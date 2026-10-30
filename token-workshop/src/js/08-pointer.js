/* ---------- pointer interaction ---------- */
const ptrs=new Map();let drag=null,gest=null,lastPt=null,wheelT=0,selCtx=null,softCtx=null;
function cpt(x,y){const r=cv.getBoundingClientRect(),k=cv.width/r.width;return{x:(x-r.left)*k,y:(y-r.top)*k,k};}
function pt(e){return cpt(e.clientX,e.clientY);}
function imgPt(e){const q=toTok(pt(e));return toImg(geom(cv.width,effPad()),q.x,q.y);}
const curMode=e=>((e&&e.altKey)||st.alt)?'sub':st.mode;
function startPaint(){refreshSoft();refreshSel();st.mask=st.mask.slice();st.painting=true;lastPt=null;selCtx=st.selCv.getContext('2d');softCtx=st.softCv.getContext('2d');
  if(st.strand)strandSetup();
}
function dab(u,v,r,val){if(st.strand||st.bsoft>0){dabSoft(u,v,r,!val);return;}paintDisc(u,v,r,val);for(const c of[selCtx,softCtx]){c.globalCompositeOperation=val?'source-over':'destination-out';c.fillStyle='#fff';c.beginPath();c.arc(u,v,r,0,TAU);c.fill();c.globalCompositeOperation='source-over';}}
function paintTo(e){const q=imgPt(e),val=curMode(e)==='sub'?0:255,r=brushR();
  if(lastPt){const dx=q.u-lastPt.u,dy=q.v-lastPt.v,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/(r/3)));for(let i=1;i<=n;i++)dab(lastPt.u+dx*i/n,lastPt.v+dy*i/n,r,val);}
  else dab(q.u,q.v,r,val);
  flushDirty();lastPt=q;if(val&&!st.selCount)st.selCount=1;st.popDirty=true;draw();}
function endPaint(){flushDirty();st.painting=false;maskChanged();commit();draw();}
cv.addEventListener('pointerdown',e=>{if(!st.src)return;if(e.pointerType==='mouse'&&e.button!==0)return;
  cv.focus({preventScroll:true});st.kc=null;
  dismissCoach(true);cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];gest={d:Math.hypot(a.x-b.x,a.y-b.y),z:st.zoom,vz:st.vz,tok:toTok(cpt((a.x+b.x)/2,(a.y+b.y)/2))};drag=null;if(!viewTool())st.lockPad=true;
    if(st.painting)endPaint();return;}
  if(st.tool==='move'||st.space){const vw=st.space&&viewTool()&&st.vz>1;drag={x:e.clientX,y:e.clientY,view:vw};if(!vw)st.lockPad=true;cv.classList.add('grabbing');}
  else if(st.tool==='select'){const q=imgPt(e);wandStart(q.u,q.v,curMode(e));}
  else{startPaint();paintTo(e);}});
cv.addEventListener('pointermove',e=>{
  if(st.tool==='brush'){st.hover=toTok(pt(e));if(!ptrs.has(e.pointerId))draw();}
  if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2&&gest){const[a,b]=[...ptrs.values()],ratio=Math.hypot(a.x-b.x,a.y-b.y)/gest.d;
    if(viewTool()){const m=cpt((a.x+b.x)/2,(a.y+b.y)/2),S=cv.width;st.vz=clamp(gest.vz*ratio,1,8);st.vx=(m.x-gest.tok.x*st.vz)/S;st.vy=(m.y-gest.tok.y*st.vz)/S;clampView();hud('Workspace '+Math.round(st.vz*100)+'%');draw();}
    else{st.zoom=clamp(gest.z*ratio,.1,8);SLI.zoom.sync();hud('Picture '+Math.round(st.zoom*100)+'%');viewChanged();}
    return;}
  if(st.painting)paintTo(e);
  else if(drag){const p=pt(e),S=cv.width;
    if(drag.view){st.vx+=(e.clientX-drag.x)*p.k/S;st.vy+=(e.clientY-drag.y)*p.k/S;clampView();draw();}
    else{const R=S*(.5-effPad())*st.vz;st.ix+=(e.clientX-drag.x)*p.k/R;st.iy+=(e.clientY-drag.y)*p.k/R;viewChanged();}
    drag={x:e.clientX,y:e.clientY,view:drag.view};}});
const endP=e=>{if(!ptrs.has(e.pointerId))return;const moved=drag||gest;ptrs.delete(e.pointerId);if(ptrs.size<2)gest=null;drag=null;cv.classList.remove('grabbing');
  if(st.painting)endPaint();
  if(!ptrs.size){st.lockPad=false;st.fitDirty=true;draw();if(moved)commit();}};
cv.addEventListener('pointerup',endP);cv.addEventListener('pointercancel',endP);
cv.addEventListener('pointerleave',()=>{st.hover=null;draw();});
cv.addEventListener('wheel',e=>{if(!st.src)return;
  if(!(e.ctrlKey||e.metaKey)){if(Date.now()-wheelHint>9000){wheelHint=Date.now();toast('Hold Ctrl (⌘ on Mac) and scroll to zoom the picture.');}return;}
  e.preventDefault();const dz=Math.exp(-e.deltaY*(Math.abs(e.deltaY)<30?.01:.0025));
  if(viewTool()){const p=pt(e);zoomAt(st.vz*dz,p.x,p.y);return;}
  st.lockPad=true;setZoom(st.zoom*dz);
  clearTimeout(wheelT);wheelT=setTimeout(()=>{st.lockPad=false;st.fitDirty=true;draw();commit();},350);},{passive:false});

/* drag & drop + paste */
let dragDepth=0;const board=$('#board');
addEventListener('dragenter',e=>{if([...(e.dataTransfer?.types||[])].includes('Files')){dragDepth++;board.classList.add('drop');}});
addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)board.classList.remove('drop');});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();dragDepth=0;board.classList.remove('drop');openFile(e.dataTransfer.files[0]);});
addEventListener('paste',e=>{const f=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));if(f){e.preventDefault();openFile(f);}});
