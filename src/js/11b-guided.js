/* ---------- Guided and Studio modes, Fine-tune drawers, edge styles, Hide a side, tips, progress, Find ---------- */
{const sv=store.get('tw_studio');st.studio=sv===null?window.TW_STUDIO===true:sv==='1';}   /* first visit: Guided (tests preset Studio through window.TW_STUDIO) */
const TOOL_NAMES={select:['Click','Select'],brush:['Paint','Brush'],magnet:['Trace','Magnet']};
function applyMode(){document.body.classList.toggle('simple',!st.studio);const b=$('#bMode');b.setAttribute('aria-pressed',String(st.studio));b.lastElementChild.textContent=st.studio?'Guided':'Studio';
  b.title=st.studio?'Back to the guided view: essentials first, the rest under Fine-tune.':'Studio shows every control at once, as in earlier versions.';
  for(const[k,v]of Object.entries(TOOL_NAMES)){const s=$('.tbtn[data-tool='+k+'] span');if(s)s.textContent=st.studio?v[1]:v[0];}
  $('#selHelp').innerHTML=st.studio?'Pick what pops out with <b>Select</b>, <b>Lasso</b>, <b>Brush</b> or <b>Auto</b> in the toolbar next to the preview.':'Start with <b>Auto</b>, then refine with <b>Click</b>, <b>Paint</b> or <b>Trace</b> in the toolbar next to the preview.';
  if(!st.studio)$('#secLooks').open=true;
  store.set('tw_studio',st.studio?'1':'0');showTip();}
$('#bMode').onclick=()=>{st.studio=!st.studio;applyMode();rove();toast(st.studio?'Studio: every control is visible.':'Guided: essentials first. Tap Fine-tune for more.');};

/* Fine-tune drawers: remembered per step */
let fineOpen={};try{fineOpen=JSON.parse(store.get('tw_fine')||'{}')||{};}catch(e){fineOpen={};}
function applyFine(){$$('.panel').forEach(p=>p.classList.toggle('open-fine',!!fineOpen[p.id.slice(2)]));
  $$('.fineBtn').forEach(b=>{const o=!!fineOpen[b.dataset.fine];b.setAttribute('aria-expanded',String(o));b.textContent=o?'Hide fine-tune':'Fine-tune';});}
function openFineFor(el){const p=el.closest('.panel');if(p&&el.closest('.fine')&&!fineOpen[p.id.slice(2)]){fineOpen[p.id.slice(2)]=1;store.set('tw_fine',JSON.stringify(fineOpen));applyFine();}}
$$('.fineBtn').forEach(b=>b.onclick=()=>{fineOpen[b.dataset.fine]=fineOpen[b.dataset.fine]?0:1;store.set('tw_fine',JSON.stringify(fineOpen));applyFine();});

/* Edge style: three presets that set feather and halo removal together */
const EDGE_STYLES={crisp:{feather:.5,defr:1},natural:{feather:2,defr:.5},soft:{feather:4,defr:.8}};
const edgeNow=()=>Object.keys(EDGE_STYLES).find(k=>Math.abs(EDGE_STYLES[k].feather-st.feather)<.01&&Math.abs(EDGE_STYLES[k].defr-st.defr)<.02)||'';
bindSeg($('#edgeSeg'),edgeNow,v=>{if(!st.src)return;Object.assign(st,EDGE_STYLES[v]);fx('defr');st.softDirty=st.popDirty=st.fitDirty=true;SLI.feather.sync();SLI.defr.sync();lab('Edge style: '+v);draw();commit();});
/* Hide a side */
$$('#hideSeg button').forEach(b=>b.addEventListener('click',()=>{if(st.src)setHideSide(b.dataset.v);}));
syncers.push(syncHide);

/* tips: one short line, shown once per step until the first action there */
const TIPS={popout:'Get the person out. Keep the ear over the ring. Hide the bottom behind the border.',ring:'Pick a look, then change its colour.',export:'Choose a size and save. Keep editable lets you reopen it later.'};
let tipSeen={};try{tipSeen=JSON.parse(store.get('tw_tipseen')||'{}')||{};}catch(e){tipSeen={};}
let tipsOff=store.get('tw_tips')==='off';
function showTip(){const t=$('#tip'),k=typeof tab==='string'?tab:'image',on=!st.studio&&!tipsOff&&TIPS[k]&&!tipSeen[k]&&!!st.src;t.hidden=!on;if(on)$('#tipT').textContent=TIPS[k];}
function tipDone(){if(!$('#tip').hidden){tipSeen[tab]=1;store.set('tw_tipseen',JSON.stringify(tipSeen));$('#tip').hidden=true;}}
$('#tipX').onclick=()=>{tipDone();};
{const sw=$('#tipsOn');sw.checked=!tipsOff;sw.addEventListener('change',()=>{tipsOff=!sw.checked;store.set('tw_tips',tipsOff?'off':'on');if(!tipsOff){tipSeen={};store.set('tw_tipseen','{}');}showTip();});}

/* progress: a step shows a check once you have moved past it with something to show */
let maxStep=0;
function updProgress(){maxStep=Math.max(maxStep,TABS.indexOf(tab));
  const ok=[!!st.src,st.selCount>0,true,false];TABS.forEach((t,i)=>$('#t-'+t).classList.toggle('done',i<maxStep&&ok[i]&&i!==TABS.indexOf(tab)));}

