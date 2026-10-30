/* ---------- image palette ---------- */
function extractPalette(c0){const N=48,c=mk();c.width=c.height=N;const x=c.getContext('2d');x.drawImage(c0,0,0,N,N);
  const d=x.getImageData(0,0,N,N).data,B={};
  for(let i=0;i<d.length;i+=4){if(d[i+3]<200)continue;const k=(d[i]>>4)<<8|(d[i+1]>>4)<<4|(d[i+2]>>4),e=B[k]||(B[k]={n:0,r:0,g:0,b:0});e.n++;e.r+=d[i];e.g+=d[i+1];e.b+=d[i+2];}
  const L=Object.values(B).map(e=>{const r=e.r/e.n,g=e.g/e.n,b=e.b/e.n;return{r,g,b,n:e.n*(1+(Math.max(r,g,b)-Math.min(r,g,b))/128)};}).sort((a,b)=>b.n-a.n),out=[];
  for(const q of L){if(out.every(o=>Math.hypot(o.r-q.r,o.g-q.g,o.b-q.b)>70))out.push(q);if(out.length>=6)break;}
  return out.map(o=>'#'+[o.r,o.g,o.b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''));}
function imageGrad(){if(st.pal.length<2)return null;const lum=h=>{const[r,g,b]=hexToRgb(h);return r*.3+g*.59+b*.11;},a=st.pal[0];
  let bb=st.pal[1],best=0;st.pal.slice(1).forEach(h=>{const dd=Math.abs(lum(h)-lum(a));if(dd>=best){best=dd;bb=h;}});
  return lum(a)>=lum(bb)?[a,bb]:[bb,a];}
function renderPalette(){
  $$('.pal').forEach(sp=>{sp.innerHTML='';st.pal.forEach(h=>{const b=document.createElement('button');b.title='Use '+h+' from your image';b.setAttribute('aria-label','Use image colour '+h);
    b.innerHTML='<i style="background:'+h+'"></i>';
    b.onclick=()=>{const el=$('#'+sp.dataset.for);el.value=h;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};sp.appendChild(b);});});
  buildGradGrid();}

