/* ---------- ring textures: generated in small slices so the UI never freezes ---------- */
const TEX=[['none','None'],['stone','Stone'],['scratched','Scratched metal'],['hammered','Hammered'],['wood','Wood'],['liquid','Liquid'],['energy','Energy']];
const TEX_AMT={stone:.85,scratched:.85,hammered:.8,wood:.65,liquid:.6,energy:.8};
const TEXMODE={stone:'overlay',scratched:'overlay',hammered:'overlay',wood:'overlay',liquid:'overlay',energy:'screen'};
const fixTex=t=>TEXMODE[t]?t:(t==='marble'?'stone':'none');
const texCache=new Map(),texJobs=new Map(),offMap=new Map();
function hash(x,y,s){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s,1274126177);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;}
function vn(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,s){let t=0,a=.5;for(let i=0;i<4;i++){t+=a*vn(x,y,s+i);x=x*2+17;y=y*2+31;a/=2;}return t/.9375;}
function texPx(type,u,v,px,py,seed){
  if(type==='stone'){const t=fbm(u*6,v*6,seed),m=fbm(u*22+5,v*22,seed+2),grain=hash(px,py,seed)-.5,sp=vn(u*140,v*140,seed+4),
      crack=Math.pow(1-Math.abs(2*fbm(u*4+t*1.5,v*4+t*1.5,seed+9)-1),24),pit=Math.pow(vn(u*64,v*64,seed+6),10);
    const L=128+(t-.5)*80+(m-.5)*70+grain*60+(sp-.5)*50-crack*130-pit*90;return[L,L,L*1.02];}
  if(type==='scratched'){const a=vn(u*4,v*420,seed),b=vn(u*9+3,v*700,seed+1),c=fbm(u*3,v*3,seed+2),L=128+(a-.5)*80+(b-.5)*55+(c-.5)*50;return[L,L,L*1.03];}
  if(type==='hammered'){const G=9,gx=u*G,gy=v*G,ix=Math.floor(gx),iy=Math.floor(gy);let best=9,bx=0,by=0;
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=ix+i,cy=iy+j,dx=gx-(cx+hash(cx,cy,seed)*.8+.1),dy=gy-(cy+hash(cx,cy,seed+1)*.8+.1),d2=dx*dx+dy*dy;if(d2<best){best=d2;bx=dx;by=dy;}}
    const r=Math.sqrt(best),R0=.62;let L=128+(hash(px,py,seed)-.5)*26+(fbm(u*10,v*10,seed+3)-.5)*40;
    if(r<R0)L+=(bx+by)*.7/R0*120*(r/R0>.2?1:r/R0*5);L-=60*Math.exp(-Math.pow((r-R0)/.07,2));return[L,L,L];}
  if(type==='wood'){const w=fbm(u*2.2,v*50,seed),q=fbm(u*5,v*5,seed+3),ring=Math.sin((v*26+q*2.4+w*1.2)*TAU)*.5+.5,fine=vn(u*8,v*300,seed+5),L=128+(ring-.5)*80+(fine-.5)*50+(w-.5)*50;return[L*1.05,L,L*.9];}
  if(type==='liquid'){const q=fbm(u*4,v*4,seed),w=fbm(u*4+q*3+1.7,v*4+q*3+9.2,seed+3),L=128+Math.sin(w*Math.PI*5)*105;return[L*.92,L,Math.min(255,L*1.08)];}
  return[128,128,128];}
function texRow(type,seed,py,d,N){const v=py/N;for(let px=0;px<N;px++){const[r,g,b]=texPx(type,px/N,v,px,py,seed),i=(py*N+px)*4;d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;}}
/* hand-drawn extras on top of the noise: scratches and gouges */
function scratchPost(x,N,seed){let s=(seed*9301+49297)>>>0;const r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};x.lineCap='round';
  for(let i=0;i<340;i++){const a=r()<.62?(r()-.5)*.3:(r()-.5)*Math.PI,len=14+r()*r()*340,cx=r()*N,cy=r()*N,dx=Math.cos(a)*len/2,dy=Math.sin(a)*len/2,al=.06+r()*.3;
    x.strokeStyle=r()<.5?'rgba(255,255,255,'+al+')':'rgba(0,0,0,'+al+')';x.lineWidth=.5+r()*1.1;x.beginPath();x.moveTo(cx-dx,cy-dy);x.lineTo(cx+dx,cy+dy);x.stroke();}
  for(let i=0;i<16;i++){const a=(r()-.5)*1.2,len=40+r()*130,cx=r()*N,cy=r()*N,dx=Math.cos(a)*len/2,dy=Math.sin(a)*len/2;
    x.lineWidth=1.8+r()*1.6;x.strokeStyle='rgba(0,0,0,.5)';x.beginPath();x.moveTo(cx-dx,cy-dy);x.lineTo(cx+dx,cy+dy);x.stroke();
    x.lineWidth=.8;x.strokeStyle='rgba(255,255,255,.55)';x.beginPath();x.moveTo(cx-dx,cy-dy+1.6);x.lineTo(cx+dx,cy+dy+1.6);x.stroke();}}
