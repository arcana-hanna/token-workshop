/* ---------- Auto suggestions: several different ideas, nothing is applied until the user picks one ----------
   Every method returns a full-size opacity mask (0-255) or null. They share the analysis grid and the ring position:
   the ring is aimed at the character, so its centre is the best hint for "this is the subject". */
const SG_LONG=360;
function sgInput(){
  const W=st.sw,H=st.sh,k=Math.min(1,SG_LONG/Math.max(W,H)),w=Math.max(8,Math.round(W*k)),h=Math.max(8,Math.round(H*k)),N=w*h;
  const c=mk();c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingQuality='high';x.drawImage(st.src,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data;
  /* ring position in picture pixels, as it is now with a ring that fills the frame */
  const S=1024,g=geom(S,0),m=toImg(g,S/2,S/2),R=g.R/g.sc,ri=R*(1-st.width);
  return{W,H,w,h,N,k,d,cx:m.u*w/W,cy:m.v*h/H,R:R*k,ri:ri*k};}
/* full-size mask from an analysis-grid opacity (0..1) */
function sgUp(a,I){const{W,H,w,h,N}=I,s=mk();s.width=w;s.height=h;const sx=s.getContext('2d'),id=sx.createImageData(w,h);
  for(let i=0;i<N;i++)id.data[i*4+3]=Math.round(clamp(a[i],0,1)*255);sx.putImageData(id,0,0);
  const b=mk();b.width=W;b.height=H;const bx=b.getContext('2d',{willReadFrequently:true});bx.imageSmoothingEnabled=true;bx.imageSmoothingQuality='high';bx.drawImage(s,0,0,W,H);
  const bd=bx.getImageData(0,0,W,H).data,m=new Uint8Array(W*H);for(let i=0;i<m.length;i++){const v=bd[i*4+3];m[i]=v<10?0:v;}return m;}
/* 4-connected labelling of a binary grid; returns {lab,sizes} */
function sgLabel(b,w,h){const N=w*h,lab=new Int32Array(N),sizes=[0],st2=new Int32Array(N);let n=0;
  for(let s=0;s<N;s++){if(!b[s]||lab[s])continue;n++;let sp=0,cnt=0;st2[sp++]=s;lab[s]=n;
    while(sp){const i=st2[--sp],x=i%w;cnt++;
      if(x>0&&b[i-1]&&!lab[i-1]){lab[i-1]=n;st2[sp++]=i-1;}if(x<w-1&&b[i+1]&&!lab[i+1]){lab[i+1]=n;st2[sp++]=i+1;}
      if(i>=w&&b[i-w]&&!lab[i-w]){lab[i-w]=n;st2[sp++]=i-w;}if(i<N-w&&b[i+w]&&!lab[i+w]){lab[i+w]=n;st2[sp++]=i+w;}}
    sizes[n]=cnt;}
  return{lab,sizes,n};}
/* keep the components that touch the subject seed (the ring centre), drop the rest, fill holes that do not reach the border */
function sgTidy(b,I){const{w,h,N,cx,cy,ri}=I,{lab,sizes}=sgLabel(b,w,h),keep=new Set();
  const r0=Math.max(2,ri*.3);for(let y=Math.max(0,Math.floor(cy-r0));y<=Math.min(h-1,Math.ceil(cy+r0));y++)for(let x=Math.max(0,Math.floor(cx-r0));x<=Math.min(w-1,Math.ceil(cx+r0));x++){
    if((x-cx)**2+(y-cy)**2<=r0*r0&&lab[y*w+x])keep.add(lab[y*w+x]);}
  if(!keep.size){let bi=0;for(let i=1;i<sizes.length;i++)if(sizes[i]>sizes[bi])bi=i;if(bi)keep.add(bi);}
  const out=new Uint8Array(N);let tot=0;for(let i=0;i<N;i++)if(lab[i]&&keep.has(lab[i])){out[i]=1;tot++;}
  /* holes */
  const bgc=new Uint8Array(N),stk=new Int32Array(N);let sp=0;
  const sd=i=>{if(!out[i]&&!bgc[i]){bgc[i]=1;stk[sp++]=i;}};
  for(let x=0;x<w;x++){sd(x);sd((h-1)*w+x);}for(let y=0;y<h;y++){sd(y*w);sd(y*w+w-1);}
  while(sp){const i=stk[--sp],x=i%w;if(x>0)sd(i-1);if(x<w-1)sd(i+1);if(i>=w)sd(i-w);if(i<N-w)sd(i+w);}
  for(let i=0;i<N;i++)if(!out[i]&&!bgc[i]){out[i]=1;tot++;}
  return tot<N*.004||tot>N*.95?null:out;}
/* a hard grid mask becomes a soft 1-pixel edge */
function sgSoft(b,w,h){const N=w*h,t=new Float32Array(N),o=new Float32Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let q=Math.max(0,x-1);q<=Math.min(w-1,x+1);q++){s+=b[y*w+q];n++;}t[y*w+x]=s/n;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let q=Math.max(0,y-1);q<=Math.min(h-1,y+1);q++){s+=t[q*w+x];n++;}o[y*w+x]=s/n;}
  return o;}