/* ---------- slider factory: label · slider · typed value · double-click resets ---------- */
const SL={
 zoom:{label:'Zoom',min:10,max:800,step:1,unit:'%',k:.01,def:100,fx:'view',tip:'Scale the picture inside the ring'},
 rot:{label:'Rotate',min:-180,max:180,step:1,unit:'°',k:Math.PI/180,def:0,fx:'view',tip:'Rotate the picture'},
 pad:{label:'Margin',min:0,max:45,step:.1,unit:'%',k:.01,def:8,fx:'draw',tip:'Empty space around the ring so pop-out art can extend past it'},
 feather:{label:'Feather',min:0,max:12,step:.5,unit:'px',k:1,def:.5,fx:'soft',tip:'Fades the outer edge of the cut-out inward. Soft hair edges are left alone. Try Show mask to see it.'},
 autoSens:{label:'Auto sensitivity',min:0,max:100,step:1,unit:'',k:1,def:50,fx:'auto',tip:'Not happy with Auto? Low needs a clear difference from the background, high keeps even faint strands. Runs Auto again, so it replaces the current selection.'},
 autoShrink:{label:'Shrink / grow',min:-10,max:10,step:1,unit:'px',k:1,def:0,fx:'auto',tip:'Moves the whole Auto outline in (positive) or out (negative), like shrinking a wand selection. Runs Auto again.'},
 gap:{label:'Close small gaps',min:0,max:40,step:1,unit:'px',k:1,def:0,fx:'gap',tip:'Removes background-coloured gaps between curls up to this width. Larger gaps: use the Brush set to Remove.'},
 shadow:{label:'Drop shadow',min:0,max:100,step:1,unit:'%',k:.01,def:0,fx:'fit',tip:'Shadow the pop-out casts onto the ring'},
 tol:{label:'Sensitivity',min:1,max:100,step:1,unit:'',k:1,def:30,fx:'wand',tip:'How different a colour can be and still be selected. Low picks only almost identical colours, high picks more. The whole slider is useful. Drag it after a click to adjust live.'},
 brush:{label:'Size',min:2,max:40,step:1,unit:'%',k:1,def:10,fx:'draw',tip:'Brush size'},
 width:{label:'Ring width',min:4,max:30,step:1,unit:'%',k:.01,def:11,fx:'ring',tip:'How thick the ring is'},
 count:{label:'Count',min:6,max:60,step:1,unit:'',k:1,def:()=>PAT[st.formula].n,fx:'ring',tip:'How many teeth, beads, segments or ticks'},
 depth:{label:'Depth',min:0,max:100,step:1,unit:'%',k:.01,def:()=>Math.round(PAT[st.formula].d*100),fx:'ring',tip:'How pronounced the shape detail is'},
 gAng:{label:'Angle',min:0,max:360,step:1,unit:'°',k:Math.PI/180,def:45,fx:'ring',tip:'0° is left to right, 90° is top to bottom'},
 texAmt:{label:'Intensity',min:5,max:100,step:1,unit:'%',k:.01,def:60,fx:'draw',tip:'How strongly the texture shows on the ring'},
 texDens:{label:'Scale',min:15,max:150,step:1,unit:'%',k:.03,def:100,fx:'draw',tip:'Higher values repeat the texture more often, which makes the grain finer'},
 texRot:{label:'Rotation',min:0,max:360,step:1,unit:'°',k:Math.PI/180,def:0,fx:'draw',tip:'Turn the texture, for example to change the direction of wood grain or brushed metal'},
 lineW:{label:'Line width',min:2,max:30,step:.5,unit:'%',k:.01,def:()=>Math.round((PAT[st.formula].xd||.1)*100),fx:'ring',tip:'Thickness of the lines in this shape'},
 lAng:{label:'Light from',min:0,max:360,step:1,unit:'°',k:Math.PI/180,def:135,fx:'ring',tip:'Direction the light comes from: 0° right, 90° bottom, 180° left, 270° top'},
 eAmt:{label:'Amount',min:1,max:24,step:1,unit:'',k:1,def:5,fx:'draw',tip:'How many lightning bolts'},
 eLen:{label:'Length',min:20,max:200,step:1,unit:'%',k:.01,def:100,fx:'draw',tip:'How far each bolt travels around the ring'},
 bri:{label:'Brightness',min:-100,max:100,step:1,unit:'',k:1,def:0,fx:'adj',tip:'Make the picture lighter or darker'},
 con:{label:'Contrast',min:-100,max:100,step:1,unit:'',k:1,def:0,fx:'adj',tip:'Difference between light and dark areas'},
 sat:{label:'Saturation',min:-100,max:100,step:1,unit:'',k:1,def:0,fx:'adj',tip:'How vivid the colours are. -100 is black and white.'},
 defr:{label:'Halo removal',min:0,max:100,step:1,unit:'%',k:.01,def:0,fx:'defr',tip:'Removes leftover background colour from the soft, semi-transparent edge pixels (hair, fur)'},
 bsoft:{label:'Brush softness',min:0,max:100,step:1,unit:'%',k:.01,def:0,fx:'none',tip:'0% is a hard brush. Higher values fade the edge of the stroke.'},
 lInt:{label:'Strength',min:0,max:150,step:1,unit:'%',k:.01,def:100,fx:'ring',tip:'How strong the light and shade are. 0% is flat.'}
};
const SLI={},syncers=[];let bgVer=-1;
function fx(kind){if(kind==='wand'){wandRetune();return;}
  if(kind==='auto'){autoRetune();return;}
  if(kind==='edge'||kind==='shift'||kind==='gap'){edgeRetune(kind);return;}
  if(kind==='adj'){st.popDirty=true;draw();return;}
  if(kind==='defr'){if(st.bgAuto&&st.defr>0&&bgVer!==st.maskVer){bgVer=st.maskVer;st.bgC=rgbToHex(estimateBg(st.mask,bounds(),Math.round(st.eReach)).c);}st.popDirty=true;draw();return;}
  if(kind==='none'){draw();return;}
  if(kind==='view'||kind==='fit')st.fitDirty=true;
  if(kind==='soft'){st.softDirty=st.popDirty=st.fitDirty=true;}
  if(kind==='ring')thumbsSoon();draw();}
