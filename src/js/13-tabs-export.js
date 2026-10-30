/* ---------- tabs ---------- */
const TABS=['image','popout','ring','export'];let tab='image';
function setTab(name,focus){tab=name;TABS.forEach(t=>{const sel=t===name;$('#t-'+t).setAttribute('aria-selected',String(sel));$('#t-'+t).tabIndex=sel?0:-1;$('#p-'+t).hidden=!sel;});
  if(focus)$('#t-'+name).focus();
  if(name==='ring'&&thumbsStale)thumbsNow();if(name==='export'){updExport();miniSoon(true);}
  if(!DESKTOP.matches)scrollTo({top:0});else $('.inspector').scrollTop=0;}
$$('.tab').forEach(b=>{b.onclick=()=>setTab(b.dataset.tab);
  b.addEventListener('keydown',e=>{const i=TABS.indexOf(b.dataset.tab);let n=-1;
    if(e.key==='ArrowRight')n=(i+1)%4;else if(e.key==='ArrowLeft')n=(i+3)%4;else if(e.key==='Home')n=0;else if(e.key==='End')n=3;
    if(n>=0){e.preventDefault();setTab(TABS[n],true);}});});
$$('[data-next]').forEach(b=>b.onclick=()=>setTab(b.dataset.next));

/* ---------- export ---------- */
/* st.exportWhat: token | ring | pop | layers.  st.exportFmt: png | webp */
const FMT={png:{type:'image/png',ext:'png'},webp:{type:'image/webp',ext:'webp'}};
function zipStore(files){const enc=new TextEncoder(),d=new Date(),dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(),tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),parts=[],cd=[];let off=0;
  for(const f of files){const nm=enc.encode(f.name),crc=crc32(f.bytes),lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(10,tm,true);lh.setUint16(12,dt,true);
    lh.setUint32(14,crc,true);lh.setUint32(18,f.bytes.length,true);lh.setUint32(22,f.bytes.length,true);lh.setUint16(26,nm.length,true);lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer),nm,f.bytes);
    const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);ch.setUint16(12,tm,true);ch.setUint16(14,dt,true);
    ch.setUint32(16,crc,true);ch.setUint32(20,f.bytes.length,true);ch.setUint32(24,f.bytes.length,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
    cd.push(new Uint8Array(ch.buffer),nm);off+=30+nm.length+f.bytes.length;}
  let cds=0;for(const p of cd)cds+=p.length;
  const end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cds,true);end.setUint32(16,off,true);
  return new Blob([...parts,...cd,new Uint8Array(end.buffer)],{type:'application/zip'});}
/* one rendered image: the whole token or a single layer, as PNG or WebP (falls back to PNG where WebP is unavailable) */
async function renderImage(layer,fmt,embed){const S=st.exportSize,c=mk();c.width=c.height=S;
  render(c.getContext('2d'),S,{clean:true,hi:true,pad:exportPad(),layer});
  let ext=fmt,blob=await new Promise(r=>c.toBlob(r,FMT[fmt].type,.95));
  if(!blob||blob.type!==FMT[fmt].type){ext='png';blob=await new Promise(r=>c.toBlob(r,'image/png'));if(fmt==='webp')toast('This browser cannot save WebP, so PNG was used.');}
  if(!blob||!embed||layer)return{blob,ext};
  const e=await embedImage(),chunk=buildChunk(projectMeta(e),e.bytes),bytes=new Uint8Array(await blob.arrayBuffer());
  if(ext==='png')return{blob:new Blob([injectChunk(bytes,chunk)],{type:'image/png'}),ext};
  /* WebP: append a RIFF chunk "TKWS" and fix the RIFF size */
  const pl=chunk.subarray(8,chunk.length-4),pad=pl.length&1,out=new Uint8Array(bytes.length+8+pl.length+pad),dv=new DataView(out.buffer);
  out.set(bytes);out.set([0x54,0x4b,0x57,0x53],bytes.length);dv.setUint32(bytes.length+4,pl.length,true);out.set(pl,bytes.length+8);dv.setUint32(4,out.length-8,true);
  return{blob:new Blob([out],{type:'image/webp'}),ext};}
