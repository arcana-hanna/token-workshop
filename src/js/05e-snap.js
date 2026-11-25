/* ---------- edge snapping: the magnetic-lasso idea applied to an automatic selection ----------
   The outline of a candidate is cut into short pieces. Each piece is re-routed through the picture's real edges with the same
   live-wire search the Magnet tool uses, but only inside a narrow corridor around the old outline, so it can fix small errors
   (the analysis runs on a reduced picture) without ever wandering off. */
function sgContour(b,W,H,sx,sy){const dx=[1,1,0,-1,-1,-1,0,1],dy=[0,1,1,1,0,-1,-1,-1],at=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&b[y*W+x]===1,pts=[{x:sx,y:sy}];
  let x=sx,y=sy,bk=4,first=-1,guard=0;const lim=4*(W+H)+W*H/4;
  while(guard++<lim){let found=-1;for(let k=1;k<=8;k++){const d=(bk+k)%8;if(at(x+dx[d],y+dy[d])){found=k;break;}}
    if(found<0)break;const d=(bk+found)%8,pd=(bk+found-1)%8,nx=x+dx[d],ny=y+dy[d],bx=x+dx[pd],by=y+dy[pd];
    if(first<0)first=ny*W+nx;else if(x===sx&&y===sy&&ny*W+nx===first)break;
    let nb=0;for(let q=0;q<8;q++)if(nx+dx[q]===bx&&ny+dy[q]===by){nb=q;break;}
    x=nx;y=ny;bk=nb;if(x===sx&&y===sy&&first>=0&&guard>2){/* back at the start: stop when the next step repeats the first */}
    pts.push({x,y});}
  return pts;}
/* cheapest route between two points inside the corridor (null when the corridor does not connect them) */
function sgRoute(a,b,corr,W,H,pad){const G=magGrad(),x0=Math.max(0,Math.min(a.x,b.x)-pad),y0=Math.max(0,Math.min(a.y,b.y)-pad),x1=Math.min(W,Math.max(a.x,b.x)+pad+1),y1=Math.min(H,Math.max(a.y,b.y)+pad+1),w=x1-x0,h=y1-y0,N=w*h;
  const dist=new Float32Array(N).fill(1e30),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N),hp=new Int32Array(N*8+8),hk=new Float32Array(N*8+8);let hn=0;
  const push=(i,k)=>{let p=hn++;while(p>0){const q=(p-1)>>1;if(hk[q]<=k)break;hp[p]=hp[q];hk[p]=hk[q];p=q;}hp[p]=i;hk[p]=k;};
  const pop=()=>{const r=hp[0];hn--;const ki=hp[hn],kk=hk[hn];let p=0;while(true){let c=p*2+1;if(c>=hn)break;if(c+1<hn&&hk[c+1]<hk[c])c++;if(hk[c]>=kk)break;hp[p]=hp[c];hk[p]=hk[c];p=c;}hp[p]=ki;hk[p]=kk;return r;};
  const s=(a.y-y0)*w+(a.x-x0),t=(b.y-y0)*w+(b.x-x0);dist[s]=0;push(s,0);
  while(hn){const i=pop();if(done[i])continue;done[i]=1;if(i===t)break;const ix=i%w,iy=(i/w)|0,di=dist[i];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=ix+dx,ny=iy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx;if(done[j])continue;
      const gi=(y0+ny)*W+x0+nx;if(!corr[gi])continue;const nd=di+G.lut[G.g[gi]]*(dx&&dy?1.414:1);if(nd<dist[j]){dist[j]=nd;prev[j]=i;push(j,nd);}}}
  if(!done[t])return null;const out=[];let i=t;while(i>=0){out.push({u:x0+i%w+.5,v:y0+((i/w)|0)+.5});i=prev[i];}return out.reverse();}
function sgSnap(m){const W=st.sw,H=st.sh,N=W*H,b=new Uint8Array(N);let any=0;for(let i=0;i<N;i++)if(m[i]>=128){b[i]=1;any++;}
  if(any<200||any>N*.97)return m;
  const{lab,sizes}=sgLabel(b,W,H),first=new Int32Array(sizes.length).fill(-1);for(let i=0;i<N;i++){const l=lab[i];if(l&&first[l]<0)first[l]=i;}
  const comps=[];for(let l=1;l<sizes.length;l++)if(sizes[l]>=Math.max(300,any*.02))comps.push(l);comps.sort((p,q)=>sizes[q]-sizes[p]);
  const d=clamp(Math.round(Math.max(W,H)/220),3,8),step=Math.max(8,Math.round(Math.max(W,H)/80)),polys=[],ring=new Uint8Array(N);
  for(const l of comps.slice(0,3)){const f=first[l],P=sgContour(b,W,H,f%W,(f/W)|0);if(P.length<24)continue;
    for(const p of P)ring[p.y*W+p.x]=1;
    const A=[],O=[];for(let i=0;i<P.length;i+=step){const g0=magGrad().g,o=P[i],q=magSnap({u:o.x,v:o.y},d),keep=g0[q.v*W+q.u]>=1.5*g0[o.y*W+o.x]+8;
      A.push(keep?{x:q.u,y:q.v}:{x:o.x,y:o.y});O.push(P.slice(i,i+step+1));}
    if(P.length%step!==1)O[O.length-1]=P.slice((O.length-1)*step).concat([P[0]]);polys.push({A,O});}
  if(!polys.length)return m;
  /* corridor = every pixel within d of the old outline */
  const t=new Uint8Array(N),corr=new Uint8Array(N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!ring[y*W+x])continue;for(let q=Math.max(0,x-d);q<=Math.min(W-1,x+d);q++)t[y*W+q]=1;}
  for(let x=0;x<W;x++)for(let y=0;y<H;y++){if(!t[y*W+x])continue;for(let q=Math.max(0,y-d);q<=Math.min(H-1,y+d);q++)corr[q*W+x]=1;}
  const c=mk();c.width=W;c.height=H;const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';
  const G=magGrad(),cost=(pts)=>{let c=0;for(const p of pts)c+=G.lut[G.g[Math.min(H-1,Math.floor(p.v))*W+Math.min(W-1,Math.floor(p.u))]];return c/Math.max(1,pts.length);};
  for(const{A,O}of polys){x.beginPath();let started=false;
    for(let i=0;i<A.length;i++){const a=A[i],bb=A[(i+1)%A.length],r=sgRoute(a,bb,corr,W,H,d+2),old=(O[i]||[]).map(p=>({u:p.x+.5,v:p.y+.5})),
        /* keep the old piece unless the new route really runs along stronger edges */
        seg=r&&(!old.length||cost(r)<cost(old)*.8)?r:old.length>1?old:[{u:a.x+.5,v:a.y+.5},{u:bb.x+.5,v:bb.y+.5}];
      seg.forEach((p,j)=>{if(!started){x.moveTo(p.u,p.v);started=true;}else if(j||!i)x.lineTo(p.u,p.v);});}
    x.closePath();x.fill();}
  const pd=x.getImageData(0,0,W,H).data,out=new Uint8Array(m);
  for(let i=0;i<N;i++)if(corr[i])out[i]=pd[i*4+3]>=128?255:0;
  /* a 1 px soft edge inside the corridor only */
  const o2=new Uint8Array(out);for(let y=1;y<H-1;y++)for(let xx=1;xx<W-1;xx++){const i=y*W+xx;if(!corr[i])continue;let s=0;for(let q=-1;q<=1;q++)for(let p=-1;p<=1;p++)s+=out[i+q*W+p];o2[i]=Math.round(s/9);}
  return o2;}