function mkSlider(key,host){const s=SL[key],dec=s.step<1?1:0,fmt=v=>(+v).toFixed(dec);
  host.classList.add('row','srow');host.title=s.tip+'  (double-click to reset)';
  host.innerHTML='<label for="r_'+key+'">'+s.label+'</label><input id="r_'+key+'" type="range" min="'+s.min+'" max="'+s.max+'" step="'+s.step+'"><span class="nv"><input type="number" inputmode="decimal" aria-label="'+s.label+' value" min="'+s.min+'" max="'+s.max+'" step="'+s.step+'"><em>'+s.unit+'</em></span>';
  const label=host.querySelector('label'),range=host.querySelector('input[type=range]'),num=host.querySelector('input[type=number]');
  const sync=()=>{const v=st[key]/s.k;range.value=v;num.value=fmt(Math.round(v/s.step)*s.step);};
  const set=(v,fromNum)=>{st[key]=+(v*s.k).toFixed(6);if(fromNum)range.value=v;else num.value=fmt(v);fx(s.fx);};
  const done=()=>s.fx==='wand'?wandDone():s.fx==='auto'?autoCommit():(s.fx==='edge'||s.fx==='shift'||s.fx==='gap')?edgeCommit():commit();
  range.addEventListener('input',()=>set(+range.value));range.addEventListener('change',done);
  num.addEventListener('input',()=>{const v=parseFloat(num.value);if(!isNaN(v))set(clamp(v,+range.min,+range.max),true);});
  num.addEventListener('change',()=>{sync();done();});
  const reset=()=>{const d=typeof s.def==='function'?s.def():s.def;set(d);range.value=d;done();};
  range.addEventListener('dblclick',reset);label.addEventListener('dblclick',reset);
  SLI[key]={sync,range,num,label,host};syncers.push(sync);}
$$('[data-sl]').forEach(h=>mkSlider(h.dataset.sl,h));

/* ---------- switches, colours, segmented controls ---------- */
function bindSwitch(id,key,after){const el=$('#'+id);const sync=()=>el.checked=st[key];
  el.addEventListener('change',()=>{st[key]=el.checked;after&&after();draw();commit();});syncers.push(sync);}
function bindColor(id,key,after){const el=$('#'+id);const sync=()=>el.value=st[key];
  el.addEventListener('input',()=>{st[key]=el.value;after&&after();draw();});el.addEventListener('change',commit);syncers.push(sync);}
function bindSeg(root,get,set){const bs=[...root.querySelectorAll('button')];const sync=()=>bs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===String(get()))));
  bs.forEach(b=>b.addEventListener('click',()=>{set(b.dataset.v);sync();}));syncers.push(sync);return bs;}
