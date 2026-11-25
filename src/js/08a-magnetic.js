/* ---------- magnetic lasso: the outline is a least-effort path through the picture's edges (live-wire) ----------
   Hold and drag along an edge (release closes the outline), or click to place points and finish with Enter / Finish.
   Costs come from the colour gradient, so the line prefers to run along strong edges. */
let mgrad=null;
function magGrad(){if(mgrad&&mgrad.d===st.sdata)return mgrad;const W=st.sw,H=st.sh,d=st.sdata,g=new Uint8Array(W*H);
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;let m=0;
    for(let c=0;c<3;c++){const a=(j)=>d[j*4+c],gx=a(i+1)*2+a(i+1-W)+a(i+1+W)-a(i-1)*2-a(i-1-W)-a(i-1+W),gy=a(i+W)*2+a(i+W-1)+a(i+W+1)-a(i-W)*2-a(i-W-1)-a(i-W+1),v=(Math.abs(gx)+Math.abs(gy))/8;if(v>m)m=v;}
    g[i]=m>255?255:m;}
  const h=new Uint32Array(256);for(let i=0;i<g.length;i+=3)h[g[i]]++;let n=0,tot=Math.ceil(g.length/3),cap=24;for(let v=0;v<256;v++){n+=h[v];if(n>=tot*.97){cap=Math.max(24,v);break;}}
  const lut=new Float32Array(256);for(let v=0;v<256;v++){const t=Math.min(1,v/cap);lut[v]=.03+(1-t)*(1-t);}
  return mgrad={d:st.sdata,g,lut};}
/* shortest paths from (sx,sy) inside a window around it */
function magTree(sx,sy,half){const W=st.sw,H=st.sh,G=magGrad(),x0=Math.max(0,sx-half),y0=Math.max(0,sy-half),x1=Math.min(W,sx+half+1),y1=Math.min(H,sy+half+1),w=x1-x0,h=y1-y0,N=w*h;
  const dist=new Float32Array(N).fill(1e30),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N);
  const hp=new Int32Array(N*8+8),hk=new Float32Array(N*8+8);let hn=0;
  const push=(i,k)=>{let p=hn++;while(p>0){const q=(p-1)>>1;if(hk[q]<=k)break;hp[p]=hp[q];hk[p]=hk[q];p=q;}hp[p]=i;hk[p]=k;};
  const pop=()=>{const r=hp[0];hn--;const ki=hp[hn];let p=0;while(true){let c=p*2+1;if(c>=hn)break;if(c+1<hn&&hk[c+1]<hk[c])c++;if(hk[c]>=hk[hn])break;hp[p]=hp[c];hk[p]=hk[c];p=c;}hp[p]=ki;hk[p]=hk[hn];return r;};
  const s=(sy-y0)*w+(sx-x0);dist[s]=0;push(s,0);
  while(hn){const i=pop();if(done[i])continue;done[i]=1;const ix=i%w,iy=(i/w)|0,di=dist[i];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=ix+dx,ny=iy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx;if(done[j])continue;
      const nd=di+G.lut[G.g[(y0+ny)*W+x0+nx]]*(dx&&dy?1.414:1);if(nd<dist[j]){dist[j]=nd;prev[j]=i;push(j,nd);}}}
  return{x0,y0,w,h,prev,sx,sy};}
function magTrace(T,tx,ty){const px=clamp(Math.round(tx),T.x0,T.x0+T.w-1),py=clamp(Math.round(ty),T.y0,T.y0+T.h-1),out=[];let i=(py-T.y0)*T.w+(px-T.x0);
  while(i>=0){out.push({u:T.x0+i%T.w+.5,v:T.y0+((i/T.w)|0)+.5});i=T.prev[i];}out.reverse();
  if(px!==Math.round(tx)||py!==Math.round(ty))out.push({u:tx,v:ty});return out;}
/* move the cursor onto the strongest nearby edge */
function magSnap(q,r){const W=st.sw,H=st.sh,G=magGrad();let bx=Math.round(q.u),by=Math.round(q.v),bs=-1;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=Math.round(q.u)+dx,y=Math.round(q.v)+dy;if(x<1||y<1||x>=W-1||y>=H-1)continue;const dd=Math.hypot(dx,dy);if(dd>r)continue;
    const sc=G.g[y*W+x]-dd*1.5;if(sc>bs){bs=sc;bx=x;by=y;}}
  return{u:clamp(bx,0,st.sw-1),v:clamp(by,0,st.sh-1)};}
