/* ---------- picture adjustments (brightness, contrast, saturation) and halo removal ----------
   Both are non-destructive: they build derived canvases from the original pixels and are cached by their settings. */
const ADJ_DEFAULT={bri:0,con:0,sat:0,defr:0,bgC:'#808080',bgAuto:true};
const adjCache={};
const adjNeutral=()=>!st.bri&&!st.con&&!st.sat;
function adjustCanvas(src){const W=src.width,Hh=src.height,out=mk();out.width=W;out.height=Hh;const x=out.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0);
  const id=x.getImageData(0,0,W,Hh),d=id.data,bf=1+st.bri/100,cf=1+st.con/100,sf=1+st.sat/100;
  for(let i=0;i<d.length;i+=4){let r=d[i]*bf,g=d[i+1]*bf,b=d[i+2]*bf;
    r=(r-128)*cf+128;g=(g-128)*cf+128;b=(b-128)*cf+128;
    const l=.299*r+.587*g+.114*b;r=l+(r-l)*sf;g=l+(g-l)*sf;b=l+(b-l)*sf;
    d[i]=r<0?0:r>255?255:r;d[i+1]=g<0?0:g>255?255:g;d[i+2]=b<0?0:b>255?255:b;}
  x.putImageData(id,0,0);return out;}
function cached(slot,key,base,make){const c=adjCache[slot];if(c&&c.key===key&&c.base===base)return c.cv;const cv=make();adjCache[slot]={key,base,cv};return cv;}
/* the picture as drawn behind the ring */
function picSrc(hi){const base=hi?st.full:st.src;if(adjNeutral())return base;
  return cached(hi?'picF':'picW',st.bri+','+st.con+','+st.sat,base,()=>adjustCanvas(base));}
/* the pop-out source: like the picture, but with background colour removed from soft (partly transparent) edge pixels */
function unmixCanvas(base){const W=base.width,Hh=base.height,out=mk();out.width=W;out.height=Hh;const x=out.getContext('2d',{willReadFrequently:true});x.drawImage(base,0,0);
  const id=x.getImageData(0,0,W,Hh),d=id.data,m=st.mask,mw=st.sw,mh=st.sh,gbg=hexToRgb(st.bgC),k=st.defr,sx=mw/W,sy=mh/Hh,local=st.bgAuto,
    DIRS=[[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]],bgc=[0,0,0],rs=[],gs=[],bs=[];
  /* the background right next to this pixel: the first unselected pixel found in each of 8 directions (median of the hits) */
  const localBg=(px,py)=>{rs.length=gs.length=bs.length=0;
    for(const[dx,dy]of DIRS)for(let s=2;s<=14;s++){const qx=Math.round(px+dx*s),qy=Math.round(py+dy*s);if(qx<0||qy<0||qx>=mw||qy>=mh)break;
      if(m[qy*mw+qx]===0){const hx=Math.min(W-1,Math.round((qx+.5)/sx-.5)),hy=Math.min(Hh-1,Math.round((qy+.5)/sy-.5)),j=(hy*W+hx)*4;rs.push(d0[j]);gs.push(d0[j+1]);bs.push(d0[j+2]);break;}}
    if(rs.length<3)return gbg;bgc[0]=median(rs);bgc[1]=median(gs);bgc[2]=median(bs);return bgc;},
    d0=Uint8ClampedArray.from(d);
  for(let y=0;y<Hh;y++){const fy=Math.max(0,Math.min(mh-1.001,(y+.5)*sy-.5)),y0=fy|0,ty=fy-y0;
    for(let xx=0;xx<W;xx++){const fx=Math.max(0,Math.min(mw-1.001,(xx+.5)*sx-.5)),x0=fx|0,tx=fx-x0,i=y0*mw+x0,
      a=m[i],b=m[i+1],c=m[i+mw],e=m[i+mw+1];
      if((a===0&&b===0&&c===0&&e===0)||(a===255&&b===255&&c===255&&e===255))continue;
      const al=((a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+e*tx)*ty)/255;if(al<.04||al>.985)continue;
      const j=(y*W+xx)*4,t=clamp((al-.12)/.4,0,1),w8=k*t*t*(3-2*t),bg=local?localBg(fx,fy):gbg;
      for(let ch=0;ch<3;ch++){const C=d[j+ch],F=clamp((C-(1-al)*bg[ch])/al,0,255);d[j+ch]=C+(F-C)*w8;}}}
  x.putImageData(id,0,0);return out;}
function popSrc(hi){let base=hi?st.full:st.src;
  if(st.defr>0&&st.partial>0){const key=st.maskVer+','+st.defr+','+st.bgC;base=cached(hi?'unF':'unW',key,base,()=>unmixCanvas(base));
    if(adjNeutral())return base;return cached(hi?'unaF':'unaW',key+'|'+st.bri+','+st.con+','+st.sat,base,()=>adjustCanvas(base));}
  return picSrc(hi);}
/* Match to ring: nudge brightness and saturation so the picture sits better against the ring */
function lumSat(cv){const t=mk();t.width=t.height=48;const x=t.getContext('2d',{willReadFrequently:true});x.drawImage(cv,0,0,48,48);const d=x.getImageData(0,0,48,48).data;let l=0,s=0,n=0;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<200)continue;const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);l+=.299*r+.587*g+.114*b;s+=mx?(mx-mn)/mx:0;n++;}
  return n?{l:l/n,s:s/n}:{l:128,s:.3};}
function matchToRing(){if(!st.src)return;const S=128,g=geom(S,effPad()),ring=lumSat(ringLayer(S,g.R,g.c)),pic=lumSat(st.src);
  st.bri=Math.round(clamp((ring.l/Math.max(20,pic.l)-1)*60,-40,40));
  st.sat=Math.round(clamp((ring.s/Math.max(.05,pic.s)-1)*40,-30,30));
  st.popDirty=true;syncUI();draw();commit();toast('Picture matched to the ring. Fine-tune with the sliders, or Reset.');}
