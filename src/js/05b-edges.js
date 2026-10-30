/* ---------- edge tools: soft matte, clean-up, edge shift, hair-aware brush ----------
   The mask holds opacity (0-255). "Matte" turns pixels near the selection edge into partial opacity based on how far
   their colour is from the background, so hair and fur keep their fine, see-through strands. */
const hexToRgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const rgbToHex=c=>'#'+c.map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
const cdist=(d,i,c)=>{const j=i*4,a=d[j]-c[0],b=d[j+1]-c[1],e=d[j+2]-c[2];return Math.sqrt((a*a+b*b+e*e)/3);};
const edgeReachDefault=()=>clamp(Math.round(Math.min(st.sw,st.sh)/200),3,14);
/* distance (in pixels, chamfer) from every pixel of window B to the nearest pixel where src is 1 */
function chamfer(src,W,Hh,idx){const INF=1e9,d=new Float32Array(W*Hh);
  for(let i=0;i<d.length;i++){d[i]=src[i]?0:INF;if(idx)idx[i]=src[i]?i:-1;}
  const upd=(i,j,c)=>{if(d[j]+c<d[i]){d[i]=d[j]+c;if(idx)idx[i]=idx[j];}};
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x;
    if(x>0)upd(i,i-1,1);
    if(y>0){upd(i,i-W,1);if(x>0)upd(i,i-W-1,1.414);if(x<W-1)upd(i,i-W+1,1.414);}}
  for(let y=Hh-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;
    if(x<W-1)upd(i,i+1,1);
    if(y<Hh-1){upd(i,i+W,1);if(x<W-1)upd(i,i+W+1,1.414);if(x>0)upd(i,i+W-1,1.414);}}
  return d;}
function solidMap(base,B){const w=st.sw,W=B.x1-B.x0,Hh=B.y1-B.y0,d=st.sdata,sol=new Uint8Array(W*Hh),non=new Uint8Array(W*Hh),stack=new Int32Array(W*Hh);let sp=0;
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const g=(y+B.y0)*w+x+B.x0;sol[y*W+x]=base[g]>=128&&d[g*4+3]>8?1:0;}
  /* the flood may hop over hair-thin strands (up to 2 px each side), so pockets between curls count as background */
  const dil=new Uint8Array(W*Hh),tmp=new Uint8Array(W*Hh),R=2;
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){let v=0;for(let q=Math.max(0,x-R);q<=Math.min(W-1,x+R)&&!v;q++)v=sol[y*W+q]?0:1;tmp[y*W+x]=v;}
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){let v=0;for(let q=Math.max(0,y-R);q<=Math.min(Hh-1,y+R)&&!v;q++)v=tmp[q*W+x];dil[y*W+x]=v;}
  const hop=i=>{if(dil[i]&&!seen[i]){seen[i]=1;stack[sp++]=i;}},seen=new Uint8Array(W*Hh);
  for(let x=0;x<W;x++){hop(x);hop((Hh-1)*W+x);}for(let y=0;y<Hh;y++){hop(y*W);hop(y*W+W-1);}
  while(sp){const i=stack[--sp],x=i%W,y=(i/W)|0;
    if(x>0)hop(i-1);if(x<W-1)hop(i+1);if(y>0)hop(i-W);if(y<Hh-1)hop(i+W);}
  for(let i=0;i<W*Hh;i++)non[i]=seen[i]&&!sol[i]?1:0;
  return{sol,non,W,Hh};}
const median=a=>{a.sort((p,q)=>p-q);return a[a.length>>1];};
/* the colour behind the subject: sampled just outside the selection edge, falling back to the picture border */
function estimateBg(base,B,reach){const w=st.sw,d=st.sdata,sm=solidMap(base,B),{sol,W,Hh}=sm,dOut=chamfer(sol,W,Hh),R=[],G=[],Bl=[];
  const lo=reach+1,hi=reach+1+Math.max(6,reach),{non}=sm;let cnt=0;
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x;if(non[i]&&dOut[i]>=lo&&dOut[i]<=hi)cnt++;}
  const step=Math.max(1,Math.floor(cnt/4000));let k=0;
  const take=g=>{R.push(d[g*4]);G.push(d[g*4+1]);Bl.push(d[g*4+2]);};
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x;if(non[i]&&dOut[i]>=lo&&dOut[i]<=hi&&d[((y+B.y0)*w+x+B.x0)*4+3]>200&&(k++%step===0))take((y+B.y0)*w+x+B.x0);}
  if(R.length<40){R.length=G.length=Bl.length=0;const sh=st.sh;
    for(let x=0;x<w;x+=2){take(x);take((sh-1)*w+x);}for(let y=0;y<sh;y+=2){take(y*w);take(y*w+w-1);}}
  const c=[median(R.slice()),median(G.slice()),median(Bl.slice())];
  let dev=0;for(let i=0;i<R.length;i++)dev+=Math.sqrt(((R[i]-c[0])**2+(G[i]-c[1])**2+(Bl[i]-c[2])**2)/3);
  return{c,busy:dev/R.length>38};}
