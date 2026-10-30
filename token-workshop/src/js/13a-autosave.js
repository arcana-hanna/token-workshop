/* ---------- autosave: the session is kept in this browser (IndexedDB) and comes back on the next visit ---------- */
const AUTO_KEY='session';let autoReady=false,autoT=0;
function idbOpen(){return new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('no indexedDB'));
  const r=indexedDB.open('token-workshop',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function idbDo(mode,fn){const d=await idbOpen();try{return await new Promise((res,rej)=>{const t=d.transaction('kv',mode),q=fn(t.objectStore('kv'));
  t.oncomplete=()=>res(q&&q.result);t.onerror=t.onabort=()=>rej(t.error);});}finally{d.close();}}
async function autosaveNow(){clearTimeout(autoT);if(!autoReady||!st.src)return;
  try{const e=await embedImage();await idbDo('readwrite',s=>s.put({meta:projectMeta(e),img:e.bytes,name:$('#fname').value,size:st.exportSize,at:Date.now()},AUTO_KEY));}catch(err){}}
function autosaveSoon(){if(!autoReady)return;clearTimeout(autoT);autoT=setTimeout(autosaveNow,2000);}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')autosaveNow();});
addEventListener('pagehide',autosaveNow);
async function autoRestore(){
  try{const r=await idbDo('readonly',s=>s.get(AUTO_KEY));
    if(r&&validMeta(r.meta)&&r.img instanceof Uint8Array&&r.img.length<LIMITS.file&&H.a.length<=1){
      await restoreProject({meta:r.meta,img:r.img},'Welcome back. Your last session was restored.');
      if(typeof r.name==='string')$('#fname').value=r.name.slice(0,80);
      if([256,512,1024,2048].includes(r.size)){st.exportSize=r.size;syncUI();}}}
  catch(err){}
  autoReady=true;}