/* Idea 1: plain background (paper, studio): per-pixel difference from the estimated background, soft strands */
function sgMatte(){let r=null;try{r=autoUniform();}catch(e){}if(!r)return null;r.mask.bg=r.bg;return r.mask;}

/* Idea 2: connected background: grow the background in from the picture border while neighbouring colours stay alike */
function sgFlood(){let r=null;try{r=autoSubject();}catch(e){}return r;}

/* Idea 3: colour statistics. The colours around the ring centre are the subject, the colours along the picture border are the
   background; every pixel is judged by which of the two its colour looks more like (with the distance to the ring as a gentle prior). */
function sgScore(I){if(I.sc!==undefined)return I.sc;const{w,h,N,d,cx,cy,R,ri}=I,K=20;
  /* k-means on a subsample of the pixels */
  const cen=new Float32Array(K*3),px=[];for(let i=0;i<N;i+=3)px.push(i);
  for(let c=0;c<K;c++){const i=px[Math.floor((c+.5)*px.length/K)];cen[c*3]=d[i*4];cen[c*3+1]=d[i*4+1];cen[c*3+2]=d[i*4+2];}
  const asg=new Uint8Array(N),near=(i)=>{let b=0,bd=1e9;for(let c=0;c<K;c++){const e=(d[i*4]-cen[c*3])**2+(d[i*4+1]-cen[c*3+1])**2+(d[i*4+2]-cen[c*3+2])**2;if(e<bd){bd=e;b=c;}}return b;};
  for(let it=0;it<6;it++){const s=new Float32Array(K*3),n=new Float32Array(K);
    for(const i of px){const c=near(i);s[c*3]+=d[i*4];s[c*3+1]+=d[i*4+1];s[c*3+2]+=d[i*4+2];n[c]++;}
    for(let c=0;c<K;c++)if(n[c]){cen[c*3]=s[c*3]/n[c];cen[c*3+1]=s[c*3+1]/n[c];cen[c*3+2]=s[c*3+2]/n[c];}}
  for(let i=0;i<N;i++)asg[i]=near(i);
  const fg=new Float32Array(K),bg=new Float32Array(K);let nf=0,nb=0;
  const rs=Math.max(2,ri*.85);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;
    if((x-cx)**2+(y-cy)**2<=rs*rs){fg[asg[i]]++;nf++;}
    if(x<3||y<3||x>=w-3||y>=h-3){bg[asg[i]]++;nb++;}}
  if(!nf||!nb)return I.sc=null;
  const sc=new Float32Array(N);
  for(let i=0;i<N;i++){const c=asg[i],f=(fg[c]+.5)/nf,b=(bg[c]+.5)/nb,p=f/(f+b),dist=Math.hypot(i%w-cx,((i/w)|0)-cy)/R,pr=dist<1.2?1:Math.max(.25,1.2/dist**1.5);sc[i]=.5+(p-.5)*pr*1.0+(dist<.6?.15:0);}
  /* smooth the score so single odd pixels do not matter */
  const t=new Float32Array(N),s2=new Float32Array(N),SR=2;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let q=Math.max(0,x-SR);q<=Math.min(w-1,x+SR);q++){s+=sc[y*w+q];n++;}t[y*w+x]=s/n;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let q=Math.max(0,y-SR);q<=Math.min(h-1,y+SR);q++){s+=t[q*w+x];n++;}s2[y*w+x]=s/n;}
  return I.sc=s2;}
