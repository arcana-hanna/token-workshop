/* ---------- editable project inside the exported PNG (private chunk "tkWs") ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=CRC[(c^u8[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function b64enc(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);}
function b64dec(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
function rleDec(u8,len){const m=new Uint8Array(len);let p=0,i=0,cur=0;
  while(i<u8.length&&p<len){let n=0,sh=0,b;do{b=u8[i++];n+=(b&127)*Math.pow(2,sh);sh+=7;}while((b&128)&&i<u8.length&&sh<35);if(cur)m.fill(255,p,Math.min(len,p+n));p+=n;cur^=1;}return m;}
/* 8-bit mask: 5 bits per pixel (32 levels) in runs, so soft edges stay compact */
function rle8Enc(m){const out=[],n=m.length;let i=0;
  while(i<n){const v=m[i]>>3;let j=i+1;while(j<n&&(m[j]>>3)===v)j++;out.push(v);let r=j-i;while(r>127){out.push(r&127|128);r>>>=7;}out.push(r);i=j;}
  return Uint8Array.from(out);}
function rle8Dec(u8,len){const m=new Uint8Array(len);let p=0,i=0;
  while(i<u8.length&&p<len){const v=u8[i++]&31;let n=0,sh=0,b;do{b=u8[i++];n+=(b&127)*Math.pow(2,sh);sh+=7;}while((b&128)&&i<u8.length&&sh<35);
    if(v)m.fill((v<<3)|(v>>2),p,Math.min(len,p+n));p+=n;}return m;}
function resampleMask(m,w,h){const o=new Uint8Array(st.sw*st.sh);
  for(let y=0;y<st.sh;y++){const sy=Math.min(h-1,Math.floor(y/st.sh*h));for(let x=0;x<st.sw;x++)o[y*st.sw+x]=m[sy*w+Math.min(w-1,Math.floor(x/st.sw*w))];}return o;}
async function embedImage(){if(st.embed)return st.embed;let alpha=false;const d=st.sdata;for(let i=3;i<d.length;i+=4)if(d[i]<250){alpha=true;break;}
  const type=alpha?'image/png':'image/jpeg',blob=await new Promise(r=>st.full.toBlob(r,type,.92));
  return st.embed={type,bytes:new Uint8Array(await blob.arrayBuffer())};}
function buildChunk(meta,img){const j=new TextEncoder().encode(JSON.stringify(meta)),data=new Uint8Array(4+j.length+img.length);
  new DataView(data.buffer).setUint32(0,j.length);data.set(j,4);data.set(img,4+j.length);
  const out=new Uint8Array(12+data.length),dv=new DataView(out.buffer);dv.setUint32(0,data.length);out.set([0x74,0x6b,0x57,0x73],4);out.set(data,8);
  dv.setUint32(8+data.length,crc32(out.subarray(4,8+data.length)));return out;}
function injectChunk(png,chunk){const at=png.length-12,out=new Uint8Array(png.length+chunk.length);out.set(png.subarray(0,at));out.set(chunk,at);out.set(png.subarray(at),at+chunk.length);return out;}
/* Everything read from a file is untrusted: sizes are checked, the CRC must match, and every setting is validated. */
const LIMITS={file:120e6,json:8e6,maskPixels:16.8e6,imagePixels:50e6};
const NUM=(a,b)=>v=>typeof v==='number'&&isFinite(v)?clamp(v,a,b):undefined;
const BOOL=v=>typeof v==='boolean'?v:undefined;
const COLOR=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():undefined;
const STR=n=>v=>typeof v==='string'?v.slice(0,n):undefined;
const SCHEMA={ix:NUM(-3,3),iy:NUM(-3,3),zoom:NUM(.1,8),rot:NUM(-12.6,12.6),flip:v=>v===-1||v===1?v:undefined,bgOn:BOOL,bg:COLOR,autoFit:BOOL,pad:NUM(0,.45),popOn:BOOL,
  feather:NUM(0,12),shadow:NUM(0,1),formula:v=>typeof v==='string'&&Object.prototype.hasOwnProperty.call(PAT,v)?v:undefined,color:COLOR,accent:COLOR,width:NUM(.04,.3),count:NUM(0,90),depth:NUM(0,1),
  tex:v=>typeof v==='string'?fixTex(v):undefined,texAmt:NUM(0,1),texDens:NUM(.4,5),seed:v=>Number.isInteger(v)?clamp(v,0,1e9):undefined,eCol:COLOR,gradOn:BOOL,g1:COLOR,g2:COLOR,
  gAng:NUM(-12.6,12.6),colorKey:STR(40),lAng:NUM(-12.6,12.6),lInt:NUM(0,1.5),texRot:NUM(-12.6,12.6),lineW:NUM(.01,.4),eAmt:NUM(1,24),eLen:NUM(.2,2),
  bri:NUM(-100,100),con:NUM(-100,100),sat:NUM(-100,100),defr:NUM(0,1),bgC:COLOR,bgAuto:BOOL};
