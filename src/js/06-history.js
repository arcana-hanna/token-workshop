/* ---------- history: one stack for selection, view and ring changes ---------- */
const H={a:[],i:-1};
function snap(){return{m:st.mask,s:JSON.stringify(SETTINGS.map(k=>st[k]))};}
/* read-only edit history: short text lines, saved with the token. Repeats of the same kind of step are counted, not listed. */
const LOGMAX=150;st.log=[];
function lab(t){st.lab=t;}
const KEYNAME={ix:'moved picture',iy:'moved picture',zoom:'resized picture',rot:'rotated picture',flip:'flipped picture',pad:'canvas padding',autoFit:'auto-fit canvas',popOn:'pop-out on/off',bgOn:'fill',bg:'fill colour'};
function logStep(prev,s){let t=st.lab;st.lab=null;
  if(!t){const a=JSON.parse(prev.s),b=JSON.parse(s.s),ch=[];SETTINGS.forEach((k,i)=>{if(JSON.stringify(a[i])!==JSON.stringify(b[i])){const n=KEYNAME[k]||(typeof SLI!=='undefined'&&SLI[k]&&SLI[k].label?SLI[k].label.textContent.toLowerCase():'ring '+k);if(!ch.includes(n))ch.push(n);}});
    if(prev.m!==s.m&&!ch.length){const T={select:'Wand',lasso:'Lasso',magnet:'Magnet lasso',brush:'Brush'}[st.tool];t=T?T+(typeof curMode==='function'&&curMode()==='sub'?' removed':' added')+' to the selection':'Selection edited';}t=t||(ch.length?'Changed '+ch.slice(0,4).join(', ')+(ch.length>4?' …':''):'');}
  if(!t)return;const L=st.log,last=L[L.length-1];
  if(last&&last.t===t)last.n++;else{L.push({t,n:1});if(L.length>LOGMAX)L.shift();}}
function logLines(){return st.log.map(e=>e.n>1?e.t+' ×'+e.n:e.t);}
function commit(keep){if(!st.src)return;if(!keep)wand=null;const s=snap(),cur=H.a[H.i];if(cur&&cur.m===s.m&&cur.s===s.s)return;if(cur&&H.i>=0)logStep(cur,s);if(typeof tipDone==='function'&&cur)tipDone();
  H.a.length=H.i+1;H.a.push(s);if(H.a.length>40)H.a.shift();H.i=H.a.length-1;updHist();autosaveSoon();}
function restore(sn){wand=null;st.mask=sn.m;const v=JSON.parse(sn.s);SETTINGS.forEach((k,i)=>st[k]=v[i]);
  maskChanged();syncUI();thumbsSoon();draw();}
function undo(){if(H.i<=0)return toast('Nothing to undo.');H.i--;restore(H.a[H.i]);updHist();}
function redo(){if(H.i>=H.a.length-1)return toast('Nothing to redo.');H.i++;restore(H.a[H.i]);updHist();}
function updHist(){$('#bUndo2').disabled=H.i<=0;$('#bRedo2').disabled=H.i>=H.a.length-1;$('#bUndo').disabled=H.i<=0;$('#bRedo').disabled=H.i>=H.a.length-1;}
let commitT=0;const commitSoon=()=>{clearTimeout(commitT);commitT=setTimeout(commit,350);};
