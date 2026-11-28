/* ---------- Auto suggestions: a full-screen layer with large options; clicking one applies it (Undo reverts) ---------- */
/* exported suggestBest */
let sg=null;
const SG_KIND={whole:'Whole figure',pop:'Head & hair only'};
function sgClose(){const had=!!(sg||st.sgShow);sg=null;st.sgShow=null;st.sgCv=null;const b=$('#sgBar');if(b)b.hidden=true;if(had)draw();}
function sgPreview(c){st.sgShow=c||null;st.sgCv=null;draw();}
/* tinted copy of a candidate's mask for the canvas overlay */
function sgOverlay(ctx,g,S){const c=st.sgShow;if(!c)return;
  if(!st.sgCv){const W=st.sw,H=st.sh,cv2=mk();cv2.width=W;cv2.height=H;const x=cv2.getContext('2d'),id=x.createImageData(W,H),m=c.mask;
    for(let i=0;i<W*H;i++){id.data[i*4]=48;id.data[i*4+1]=209;id.data[i*4+2]=88;id.data[i*4+3]=m[i];}x.putImageData(id,0,0);st.sgCv=cv2;}
  ctx.save();ctx.globalAlpha=.5;applyT(ctx,g);ctx.drawImage(st.sgCv,0,0,st.sw,st.sh);ctx.restore();}
/* small picture of what a candidate selects: the area around the ring, with the rest dimmed */
function sgThumb(c,I){const T=220,cv2=mk();cv2.width=cv2.height=T*2;const x=cv2.getContext('2d'),W=st.sw,H=st.sh,k=I.k,cx=I.cx/k,cy=I.cy/k,half=I.R/k*1.8,sx=cx-half,sy=cy-half,sz=half*2,P=T*2;
  x.fillStyle='#d8d8de';x.fillRect(0,0,P,P);x.fillStyle='#ececf0';for(let i=0;i<8;i++)for(let j=0;j<8;j++)if((i+j)%2)x.fillRect(i*P/8,j*P/8,P/8,P/8);
  x.imageSmoothingQuality='high';x.save();x.globalAlpha=.28;x.drawImage(st.src,sx,sy,sz,sz,0,0,P,P);x.restore();
  const p=mk();p.width=p.height=P;const px=p.getContext('2d');px.imageSmoothingQuality='high';px.drawImage(st.src,sx,sy,sz,sz,0,0,P,P);
  const mc=mk();mc.width=mc.height=P;const mx=mc.getContext('2d'),id=mx.createImageData(P,P),m=c.mask;
  for(let yy=0;yy<P;yy++){const v=Math.min(H-1,Math.max(0,Math.floor(sy+(yy+.5)/P*sz)));for(let xx=0;xx<P;xx++){const u=Math.min(W-1,Math.max(0,Math.floor(sx+(xx+.5)/P*sz)));id.data[(yy*P+xx)*4+3]=(sx+(xx+.5)/P*sz<0||sy+(yy+.5)/P*sz<0)?0:m[v*W+u];}}
  mx.putImageData(id,0,0);px.globalCompositeOperation='destination-in';px.drawImage(mc,0,0);x.drawImage(p,0,0);
  x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=3;x.beginPath();x.arc(P/2,P/2,P/3.6,0,TAU);x.stroke();x.strokeStyle='rgba(0,0,0,.55)';x.lineWidth=1.5;x.stroke();
  return cv2;}
function sgRender(){const list=$('#sgList');list.textContent='';
  sg.pick.forEach((c,i)=>{const b=document.createElement('button');b.className='sg-card';b.type='button';
    b.title=c.name+': '+SG_KIND[c.kind]+'. Click to use it.';
    if(i===0){const t=document.createElement('span');t.className='best';t.textContent='Best guess';b.appendChild(t);}
    b.appendChild(sgThumb(c,sg.I));
    const n=document.createElement('b');n.textContent=c.name;const k=document.createElement('span');k.className='k';k.textContent=SG_KIND[c.kind];b.append(n,k);
    b.onclick=()=>sgApply(c);
    list.appendChild(b);});
  $('#sgBar').dataset.n=sg.pick.length;$('#sgBar').hidden=false;sg.sel=-1;sgPreview(null);const f=list.querySelector('.sg-card');if(f)f.focus({preventScroll:true});}
function sgApply(c){if(!c)return;lab('Auto suggestion applied'+(c.label?': '+c.label:''));let m=c.mask.slice();const matte=!!c.mask.bg;
  if(matte&&!autoFixOn())for(let i=0;i<m.length;i++)m[i]=m[i]>=128?255:0;
  st.mask=m;maskChanged();let note='Pop-out applied. Refine it with Click, Paint or Trace, or Undo.';
  if(matte&&autoFixOn()){st.bgC=c.mask.bg;st.bgAuto=true;st.defr=1;eSess=null;}
  else if(!matte&&autoFixOn()){try{fixEdges(true);}catch(e){}}
  st.popOn=true;sgClose();syncUI();draw();commit();toast(note);}
function runSuggest(){if(!st.src)return;busy(1,'Finding suggestions…');
  setTimeout(()=>{let r=null;try{r=sgCandidates();}catch(e){}
    busy(-1);
    const pick=r?sgPick(r.cands).filter(c=>c.score>(c.kind==='pop'?-.3:0)):[];
    if(!pick.length){sgClose();toast('No clear suggestion. Open the Pop-out step and click the part that should pop out.');setTab('popout');setTool('select');return;}
    sg={I:r.I,pick,sel:-1};sgRender();},30);}
addEventListener('keydown',e=>{if(e.key==='Escape'&&sg&&!$('#sgBar').hidden){e.preventDefault();e.stopPropagation();sgClose();}},true);
$('#sgClose').onclick=sgClose;

/* apply the top suggestion straight away (used by the tests; the app always lets the user choose) */
function suggestBest(kind,id){const r=sgCandidates(),c=id?r.cands.find(x=>x.id===id):sgPick(r.cands).find(x=>!kind||x.kind===kind);if(!c)return false;sgApply(c);return true;}
