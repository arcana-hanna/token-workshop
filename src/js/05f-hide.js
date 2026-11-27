/* ---------- Hide a side: part of the pop-out tucks behind the ring (non-destructive, works in ring space) ---------- */
const HIDE_DEF={hideOn:false,hideA:90,hideW:120,hideD:0};
const HIDE_SIDES={bottom:90,left:180,right:0,top:-90};
/* alpha multiplier at a point in ring radii (ring centre 0,0; ring outer edge radius 1): 0 = hidden, 1 = shown */
function hideAlpha(X,Y){if(!st.hideOn)return 1;const r=Math.hypot(X,Y),r0=(1-st.width)+st.hideD*st.width;if(r<r0)return 1;
  let d=Math.atan2(Y,X)*180/Math.PI-st.hideA;d=((d%360)+540)%360-180;
  return 1-Math.max(0,Math.min(1,(st.hideW/2-Math.abs(d))*(Math.PI/180)*Math.max(r,.3)/.04));}
function hideKey(){return st.hideOn?[st.hideA,st.hideW,st.hideD,st.width,st.ix,st.iy,st.zoom,st.rot,st.flip,st.sw,st.sh].join():'';}
function applyHide(m){if(!st.hideOn)return m;const w=st.sw,h=st.sh,k=2/Math.min(w,h)*st.zoom,co=Math.cos(st.rot),si=Math.sin(st.rot),f=st.flip,o=m.slice();
  for(let y=0;y<h;y++){const py=(y+.5-h/2)*k;for(let x=0;x<w;x++){const i=y*w+x;if(!m[i])continue;const px=(x+.5-w/2)*k*f,X=px*co-py*si+st.ix,Y=px*si+py*co+st.iy,a=hideAlpha(X,Y);if(a<1)o[i]=Math.round(m[i]*a);}}
  return o;}
function hideChanged(){st.softDirty=st.popDirty=st.fitDirty=true;syncHide();draw();}
function setHideSide(name){if(name==='none')st.hideOn=false;else{st.hideOn=true;st.hideA=HIDE_SIDES[name];}lab(name==='none'?'Hide a side: off':'Hide a side: '+name);hideChanged();commit();}
function syncHide(){const b=$$('#hideSeg button');b.forEach(x=>{const v=x.dataset.v,on=v==='none'?!st.hideOn:st.hideOn&&Math.abs(((st.hideA-HIDE_SIDES[v])%360+540)%360-180)<1;x.setAttribute('aria-pressed',String(on));});
  $('#hideFine').hidden=!st.hideOn;$('#hideNote').textContent=st.hideOn&&!b.some(x=>x.getAttribute('aria-pressed')==='true')?'Custom angle. Drag the round handles on the ring.':'';}
/* two round handles on the ring end of the hidden arc */
function hideHandles(g){const a0=(st.hideA-st.hideW/2)*Math.PI/180,a1=(st.hideA+st.hideW/2)*Math.PI/180;
  return[{k:'s',a:a0,x:g.c+g.R*Math.cos(a0),y:g.c+g.R*Math.sin(a0)},{k:'e',a:a1,x:g.c+g.R*Math.cos(a1),y:g.c+g.R*Math.sin(a1)}];}
function hideOverlay(ctx,g,S){const R=g.R,r0=R*((1-st.width)+st.hideD*st.width),a0=(st.hideA-st.hideW/2)*Math.PI/180,a1=(st.hideA+st.hideW/2)*Math.PI/180,z=1/st.vz;
  ctx.save();ctx.beginPath();ctx.arc(g.c,g.c,R*1.9,a0,a1);ctx.arc(g.c,g.c,r0,a1,a0,true);ctx.closePath();ctx.fillStyle='rgba(13,127,120,.16)';ctx.fill();
  for(const[w,col]of[[5*z,'rgba(0,0,0,.55)'],[2.4*z,'#3cc2b8']]){ctx.lineWidth=w;ctx.strokeStyle=col;ctx.beginPath();ctx.arc(g.c,g.c,R,a0,a1);ctx.stroke();}
  for(const h of hideHandles(g)){ctx.beginPath();ctx.arc(h.x,h.y,9*z,0,TAU);ctx.fillStyle='#3cc2b8';ctx.fill();ctx.lineWidth=2*z;ctx.strokeStyle='#fff';ctx.stroke();}
  ctx.restore();}
let hdrag=null;
function hideGrab(e){if(!st.hideOn)return false;const g=geom(cv.width,effPad()),q=toTok(pt(e)),tol=Math.max(18,cv.width/24)/st.vz;
  for(const h of hideHandles(g))if(Math.hypot(q.x-h.x,q.y-h.y)<=tol){hdrag=h.k;return true;}return false;}
function hideDrag(e){const g=geom(cv.width,effPad()),q=toTok(pt(e)),a=Math.atan2(q.y-g.c,q.x-g.c)*180/Math.PI;
  const s0=st.hideA-st.hideW/2,e0=st.hideA+st.hideW/2;let s=hdrag==='s'?a:s0,en=hdrag==='e'?a:e0;
  let w=((en-s)%360+360)%360;w=clamp(w,20,300);if(hdrag==='s')s=en-w;else en=s+w;
  st.hideW=Math.round(w);st.hideA=(((s+w/2)+540)%360)-180;if(typeof SLI!=='undefined'&&SLI.hideW)SLI.hideW.sync();hideChanged();}
