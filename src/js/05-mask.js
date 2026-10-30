/* ---------- mask machinery (masks are immutable between edits so history can hold references) ---------- */
function blurMask(m,w,h,r0){if(r0<=0)return m;const r=Math.max(1,Math.round(r0));let a=Float32Array.from(m),b=new Float32Array(m.length);const win=2*r+1;
  for(let pass=0;pass<2;pass++){
    for(let y=0;y<h;y++){const o=y*w;let s=0;for(let x=-r;x<=r;x++)s+=a[o+clamp(x,0,w-1)];
      for(let x=0;x<w;x++){b[o+x]=s/win;s+=a[o+Math.min(w-1,x+r+1)]-a[o+Math.max(0,x-r)];}}
    for(let x=0;x<w;x++){let s=0;for(let y=-r;y<=r;y++)s+=b[clamp(y,0,h-1)*w+x];
      for(let y=0;y<h;y++){a[y*w+x]=s/win;s+=b[Math.min(h-1,y+r+1)*w+x]-b[Math.max(0,y-r)*w+x];}}
  }
  if(r0<1)for(let i=0;i<a.length;i++)a[i]=m[i]+(a[i]-m[i])*r0;
  return a;}
function maskChanged(){const m=st.mask,d=st.sdata,w=st.sw,h=st.sh,xs=[],ys=[];let n=0,part=0;
  const eff=i=>m[i]>=16&&d[i*4+3]>8;   /* the mask holds opacity 0-255; edge and fit maths use pixels that are visibly in */
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!m[i])continue;n++;if(m[i]<255)part++;if(m[i]<16||d[i*4+3]<=8)continue;
    if(x===0||y===0||x===w-1||y===h-1||!eff(i-1)||!eff(i+1)||!eff(i-w)||!eff(i+w)){xs.push(x+.5-w/2);ys.push(y+.5-h/2);}}
  st.selCount=n;st.partial=part;st.maskVer++;st.bx=Float32Array.from(xs);st.by=Float32Array.from(ys);
  st.softDirty=st.popDirty=st.selDirty=st.fitDirty=true;selStat();}
function selStat(){const p=st.selCount/(st.sw*st.sh)*100;
  $('#selStat').textContent=st.selCount?'Selected: '+(p<1?'under 1':Math.round(p))+'% of the picture':'Nothing selected yet';}
function sizeTo(cv,w,h){if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}return cv.getContext('2d');}
/* feather inward only: hard-edged areas fade at their outline, while already soft (hair) pixels and their neighbours are left alone */
function featherMask(m,w,h,r){const bl=blurMask(m,w,h,r),out=new Uint8Array(m.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,v=m[i];let soft=v>2&&v<253;
    if(!soft){for(let dy=-1;dy<=1&&!soft;dy++){const yy=y+dy;if(yy<0||yy>=h)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=w)continue;const q=m[yy*w+xx];if(q>2&&q<253){soft=true;break;}}}}
    out[i]=soft?v:Math.round(Math.min(v,bl[i]));}
  return out;}
function refreshSoft(){if(!st.softDirty)return;const{sw,sh}=st,ctx=sizeTo(st.softCv,sw,sh);
  const m=st.feather>0?featherMask(st.mask,sw,sh,st.feather):st.mask,id=ctx.createImageData(sw,sh),d=id.data;
  for(let i=0,n=sw*sh;i<n;i++){const j=i*4;d[j]=d[j+1]=d[j+2]=255;d[j+3]=m[i];}
  ctx.putImageData(id,0,0);st.softDirty=false;st.popDirty=true;}
function refreshPop(){refreshSoft();if(!st.popDirty)return;const x=sizeTo(st.popCv,st.sw,st.sh);
  x.clearRect(0,0,st.sw,st.sh);x.globalCompositeOperation='source-over';x.drawImage(popSrc(false),0,0);
  x.globalCompositeOperation='destination-in';x.drawImage(st.softCv,0,0);x.globalCompositeOperation='source-over';st.popDirty=false;}