const exportBase=()=>($('#fname').value||'').trim().replace(/[\\/:*?"<>|]+/g,'').replace(/\.(png|webp|zip)$/i,'')||'token';
async function saveBlob(blob,name){let dl=null;try{dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;}catch(e){}
  if(dl){try{await dl.save({filename:name,data:blob});toast('Saved '+name);return;}catch(e){if(e&&e.code==='declined')return;}}
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast('Downloading '+name);}
async function exportFile(){const what=st.exportWhat,base=exportBase(),fmt=st.exportFmt,embed=st.embedOn;
  if(what==='token'){const r=await renderImage(undefined,fmt,embed);return{blob:r.blob,name:base+'.'+r.ext};}
  if(what==='ring'||what==='pop'){const r=await renderImage(what,fmt,false);return{blob:r.blob,name:base+(what==='ring'?'-ring.':'-popout.')+r.ext};}
  const parts=[['token',undefined],['ring','ring'],['picture','art'],['popout','pop']],files=[];
  for(const[n,layer]of parts){const r=await renderImage(layer,fmt,embed&&!layer);files.push({name:base+'-'+n+'.'+r.ext,bytes:new Uint8Array(await r.blob.arrayBuffer())});}
  return{blob:zipStore(files),name:base+'-layers.zip'};}
async function exportPng(){busy(1,'Rendering…');await new Promise(r=>setTimeout(r,20));
  try{const r=await exportFile();if(!r.blob)return toast('Export failed.');await saveBlob(r.blob,r.name);}finally{busy(-1);}}
function projectMeta(e){return{app:'token-workshop',v:3,created:new Date().toISOString(),img:{type:e.type},
  settings:Object.fromEntries(SETTINGS.map(k=>[k,st[k]])),mask:{w:st.sw,h:st.sh,rle8:b64enc(rle8Enc(st.mask))}};}
async function makeBlob(embed){return(await renderImage(undefined,'png',embed)).blob;}
async function copyPng(){busy(1,'Rendering…');await new Promise(r=>setTimeout(r,20));
  try{const blob=await makeBlob(false);await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);toast('Copied to clipboard.');}
  catch(e){toast('Copy is blocked here. Use Download instead.');}finally{busy(-1);}}
$('#bDownload').onclick=exportPng;$('#bCopy').onclick=copyPng;
const WHAT_NOTE={token:'The finished token: picture, ring and pop-out together.',ring:'Only the ring, transparent in the middle. Handy as a reusable frame.',pop:'Only the pop-out part of the picture, transparent elsewhere.',layers:'A .zip with the finished token plus ring, picture and pop-out as separate transparent files. All have the same framing, so they stack exactly.'};
function updExport(){$('#dlSize').textContent=st.exportSize+' px';
  const ext=st.exportWhat==='layers'?'zip':st.exportFmt;$('#fext').textContent='.'+ext;$('#dlWhat').textContent=st.exportWhat==='layers'?'Download layers (.zip)':st.exportWhat==='ring'?'Download ring ('+ext.toUpperCase()+')':st.exportWhat==='pop'?'Download pop-out ('+ext.toUpperCase()+')':'Download '+ext.toUpperCase();
  $('#whatNote').textContent=WHAT_NOTE[st.exportWhat];$('#bDownload').title='Download as '+ext+' (Ctrl/⌘+S)';if(!st.full)return;
  const native=Math.round(Math.min(st.full.width,st.full.height)/st.zoom/(1-2*exportPad()));
  $$('#sizes button').forEach(b=>{const soft=+b.dataset.v>native*1.05;b.classList.toggle('soft',soft);b.title=soft?'Larger than your photo can deliver sharply':'';});
  $('#expNote').textContent=native>=2048?'Your photo has enough detail for every size.':'Your photo stays sharp up to about '+native+' px at this zoom. Sizes marked ↑ are upscaled and may look soft.';}
let miniT=0;function miniSoon(now){if(tab!=='export')return;clearTimeout(miniT);miniT=setTimeout(drawMini,now?0:100);}
function drawMini(){if(!st.src||tab!=='export')return;const S=192,c=off(3,S);render(c.getContext('2d'),S,{clean:true,pad:exportPad()});
  const dpr=devicePixelRatio||1;$$('.mini').forEach(m=>{const px=Math.round(+m.dataset.s*dpr);m.width=m.height=px;const x=m.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(c,0,0,px,px);});}
