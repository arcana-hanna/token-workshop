/* ---------- Background layer ----------
   Three layers: Background (bottom, recolourable) - the picture behind the ring - the pop-out (top).
   The background has its own mask. It may only use pixels the pop-out does not: the effective background is
   backgroundMask x (1 - popOutMask), worked out at render time, so nothing the user painted is ever lost.
   While the Background step is open, st.mask is the BACKGROUND mask (so Wand, Brush, Lasso and Auto work unchanged)
   and the pop-out mask waits in st.popM; the pop-out is drawn from a frozen copy (st.popFrozen). */
const BG_DEFAULT={bgMode:'keep',bgCol:'#24345f',bgG1:'#1f3a7a',bgG2:'#0a0f24',bgGAng:Math.PI/2,bgGMid:.5,bgBlur:40,bgBri:0,bgSat:0,bgEdge:20};
const bgActive=()=>st.bgMode!=='keep'||st.bgBri!==0||st.bgSat!==0;
const popMask=()=>st.act==='bg'?st.popM:st.mask;
const bgMaskArr=()=>st.act==='bg'?st.mask:st.bgM;
const popCount=()=>st.act==='bg'?st.popN:st.selCount;
const invMask=m=>{const o=new Uint8Array(m.length);for(let i=0;i<m.length;i++)o[i]=255-m[i];return o;};

/* a copy of the pop-out as it is drawn, so the Background step can show it while editing the other mask */
function snapPop(){refreshPop();const x=sizeTo(st.popFrozen,st.sw,st.sh);x.clearRect(0,0,st.sw,st.sh);x.drawImage(st.popCv,0,0);st.popN=st.selCount;
  const t=sizeTo(st.popTint,st.sw,st.sh);t.globalCompositeOperation='source-over';t.clearRect(0,0,st.sw,st.sh);t.drawImage(st.popCv,0,0);
  t.globalCompositeOperation='source-in';t.fillStyle='#8a5cff';t.fillRect(0,0,st.sw,st.sh);t.globalCompositeOperation='source-over';}
function freezePop(){
  if(st.act!=='bg'){snapPop();return;}
  const cur=st.mask;st.mask=st.popM;st.act='pop';maskChanged();st.popDirty=true;
  try{snapPop();}finally{st.mask=cur;st.act='bg';maskChanged();}}
function setAct(which){if(!st.src||st.act===which)return;wand=null;eSess=null;
  if(which==='bg'){freezePop();st.popM=st.mask;st.mask=st.bgM;st.act='bg';}
  else{st.bgM=st.mask;st.mask=st.popM;st.popM=null;st.act='pop';}
  maskChanged();}
/* run something with the pop-out mask active (exports, saving), whatever step is open */
function withPop(fn){if(st.act!=='bg')return fn();
  const b=st.mask;st.bgM=b;st.mask=st.popM;st.act='pop';maskChanged();
  try{return fn();}finally{st.popM=st.mask;st.mask=b;st.act='bg';maskChanged();}}

/* how much of each pixel is replaced (0..1), at mask resolution */
let bgA={key:'',a:null};
function bgAlpha(){const pm=popMask(),bm=bgMaskArr(),w=st.sw,h=st.sh,key=st.bgV+'|'+st.popV+'|'+st.bgEdge+'|'+w+'x'+h;
  if(bgA.key===key&&bgA.a)return bgA.a;
  /* a = how much is replaced on screen (edge-blended); a.raw = the marked coverage itself, used to take the old background out of edge pixels */
  const r=st.bgEdge/100*Math.max(w,h)*.012,src=r>=.5?blurMask(bm,w,h,r):bm,a=new Float32Array(w*h),raw=new Float32Array(w*h);let any=false;
  for(let i=0;i<a.length;i++){const q=1-pm[i]/255,r0=bm[i]/255*q,v=Math.max(src[i]/255*q,r0);raw[i]=r0;a[i]=v;if(v>.002)any=true;}
  a.any=any;a.raw=raw;bgA={key,a};return a;}