function refreshSel(){if(!st.selDirty)return;const{sw,sh}=st,ctx=sizeTo(st.selCv,sw,sh),id=ctx.createImageData(sw,sh),d=id.data,m=st.mask;
  for(let i=0,n=sw*sh;i<n;i++)if(m[i]){const j=i*4;d[j]=d[j+1]=d[j+2]=255;d[j+3]=m[i];}
  ctx.putImageData(id,0,0);st.selDirty=false;}
function hiPop(){refreshSoft();if(st.full===st.src){refreshPop();return st.popCv;}
  const c=mk();c.width=st.full.width;c.height=st.full.height;const x=c.getContext('2d');x.drawImage(popSrc(true),0,0);
  x.globalCompositeOperation='destination-in';x.imageSmoothingQuality='high';x.drawImage(st.softCv,0,0,c.width,c.height);return c;}
/* Magic wand: the click is remembered (wand) so the Sensitivity slider can re-run it live from the same point */
/* slider 1-100 to colour difference: slow at the low end, where backgrounds and subjects actually differ (about 2 to 150 of 255) */
const wandTol=s=>2+150*(s/100)**2;
let wand=null,wandRaf=0;
function wandSel(u,v){
  const w=st.sw,h=st.sh,d=st.sdata,B=bounds(),x0=Math.floor(u),y0=Math.floor(v);if(x0<B.x0||y0<B.y0||x0>=B.x1||y0>=B.y1)return null;
  const i0=(y0*w+x0)*4,r0=d[i0],g0=d[i0+1],b0=d[i0+2],a0=d[i0+3],tol=wandTol(st.tol);
  const match=i=>{const j=i*4;return Math.abs(d[j]-r0)<=tol&&Math.abs(d[j+1]-g0)<=tol&&Math.abs(d[j+2]-b0)<=tol&&Math.abs(d[j+3]-a0)<=tol;};
  const sel=new Uint8Array(w*h);
  if(st.contig){const stack=new Int32Array(w*h);let sp=0;const s0=y0*w+x0;stack[sp++]=s0;sel[s0]=1;
    while(sp){const i=stack[--sp],x=i%w,y=(i/w)|0;
      if(x>B.x0&&!sel[i-1]&&match(i-1)){sel[i-1]=1;stack[sp++]=i-1;}
      if(x<B.x1-1&&!sel[i+1]&&match(i+1)){sel[i+1]=1;stack[sp++]=i+1;}
      if(y>B.y0&&!sel[i-w]&&match(i-w)){sel[i-w]=1;stack[sp++]=i-w;}
      if(y<B.y1-1&&!sel[i+w]&&match(i+w)){sel[i+w]=1;stack[sp++]=i+w;}}
  }else for(let y=B.y0;y<B.y1;y++)for(let x=B.x0;x<B.x1;x++){const i=y*w+x;if(match(i))sel[i]=1;}
  return sel;}
function wandRun(){if(!wand)return;const sel=wandSel(wand.u,wand.v);if(!sel)return;const m=wand.base.slice(),add=wand.mode==='add';let ch=0;
  for(let i=0;i<m.length;i++)if(sel[i]&&(add?m[i]<255:m[i]>0)){m[i]=add?255:0;ch++;}
  st.mask=m;maskChanged();const pct=ch/(st.sw*st.sh)*100,f=pct<.1?'under 0.1':pct<10?pct.toFixed(1):Math.round(pct);
  hud(ch?(add?'Added ':'Removed ')+f+'% of the picture · sensitivity '+st.tol:'Nothing new here. Raise the sensitivity or click elsewhere.',4000);draw();}
function wandRetune(){if(!wand||wandRaf)return;wandRaf=requestAnimationFrame(()=>{wandRaf=0;wandRun();});}
function wandCommit(){if(wand&&H.i===wand.hi){H.a[H.i]=snap();updHist();}else commit();}
function wandDone(){if(!wand)return;cancelAnimationFrame(wandRaf);wandRaf=0;wandRun();wandCommit();}
function wandStart(u,v,mode){const B=bounds();if(u<B.x0||v<B.y0||u>=B.x1||v>=B.y1)return;wand={u,v,mode,base:st.mask,hi:-1};wandRun();commit(true);wand.hi=H.i;}
function morph(grow){const w=st.sw,h=st.sh;let m=st.mask;for(let it=0;it<2;it++){const o=new Uint8Array(m.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;
    const l=x>0?m[i-1]:grow?0:255,r=x<w-1?m[i+1]:grow?0:255,u=y>0?m[i-w]:grow?0:255,dn=y<h-1?m[i+w]:grow?0:255;
    o[i]=grow?Math.max(m[i],l,r,u,dn):Math.min(m[i],l,r,u,dn);}
  m=o;}st.mask=m;maskChanged();}