bindSwitch('bgOn','bgOn');bindSwitch('popOn','popOn',()=>{st.fitDirty=true;});bindSwitch('embedOn','embedOn');
bindSwitch('autoFit','autoFit',()=>{if(!st.autoFit)st.pad=st.padCur;else st.fitDirty=true;updVis();SLI.pad.sync();});
bindColor('bg','bg');bindColor('accent','accent',()=>thumbsSoon());bindColor('eCol','eCol',()=>thumbsSoon());
bindColor('g1','g1',()=>{st.colorKey='Custom gradient';updColorSel();thumbsSoon();});bindColor('g2','g2',()=>{st.colorKey='Custom gradient';updColorSel();thumbsSoon();});
bindColor('color','color',()=>{st.gradOn=false;st.colorKey='Custom';updColorSel();updVis();thumbsSoon();});
$('#contig').onclick=()=>{st.contig=!st.contig;syncUI();wandDone();};
syncers.push(()=>$('#contig').setAttribute('aria-pressed',String(st.contig)));
$$('.modeSeg').forEach(r=>bindSeg(r,()=>st.mode,v=>{st.mode=v;updBadge();if(wand&&st.tool==='select'){wand.mode=v;wandDone();}}));
bindSeg($('#sizes'),()=>st.exportSize,v=>{st.exportSize=+v;updExport();});
bindSeg($('#whatSeg'),()=>st.exportWhat,v=>{st.exportWhat=v;updExport();});
bindSeg($('#fmtSeg'),()=>st.exportFmt,v=>{st.exportFmt=v;store.set('tw_fmt',v);updExport();});
if(['png','webp'].includes(store.get('tw_fmt')))st.exportFmt=store.get('tw_fmt');
let theme=store.get('tw_theme')||'auto';
function applyTheme(){if(theme==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',theme);}
bindSeg($('#themeSeg'),()=>theme,v=>{theme=v;applyTheme();store.set('tw_theme',v);});
TEX.forEach(([id,name])=>{const b=document.createElement('button');b.className='chip';b.dataset.v=id;b.textContent=name;$('#texGrid').appendChild(b);});
bindSeg($('#texGrid'),()=>st.tex,v=>{st.tex=v;if(v!=='none'){st.texAmt=TEX_AMT[v];SLI.texAmt.sync();}updVis();draw();thumbsSoon();commit();});

/* ---------- tools & badge ---------- */
function setTool(v){wand=null;st.tool=v;$$('.tbtn[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===v)));
  $$('#optbar .o').forEach(o=>o.hidden=o.dataset.for!==v);cv.dataset.tool=v;updBadge();draw();}
$$('.tbtn[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
function updBadge(){const b=$('#badge'),m=curMode(),T={move:'Move',select:'Select',brush:'Brush'}[st.tool];
  b.className='badge'+(st.tool==='move'||st.space?'':' '+m);b.lastChild.textContent=st.space?'Pan (Space held)':st.tool==='move'?T:T+' · '+(m==='sub'?'Remove':'Add');}

/* ---------- selection actions: toolbar buttons + "More" menu ---------- */
function clearSel(){if(!st.src||!st.selCount)return;st.mask=new Uint8Array(st.mask.length);maskChanged();draw();commit();toast('Selection cleared. Undo brings it back.');}
function invertSel(){if(!st.src)return;const m=new Uint8Array(st.mask.length),d=st.sdata;for(let i=0;i<m.length;i++)m[i]=d[i*4+3]>8?255-st.mask[i]:0;st.mask=m;maskChanged();draw();commit();}
function morphSel(grow){if(!st.src)return;busy(1,grow?'Growing…':'Shrinking…');setTimeout(()=>{morph(grow);busy(-1);draw();commit();},10);}
$('#bAuto').onclick=runAuto;$('#bClear').onclick=clearSel;
const menu=$('#moreMenu'),bMore=$('#bMore');
function closeMenu(){menu.hidden=true;bMore.setAttribute('aria-expanded','false');}
function openMenu(){menu.hidden=false;const r=bMore.getBoundingClientRect(),mw=menu.offsetWidth,mh=menu.offsetHeight;
  const l=DESKTOP.matches?r.right+8:clamp(r.left,8,innerWidth-mw-8),t=DESKTOP.matches?Math.min(r.top,innerHeight-mh-8):r.bottom+6;
  menu.style.left=l+'px';menu.style.top=Math.max(8,t)+'px';bMore.setAttribute('aria-expanded','true');menu.querySelector('button').focus();}
bMore.onclick=()=>menu.hidden?openMenu():closeMenu();
document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!bMore.contains(e.target))closeMenu();});
menu.addEventListener('keydown',e=>{const bs=[...menu.querySelectorAll('button')],i=bs.indexOf(document.activeElement);
  if(e.key==='Escape'){closeMenu();bMore.focus();}else if(e.key==='ArrowDown'){e.preventDefault();bs[(i+1)%bs.length].focus();}else if(e.key==='ArrowUp'){e.preventDefault();bs[(i+bs.length-1)%bs.length].focus();}});
$('#mInvert').onclick=()=>{closeMenu();invertSel();};$('#mGrow').onclick=()=>{closeMenu();morphSel(true);};$('#mShrink').onclick=()=>{closeMenu();morphSel(false);};
/* preview background + isolate view (display only) */
function setPreviewBg(v){$('#board').dataset.bg=v;$('#tableStrip').dataset.bg=v;$$('#moreMenu [data-bg]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.bg===v)));store.set('tw_bg',v);}
$$('#moreMenu [data-bg]').forEach(b=>b.onclick=()=>{setPreviewBg(b.dataset.bg);closeMenu();});
{const v=store.get('tw_bg');setPreviewBg(['checker','map','dark'].includes(v)?v:'checker');}
function toggleIso(){st.iso=!st.iso;syncUI();if(st.iso&&!st.selCount)toast('Nothing is selected yet, so there is nothing to show.');draw();}
$('#bIso').onclick=toggleIso;
function togglePrev(){st.prev=!st.prev;syncUI();draw();}
$('#bPrev').onclick=togglePrev;
syncers.push(()=>$('#bPrev').setAttribute('aria-pressed',String(st.prev)));
syncers.push(updBadge);
syncers.push(()=>$('#bIso').setAttribute('aria-pressed',String(st.iso)));
/* ---------- edge tools ---------- */
const fixNow=()=>{if(!st.selCount)return toast('Choose the pop-out first, then fix its edges.');busy(1,'Fixing edges…');setTimeout(()=>{try{fixEdges(false);}finally{busy(-1);}},20);};
$('#bFixEdges').onclick=fixNow;
$('#bClean').onclick=()=>{if(!st.selCount)return toast('Nothing is selected yet.');const c=cleanMask(st.mask,bounds(),speckArea(),true);
  if(!c.specks&&!c.filled)return toast('No specks or holes this small.');
  st.mask=c.mask;maskChanged();draw();commit();toast('Removed '+c.specks+' speck'+(c.specks===1?'':'s')+' and filled '+c.filled+' hole'+(c.filled===1?'':'s')+'.');};
$('#strandChip').onclick=()=>{st.strand=!st.strand;syncUI();if(st.strand)toast('Hair-aware brush: paint over hair strands to add them, or in Remove mode to erase leftover background.');};
$('#bMatch').onclick=matchToRing;
$('#bAdjReset').onclick=()=>{st.bri=st.con=st.sat=0;st.popDirty=true;syncUI();draw();commit();};
function toggleMask(){st.maskView=!st.maskView;syncUI();draw();}
$('#mMask').onclick=()=>{closeMenu();toggleMask();};$('#bMaskView').onclick=toggleMask;
$('#mAutoFix').onclick=()=>{store.set('tw_autofix',autoFixOn()?'0':'1');syncUI();};
const autoFixOn=()=>store.get('tw_autofix')!=='0';
syncers.push(()=>{$('#strandChip').setAttribute('aria-pressed',String(st.strand));
  $('#mMask').setAttribute('aria-checked',String(st.maskView));$('#bMaskView').setAttribute('aria-pressed',String(st.maskView));$('#bMaskView').textContent=st.maskView?'Hide mask':'Show mask';
  $('#mAutoFix').setAttribute('aria-checked',String(autoFixOn()));});

/* ---------- history, zoom and view buttons ---------- */
$('#bUndo').onclick=undo;$('#bRedo').onclick=redo;$('#bUndo2').onclick=undo;$('#bRedo2').onclick=redo;
function holdBtn(btn,fn){let t=0,iv=0,held=false;
  const stop=()=>{clearTimeout(t);clearInterval(iv);if(held){held=false;commit();}};
  btn.addEventListener('pointerdown',e=>{if(e.button)return;held=true;fn();t=setTimeout(()=>{iv=setInterval(fn,80);},420);});
  ['pointerup','pointerleave','pointercancel'].forEach(n=>btn.addEventListener(n,stop));
  btn.addEventListener('click',e=>{if(e.detail===0){fn();commit();}});}
holdBtn($('#bZoomIn'),()=>zoomStep(1));holdBtn($('#bZoomOut'),()=>zoomStep(-1));
$('#bReset').onclick=()=>{resetView();commit();};
$('#viewReset').onclick=resetWorkspace;
$('#bFlip').onclick=()=>{st.flip*=-1;viewChanged();commit();};
$('#bOpen').onclick=()=>$('#file').click();
$('#file').addEventListener('change',e=>{openFile(e.target.files[0]);e.target.value='';});
$('#bHelp').onclick=()=>$('#helpDlg').showModal();$('#helpClose').onclick=()=>$('#helpDlg').close();
function dismissCoach(persist){$('#coach').hidden=true;if(persist)store.set('tw_coach','1');}
$('#coachOk').onclick=()=>dismissCoach(true);