function blurCanvas(base,amount){const W=base.width,H=base.height,r=Math.max(1,amount/100*.06*Math.max(W,H)),
    k=Math.max(2,Math.round(Math.sqrt(r*2))),o=mk();o.width=W;o.height=H;
  let cur=base;for(let pass=0;pass<2;pass++){const s=mk();s.width=Math.max(2,Math.ceil(W/(k*(pass?1:2))));s.height=Math.max(2,Math.ceil(H/(k*(pass?1:2))));
    const x=s.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(cur,0,0,s.width,s.height);cur=s;}
  const x=o.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(cur,0,0,W,H);return o;}

function bgComposite(base){const A=bgAlpha();if(!A.any)return base;const R0=A.raw;
  const W=base.width,H=base.height,out=mk();out.width=W;out.height=H;const x=out.getContext('2d',{willReadFrequently:true});x.drawImage(base,0,0);
  const id=x.getImageData(0,0,W,H),d=id.data,sw=st.sw,sh=st.sh,sx=sw/W,sy=sh/H,mode=st.bgMode,bf=1+st.bgBri/100,sf=1+st.bgSat/100,T=[0,0,0],
    tone=(r,g,b)=>{r*=bf;g*=bf;b*=bf;const l=.299*r+.587*g+.114*b;r=l+(r-l)*sf;g=l+(g-l)*sf;b=l+(b-l)*sf;
      T[0]=r<0?0:r>255?255:r;T[1]=g<0?0:g>255?255:g;T[2]=b<0?0:b>255?255:b;return T;};
  /* the colour of the old background, from pixels that are surely background (used to take it out of soft hair edges) */
  let B=null;{const rs=[],gs=[],bs=[],step=Math.max(1,Math.floor(sw*sh/4000));
    for(let i=0;i<A.length;i+=step)if(A[i]>.97){const px=Math.min(W-1,Math.round(((i%sw)+.5)/sx-.5)),py=Math.min(H-1,Math.round((((i/sw)|0)+.5)/sy-.5)),j=(py*W+px)*4;if(d[j+3]>250){rs.push(d[j]);gs.push(d[j+1]);bs.push(d[j+2]);}}
    if(rs.length>=20)B=[median(rs),median(gs),median(bs)];}
  let C=null,LUT=null,FB=null;
  if(mode==='colour')C=tone(...hexToRgb(st.bgCol)).slice();
  else if(mode==='gradient'){const c1=hexToRgb(st.bgG1),c2=hexToRgb(st.bgG2),m=clamp(st.bgGMid,.05,.95);LUT=[];
    for(let i=0;i<256;i++){const t=i/255,k=t<m?.5*t/m:.5+.5*(t-m)/(1-m),c=[0,1,2].map(ch=>c1[ch]+(c2[ch]-c1[ch])*k);LUT.push(tone(c[0],c[1],c[2]).slice());}}
  else if(mode==='blur'){const bl=blurCanvas(base,st.bgBlur);FB=bl.getContext('2d',{willReadFrequently:true}).getImageData(0,0,W,H).data;}
  const ca=Math.cos(st.bgGAng),sa=Math.sin(st.bgGAng),norm=Math.abs(ca)+Math.abs(sa)||1;
  for(let y=0;y<H;y++){const fy=Math.min(sh-1.001,Math.max(0,(y+.5)*sy-.5)),y0=fy|0,ty=fy-y0;
    for(let xx=0;xx<W;xx++){const fx=Math.min(sw-1.001,Math.max(0,(xx+.5)*sx-.5)),x0=fx|0,tx=fx-x0,i=y0*sw+x0,
      a=(A[i]*(1-tx)+A[i+1]*tx)*(1-ty)+(A[i+sw]*(1-tx)+A[i+sw+1]*tx)*ty,
      a0=Math.min(a,(R0[i]*(1-tx)+R0[i+1]*tx)*(1-ty)+(R0[i+sw]*(1-tx)+R0[i+sw+1]*tx)*ty);
      if(a<.002)continue;
      const j=(y*W+xx)*4,pa=d[j+3],pr=d[j],pg=d[j+1],pb=d[j+2];
      if(mode==='clear'){let r=pr,g=pg,b=pb;
        if(B&&pa>250&&a<.95){const w=Math.min(1,(.95-a)/.3);r+=(clamp((pr-a*B[0])/(1-a),0,255)-pr)*w;g+=(clamp((pg-a*B[1])/(1-a),0,255)-pg)*w;b+=(clamp((pb-a*B[2])/(1-a),0,255)-pb)*w;}
        d[j]=r;d[j+1]=g;d[j+2]=b;d[j+3]=pa*(1-a);continue;}
      let F;
      if(mode==='colour')F=C;else if(mode==='gradient'){const t=.5+(((xx+.5)/W-.5)*ca+((y+.5)/H-.5)*sa)/norm;F=LUT[Math.round(clamp(t,0,1)*255)];}
      else if(mode==='blur')F=tone(FB[j],FB[j+1],FB[j+2]);else F=tone(pr,pg,pb);
      let r,g,b;
      if(mode==='keep'){r=pr+(F[0]-pr)*a;g=pg+(F[1]-pg)*a;b=pb+(F[2]-pb)*a;d[j]=r;d[j+1]=g;d[j+2]=b;continue;}
      /* old background colour is taken out of soft edge pixels first, then the new one takes over as coverage grows */
      /* subject colour = (pixel - old background x raw coverage) / (1 - raw coverage), then mixed with the new backdrop at the on-screen coverage */
      let tr=pr,tg=pg,tb=pb;if(B&&pa>250&&a0>.003){const s=a0>=.98?0:(1-a)/(1-a0);
        tr=clamp((pr-a0*B[0])*s,0,255)+F[0]*a;tg=clamp((pg-a0*B[1])*s,0,255)+F[1]*a;tb=clamp((pb-a0*B[2])*s,0,255)+F[2]*a;
        if(a0>=.98){tr=F[0];tg=F[1];tb=F[2];}}
      else{tr=pr*(1-a)+F[0]*a;tg=pg*(1-a)+F[1]*a;tb=pb*(1-a)+F[2]*a;}
      const k=a<=.8?0:a>=1?1:(a-.8)/.2,k2=k*k*(3-2*k);r=tr+(F[0]-tr)*k2;g=tg+(F[1]-tg)*k2;b=tb+(F[2]-tb)*k2;
      if(pa<255){const al=pa+(255-pa)*a;r=(r*pa+F[0]*(255-pa)*a)/al;g=(g*pa+F[1]*(255-pa)*a)/al;b=(b*pa+F[2]*(255-pa)*a)/al;d[j+3]=al;}
      d[j]=r<0?0:r>255?255:r;d[j+1]=g<0?0:g>255?255:g;d[j+2]=b<0?0:b>255?255:b;}}
  x.putImageData(id,0,0);return out;}