function sgColours(I){const sc=sgScore(I);if(!sc)return null;const{w,h,N}=I,b=new Uint8Array(N);for(let i=0;i<N;i++)b[i]=sc[i]>.5?1:0;
  const o=sgTidy(b,I);if(!o)return null;return sgUp(sgSoft(o,w,h),I);}

/* colour gradient size of every grid pixel (0-255) */
function sgGrad(I){if(I.gr)return I.gr;const{w,h,N,d}=I,gr=new Uint8Array(N),ch=(i,c)=>d[i*4+c];
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;let m=0;
    for(let c=0;c<3;c++){const gx=ch(i+1,c)*2+ch(i+1-w,c)+ch(i+1+w,c)-ch(i-1,c)*2-ch(i-1-w,c)-ch(i-1+w,c),gy=ch(i+w,c)*2+ch(i+w-1,c)+ch(i+w+1,c)-ch(i-w,c)*2-ch(i-w-1,c)-ch(i-w+1,c);
      const v=(Math.abs(gx)+Math.abs(gy))/8;if(v>m)m=v;}
    gr[i]=Math.min(255,Math.round(m));}
  return I.gr=gr;}
/* Idea 4: edges. Seeds in the ring centre and along the picture border grow like water filling basins; the meeting line follows the strongest outline. */
function sgEdges(I,opt={}){const{w,h,N,cx,cy,ri,R}=I,rad=opt.rad,sc=opt.colour?sgScore(I):null;
  const gr=sgGrad(I);
  const lab=new Uint8Array(N),Q=Array.from({length:256},()=>[]),rs=Math.max(2,ri*.3);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;
    if((x-cx)**2+(y-cy)**2<=rs*rs){lab[i]=1;Q[0].push(i);}
    else if(x<2||y<2||x>=w-2||y>=h-2||(rad&&(x-cx)**2+(y-cy)**2>=(rad*R)**2)||(sc&&sc[i]<.15&&(x-cx)**2+(y-cy)**2>R*R)){lab[i]=2;Q[0].push(i);}}
  for(let lv=0;lv<256;){const q=Q[lv];if(!q.length){lv++;continue;}const i=q.pop(),x=i%w,l=lab[i];
    const nb=j=>{if(lab[j])return;lab[j]=l;Q[Math.max(lv,gr[j])].push(j);};
    if(x>0)nb(i-1);if(x<w-1)nb(i+1);if(i>=w)nb(i-w);if(i<N-w)nb(i+w);}
  const b=new Uint8Array(N);for(let i=0;i<N;i++)b[i]=lab[i]===1?1:0;
  const o=sgTidy(b,I);if(!o)return null;return sgUp(sgSoft(o,w,h),I);}

/* "Pop-out only": keep the part of a whole-subject mask that can show around the ring, and let the lower body vanish behind the border.
   Everything below a line a little under the ring centre is dropped, except hair-like thin parts are kept by the caller's choice (not here). */
function sgTop(m,I){const{W,H,k,cy,R}=I,lim=Math.round((cy+R*.3)/k),o=new Uint8Array(m.length);
  for(let y=0;y<Math.min(H,lim);y++)o.set(m.subarray(y*W,y*W+W),y*W);
  /* a short soft fade instead of a hard cut */
  const f=Math.max(2,Math.round(R*.06/k));for(let y=Math.max(0,lim-f);y<lim;y++){const a=(lim-y)/f;for(let x=0;x<W;x++)o[y*W+x]=Math.round(o[y*W+x]*a);}
  if(m.bg)o.bg=m.bg;return o;}

/* How plausible is a candidate? No picture of the answer exists, so look at what a good pop-out looks like:
   it follows real outlines, covers the ring centre, never runs off the picture border, and takes only a small share of the ring band. */
