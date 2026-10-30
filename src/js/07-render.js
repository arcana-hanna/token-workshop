/* ---------- compositing ---------- */
function render(ctx,S,o={}){
  ctx.clearRect(0,0,S,S);if(!st.src)return;
  const pad=o.pad??effPad(),g=geom(S,pad),R=g.R,c=g.c,w=R*st.width,ri=R-w,clipR=ri+w*.3,img=picSrc(!!o.hi);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  /* on-screen only: Isolate shows just the pop-out; in Move the pop-out turns see-through so the ring beneath is visible */
  const prev=!o.clean&&st.prev,iso=!o.clean&&st.iso&&!prev,ghost=!o.clean&&!iso&&!prev&&st.tool==='move',L=o.layer,RC=iso||L==='art'||L==='pop'?null:ringLayer(S,R,c);
  if(!iso&&L!=='pop'){
    if(st.bgOn&&L!=='ring'){ctx.beginPath();ctx.arc(c,c,clipR,0,TAU);ctx.fillStyle=st.bg;ctx.fill();}
    if(L!=='ring'){ctx.save();ctx.beginPath();ctx.arc(c,c,clipR,0,TAU);ctx.clip();ctx.save();applyT(ctx,g);ctx.drawImage(img,0,0,st.sw,st.sh);ctx.restore();ctx.restore();}
    if(RC)ctx.drawImage(RC,0,0);}
  if(L!=='ring'&&L!=='art'&&(st.popOn||iso||L==='pop')&&st.selCount>0){
    const P=o.hi?hiPop():(refreshPop(),st.popCv);
    if(st.shadow>0&&!iso&&!ghost&&!L){/* the shadow is clipped to the ring: it never darkens the picture or the empty canvas */
      const SH=off(4,S),sx=SH.getContext('2d');sx.globalCompositeOperation='source-over';sx.clearRect(0,0,S,S);
      sx.save();sx.shadowColor='rgba(0,0,0,'+(.6*st.shadow)+')';sx.shadowBlur=R*.05*(.4+st.shadow);sx.shadowOffsetY=R*.02;applyT(sx,g);sx.drawImage(P,0,0,st.sw,st.sh);sx.restore();
      sx.globalCompositeOperation='destination-out';sx.save();applyT(sx,g);sx.drawImage(P,0,0,st.sw,st.sh);sx.restore();
      sx.globalCompositeOperation='destination-in';sx.drawImage(RC,0,0);sx.globalCompositeOperation='source-over';ctx.drawImage(SH,0,0);}
    ctx.save();if(ghost)ctx.globalAlpha=.4;applyT(ctx,g);ctx.drawImage(P,0,0,st.sw,st.sh);ctx.restore();}
  if(!o.clean&&!prev){
    if(st.showSel&&st.selCount>0&&!iso)selOverlay(ctx,g,S);
    if(st.tool==='brush'&&st.hover&&!st.space){const r=brushR()*g.sc,sub=curMode()==='sub';ctx.save();ctx.beginPath();ctx.arc(st.hover.x,st.hover.y,r,0,TAU);
      ctx.fillStyle=sub?'rgba(255,69,58,.22)':'rgba(48,209,88,.22)';ctx.fill();ctx.lineWidth=2.5/st.vz;ctx.strokeStyle='rgba(0,0,0,.6)';ctx.stroke();ctx.lineWidth=1.2/st.vz;ctx.strokeStyle='#fff';ctx.stroke();ctx.restore();}
    if(st.maskView&&st.selCount>=0){refreshSoft();ctx.save();ctx.fillStyle='#000';ctx.fillRect(-1e5,-1e5,2e5,2e5);applyT(ctx,g);ctx.drawImage(st.softCv,0,0,st.sw,st.sh);ctx.restore();}
    if(st.kc&&st.tool!=='brush'&&st.tool!=='move'&&document.activeElement===cv){const r=S/45/st.vz;ctx.save();ctx.lineCap='round';
      for(const[w,c]of[[3.2,'rgba(0,0,0,.7)'],[1.5,'#fff']]){ctx.lineWidth=w/st.vz;ctx.strokeStyle=c;ctx.beginPath();ctx.moveTo(st.kc.x-r,st.kc.y);ctx.lineTo(st.kc.x+r,st.kc.y);ctx.moveTo(st.kc.x,st.kc.y-r);ctx.lineTo(st.kc.x,st.kc.y+r);ctx.stroke();}ctx.restore();}
    if(wand&&st.tool==='select'){ctx.save();applyT(ctx,g);const r=S/70/(g.sc*st.vz);ctx.beginPath();ctx.arc(wand.u,wand.v,r,0,TAU);ctx.lineWidth=r*.5;ctx.strokeStyle='rgba(0,0,0,.65)';ctx.stroke();ctx.lineWidth=r*.25;ctx.strokeStyle='#fff';ctx.stroke();
      ctx.beginPath();ctx.arc(wand.u,wand.v,r*.3,0,TAU);ctx.fillStyle='#fff';ctx.fill();ctx.restore();}}
}
let stripe=null;
function stripePat(ctx){if(!stripe){const p=mk();p.width=p.height=16;const x=p.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,16,16);x.fillStyle='#111';
  x.beginPath();x.moveTo(0,8);x.lineTo(8,0);x.lineTo(16,0);x.lineTo(0,16);x.closePath();x.fill();x.beginPath();x.moveTo(16,8);x.lineTo(8,16);x.lineTo(16,16);x.closePath();x.fill();stripe=p;}
  return ctx.createPattern(stripe,'repeat');}