function paintDisc(u,v,r,val){const w=st.sw,m=st.mask,r2=r*r,B=bounds();
  for(let y=Math.max(B.y0,Math.floor(v-r));y<=Math.min(B.y1-1,Math.ceil(v+r));y++)for(let x=Math.max(B.x0,Math.floor(u-r));x<=Math.min(B.x1-1,Math.ceil(u+r));x++){
    const dx=x-u,dy=y-v;if(dx*dx+dy*dy<=r2)m[y*w+x]=val;}}

/* ---------- one-click subject detection ---------- */
/* turns a background map (1 = background) at w x h into a subject mask at working resolution: keeps the big pieces, drops tiny ones */
function subjectFromBg(bg,w,h,keepFrac,minAbs){const W=st.sw,H=st.sh,N=w*h,stack=new Int32Array(N);
  const lab=new Int32Array(N),sizes=[0];let nl=0;
  for(let s=0;s<N;s++){if(bg[s]||lab[s])continue;nl++;let sp=0,cnt=0;stack[sp++]=s;lab[s]=nl;
    while(sp){const i=stack[--sp],x=i%w,y=(i/w)|0;cnt++;
      if(x>0&&!bg[i-1]&&!lab[i-1]){lab[i-1]=nl;stack[sp++]=i-1;}if(x<w-1&&!bg[i+1]&&!lab[i+1]){lab[i+1]=nl;stack[sp++]=i+1;}
      if(y>0&&!bg[i-w]&&!lab[i-w]){lab[i-w]=nl;stack[sp++]=i-w;}if(y<h-1&&!bg[i+w]&&!lab[i+w]){lab[i+w]=nl;stack[sp++]=i+w;}}
    sizes[nl]=cnt;}
  if(!nl)return null;const maxS=Math.max(...sizes),keep=sizes.map(s=>s>=Math.max(maxS*keepFrac,minAbs));let tot=0;
  const sc=mk();sc.width=w;sc.height=h;const sx=sc.getContext('2d'),id=sx.createImageData(w,h);
  for(let i=0;i<N;i++){if(lab[i]&&keep[lab[i]]){tot++;id.data[i*4+3]=255;}}
  if(tot<N*.01||tot>N*.93)return null;
  sx.putImageData(id,0,0);
  const bc=mk();bc.width=W;bc.height=H;const bx=bc.getContext('2d',{willReadFrequently:true});bx.imageSmoothingEnabled=true;bx.imageSmoothingQuality='high';bx.drawImage(sc,0,0,W,H);
  const big=bx.getImageData(0,0,W,H).data,m=new Uint8Array(W*H);for(let i=0;i<m.length;i++)m[i]=big[i*4+3]>127?255:0;return m;}
/* Plain backgrounds (paper, studio backdrops): difference matte.
   Every pixel gets an opacity from how far its colour is from the (locally estimated) background, so strands, glows and gaps
   between curls resolve per pixel. Enclosed whites inside thick shapes (eyes) are kept, specks of paper dirt are dropped.
   Returns an opacity mask (0-255) and the background colour, or null when the background is not plain. */