function sgFeatures(m,I){const{W,H,w,h,N,k,cx,cy,R,ri}=I,gr=sgGrad(I),b=new Uint8Array(N);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)b[y*w+x]=m[Math.min(H-1,Math.floor(y/k))*W+Math.min(W-1,Math.floor(x/k))]>=128?1:0;
  let area=0,cen=0,cenN=0,bor=0,borN=0,band=0,bandN=0,bs=0,bn=0,out=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,v=b[i],r=Math.hypot(x-cx,y-cy);area+=v;
    if(r<ri*.5){cenN++;cen+=v;}if(x<2||y<2||x>=w-2||y>=h-2){borN++;bor+=v;}
    if(r>ri&&r<=R){bandN++;band+=v;}if(r>R)out+=v;
    if(v&&x>0&&y>0&&x<w-1&&y<h-1&&(!b[i-1]||!b[i+1]||!b[i-w]||!b[i+w])){bs+=gr[i];bn++;}}
  return{edge:bn?bs/bn/255:0,centre:cenN?cen/cenN:0,border:borN?bor/borN:0,band:bandN?band/bandN:0,area:area/N,out:out/Math.max(1,bandN)};}
function sgPlausible(f,whole){let s=f.edge*3;
  if(f.centre<.85)s-=(.85-f.centre)*4;
  s-=f.border*6;
  if(f.area>.6)s-=(f.area-.6)*4;
  if(!whole){s-=2.5*Math.max(0,f.out-.05);if(f.band>.4)s-=(f.band-.4)*3;if(f.band<.02)s-=(.02-f.band)*25;}
  return s;}
/* all methods, as {id,name,kind,mask}; "pop-out" candidates keep only what can show around the ring, "whole" ones select the whole figure */
const SG_METHODS=[
  {id:'edges',name:'Outlines',whole:I=>sgEdges(I)},
  {id:'local',name:'Outlines near the ring',pop:I=>sgEdges(I,{rad:1.7})},
  {id:'localC',name:'Outlines and colours near the ring',pop:I=>sgEdges(I,{rad:1.7,colour:1})},
  {id:'edgesC',name:'Outlines and colours',whole:I=>sgEdges(I,{colour:1})},
  {id:'colour',name:'Colour match',whole:I=>sgColours(I)},
  {id:'flood',name:'Connected background',whole:()=>sgFlood()},
  {id:'matte',name:'Plain background',whole:()=>sgMatte()}];
function sgCandidates(){const I=sgInput(),out=[];
  for(const M of SG_METHODS){let m=null;try{m=(M.whole||M.pop)(I);}catch(e){}if(!m)continue;
    if(!m.bg&&window.SG_SNAP!==false){try{m=sgSnap(m);}catch(e){}}
    if(M.whole){out.push({id:M.id,name:M.name,kind:'whole',mask:m});const t=sgTop(m,I);out.push({id:M.id+'-top',name:M.name,kind:'pop',mask:t});}
    else out.push({id:M.id,name:M.name,kind:'pop',mask:m});}
  for(const c of out){c.feat=sgFeatures(c.mask,I);c.score=sgPlausible(c.feat,c.kind==='whole');}
  return{I,cands:out};}
/* two of each kind, best first, never two that are nearly the same mask */
function sgPick(cands,n=4){const same=(a,b)=>{let i=0,u=0;const A=a.mask,B=b.mask;for(let x=0;x<A.length;x+=7){const p=A[x]>=128,q=B[x]>=128;if(p||q)u++;if(p&&q)i++;}return u?i/u:1;};
  const pick=[],tryAdd=c=>{if(c&&pick.length<n&&!pick.includes(c)&&pick.every(p=>same(p,c)<.92))pick.push(c);};
  const pop=cands.filter(c=>c.kind==='pop').sort((a,b)=>b.score-a.score),whole=cands.filter(c=>c.kind==='whole'&&c.score>0).sort((a,b)=>b.score-a.score);
  const best=pop[0];if(best)tryAdd(best);
  for(let i=0;i<2;i++){tryAdd(whole[i]);}
  for(const c of pop)tryAdd(c);for(const c of whole)tryAdd(c);
  return pick;}