const effBg=(base,B,reach)=>{if(!st.bgAuto&&/^#[0-9a-f]{6}$/i.test(st.bgC))return{c:hexToRgb(st.bgC),busy:false};return estimateBg(base,B,reach);};
/* soft matte: pixels within `reach` of the edge get opacity from their colour distance to the background.
   The background is read locally (nearest open background beyond the band), so gradients and vignettes work. */
function matte(base,B,bg,reach,tol,soft,local){const w=st.sw,d=st.sdata,{sol,non,W,Hh}=solidMap(base,B),dOut=chamfer(sol,W,Hh),dIn=chamfer(non,W,Hh);
  let far=null,near=null;
  if(local){far=new Uint8Array(W*Hh);let n=0;for(let i=0;i<W*Hh;i++)if(non[i]&&dOut[i]>reach+1){far[i]=1;n++;}
    if(n>50){near=new Int32Array(W*Hh);chamfer(far,W,Hh,near);}}
  const col=[0,0,0],bgAt=(i,g)=>{if(!near||near[i]<0)return bg;const s=near[i],sx=s%W+B.x0,sy=((s/W)|0)+B.y0;let r=0,gg=0,b=0,c=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=sx+dx,y=sy+dy;if(x<0||y<0||x>=w||y>=st.sh)continue;const j=(y*w+x)*4;r+=d[j];gg+=d[j+1];b+=d[j+2];c++;}
    col[0]=r/c;col[1]=gg/c;col[2]=b/c;return col;};
  const samples=[];
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x;if(sol[i]&&dIn[i]<=reach+1&&(i%3===0)){const g=(y+B.y0)*w+x+B.x0;samples.push(cdist(d,g,bgAt(i,g)));}}
  if(samples.length<10)return null;
  const D=median(samples);if(D<12)return null;
  const t=Math.min(tol,Math.max(3,D*.3)),hi=t+(Math.max(D*.9,t+10)-t)*(.15+.85*soft),out=base.slice();
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x,g=(y+B.y0)*w+x+B.x0;
    if(d[g*4+3]<=8)continue;
    if(!((sol[i]&&dIn[i]<=reach)||(non[i]&&dOut[i]<=reach)))continue;
    let a=clamp((cdist(d,g,bgAt(i,g))-t)/(hi-t),0,1);if(a<.08)a=0;out[g]=Math.round(a*255);}
  return out;}
/* remove isolated specks and fill small holes (areas in pixels) */
function cleanMask(base,B,minArea,holes){const w=st.sw,out=base.slice(),W=B.x1-B.x0,Hh=B.y1-B.y0,lab=new Uint8Array(W*Hh),stack=new Int32Array(W*Hh);let specks=0,filled=0;
  const flood=(start,test,collect)=>{let sp=0,n=0,edge=false;const list=[];stack[sp++]=start;lab[start]=1;
    while(sp){const i=stack[--sp],x=i%W,y=(i/W)|0;n++;if(collect)list.push(i);
      if(x===0||y===0||x===W-1||y===Hh-1)edge=true;
      if(x>0&&!lab[i-1]&&test(i-1)){lab[i-1]=1;stack[sp++]=i-1;}if(x<W-1&&!lab[i+1]&&test(i+1)){lab[i+1]=1;stack[sp++]=i+1;}
      if(y>0&&!lab[i-W]&&test(i-W)){lab[i-W]=1;stack[sp++]=i-W;}if(y<Hh-1&&!lab[i+W]&&test(i+W)){lab[i+W]=1;stack[sp++]=i+W;}}
    return{n,edge,list};};
  const G=i=>((((i/W)|0)+B.y0)*w+(i%W)+B.x0);
  const on=i=>base[G(i)]>0;
  for(let i=0;i<W*Hh;i++){if(lab[i]||!on(i))continue;const r=flood(i,on,true);if(r.n<minArea){specks++;for(const j of r.list)out[G(j)]=0;}}
  if(holes){lab.fill(0);const off=i=>base[G(i)]<128;
    for(let i=0;i<W*Hh;i++){if(lab[i]||!off(i))continue;const r=flood(i,off,true);if(!r.edge&&r.n<minArea){filled++;for(const j of r.list)out[G(j)]=255;}}}
  return{mask:out,specks,filled};}
/* close small gaps: selected pixels that look like the background and form thin pockets (curls, hair loops) are removed.
   width is the widest gap to close, in picture pixels; wider pockets are left for the Remove brush */