function magScale(){const g=geom(cv.width,effPad()),S=cv.width/g.sc/st.vz;return{snap:clamp(Math.round(S*.016),2,14),half:clamp(Math.round(S*.3),40,260),auto:Math.max(24,Math.round(S*.14)),close:S*.025};}
function magDown(e){const sc=magScale(),q=magSnap(imgPt(e),sc.snap);
  if(st.mag){/* click mode: closing click near the start, otherwise a new point at the end of the live path */
    const m=st.mag;m.down={x:e.clientX,y:e.clientY};m.moved=false;m.press=true;m.mode=curMode(e);return;}
  st.mag={mode:curMode(e),fixed:[{u:q.u+.5,v:q.v+.5}],anc:[{u:q.u+.5,v:q.v+.5}],path:[],tree:magTree(q.u,q.v,sc.half),cur:q,down:{x:e.clientX,y:e.clientY},moved:false,press:true,click:false};magSync();}
function magPath(){const m=st.mag;return m.tree?magTrace(m.tree,m.cur.u,m.cur.v):[];}
function magMove(e){const m=st.mag;if(!m)return;const sc=magScale();
  if(m.press&&Math.hypot(e.clientX-m.down.x,e.clientY-m.down.y)>5)m.moved=true;
  if(!m.press&&!m.click)return;
  m.cur=magSnap(imgPt(e),sc.snap);m.path=magPath();
  if(m.path.length>sc.auto*1.5&&(m.press&&m.moved||m.click)){/* keep the older part of the line, start a new live segment from a point behind the cursor */
    const keep=Math.round(sc.auto*.5),idx=m.path.length-1-keep,p=m.path[idx];
    m.fixed.push(...m.path.slice(1,idx+1));m.anc.push({u:p.u,v:p.v});m.tree=magTree(Math.round(p.u-.5),Math.round(p.v-.5),sc.half);m.path=magPath();}
  magSync();}
function magUp(e){const m=st.mag;if(!m||!m.press)return;m.press=false;
  if(m.moved){magMove(e);magFinish();return;}
  /* a click: place a point (or close when clicking the first one) */
  const sc=magScale(),q=magSnap(imgPt(e),sc.snap),a0=m.anc[0];
  if(m.click&&m.anc.length>=2&&Math.hypot(q.u-a0.u,q.v-a0.v)<=sc.close){magFinish();return;}
  if(!m.click){m.click=true;magSync();return;}
  m.cur=q;m.path=magPath();m.fixed.push(...m.path.slice(1));m.anc.push({u:q.u+.5,v:q.v+.5});m.tree=magTree(q.u,q.v,sc.half);m.path=[];magSync();}
function magPts(){const m=st.mag;return m.fixed.concat(m.path.slice(1));}
function magSync(){const m=st.mag;if(!m){st.magDraw=null;}else{st.magDraw={pts:magPts(),mode:m.mode,anc:m.anc};}
  for(const id of['magDone','magBack','magCancel']){const b=$('#'+id);if(b)b.hidden=!(m&&m.click);}const h=$('#magHint');if(h)h.hidden=!!(m&&m.click);draw();}
function magBack(){const m=st.mag;if(!m||!m.click)return;
  if(m.anc.length<=1){magCancel();draw();return;}
  m.anc.pop();const a=m.anc[m.anc.length-1];const at=m.fixed.findIndex((p,i)=>i&&Math.abs(p.u-a.u)<.6&&Math.abs(p.v-a.v)<.6);if(at>=0)m.fixed.length=at+1;
  m.tree=magTree(Math.round(a.u-.5),Math.round(a.v-.5),magScale().half);m.path=magPath();magSync();}
function magCancel(){if(st.mag||st.magDraw){st.mag=null;st.magDraw=null;const h=$('#magHint');if(h)h.hidden=false;for(const id of['magDone','magBack','magCancel']){const b=$('#'+id);if(b)b.hidden=true;}}}
function magFinish(){const m=st.mag;if(!m)return;let pts=magPts();
  /* close with a snapped line back to the start where it is close enough, otherwise straight */
  const last=m.anc[m.anc.length-1],a0=m.anc[0];
  if(Math.hypot(last.u-a0.u,last.v-a0.v)>1){const T=magTree(Math.round(last.u-.5),Math.round(last.v-.5),magScale().half),c=magTrace(T,a0.u-.5,a0.v-.5);pts=pts.concat(c.slice(1));}
  const L={pts,mode:m.mode};magCancel();if(pts.length>=3)lassoApply(L);else draw();}
$('#magDone').onclick=magFinish;$('#magBack').onclick=magBack;$('#magCancel').onclick=()=>{magCancel();draw();};