const TEXPOST={scratched:scratchPost};
function texRequest(type,seed){const key=type+':'+seed;if(texCache.has(key))return texCache.get(key);
  if(texJobs.has(key))return null;
  const N=512,cv=mk();cv.width=cv.height=N;const x=cv.getContext('2d'),id=x.createImageData(N,N);let py=0;
  texJobs.set(key,1);busy(1,'Generating texture…');
  const step=()=>{const t0=performance.now();while(py<N&&performance.now()-t0<9)texRow(type,seed,py++,id.data,N);
    if(py<N){setTimeout(step,0);return;}
    x.putImageData(id,0,0);if(TEXPOST[type])TEXPOST[type](x,N,seed);
    texCache.set(key,cv);texJobs.delete(key);if(texCache.size>10)texCache.delete(texCache.keys().next().value);
    ringVer++;busy(-1);draw();thumbsSoon(true);};
  setTimeout(step,0);return null;}
/* The ring is expensive to draw but only changes when a ring setting, the size or the margin changes,
   so it is rendered into a cached layer and reused while you pan, zoom or select. */
const ringCache=new Map();let ringVer=0;
function ringLayer(S,R,c){let e=ringCache.get(S);
  if(!e){e={key:'',cv:mk()};e.cv.width=e.cv.height=S;ringCache.set(S,e);if(ringCache.size>4)ringCache.delete(ringCache.keys().next().value);}
  const key=R.toFixed(2)+'|'+RING_KEYS.map(k=>st[k]).join(',')+'|'+ringVer;
  if(e.key!==key){const x=e.cv.getContext('2d');x.clearRect(0,0,S,S);drawRing(x,c,R,st);e.key=key;}
  return e.cv;}
function off(i,S){const key=i+'_'+S;let o=offMap.get(key);if(!o){o=mk();o.width=o.height=S;offMap.set(key,o);if(offMap.size>24)offMap.delete(offMap.keys().next().value);}return o;}
/* Energy is drawn, not tiled: real branching lightning (midpoint displacement) that arcs around the ring */
function drawBolts(l,c,R,ri,p){const w=R-ri,lo=ri+w*.07,hi=R-w*.07,nb=Math.max(1,Math.round(p.eAmt)),len=p.eLen;let rnd=()=>0;
  const seedRng=k=>{let z=(p.seed*2654435761+k*40503)>>>0;rnd=()=>{z=(Math.imul(z,1664525)+1013904223)>>>0;return z/4294967296;};};
  l.save();l.translate(c,c);l.rotate(p.texRot||0);l.translate(-c,-c);l.strokeStyle='#fff';l.lineCap='round';l.lineJoin='round';
  const clampP=([x,y])=>{const dx=x-c,dy=y-c,r=Math.hypot(dx,dy),k=clamp(r,lo,hi)/(r||1);return[c+dx*k,c+dy*k];};
  const disp=(a,b,amp,lv)=>{if(lv===0)return[a,b];const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,o=(rnd()-.5)*2*amp,
      pp=clampP([m[0]-dy/L*o,m[1]+dx/L*o]);return[...disp(a,pp,amp*.56,lv-1).slice(0,-1),...disp(pp,b,amp*.56,lv-1)];};
  const bolt=(P0,P1,wid,depth)=>{const L=Math.hypot(P1[0]-P0[0],P1[1]-P0[1]),pts=disp(P0,P1,L*.2,6);
    for(const[k,al]of[[3.2,.18],[1.8,.35],[1,1]]){l.globalAlpha=al;l.lineWidth=wid*k;l.beginPath();pts.forEach(([x,y],i)=>i?l.lineTo(x,y):l.moveTo(x,y));l.stroke();}l.globalAlpha=1;
    if(depth<2)for(let i=4;i<pts.length-6;i++)if(rnd()<.045){const d=Math.atan2(P1[1]-P0[1],P1[0]-P0[0])+(rnd()<.5?-1:1)*(.5+rnd()*.5),fl=L*(.25+.2*rnd()),
        a=pts[i],e=clampP([a[0]+Math.cos(d)*fl,a[1]+Math.sin(d)*fl]);bolt(a,e,wid*.55,depth+1);}};
  for(let b=0;b<nb;b++){seedRng(b+1);const a0=rnd()*TAU,span=(.7+rnd()*.7)*len,t0=.15+.7*rnd(),t1=.15+.7*rnd();
    bolt(pol(c,a0,ri+w*t0),pol(c,a0+span,ri+w*t1),Math.max(1.6,w*.075),0);}
  l.restore();}