/* ---------- Find: search every tool, control and button ---------- */
let findList=[];
function findBuild(){const E=[];const add=(name,keys,run,where)=>E.push({name,keys:(keys||'').toLowerCase(),run,where});
  const T=(tool,name,keys)=>add(name,keys,()=>{setTab('popout');setTool(tool);cv.focus({preventScroll:true});},'Tool');
  T('select','Click (wand)','select wand magic click colour area');T('brush','Paint (brush)','brush paint draw hair');T('magnet','Trace (magnetic lasso)','magnet magnetic lasso trace edge outline');T('lasso','Lasso','lasso freehand draw outline');
  add('Move picture','move drag position place',()=>{setTab('image');cv.focus({preventScroll:true});},'Tool');
  add('Auto suggestions','auto suggest candidates cut out',()=>{$('#bAuto').click();},'Action');
  add('Preview','preview finished clean',()=>$('#bPrev').click(),'View');add('Isolate pop-out','isolate only pop-out',()=>{setTab('popout');$('#bIso').click();},'View');
  add('Undo','undo',()=>$('#bUndo').click(),'Action');add('Redo','redo',()=>$('#bRedo').click(),'Action');
  add(st.studio?'Guided mode':'Studio mode','studio guided simple advanced all controls',()=>$('#bMode').click(),'View');
  add('Help and shortcuts','help shortcuts keys how',()=>$('#bHelp').click(),'Help');
  const seen=new Set();
  $$('.panel').forEach(p=>{const step=p.id.slice(2);
    p.querySelectorAll('[data-sl]').forEach(h=>{const s=SL[h.dataset.sl];if(!s||seen.has(h.dataset.sl))return;seen.add(h.dataset.sl);add(s.label,(s.tip||'')+' '+h.dataset.sl,()=>findGo(h,SLI[h.dataset.sl].range),'Slider · '+TABLABEL[step]);});
    p.querySelectorAll('summary,.btn,.link,.chip,.row>label,.seg button,.fineBtn').forEach(el=>{let t=(el.firstChild&&el.firstChild.nodeType===3?el.firstChild.textContent:el.textContent).trim().replace(/\s+/g,' ');
      if(!t||t.length>40||el.closest('#looks,#gridMetal,#gridGrad,#patGrid,#texGrid,.pal')||el.id==='fname')return;
      const k=step+'|'+t.toLowerCase();if(seen.has(k))return;seen.add(k);add(t,el.title||'',()=>findGo(el,el.matches('label')?document.getElementById(el.htmlFor)||el:el),TABLABEL[step]);});});
  return E;}
const TABLABEL={image:'Image',popout:'Pop-out',ring:'Ring',export:'Export'};
function findGo(host,focusEl){const p=host.closest('.panel');setTab(p.id.slice(2));openFineFor(host);let d=host.closest('details');while(d){d.open=true;d=d.parentElement&&d.parentElement.closest('details');}
  requestAnimationFrame(()=>{host.scrollIntoView({block:'center',behavior:REDUCED?'auto':'smooth'});if(focusEl&&focusEl.focus)focusEl.focus({preventScroll:true});host.classList.add('flash');setTimeout(()=>host.classList.remove('flash'),1600);});}
const findDlg=$('#findDlg'),findIn=$('#findIn'),findUl=$('#findList');let findSel=0,findRes=[];
function findRender(){const q=findIn.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  findRes=findList.map(e=>{const hay=e.name.toLowerCase()+' '+e.keys;let sc=0;for(const w of q){if(e.name.toLowerCase().startsWith(w))sc+=3;else if(e.name.toLowerCase().includes(w))sc+=2;else if(hay.includes(w))sc+=1;else return null;}return{e,sc};}).filter(Boolean).sort((a,b)=>b.sc-a.sc).slice(0,30);
  findSel=Math.min(findSel,Math.max(0,findRes.length-1));findUl.textContent='';
  findRes.forEach((r,i)=>{const li=document.createElement('li');li.setAttribute('role','option');li.setAttribute('aria-selected',String(i===findSel));li.id='fo'+i;
    const a=document.createElement('span');a.textContent=r.e.name;const b=document.createElement('small');b.textContent=r.e.where;li.append(a,b);li.onclick=()=>findRun(i);findUl.appendChild(li);});
  findIn.setAttribute('aria-activedescendant',findRes.length?'fo'+findSel:'');
  $('#findEmpty').hidden=!!findRes.length;}
function findRun(i){const r=findRes[i];if(!r)return;findDlg.close();setTimeout(()=>r.e.run(),30);}
function findOpen(){if(findDlg.open)return;findList=findBuild();findIn.value='';findSel=0;findRender();findDlg.showModal();findIn.focus();}
$('#bFind').onclick=findOpen;
findIn.addEventListener('input',()=>{findSel=0;findRender();});
findIn.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();findSel=Math.min(findRes.length-1,findSel+1);findRender();$('#fo'+findSel)?.scrollIntoView({block:'nearest'});}
  else if(e.key==='ArrowUp'){e.preventDefault();findSel=Math.max(0,findSel-1);findRender();$('#fo'+findSel)?.scrollIntoView({block:'nearest'});}
  else if(e.key==='Enter'){e.preventDefault();findRun(findSel);}});
findDlg.addEventListener('click',e=>{if(e.target===findDlg)findDlg.close();});
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();findOpen();}},true);
/* More menu extras for tools that left the toolbar in Guided mode */
$('#mLasso').onclick=()=>{closeMenu();setTool('lasso');};$('#mIso').onclick=()=>{closeMenu();$('#bIso').click();};