function autoUniform(quick){
  const W=st.sw,H=st.sh,k=Math.min(1,(quick?560:1200)/Math.max(W,H)),w=Math.max(8,Math.round(W*k)),h=Math.max(8,Math.round(H*k)),N=w*h;
  const sc=mk();sc.width=w;sc.height=h;const sx=sc.getContext('2d',{willReadFrequently:true});sx.imageSmoothingQuality='high';sx.drawImage(st.src,0,0,w,h);
  const d=sx.getImageData(0,0,w,h).data;let tr=0;for(let i=0;i<N;i++)if(d[i*4+3]<16)tr++;if(tr>N*.03)return null;
  const bp=[];for(let t=0;t<3;t++){for(let x=0;x<w;x++){bp.push(t*w+x,(h-1-t)*w+x);}for(let y=3;y<h-3;y++){bp.push(y*w+t,y*w+w-1-t);}}
  const med=c=>{const a=bp.map(i=>d[i*4+c]).sort((p,q)=>p-q);return a[a.length>>1];},g=[med(0),med(1),med(2)];
  const mx=i=>Math.max(Math.abs(d[i*4]-g[0]),Math.abs(d[i*4+1]-g[1]),Math.abs(d[i*4+2]-g[2]));
  let near=0;for(const i of bp)if(mx(i)<=28)near++;if(near<bp.length*.6)return null;
  /* local background colour: normalised blur of the background-like pixels on a coarse grid (handles vignettes and gradients) */
  const CELL=8,cw=Math.ceil(w/CELL),ch=Math.ceil(h/CELL),fld=new Float32Array(cw*ch*3),R=7;
  for(let c=0;c<cw*ch;c++){fld[c*3]=g[0];fld[c*3+1]=g[1];fld[c*3+2]=g[2];}
  /* two passes: first pixels near the median, then pixels near the first estimate (so veils and glows do not pollute the background) */
  for(let pass=0;pass<2;pass++){const sum=new Float32Array(cw*ch*3),cnt=new Float32Array(cw*ch),lim=pass?7:14;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,o=(((y/CELL)|0)*cw+((x/CELL)|0))*3;
      if(Math.max(Math.abs(d[i*4]-fld[o]),Math.abs(d[i*4+1]-fld[o+1]),Math.abs(d[i*4+2]-fld[o+2]))>lim)continue;
      const c=o/3;sum[o]+=d[i*4];sum[o+1]+=d[i*4+1];sum[o+2]+=d[i*4+2];cnt[c]++;}
    const nf=new Float32Array(cw*ch*3);
    for(let cy=0;cy<ch;cy++)for(let cx=0;cx<cw;cx++){let a=0,b=0,c2=0,n=0;
      for(let yy=Math.max(0,cy-R);yy<=Math.min(ch-1,cy+R);yy++)for(let xx=Math.max(0,cx-R);xx<=Math.min(cw-1,cx+R);xx++){const q=yy*cw+xx;a+=sum[q*3];b+=sum[q*3+1];c2+=sum[q*3+2];n+=cnt[q];}
      const o=(cy*cw+cx)*3;if(n>20){nf[o]=a/n;nf[o+1]=b/n;nf[o+2]=c2/n;}else{nf[o]=fld[o];nf[o+1]=fld[o+1];nf[o+2]=fld[o+2];}}
    fld.set(nf);}
  const dt=(on)=>{const D=new Float32Array(N);for(let i=0;i<N;i++)D[i]=on[i]?0:1e9;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let v=D[i];if(!v)continue;if(x>0)v=Math.min(v,D[i-1]+1);if(y>0){v=Math.min(v,D[i-w]+1);if(x>0)v=Math.min(v,D[i-w-1]+1.414);if(x<w-1)v=Math.min(v,D[i-w+1]+1.414);}D[i]=v;}
      for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;let v=D[i];if(!v)continue;if(x<w-1)v=Math.min(v,D[i+1]+1);if(y<h-1){v=Math.min(v,D[i+w]+1);if(x<w-1)v=Math.min(v,D[i+w+1]+1.414);if(x>0)v=Math.min(v,D[i+w-1]+1.414);}D[i]=v;}
      return D;};
  /* the user's Auto sensitivity (0-100, 50 is the default): low demands a clear difference from the background, high keeps even faint ones */
  const darkBg=.299*g[0]+.587*g[1]+.114*g[2]<90,f=Math.pow(2,(50-Math.min(100,st.autoSens+(darkBg?25:0)))/25),TOL=9*f,D0=TOL+39*f,al=new Float32Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,o=(((y/CELL)|0)*cw+((x/CELL)|0))*3,B0=fld[o],B1=fld[o+1],B2=fld[o+2],C0=d[i*4],C1=d[i*4+1],C2=d[i*4+2];
    const dd=Math.sqrt(((C0-B0)**2+(C1-B1)**2+(C2-B2)**2)/3),key=Math.min(1,Math.max(0,(dd-TOL)/(D0-TOL)));
    /* smallest opacity for which the unmixed foreground is still a valid colour */
    const lo=(c,b)=>c>=b?(c-b)/(255.01-b):(b-c)/(b+.01),amin=Math.max(lo(C0,B0),lo(C1,B1),lo(C2,B2));
    al[i]=dd<TOL?0:Math.max(key,amin*.9);}
  /* wide, faint areas (veils, glows) carry paper grain as flicker: smooth them, but never thin strands */
  {const low=new Uint8Array(N),t1=new Uint8Array(N),t2=new Uint8Array(N),SR=2;
   for(let i=0;i<N;i++)low[i]=al[i]>.04&&al[i]<.7?1:0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=1;for(let q=Math.max(0,x-SR);q<=Math.min(w-1,x+SR)&&v;q++)v=low[y*w+q];t1[y*w+x]=v;}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=1;for(let q=Math.max(0,y-SR);q<=Math.min(h-1,y+SR)&&v;q++)v=t1[q*w+x];t2[y*w+x]=v;}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let q=Math.max(0,x-SR);q<=Math.min(w-1,x+SR)&&!v;q++)v=t2[y*w+q];t1[y*w+x]=v;}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let q=Math.max(0,y-SR);q<=Math.min(h-1,y+SR)&&!v;q++)v=t1[q*w+x];t2[y*w+x]=v;}
   const sm=new Float32Array(al);
   for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const i=y*w+x;if(!t2[i])continue;let s2=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)s2+=al[i+dy*w+dx];sm[i]=s2/25;}
   al.set(sm);}
  /* drop isolated specks (paper dirt) */
  const lab=new Uint8Array(N),stack=new Int32Array(N),minS=Math.max(14,Math.round(N*.00003));
  for(let s0=0;s0<N;s0++){if(lab[s0]||al[s0]<.1)continue;let sp=0;const list=[];stack[sp++]=s0;lab[s0]=1;
    while(sp){const i=stack[--sp],x=i%w,y=(i/w)|0;list.push(i);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const q=yy*w+xx;if(!lab[q]&&al[q]>=.1){lab[q]=1;stack[sp++]=q;}}}
    if(list.length<minS)for(const i of list)al[i]=0;}
  /* isolated weak patches (paper stains, wood highlights) never touch solid subject: drop them */
  {const ll=new Uint8Array(N),stk=new Int32Array(N);let comps=[];
   for(let s0=0;s0<N;s0++){if(ll[s0]||al[s0]<.1)continue;let sp=0,solid=0;const list=[];stk[sp++]=s0;ll[s0]=1;
     while(sp){const i=stk[--sp],x=i%w,y=(i/w)|0;list.push(i);if(al[i]>=.6)solid++;
       for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const q=yy*w+xx;if(!ll[q]&&al[q]>=.1){ll[q]=1;stk[sp++]=q;}}}
     comps.push({list,solid});}
   let big=0;for(const c of comps)if(c.solid>big)big=c.solid;
   for(const c of comps)if(c.solid<Math.max(12,big*.02))for(const i of c.list)al[i]=0;}
  /* dark backdrops: parts of the subject (shadows, black hair) are as dark as the background, so colour alone cannot tell them apart.
     Use the shape instead: close the solid core into one silhouette and fill it. Strands outside it keep their per-pixel opacity. */
  if(darkBg){
    const RC=Math.max(6,Math.round(Math.max(w,h)*.045)),core=new Uint8Array(N),dil=new Uint8Array(N),inv=new Uint8Array(N);
    for(let i=0;i<N;i++)core[i]=al[i]>=.8?1:0;
    const d1=dt(core);for(let i=0;i<N;i++){dil[i]=d1[i]<=RC?1:0;inv[i]=dil[i]?0:1;}
    const d2=dt(inv),sil=new Uint8Array(N);for(let i=0;i<N;i++)sil[i]=dil[i]&&d2[i]>RC?1:0;
    /* fill holes: whatever the silhouette encloses */
    const out2=new Uint8Array(N),st3=new Int32Array(N);let sp3=0;
    const sd=i=>{if(!sil[i]&&!out2[i]){out2[i]=1;st3[sp3++]=i;}};
    for(let x=0;x<w;x++){sd(x);sd((h-1)*w+x);}for(let y=0;y<h;y++){sd(y*w);sd(y*w+w-1);}
    while(sp3){const i=st3[--sp3],x=i%w,y=(i/w)|0;if(x>0)sd(i-1);if(x<w-1)sd(i+1);if(y>0)sd(i-w);if(y<h-1)sd(i+w);}
    const ins=new Uint8Array(N);for(let i=0;i<N;i++){ins[i]=out2[i]?0:1;}
    const d3=dt(ins),RS=Math.round(RC*.6);
    for(let i=0;i<N;i++){if(ins[i])al[i]=1;else if(d3[i]>RS)al[i]=0;}}
  /* solid interior: pale skin and silver highlights are close to the paper colour, but far from the open background they are subject.
     Opacity is only resolved near background that connects to the picture border. */
  {const open=new Uint8Array(N),st2=new Int32Array(N);let sp=0;
   const seed=i=>{if(!open[i]&&al[i]<.5){open[i]=1;st2[sp++]=i;}};
   for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x);}for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1);}
   while(sp){const i=st2[--sp],x=i%w,y=(i/w)|0;
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const q=yy*w+xx;if(!open[q]&&al[q]<.5){open[q]=1;st2[sp++]=q;}}}
   const dist=new Float32Array(N),INF=1e9;for(let i=0;i<N;i++)dist[i]=open[i]?0:INF;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let v=dist[i];
     if(x>0)v=Math.min(v,dist[i-1]+1);if(y>0){v=Math.min(v,dist[i-w]+1);if(x>0)v=Math.min(v,dist[i-w-1]+1.414);if(x<w-1)v=Math.min(v,dist[i-w+1]+1.414);}dist[i]=v;}
   for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;let v=dist[i];
     if(x<w-1)v=Math.min(v,dist[i+1]+1);if(y<h-1){v=Math.min(v,dist[i+w]+1);if(x<w-1)v=Math.min(v,dist[i+w+1]+1.414);if(x>0)v=Math.min(v,dist[i+w-1]+1.414);}dist[i]=v;}
   /* a partial-opacity region that is bordered mostly by solid subject (not by open background) is subject: pale skin, silver highlights.
      Glows and veils border the open background and stay soft. */
   const big2=Math.round(N*.0008);lab.fill(0);
   for(let s0=0;s0<N;s0++){if(lab[s0]||open[s0]||al[s0]<.05||al[s0]>=.95)continue;let sp2=0,so=0,sd=0;const list=[];st2[sp2++]=s0;lab[s0]=1;
     while(sp2){const i=st2[--sp2],x=i%w,y=(i/w)|0;list.push(i);
       for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const q=yy*w+xx;
         if(open[q])so++;else if(al[q]>=.95)sd++;else if(!lab[q]&&al[q]>=.05){lab[q]=1;st2[sp2++]=q;}}}
     if((so===0||list.length>=big2)&&sd>=so*2.5)for(const i of list)al[i]=1;}}
  /* enclosed light areas surrounded by thick shapes (eye whites, teeth) belong to the subject; gaps between thin strands do not */
  const fgb=new Uint8Array(N),er=new Uint8Array(N),thick=new Uint8Array(N),TR=3;
  for(let i=0;i<N;i++)fgb[i]=al[i]>=.6?1:0;
  const tmp=new Uint8Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=1;for(let q=Math.max(0,x-TR);q<=Math.min(w-1,x+TR)&&v;q++)v=fgb[y*w+q];tmp[y*w+x]=v;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=1;for(let q=Math.max(0,y-TR);q<=Math.min(h-1,y+TR)&&v;q++)v=tmp[q*w+x];er[y*w+x]=v;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let q=Math.max(0,x-TR);q<=Math.min(w-1,x+TR)&&!v;q++)v=er[y*w+q];tmp[y*w+x]=v;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let q=Math.max(0,y-TR);q<=Math.min(h-1,y+TR)&&!v;q++)v=tmp[q*w+x];thick[y*w+x]=v;}
  lab.fill(0);
  for(let s0=0;s0<N;s0++){if(lab[s0]||al[s0]>=.5)continue;let sp=0,edge=false,bnd=0,tk=0,x0=w,x1=0,y0=h,y1=0;const list=[];stack[sp++]=s0;lab[s0]=1;
    while(sp){const i=stack[--sp],x=i%w,y=(i/w)|0;list.push(i);if(x===0||y===0||x===w-1||y===h-1)edge=true;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      const nb=[x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1];
      for(const q of nb){if(q<0)continue;if(al[q]<.5){if(!lab[q]){lab[q]=1;stack[sp++]=q;}}else{bnd++;if(thick[q])tk++;}}}
    const bw=x1-x0+1,bh=y1-y0+1;
    /* eyes are compact blobs (even with an iris in the middle: the spans are filled across it); gaps between locks are thin crescents */
    if(!edge&&list.length>=24&&list.length<N*.0012&&bnd>0&&tk/bnd>=.85&&Math.min(bw,bh)>=5&&Math.max(bw,bh)<=4*Math.min(bw,bh)){
      const rmin=new Int32Array(bh).fill(1e9),rmax=new Int32Array(bh).fill(-1),cmin=new Int32Array(bw).fill(1e9),cmax=new Int32Array(bw).fill(-1);
      for(const i of list){const x=i%w-x0,y=((i/w)|0)-y0;if(x<rmin[y])rmin[y]=x;if(x>rmax[y])rmax[y]=x;if(y<cmin[x])cmin[x]=y;if(y>cmax[x])cmax[x]=y;}
      let fa=0;for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(x>=rmin[y]&&x<=rmax[y]&&y>=cmin[x]&&y<=cmax[x])fa++;
      if(fa/(bw*bh)>=.5&&list.length/fa>=.4){for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(x>=rmin[y]&&x<=rmax[y]&&y>=cmin[x]&&y<=cmax[x]&&al[(y+y0)*w+x+x0]<.5)al[(y+y0)*w+x+x0]=1;}}}
  /* shrink or grow the edge by whole picture pixels, like shrinking a wand selection */
  if(st.autoShrink){const n=Math.abs(st.autoShrink)*k,sub=new Uint8Array(N);
    if(st.autoShrink>0){for(let i=0;i<N;i++)sub[i]=al[i]<.5?1:0;const dd=dt(sub);for(let i=0;i<N;i++)if(al[i]>0&&dd[i]<n)al[i]*=Math.max(0,(dd[i]-.5)/n);}
    else{for(let i=0;i<N;i++)sub[i]=al[i]>=.5?1:0;const dd=dt(sub);for(let i=0;i<N;i++)if(dd[i]>0&&dd[i]<=n)al[i]=Math.max(al[i],1-(dd[i]-.5)/n);}}
  let tot=0;for(let i=0;i<N;i++)if(al[i]>=.5)tot++;if(tot<N*.01||tot>N*.93)return null;
  const big=mk();big.width=W;big.height=H;let mask=new Uint8Array(W*H);
  if(k<1){const sc2=mk();sc2.width=w;sc2.height=h;const x2=sc2.getContext('2d'),id=x2.createImageData(w,h);for(let i=0;i<N;i++)id.data[i*4+3]=Math.round(al[i]*255);x2.putImageData(id,0,0);
    const bx=big.getContext('2d',{willReadFrequently:true});bx.imageSmoothingEnabled=true;bx.imageSmoothingQuality='high';bx.drawImage(sc2,0,0,W,H);const bd=bx.getImageData(0,0,W,H).data;for(let i=0;i<mask.length;i++)mask[i]=bd[i*4+3]<10?0:bd[i*4+3];}
  else for(let i=0;i<N;i++){const v=Math.round(al[i]*255);mask[i]=v<10?0:v;}
  return{mask,bg:rgbToHex(g)};}