function drawRing(ctx,c,R,p){
  const want=p.tex&&p.tex!=='none'&&p.texAmt>0,en=p.tex==='energy',TX=want&&!en?texRequest(p.tex,p.seed):null,T=en?want:!!TX;
  if(!T&&!p.gradOn)return drawRingBase(ctx,c,R,p);
  const ri=R*(1-p.width),S=ctx.canvas.width,O=off(0,S),L=off(1,S),o=O.getContext('2d'),l=L.getContext('2d');
  o.clearRect(0,0,S,S);drawRingBase(o,c,R,p.gradOn?{...p,color:'#808080'}:p);
  if(p.gradOn){const a=p.gAng,dx=Math.cos(a)*R,dy=Math.sin(a)*R,g=l.createLinearGradient(c-dx,c-dy,c+dx,c+dy);g.addColorStop(0,p.g1);g.addColorStop(1,p.g2);
    l.clearRect(0,0,S,S);l.fillStyle=g;l.fillRect(0,0,S,S);l.globalCompositeOperation='destination-in';l.drawImage(O,0,0);l.globalCompositeOperation='destination-out';l.beginPath();l.arc(c,c,ri,0,TAU);l.fill();l.globalCompositeOperation='source-over';
    o.globalCompositeOperation='overlay';o.drawImage(L,0,0);o.globalCompositeOperation='source-over';}
  if(T){
    l.clearRect(0,0,S,S);
    if(en)drawBolts(l,c,R,ri,p);
    else{const cell=2*R/p.texDens,E=R*1.45,i0=Math.floor((c-E-(c-R))/cell),i1=Math.ceil((c+E-(c-R))/cell);
      l.save();l.translate(c,c);l.rotate(p.texRot||0);l.translate(-c,-c);
      for(let i=i0;i<i1;i++)for(let j=i0;j<i1;j++){const fx=((i%2)+2)%2,fy=((j%2)+2)%2;l.save();l.translate(c-R+(i+fx)*cell,c-R+(j+fy)*cell);l.scale(fx?-1:1,fy?-1:1);l.drawImage(TX,0,0,cell,cell);l.restore();}
      l.restore();}
    l.globalCompositeOperation='destination-in';l.drawImage(O,0,0);l.globalCompositeOperation='destination-out';l.beginPath();l.arc(c,c,ri,0,TAU);l.fill();l.globalCompositeOperation='source-over';
    if(en){/* energy keeps your colour, even black: a contrasting halo (white for dark bolts, black for light ones) is drawn around it, and the ring colour is untouched */
      const[er,eg,eb]=rgb(p.eCol),dark=.3*er+.59*eg+.11*eb<140,H=off(6,S),h=H.getContext('2d'),a=p.texAmt,
        pass=(col,alpha,blur)=>{h.globalCompositeOperation='source-over';h.clearRect(0,0,S,S);
          if(blur&&'filter' in h){h.filter='blur('+blur+'px)';h.drawImage(L,0,0);h.drawImage(L,0,0);h.filter='none';}else h.drawImage(L,0,0);
          h.globalCompositeOperation='source-in';h.fillStyle=col;h.fillRect(0,0,S,S);h.globalCompositeOperation='destination-in';h.drawImage(O,0,0);
          o.globalAlpha=Math.min(1,a*alpha);o.drawImage(H,0,0);};
      pass(dark?'#ffffff':'#000000',dark?.9:.6,Math.max(1.2,R*.012));
      pass(dark?'#ffffff':'#000000',dark?1:.7,Math.max(.6,R*.0035));
      if(!dark)pass(p.eCol,.9,Math.max(1.5,R*.014));
      pass(p.eCol,1.5,0);o.globalAlpha=1;}
    else{o.globalCompositeOperation=TEXMODE[p.tex];o.globalAlpha=p.texAmt;o.drawImage(L,0,0);o.globalAlpha=1;o.globalCompositeOperation='source-over';}}
  ctx.drawImage(O,0,0);
}