function sanitizeSettings(o){const out={};if(!o||typeof o!=='object')return out;
  for(const k of SETTINGS){if(!Object.prototype.hasOwnProperty.call(o,k))continue;const v=SCHEMA[k]?SCHEMA[k](o[k]):undefined;if(v!==undefined)out[k]=v;}return out;}
function validMeta(meta){const M=meta&&meta.mask;
  if(!meta||meta.app!=='token-workshop'||!meta.img||!M||!meta.settings||typeof meta.settings!=='object')return false;
  if(meta.img.type!=='image/png'&&meta.img.type!=='image/jpeg')return false;
  return Number.isInteger(M.w)&&Number.isInteger(M.h)&&M.w>=1&&M.h>=1&&M.w*M.h<=LIMITS.maskPixels&&((typeof M.rle==='string'&&M.rle.length<=M.w*M.h*2+16)||(typeof M.rle8==='string'&&M.rle8.length<=M.w*M.h*3+16));}
/* payload = 4-byte JSON length, JSON, then the source picture; shared by the PNG chunk and the WebP chunk */
function parsePayload(pl){if(pl.length<4)return null;const jl=new DataView(pl.buffer,pl.byteOffset,pl.byteLength).getUint32(0);if(jl>LIMITS.json||4+jl>pl.length)return null;
  let meta;try{meta=JSON.parse(new TextDecoder().decode(pl.subarray(4,4+jl)));}catch(e){return null;}
  if(!validMeta(meta))return null;return{meta,img:pl.subarray(4+jl)};}
/* WebP: RIFF container, our data lives in an extra "TKWS" chunk (decoders ignore unknown chunks) */
function readWebpProject(u8){const t=(i)=>String.fromCharCode(u8[i],u8[i+1],u8[i+2],u8[i+3]);
  if(!u8||u8.length<20||u8.length>LIMITS.file||t(0)!=='RIFF'||t(8)!=='WEBP')return null;
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);let p=12;
  while(p+8<=u8.length){const len=dv.getUint32(p+4,true);if(len>u8.length-p-8)return null;
    if(t(p)==='TKWS')return parsePayload(u8.subarray(p+8,p+8+len));
    p+=8+len+(len&1);}
  return null;}
function readProject(u8){if(!u8||u8.length<20||u8.length>LIMITS.file||u8[0]!==0x89||u8[1]!==0x50||u8[2]!==0x4e||u8[3]!==0x47)return null;
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);let p=8;
  while(p+12<=u8.length){const len=dv.getUint32(p),type=String.fromCharCode(u8[p+4],u8[p+5],u8[p+6],u8[p+7]);
    if(len>u8.length-p-12)return null;
    if(type==='tkWs'){
      if(crc32(u8.subarray(p+4,p+8+len))!==dv.getUint32(p+8+len)||len<4)return null;
      return parsePayload(u8.subarray(p+8,p+8+len));}
    if(type==='IEND')break;p+=12+len;}
  return null;}
async function restoreProject({meta,img},msg){busy(1,'Opening project…');
  try{const url=URL.createObjectURL(new Blob([img],{type:meta.img.type})),im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});URL.revokeObjectURL(url);
    if(im.naturalWidth*im.naturalHeight>LIMITS.imagePixels)throw new Error('image too large');
    const c=mk();c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);
    loadCanvas(c,'Restored from a saved token · '+c.width+'×'+c.height+' px.');
    Object.assign(st,RING_DEFAULT,sanitizeSettings(meta.settings));
    if(!PAT[st.formula])st.formula='plain';
    const M=meta.mask,m=typeof M.rle8==='string'?rle8Dec(b64dec(M.rle8),M.w*M.h):rleDec(b64dec(M.rle),M.w*M.h);st.mask=(M.w===st.sw&&M.h===st.sh)?m:resampleMask(m,M.w,M.h);maskChanged();
    st.padCur=st.pad;st.snapPad=true;syncUI();commit();thumbsSoon();draw();setTool('select');dismissCoach(true);toast(msg||'Project restored. Everything is editable again.');
  }catch(e){toast('Could not read the project data in that file.');}finally{busy(-1);}}
let pendingOpen=null;
async function openFile(f){if(!f)return;if(!f.type.startsWith('image/'))return toast('That file is not an image.');
  if(f.type==='image/png'||f.type==='image/webp'){try{const b=new Uint8Array(await f.arrayBuffer()),pr=f.type==='image/png'?readProject(b):readWebpProject(b);
    if(pr){pendingOpen={f,pr,url:URL.createObjectURL(f)};$('#impPrev').src=pendingOpen.url;$('#importDlg').showModal();return;}}catch(e){}}
  loadFile(f);}
$('#importDlg').addEventListener('close',()=>{if(pendingOpen)URL.revokeObjectURL(pendingOpen.url);});
$('#impProject').onclick=()=>{const p=pendingOpen;$('#importDlg').close();restoreProject(p.pr);};
$('#impPlain').onclick=()=>{const p=pendingOpen;$('#importDlg').close();loadFile(p.f);};
$('#impCancel').onclick=()=>$('#importDlg').close();
