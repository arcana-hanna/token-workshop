/* ---------- pattern grid, colour swatches, looks ---------- */
const patBtns={};
PAT_ORDER.forEach(id=>{const b=document.createElement('button');b.className='pat';b.dataset.id=id;b.title=PAT[id].name+' ring';
  b.innerHTML='<canvas width="120" height="120"></canvas><span>'+PAT[id].name+'</span>';b.onclick=()=>{setPattern(id,true);draw();commit();};$('#patGrid').appendChild(b);patBtns[id]=b;});
function setPattern(id,reset){const P=PAT[id];st.formula=id;if(reset){st.count=P.n;st.depth=P.d;if(P.xd)st.lineW=P.xd;}patMeta();thumbsSoon();}
function patMeta(){const P=PAT[st.formula],r=SLI.count.range,n=SLI.count.num;
  r.min=n.min=P.min;r.max=n.max=P.max;st.count=clamp(st.count,P.min,P.max);
  SLI.count.label.textContent=P.cl||'Count';SLI.depth.label.textContent=P.dl||'Depth';
  if(P.xl){const L=SLI.lineW;L.label.textContent=P.xl;L.range.min=L.num.min=P.xmin;L.range.max=L.num.max=P.xmax;st.lineW=clamp(st.lineW,P.xmin/100,P.xmax/100);L.sync();}
  SLI.count.sync();SLI.depth.sync();updVis();}
syncers.push(()=>{patMeta();for(const id in patBtns)patBtns[id].setAttribute('aria-pressed',String(id===st.formula));});

METALS.forEach(([name,hex])=>{const b=document.createElement('button');b.className='sw';b.title=name;b.dataset.key=name;
  b.innerHTML='<i style="background:linear-gradient(135deg,'+stops(hex).join(',')+')"></i><span>'+name+'</span>';
  b.onclick=()=>{st.gradOn=false;st.color=hex;st.colorKey=name;syncUI();thumbsSoon();draw();commit();};$('#gridMetal').appendChild(b);});
function gradSwatch(name,a,b,deg){const bt=document.createElement('button');bt.className='sw';bt.dataset.key=name;bt.title=name+' gradient';
  bt.innerHTML='<i class="two"><b style="background:'+a+'"></b><b style="background:'+b+'"></b></i><span>'+name+'</span>';
  bt.onclick=()=>{st.g1=a;st.g2=b;st.gAng=deg*Math.PI/180;st.gradOn=true;st.colorKey=name;syncUI();thumbsSoon();draw();commit();};return bt;}
function buildGradGrid(){const g=$('#gridGrad');g.innerHTML='';GRADS.forEach(([n,a,b,d])=>g.appendChild(gradSwatch(n,a,b,d)));
  const ig=imageGrad();if(ig)g.appendChild(gradSwatch('Image',ig[0],ig[1],45));updColorSel();}
function updColorSel(){$$('#gridMetal .sw').forEach(b=>b.setAttribute('aria-pressed',String(!st.gradOn&&st.colorKey===b.dataset.key)));
  $$('#gridGrad .sw').forEach(b=>b.setAttribute('aria-pressed',String(st.gradOn&&st.colorKey===b.dataset.key)));
  $('#colorName').textContent=st.gradOn?(GRADS.some(g=>g[0]===st.colorKey)||st.colorKey==='Image'?st.colorKey+' gradient':'Custom gradient'):st.colorKey;}
syncers.push(updColorSel);
function updVis(){const P=PAT[st.formula];
  $('#rowCount').hidden=!P.cl;$('#rowLine').hidden=!P.xl;$('#rowDepth').hidden=!P.dl;$('#rowAccent').hidden=!P.acc;
  $('#rowCustom').hidden=st.gradOn;['rowGradFrom','rowGradTo','rowGradAng'].forEach(i=>$('#'+i).hidden=!st.gradOn);
  const t=st.tex!=='none';$('#rowTexAmt').hidden=$('#rowTexRot').hidden=$('#rowShuffleTex').hidden=!t;$('#rowTexDens').hidden=!t||st.tex==='energy';$('#rowEAmt').hidden=$('#rowELen').hidden=st.tex!=='energy';$('#rowEnergy').hidden=st.tex!=='energy';
  $('#rowPad').hidden=st.autoFit;}
syncers.push(updVis);

const LOOKS=[
 {name:'Hero',formula:'ridge',depth:.75,color:'#8a9199',colorKey:'Steel',tex:'stone',texAmt:.85,width:.11},
 {name:'Enemy',formula:'ridge',depth:.75,gradOn:true,g1:'#ff8a1f',g2:'#7a0c10',gAng:Math.PI/4,colorKey:'Enemy',tex:'stone',texAmt:.85,width:.11},
 {name:'Royal Braid',formula:'braid',color:'#d9a521',colorKey:'Gold',accent:'#2a1b4d',width:.13,count:10,depth:.6},
 {name:'Frost Scales',formula:'scales',color:'#8fd3f0',colorKey:'Ice',width:.14,count:20,depth:.5},
 {name:'Arcane Energy',formula:'ridge',depth:.75,gradOn:true,g1:'#b36cff',g2:'#1a2a8c',gAng:Math.PI/4,colorKey:'Arcane',tex:'energy',texAmt:.85,eCol:'#c7b3ff',width:.13},
 {name:'Bone Runes',formula:'tally',color:'#d9cdb0',colorKey:'Bone',accent:'#b3202e',width:.14,count:40,depth:.7},
 {name:'Oak & Iron',formula:'studs',color:'#7a5230',colorKey:'Wood',accent:'#3c4148',tex:'wood',texAmt:.7,width:.16,count:16,depth:.55},
 {name:'Dragon Flames',formula:'flames',gradOn:true,g1:'#ffd23f',g2:'#b3111a',gAng:Math.PI/2,colorKey:'Lava',width:.18,count:14,depth:.75}];