function autoSubject(){
  const W=st.sw,H=st.sh,k=Math.min(1,360/Math.max(W,H)),w=Math.max(8,Math.round(W*k)),h=Math.max(8,Math.round(H*k)),N=w*h;
  const sc=mk();sc.width=w;sc.height=h;const sx=sc.getContext('2d',{willReadFrequently:true});sx.imageSmoothingQuality='high';sx.drawImage(st.src,0,0,w,h);
  const d=sx.getImageData(0,0,w,h).data,bg=new Uint8Array(N),stack=new Int32Array(N);let transparent=0;
  for(let i=0;i<N;i++)if(d[i*4+3]<16)transparent++;
  if(transparent>N*.03){for(let i=0;i<N;i++)bg[i]=d[i*4+3]<16?1:0;}
  else{
    const bp=[];for(let x=0;x<w;x++){bp.push(x,(h-1)*w+x);}for(let y=1;y<h-1;y++){bp.push(y*w,y*w+w-1);}
    const med=c=>{const a=bp.map(i=>d[i*4+c]).sort((p,q)=>p-q);return a[a.length>>1];},mr=med(0),mg=med(1),mb=med(2);
    const anchor=new Int32Array(N);let sp=0;
    const seed=strict=>{for(const i of bp){if(bg[i])continue;if(!strict||Math.hypot(d[i*4]-mr,d[i*4+1]-mg,d[i*4+2]-mb)<110){bg[i]=1;anchor[i]=i;stack[sp++]=i;}}};
    seed(true);if(!sp)seed(false);
    const T=14,A=130;
    while(sp){const i=stack[--sp],x=i%w,y=(i/w)|0,p=i*4,r=d[p],g=d[p+1],b=d[p+2],an=anchor[i]*4;
      const tryN=j=>{if(bg[j])return;const q=j*4;if(d[q+3]<16)return;
        if(Math.max(Math.abs(d[q]-r),Math.abs(d[q+1]-g),Math.abs(d[q+2]-b))<=T&&Math.max(Math.abs(d[q]-d[an]),Math.abs(d[q+1]-d[an+1]),Math.abs(d[q+2]-d[an+2]))<=A){bg[j]=1;anchor[j]=anchor[i];stack[sp++]=j;}};
      if(x>0)tryN(i-1);if(x<w-1)tryN(i+1);if(y>0)tryN(i-w);if(y<h-1)tryN(i+w);}
  }
  return subjectFromBg(bg,w,h,.12,0);}
