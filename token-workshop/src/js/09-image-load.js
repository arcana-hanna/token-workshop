/* ---------- image loading ---------- */
function loadCanvas(full,info){
  const k=Math.min(1,WORK_MAX/Math.max(full.width,full.height)),s=k<1?mk():full;
  if(k<1){s.width=Math.max(1,Math.round(full.width*k));s.height=Math.max(1,Math.round(full.height*k));const x=s.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(full,0,0,s.width,s.height);}
  st.full=full;st.src=s;st.sw=s.width;st.sh=s.height;st.embed=null;
  st.sdata=s.getContext('2d',{willReadFrequently:true}).getImageData(0,0,s.width,s.height).data;
  st.mask=new Uint8Array(s.width*s.height);maskChanged();
  st.pal=extractPalette(s);renderPalette();
  Object.assign(st,ADJ_DEFAULT,{ix:0,iy:0,zoom:1,rot:0,flip:1,snapPad:true,vz:1,vx:0,vy:0,eReach:edgeReachDefault(),gap:0,autoSens:50,autoShrink:0});eSess=null;wand=null;clampView();
  $('#srcInfo').textContent=info;
  H.a=[];H.i=-1;updHist();}
function loadFile(f){
  if(f.size>LIMITS.file)return toast('That file is too large (limit about 120 MB).');
  busy(1,'Loading image…');const url=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{URL.revokeObjectURL(url);if(im.naturalWidth*im.naturalHeight>LIMITS.imagePixels){busy(-1);return toast('That picture is too large (limit about 50 megapixels).');}
    const k=Math.min(1,FULL_MAX/Math.max(im.naturalWidth,im.naturalHeight)),c=mk();
    c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));
    const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(im,0,0,c.width,c.height);
    loadCanvas(c,f.name+' · '+im.naturalWidth+'×'+im.naturalHeight+' px'+(k<1?' (kept at '+c.width+'×'+c.height+' for export)':'')+'.');
    st.popOn=true;syncUI();commit();draw();busy(-1);dismissCoach(true);setTool('select');
    if(tab==='image')setTab('popout');
    runAuto();};
  im.onerror=()=>{busy(-1);toast('Could not read that image.');};im.src=url;}
function sampleArt(){
  const c=mk();c.width=c.height=800;const x=c.getContext('2d');
  const bg=x.createLinearGradient(0,0,0,800);bg.addColorStop(0,'#1e1b4b');bg.addColorStop(.6,'#7a3f7a');bg.addColorStop(1,'#f59e6b');x.fillStyle=bg;x.fillRect(0,0,800,800);
  x.fillStyle='#fff7d6';for(let i=0;i<60;i++){const px=(Math.sin(i*91.7)*.5+.5)*800,py=(Math.sin(i*37.3+2)*.5+.5)*420;x.globalAlpha=.4+.5*((i*7)%5)/5;x.beginPath();x.arc(px,py,1+(i%3),0,TAU);x.fill();}x.globalAlpha=1;
  x.fillStyle='#6b3fa0';x.beginPath();x.ellipse(400,830,340,210,0,0,TAU);x.fill();
  x.fillStyle='#f0c9a0';x.beginPath();x.arc(405,440,105,0,TAU);x.fill();
  x.fillStyle='#e3ac82';x.beginPath();x.arc(405,468,17,0,TAU);x.fill();
  x.fillStyle='#2a2438';x.beginPath();x.arc(365,435,8,0,TAU);x.arc(447,435,8,0,TAU);x.fill();
  x.fillStyle='#f2efe9';x.beginPath();x.moveTo(300,478);x.quadraticCurveTo(300,700,410,775);x.quadraticCurveTo(515,700,520,478);x.quadraticCurveTo(410,540,300,478);x.fill();
  x.fillStyle='#2f4aa8';x.beginPath();x.moveTo(228,338);x.quadraticCurveTo(370,160,432,10);x.quadraticCurveTo(472,170,585,338);x.closePath();x.fill();
  x.beginPath();x.ellipse(406,338,252,42,0,0,TAU);x.fill();
  return c;}