function selOverlay(ctx,g,S){refreshSel();const T=off(2,S),t=T.getContext('2d'),tool=st.tool!=='move';
  if(tool){t.globalCompositeOperation='source-over';t.clearRect(0,0,S,S);t.save();applyT(t,g);t.drawImage(st.selCv,0,0,st.sw,st.sh);t.restore();
    t.globalCompositeOperation='source-in';t.fillStyle='#ff2d55';t.fillRect(0,0,S,S);t.globalCompositeOperation='source-over';
    ctx.save();ctx.globalAlpha=wand?.38:.2;ctx.drawImage(T,0,0);ctx.restore();}
  t.globalCompositeOperation='source-over';t.clearRect(0,0,S,S);
  const lw=Math.max(1.6,S/420)/(g.sc*st.vz);t.save();applyT(t,g);
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]])t.drawImage(st.selCv,dx*lw,dy*lw,st.sw,st.sh);t.restore();
  t.globalCompositeOperation='destination-out';t.save();applyT(t,g);t.drawImage(st.selCv,0,0,st.sw,st.sh);t.restore();
  t.globalCompositeOperation='source-in';t.fillStyle=stripePat(t);t.fillRect(0,0,S,S);t.globalCompositeOperation='source-over';
  ctx.save();ctx.globalAlpha=tool?1:.7;ctx.drawImage(T,0,0);ctx.restore();}

/* ---------- canvas sizing + draw loop (pad eases toward its auto-fit target) ---------- */
const cv=$('#cv'),cx=cv.getContext('2d');let queued=false;
function draw(){if(queued)return;queued=true;requestAnimationFrame(frame);}
function frame(){queued=false;let again=false;
  if(st.src&&st.autoFit){
    if(st.fitDirty&&!st.lockPad)recomputeFit();
    const dl=st.padT-st.padCur;
    if(st.snapPad||REDUCED){st.padCur=st.padT;st.snapPad=false;}
    else if(!st.lockPad){if(Math.abs(dl)<.0006)st.padCur=st.padT;else{st.padCur+=dl*.3;again=true;}}}
  const S=cv.width;cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,S,S);cx.setTransform(st.vz,0,0,st.vz,st.vx*S,st.vy*S);render(cx,S);cx.setTransform(1,0,0,1,0,0);
  if(again)draw();miniSoon();stripSoon();}
new ResizeObserver(()=>{const r=cv.getBoundingClientRect(),S=clamp(Math.round(r.width*(devicePixelRatio||1)),200,1400);if(cv.width!==S)cv.width=cv.height=S;draw();}).observe(cv);

/* ---------- view helpers ---------- */
function viewChanged(){st.fitDirty=true;draw();}
function setZoom(z){st.zoom=clamp(z,.1,8);SLI.zoom.sync();hud('Picture '+Math.round(st.zoom*100)+'%');viewChanged();}
/* workspace zoom (Select / Brush): magnifies the screen only, never the exported token */
const viewTool=()=>st.tool!=='move';
function toTok(p){const S=cv.width;return{x:(p.x-st.vx*S)/st.vz,y:(p.y-st.vy*S)/st.vz};}
function clampView(){st.vz=clamp(st.vz,1,8);st.vx=clamp(st.vx,1-st.vz,0);st.vy=clamp(st.vy,1-st.vz,0);$('#viewReset').hidden=st.vz<=1.001;}
function zoomAt(z,px,py){const S=cv.width,t=toTok({x:px,y:py});st.vz=clamp(z,1,8);st.vx=(px-t.x*st.vz)/S;st.vy=(py-t.y*st.vz)/S;clampView();hud('Workspace '+Math.round(st.vz*100)+'%');draw();}
function zoomStep(dir){if(viewTool())zoomAt(st.vz*(dir>0?1.25:.8),cv.width/2,cv.height/2);else stepZoom(dir);}
function zoomKey(dir,big){if(viewTool())zoomAt(st.vz*(1+dir*(big?.4:.15)),cv.width/2,cv.height/2);else setZoom(st.zoom+dir*(big?.1:.02));}
function resetWorkspace(){st.vz=1;st.vx=st.vy=0;clampView();draw();}
function stepZoom(dir){setZoom(Math.round(st.zoom/.05+dir)*.05);}
function resetView(){st.vz=1;st.vx=st.vy=0;clampView();st.ix=0;st.iy=0;st.zoom=1;st.rot=0;st.flip=1;SLI.zoom.sync();SLI.rot.sync();viewChanged();}
let wheelHint=0;
function brushR(){return st.brush/100*Math.min(st.sw,st.sh)/(2*st.zoom);}
