/* ---------- state ---------- */
const METALS=[['Gold','#d9a521'],['Silver','#b5bcc6'],['Bronze','#b8733a'],['Copper','#b4693c'],['Brass','#b5923a'],['Steel','#8a9199'],
  ['Iron','#5a6068'],['Ruby','#b3202e'],['Sapphire','#2457b8'],['Emerald','#1e8a4c'],['Amethyst','#7b3fb0'],['Ice','#8fd3f0'],
  ['Bone','#d9cdb0'],['Wood','#7a5230'],['Onyx','#2b2d33'],['Granite','#7d7f84'],['Slate','#4a5560'],['Sandstone','#b89d78']];
const GRADS=[['Enemy','#ff8a1f','#7a0c10',45],['Ally','#3ddc84','#0b4f3a',45],['Arcane','#b36cff','#1a2a8c',45],['Lava','#ffd23f','#b3111a',90],['Toxic','#d4ff3d','#1b5e20',45],['Frost','#e6f8ff','#2a6fb0',90]];
const RING_KEYS=['formula','color','accent','width','count','depth','tex','texAmt','texDens','seed','eCol','gradOn','g1','g2','gAng','colorKey','lAng','lInt','texRot','lineW','eAmt','eLen'];
const SETTINGS=['ix','iy','zoom','rot','flip','bgOn','bg','autoFit','pad','popOn','feather','shadow','bri','con','sat','defr','bgC','bgAuto',...RING_KEYS];
const st={maskVer:0,partial:0,src:null,full:null,sw:0,sh:0,sdata:null,mask:null,bx:null,by:null,embed:null,
  popCv:mk(),softCv:mk(),selCv:mk(),softDirty:true,popDirty:true,selDirty:true,selCount:0,painting:false,
  ix:0,iy:.05,zoom:1.3,rot:0,flip:1,bgOn:true,bg:'#2b2f3a',
  autoFit:true,pad:.08,padCur:.08,padT:.08,fitDirty:true,lockPad:false,snapPad:true,
  formula:'ridge',color:'#d9a521',accent:'#2b2f3a',width:.11,count:1,depth:.75,tex:'none',texAmt:.6,texDens:3,seed:1,eCol:'#5ec8ff',
  gradOn:false,g1:'#ff8a1f',g2:'#7a0c10',gAng:Math.PI/4,colorKey:'Gold',lAng:2.356194,lInt:1,texRot:0,lineW:.1,eAmt:5,eLen:1,vz:1,vx:0,vy:0,
  popOn:true,feather:.5,shadow:0,showSel:true,iso:false,prev:false,kc:null,embedOn:true,
  bri:0,con:0,sat:0,defr:0,bgC:'#808080',bgAuto:true,eReach:4,eTol:14,eSoft:70,eShift:0,speck:30,gap:0,autoSens:50,autoShrink:0,bsoft:0,strand:false,maskView:false,
  tool:'select',mode:'add',alt:false,space:false,tol:30,contig:true,brush:10,exportSize:512,exportWhat:'token',exportFmt:'png',pal:[],hover:null};
const RING_DEFAULT={formula:'ridge',color:'#d9a521',accent:'#2b2d33',width:.11,count:1,depth:.75,tex:'none',texAmt:.6,texDens:3,seed:1,eCol:'#5ec8ff',gradOn:false,g1:'#ff8a1f',g2:'#7a0c10',gAng:Math.PI/4,colorKey:'Gold',lAng:2.356194,lInt:1,texRot:0,lineW:.1,eAmt:5,eLen:1};

/* ---------- busy pill, toast, zoom hud ---------- */
let busyN=0;
function busy(d,msg){busyN=Math.max(0,busyN+d);if(msg)$('#busyT').textContent=msg;$('#busy').classList.toggle('on',busyN>0);}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),2800);}
let hudT=0;function hud(t,ms=900){const h=$('#hud');h.textContent=t;h.classList.add('on');clearTimeout(hudT);hudT=setTimeout(()=>h.classList.remove('on'),ms);}

/* ---------- geometry ---------- */
const effPad=()=>st.autoFit?st.padCur:st.pad;
function geom(S,pad){const R=S*(.5-pad),c=S/2;const sc=2*R/Math.min(st.sw,st.sh)*st.zoom;return{S,R,c,sc,tx:c+st.ix*R,ty:c+st.iy*R};}
function toImg(g,x,y){const dx=x-g.tx,dy=y-g.ty,co=Math.cos(st.rot),si=Math.sin(st.rot);
  return{u:(dx*co+dy*si)/(g.sc*st.flip)+st.sw/2,v:(-dx*si+dy*co)/g.sc+st.sh/2};}
function applyT(ctx,g){ctx.translate(g.tx,g.ty);ctx.rotate(st.rot);ctx.scale(g.sc*st.flip,g.sc);ctx.translate(-st.sw/2,-st.sh/2);}

/* Auto-fit: smallest canvas margin that keeps ring + pop-out art fully inside */
function recomputeFit(){let d=1;
  if(st.popOn&&st.selCount&&st.bx){const k=2/Math.min(st.sw,st.sh)*st.zoom,co=Math.cos(st.rot),si=Math.sin(st.rot),f=st.flip,bx=st.bx,by=st.by;
    for(let j=0;j<bx.length;j++){const x=bx[j]*k*f,y=by[j]*k;const r=Math.hypot(x*co-y*si+st.ix,x*si+y*co+st.iy);if(r>d)d=r;}
    d=d*1.005+(st.feather>0?st.feather*k:0)+(st.shadow>0?.01+.05*st.shadow:0);}
  st.padT=clamp(.5-.5/d,0,.45);st.fitDirty=false;}
function exportPad(){if(!st.autoFit)return st.pad;if(st.fitDirty)recomputeFit();return st.padT;}