function gapRemove(base,B,width,reach){const w=st.sw,d=st.sdata,W=B.x1-B.x0,Hh=B.y1-B.y0,e=effBg(base,B,reach),c=e.c,tol=Math.max(st.eTol,8)+4,N=W*Hh;
  const G=i=>((((i/W)|0)+B.y0)*w+(i%W)+B.x0),like=new Uint8Array(N);
  for(let i=0;i<N;i++){const g=G(i);like[i]=base[g]>=128&&d[g*4+3]>8&&cdist(d,g,c)<=tol?1:0;}
  const dist=new Float32Array(N);for(let i=0;i<N;i++)dist[i]=like[i]?1e9:0;
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const i=y*W+x;let v=dist[i];if(!v)continue;v=Math.min(v,x>0?dist[i-1]+1:1,y>0?dist[i-W]+1:1);if(y>0&&x>0)v=Math.min(v,dist[i-W-1]+1.414);if(y>0&&x<W-1)v=Math.min(v,dist[i-W+1]+1.414);dist[i]=v;}
  for(let y=Hh-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;let v=dist[i];if(!v)continue;v=Math.min(v,x<W-1?dist[i+1]+1:1,y<Hh-1?dist[i+W]+1:1);if(y<Hh-1&&x<W-1)v=Math.min(v,dist[i+W+1]+1.414);if(y<Hh-1&&x>0)v=Math.min(v,dist[i+W-1]+1.414);dist[i]=v;}
  const out=base.slice(),lab=new Uint8Array(N),stack=new Int32Array(N);let n=0;
  for(let s0=0;s0<N;s0++){if(lab[s0]||!like[s0])continue;let sp=0,rmax=0;const list=[];stack[sp++]=s0;lab[s0]=1;
    while(sp){const i=stack[--sp],x=i%W,y=(i/W)|0;list.push(i);if(dist[i]>rmax)rmax=dist[i];
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=Hh)continue;const q=yy*W+xx;if(like[q]&&!lab[q]){lab[q]=1;stack[sp++]=q;}}}
    if(2*rmax-1<=width){n++;for(const i of list)out[G(i)]=0;}}
  /* a one pixel rim of mixed colour next to a closed gap goes too */
  const rim=out.slice();
  for(let y=1;y<Hh-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x,g=G(i);if(!out[g]||cdist(d,g,c)>tol*2.2)continue;
    if(!out[G(i-1)]||!out[G(i+1)]||!out[G(i-W)]||!out[G(i+W)])rim[g]=0;}
  return{mask:rim,n};}
/* edge shift: smooth the selection and move its edge in or out by a fraction of a pixel (amount -100..100) */
function shiftEdge(base,B,amount){const w=st.sw,bl=blurMask(base,w,st.sh,2),out=new Uint8Array(base.length),s=amount/100*.5;
  for(let y=B.y0;y<B.y1;y++)for(let x=B.x0;x<B.x1;x++){const g=y*w+x;out[g]=Math.round(clamp((bl[g]/255-.5+s)*6+.5,0,1)*255);}
  for(let y=0;y<st.sh;y++)for(let x=0;x<w;x++){if(x<B.x0||x>=B.x1||y<B.y0||y>=B.y1)out[y*w+x]=base[y*w+x];}
  return out;}
const speckArea=()=>Math.max(4,Math.round((st.speck/100)**2*.0012*st.sw*st.sh));
/* the whole pipeline in one place: used by Fix edges, the live sliders and Auto */
function edgePipeline(base,B,steps,reach){let out=base,info={matte:false,busy:false,low:false,specks:0,filled:0,gaps:0},bg=null;
  if(steps.gap&&st.gap>0){const g=gapRemove(out,B,st.gap,reach);out=g.mask;info.gaps=g.n;}
  if(steps.matte){bg=effBg(base,B,reach);info.busy=bg.busy;
    if(!bg.busy){const r=matte(base,B,bg.c,reach,st.eTol,st.eSoft/100,st.bgAuto);if(r){out=r;info.matte=true;info.bg=bg.c;}else info.low=true;}}
  if(steps.clean){const c=cleanMask(out,B,speckArea(),true);out=c.mask;info.specks=c.specks;info.filled=c.filled;}
  if(steps.shift&&st.eShift)out=shiftEdge(out,B,st.eShift);
  info.mask=out;return info;}
/* live session: the sliders re-run the pipeline from the mask as it was before the first tweak */
let eSess=null,eRaf=0;
function edgeLive(steps){if(!st.src)return;
  if(!eSess||eSess.out!==st.mask)eSess={base:st.mask,B:bounds(),steps:{matte:false,clean:false,shift:false},hi:-1,out:null};
  Object.assign(eSess.steps,steps);
  const reach=Math.max(1,Math.round(st.eReach)),r=edgePipeline(eSess.base,eSess.B,eSess.steps,reach);
  applyEdge(r);eSess.out=st.mask;return r;}