/* Auto sensitivity and Shrink/grow sliders: run Auto again with the new values (this replaces the current selection) */
let autoRaf=0,autoHi=-1;
function autoLive(final){if(!st.src)return;let soft=null;try{soft=autoUniform(!final);}catch(e){}
  if(!soft){toast('These sliders work when the picture has a fairly plain background.');return;}
  const m=soft.mask;if(!autoFixOn())for(let i=0;i<m.length;i++)m[i]=m[i]>=128?255:0;
  st.mask=m;if(autoFixOn()){st.bgC=soft.bg;st.bgAuto=true;st.defr=1;}eSess=null;maskChanged();st.popDirty=true;syncUI();draw();}
function autoRetune(){if(autoRaf)return;autoRaf=requestAnimationFrame(()=>{autoRaf=0;autoLive();});}
function autoCommit(){autoLive(true);if(H.i===autoHi){H.a[H.i]=snap();updHist();}else{commit();autoHi=H.i;}}
function runAuto(){
  if(!st.src)return;busy(1,'Finding subject…');
  setTimeout(()=>{let m=null,soft=null;try{soft=autoUniform();if(soft&&!autoFixOn()){const b=soft.mask;for(let i=0;i<b.length;i++)b[i]=b[i]>=128?255:0;m=b;soft=null;}else m=soft?soft.mask:autoSubject();}catch(e){}
    busy(-1);
    if(!m){toast('No clear subject found. Use Select and click the part that should pop out.');setTool('select');return;}
    st.mask=m;maskChanged();let note='Subject selected. Adjust it with Select or Brush, or Undo.';
    if(soft){st.bgC=soft.bg;st.bgAuto=true;st.defr=1;eSess=null;note='Subject selected with soft edges. Use the sliders in the Pop-out tab, or the Brush, for anything missed. Undo reverts.';}
    else if(autoFixOn()){try{const r=fixEdges(true);if(r&&r.matte)note='Subject selected and edges softened. Use the sliders in the Pop-out tab or the Brush for stray hair, or Undo.';}catch(e){}}
    st.popOn=true;syncUI();draw();commit();toast(note);},30);}
