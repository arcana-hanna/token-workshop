/* ---------- keyboard ---------- */
addEventListener('keydown',e=>{
  if(e.key==='Alt'){st.alt=true;updBadge();draw();}
  const t=e.target,typing=t.matches&&t.matches('input[type=text],input[type=number],textarea,select,[contenteditable]'),mod=e.ctrlKey||e.metaKey;
  if(mod&&!e.altKey){const k=e.key.toLowerCase();
    if(k==='s'){e.preventDefault();exportPng();return;}
    if(!typing){if(k==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(k==='y'){e.preventDefault();redo();return;}}}
  if(typing||mod||document.querySelector('dialog[open]'))return;
  const onCanvas=document.activeElement===cv,k=e.key,free=onCanvas||t===document.body;
  if(k===' '&&free){e.preventDefault();if(!st.space){st.space=true;cv.style.cursor='grab';updBadge();}return;}
  if((k==='Delete'||k==='Backspace')&&free){e.preventDefault();clearSel();return;}
  const low=k.toLowerCase();
  if(low==='v')setTool('move');else if(low==='w')setTool('select');else if(low==='b')setTool('brush');else if(low==='i')toggleIso();else if(low==='m')toggleMask();else if(low==='p')togglePrev();
  else if(onCanvas&&st.tool!=='move'&&(k.startsWith('Arrow')||k==='Enter'))kbCursor(e);
  else if(k==='['){st.brush=clamp(st.brush-2,2,40);SLI.brush.sync();draw();}else if(k===']'){st.brush=clamp(st.brush+2,2,40);SLI.brush.sync();draw();}
  else if(k==='?'){$('#helpDlg').showModal();}
  else if(onCanvas){const step=e.shiftKey?.05:.01;let h=true;
    if(k==='ArrowLeft')st.ix-=step;else if(k==='ArrowRight')st.ix+=step;else if(k==='ArrowUp')st.iy-=step;else if(k==='ArrowDown')st.iy+=step;
    else if(k==='+'||k==='=')zoomKey(1,e.shiftKey);else if(k==='-'||k==='_')zoomKey(-1,e.shiftKey);else if(k==='0')resetView();else h=false;
    if(h){e.preventDefault();viewChanged();commitSoon();}}});
addEventListener('keyup',e=>{if(e.key==='Alt'){st.alt=false;updBadge();draw();}if(e.key===' '&&st.space){st.space=false;cv.style.cursor='';updBadge();}});
addEventListener('blur',()=>{st.alt=false;st.space=false;cv.style.cursor='';updBadge();});

/* ---------- keyboard cursor: Select and Brush can be used without a pointer ---------- */
function kbCursor(e){e.preventDefault();const S=cv.width,k=e.key;
  if(!st.kc){const c=toTok({x:S/2,y:S/2});st.kc={x:c.x,y:c.y};}
  if(k.startsWith('Arrow')){const d=(e.shiftKey?5:1)*S/100/st.vz;
    st.kc.x=clamp(st.kc.x+(k==='ArrowRight'?d:k==='ArrowLeft'?-d:0),0,S);st.kc.y=clamp(st.kc.y+(k==='ArrowDown'?d:k==='ArrowUp'?-d:0),0,S);
    const sx=st.kc.x*st.vz+st.vx*S,sy=st.kc.y*st.vz+st.vy*S;
    if(sx<.1*S)st.vx+=(.1*S-sx)/S;if(sx>.9*S)st.vx-=(sx-.9*S)/S;if(sy<.1*S)st.vy+=(.1*S-sy)/S;if(sy>.9*S)st.vy-=(sy-.9*S)/S;clampView();
    if(st.tool==='brush')st.hover={x:st.kc.x,y:st.kc.y};}
  const q=toImg(geom(S,effPad()),st.kc.x,st.kc.y);
  if(k==='Enter'){const mode=e.shiftKey?'sub':curMode();
    if(st.tool==='select')wandStart(q.u,q.v,mode);
    else if(st.tool==='brush'){startPaint();dab(q.u,q.v,brushR(),mode==='sub'?0:255);if(mode!=='sub'&&!st.selCount)st.selCount=1;st.popDirty=true;endPaint();}}
  draw();}
/* ---------- toolbar: one tab stop, arrow keys move between the buttons ---------- */
const toolBtns=()=>[...document.querySelectorAll('.tools .tbtn')];
function rove(keep){const all=toolBtns(),ok=b=>!b.disabled&&b.offsetParent;
  let h=keep&&ok(keep)?keep:all.find(b=>b.getAttribute('aria-pressed')==='true'&&ok(b))||all.find(ok);
  all.forEach(b=>b.tabIndex=b===h?0:-1);}
{const bar=document.querySelector('.tools');
 bar.addEventListener('focusin',e=>{if(e.target.matches('.tbtn'))rove(e.target);});
 bar.addEventListener('keydown',e=>{const all=toolBtns().filter(b=>!b.disabled&&b.offsetParent),i=all.indexOf(document.activeElement);if(i<0)return;
   const m={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.key];let n=-1;
   if(m)n=(i+m+all.length)%all.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=all.length-1;
   if(n>=0){e.preventDefault();all[n].focus();}});
 syncers.push(()=>rove());}
/* ---------- sync every control from state (undo/redo, looks, load) ---------- */
function syncUI(){syncers.forEach(f=>f());updExport();}

/* ---------- phone: while typing the file name, hide the preview and tab bar so the field stays visible ---------- */
{const f=$('#fname');
 f.addEventListener('focus',()=>{if(!DESKTOP.matches){document.body.classList.add('kb');setTimeout(()=>f.scrollIntoView({block:'center'}),60);}});
 f.addEventListener('blur',()=>document.body.classList.remove('kb'));
 f.addEventListener('keydown',e=>{if(e.key==='Enter')f.blur();});
 f.addEventListener('input',autosaveSoon);}

/* ---------- boot ---------- */
applyTheme();buildLooks();
loadCanvas(sampleArt(),'Sample art. Use Open, drop an image on the preview, or paste one with Ctrl/⌘+V.');
Object.assign(st,{zoom:1.3,iy:.05});
{const sel=wandSel(420,250),m=new Uint8Array(st.mask.length);for(let i=0;i<m.length;i++)if(sel[i])m[i]=255;st.mask=m;maskChanged();}   // pre-select the hat so the pop-out shows on first view
setTool('select');syncUI();commit();draw();
if(!store.get('tw_coach'))$('#coach').hidden=false;
rove();{const t=store.get('tw_table');setStrip(t===null?DESKTOP.matches:t==='1');}autoRestore();