function applyEdge(r){if(r.matte){if(st.bgAuto)st.bgC=rgbToHex(r.bg);if(eSess&&!eSess.defrOn){eSess.defrOn=true;st.defr=1;}}st.mask=r.mask;maskChanged();st.popDirty=true;syncUI();draw();}
function edgeRetune(kind){if(eRaf)return;eRaf=requestAnimationFrame(()=>{eRaf=0;edgeLive(kind==='shift'?{shift:true}:kind==='gap'?{gap:true}:{matte:true,clean:true,shift:true});});}
function edgeCommit(){if(!eSess)return commit();if(H.i===eSess.hi){H.a[H.i]=snap();updHist();}else{commit();eSess.hi=H.i;}}
/* one tap: matte + defringe + clean-up on the whole selection  */
function fixEdges(quiet){if(!st.src||!st.selCount){if(!quiet)toast('Choose the pop-out first, then fix its edges.');return null;}
  eSess=null;const B=bounds(),reach=Math.max(st.eReach,quiet?Math.ceil(Math.max(st.sw,st.sh)/360)+2:0);
  const r=edgePipeline(st.mask,B,{matte:true,clean:true,shift:true},Math.round(reach));
  if(quiet)st.eReach=Math.round(reach);
  eSess={base:st.mask,B,steps:{matte:true,clean:true,shift:true},hi:-1,out:null};applyEdge(r);eSess.out=st.mask;
  if(!quiet){edgeCommit();toast(r.matte?'Edges softened'+(r.specks+r.filled?' and cleaned up':'')+'. Fine-tune below, or Undo.':r.busy?'The background is busy, so only specks and holes were cleaned. Try Refine and the hair-aware brush for strands.':r.low?'The edge is too similar to the background to soften automatically. Specks were cleaned.':'Specks and holes cleaned up.');}
  return r;}
/* ---------- hair-aware and soft brush: per-pixel dabs, then a rectangle refresh of the preview canvases ---------- */
let sbg=null,dirtyR=null;
function strandSetup(){const B=bounds(),reach=Math.max(1,Math.round(st.eReach)),e=effBg(st.mask,B,reach),w=st.sw,d=st.sdata,s=[];
  for(let i=0,n=w*st.sh;i<n&&s.length<3000;i+=7)if(st.mask[i]>=200&&d[i*4+3]>200)s.push(cdist(d,i,e.c));
  const D=s.length?median(s):120,tol=st.eTol,hi=tol+(Math.max(D*.9,tol+10)-tol)*(.15+.85*st.eSoft/100);
  sbg={c:e.c,tol,hi};}
function dabSoft(u,v,r,sub){const w=st.sw,m=st.mask,d=st.sdata,B=bounds(),hard=1-st.bsoft,x0=Math.max(B.x0,Math.floor(u-r)),x1=Math.min(B.x1-1,Math.ceil(u+r)),y0=Math.max(B.y0,Math.floor(v-r)),y1=Math.min(B.y1-1,Math.ceil(v+r));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dist=Math.hypot(x-u,y-v);if(dist>r)continue;
    const f=hard>=1||dist<=r*hard?1:Math.pow(1-(dist-r*hard)/(r*(1-hard)),1.5),g=y*w+x;
    let a=1;if(st.strand&&sbg){if(d[g*4+3]<=8)continue;a=clamp((cdist(d,g,sbg.c)-sbg.tol)/(sbg.hi-sbg.tol),0,1);if(a<.08)a=0;}
    const cur=m[g];
    if(!sub){const t=Math.round(255*a*f);if(t>cur)m[g]=t;}
    else{const keep=st.strand?Math.round(255*a):0,t=Math.round(cur-(cur-Math.min(cur,keep))*f);m[g]=t;}}
  const R={x0,y0,x1,y1};dirtyR=dirtyR?{x0:Math.min(dirtyR.x0,x0),y0:Math.min(dirtyR.y0,y0),x1:Math.max(dirtyR.x1,x1),y1:Math.max(dirtyR.y1,y1)}:R;}
function flushDirty(){if(!dirtyR)return;const r=dirtyR,w=st.sw;dirtyR=null;const rw=r.x1-r.x0+1,rh=r.y1-r.y0+1;if(rw<1||rh<1)return;
  for(const cv of[st.selCv,st.softCv]){const ctx=cv.getContext('2d'),id=ctx.createImageData(rw,rh),q=id.data;
    for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){const j=(y*rw+x)*4;q[j]=q[j+1]=q[j+2]=255;q[j+3]=st.mask[(r.y0+y)*w+r.x0+x];}
    ctx.putImageData(id,r.x0,r.y0);}}