/* the picture as drawn behind the ring, with the background layer applied */
function artSrc(hi){const base=picSrc(hi);if(!bgActive()||!st.bgM&&st.act!=='bg')return base;
  const key=[st.bgMode,st.bgCol,st.bgG1,st.bgG2,st.bgGAng,st.bgGMid,st.bgBlur,st.bgBri,st.bgSat,st.bgEdge,st.bgV,st.popV].join('|');
  return cached(hi?'artF':'artW',key,base,()=>bgComposite(base));}

/* Auto in the Background step: everything that is not the subject */
function autoBackground(){if(!st.src)return;busy(1,'Finding background…');
  setTimeout(()=>{let m=null;try{const s=autoUniform();if(s)m=invMask(s.mask);}catch(e){}
    busy(-1);if(!m){m=invMask(popMask());toast('No plain backdrop found, so everything except the pop-out was marked as background.');}
    else toast('Background marked. Fix anything wrong with Select, Lasso or Brush, or Undo.');
    st.mask=m;maskChanged();st.bgMode=st.bgMode==='keep'?'colour':st.bgMode;syncUI();draw();commit();},30);}
function bgFromPopout(){if(!st.src)return;st.mask=invMask(popMask());maskChanged();draw();commit();toast('Everything except the pop-out is now background.');}