let saved=[];try{const raw=JSON.parse(store.get('tw_styles')||'[]');saved=(Array.isArray(raw)?raw:[]).map(l=>({name:String(l&&l.name||'My look').slice(0,24),...sanitizeSettings(l)})).filter(l=>l.formula).slice(0,24);}catch(e){saved=[];}
const lookFull=l=>{const f=Object.prototype.hasOwnProperty.call(PAT,l.formula)?l.formula:'plain';return{...RING_DEFAULT,count:PAT[f].n,depth:PAT[f].d,lineW:PAT[f].xd||.1,...l,formula:f,tex:fixTex(l.tex)};};
function buildLooks(){const box=$('#looks');box.innerHTML='';
  const add=(l,idx)=>{const d=document.createElement('div');d.className='look';d.setAttribute('role','listitem');
    d.innerHTML='<button class="a"><canvas width="112" height="112"></canvas><span></span></button>';
    d.querySelector('span').textContent=l.name;d.querySelector('.a').title='Apply '+l.name;d.querySelector('.a').onclick=()=>applyLook(l);d._look=l;
    if(idx!=null){const x=document.createElement('button');x.className='x';x.textContent='×';x.title='Delete saved look';x.setAttribute('aria-label','Delete '+l.name);
      x.onclick=()=>{saved.splice(idx,1);store.set('tw_styles',JSON.stringify(saved));buildLooks();thumbsNow();};d.appendChild(x);}
    box.appendChild(d);};
  saved.forEach((l,i)=>add(l,i));LOOKS.forEach(l=>add(l));}
function applyLook(l){const f=lookFull(l);RING_KEYS.forEach(k=>st[k]=f[k]);syncUI();thumbsSoon();draw();commit();}
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
$('#bShuffleLook').onclick=()=>{const f=pick(PAT_ORDER),P=PAT[f],m=pick(METALS),g=Math.random()<.3?pick(GRADS):null,t=Math.random()<.45?pick(TEX.slice(1))[0]:'none';
  applyLook({formula:f,color:m[1],colorKey:g?g[0]:m[0],gradOn:!!g,g1:g?g[1]:'#ff8a1f',g2:g?g[2]:'#7a0c10',gAng:g?g[3]*Math.PI/180:Math.PI/4,accent:pick(METALS)[1],width:+rnd(.09,.16).toFixed(2),
    count:Math.round(clamp(P.n*rnd(.75,1.3),P.min,P.max)),depth:+rnd(.35,.8).toFixed(2),tex:t,texAmt:TEX_AMT[t]||.6,eAmt:Math.round(rnd(3,9)),eLen:+rnd(.7,1.4).toFixed(2),texRot:Math.random()<.5?0:Math.PI/2,lAng:Math.random()*TAU,seed:1+Math.floor(Math.random()*9999),eCol:pick(['#5ec8ff','#c7b3ff','#ffd36b','#7dff9b'])});};
$('#bTexShuffle').onclick=()=>{st.seed=1+Math.floor(Math.random()*9999);draw();thumbsSoon();commit();};
$('#bSaveLook').onclick=()=>{$('#saveName').value='';$('#saveDlg').showModal();setTimeout(()=>$('#saveName').focus(),30);};
$('#saveForm').addEventListener('submit',e=>{if(e.submitter&&e.submitter.value==='ok'){const name=$('#saveName').value.trim()||'My look',l={name};RING_KEYS.forEach(k=>l[k]=st[k]);
  saved.unshift(l);saved=saved.slice(0,24);store.set('tw_styles',JSON.stringify(saved));buildLooks();thumbsNow();toast('Saved “'+name+'”.');}});

/* thumbnails are redrawn lazily (debounced, only while the Ring tab is open) */
let thumbT=0,thumbsStale=true;
function thumbsSoon(force){thumbsStale=true;if(tab!=='ring')return;clearTimeout(thumbT);thumbT=setTimeout(thumbsNow,force?0:140);}
function thumbsNow(){if(tab!=='ring')return;thumbsStale=false;
  PAT_ORDER.forEach(id=>{const P=PAT[id],c=patBtns[id].querySelector('canvas').getContext('2d');c.clearRect(0,0,120,120);
    drawRing(c,60,56,{...st,formula:id,tex:'none',width:.3,count:id===st.formula?st.count:P.n,depth:id===st.formula?st.depth:P.d,lineW:id===st.formula?st.lineW:(P.xd||.1)});});
  $$('#looks .look').forEach(d=>{const l=lookFull(d._look),c=d.querySelector('canvas').getContext('2d');c.clearRect(0,0,112,112);
    drawRing(c,56,52,{...l,width:Math.min(.34,l.width*2.2)});});}
