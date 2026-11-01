/* ---------- history: one stack for selection, view and ring changes ---------- */
const H={a:[],i:-1};
function snap(){return{m:st.mask,s:JSON.stringify(SETTINGS.map(k=>st[k]))};}
function commit(keep){if(!st.src)return;if(!keep)wand=null;const s=snap(),cur=H.a[H.i];if(cur&&cur.m===s.m&&cur.s===s.s)return;
  H.a.length=H.i+1;H.a.push(s);if(H.a.length>40)H.a.shift();H.i=H.a.length-1;updHist();autosaveSoon();}
function restore(sn){wand=null;st.mask=sn.m;const v=JSON.parse(sn.s);SETTINGS.forEach((k,i)=>st[k]=v[i]);
  maskChanged();syncUI();thumbsSoon();draw();}
function undo(){if(H.i<=0)return toast('Nothing to undo.');H.i--;restore(H.a[H.i]);updHist();}
function redo(){if(H.i>=H.a.length-1)return toast('Nothing to redo.');H.i++;restore(H.a[H.i]);updHist();}
function updHist(){$('#bUndo2').disabled=H.i<=0;$('#bRedo2').disabled=H.i>=H.a.length-1;$('#bUndo').disabled=H.i<=0;$('#bRedo').disabled=H.i>=H.a.length-1;}
let commitT=0;const commitSoon=()=>{clearTimeout(commitT);commitT=setTimeout(commit,350);};
