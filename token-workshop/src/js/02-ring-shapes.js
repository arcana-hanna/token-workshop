/* ---------- ring drawing (procedural) ---------- */
function polar(ctx,c,fn,steps=720){ctx.beginPath();for(let i=0;i<=steps;i++){const t=i/steps*TAU,r=fn(t);const x=c+Math.cos(t)*r,y=c+Math.sin(t)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();}
function polarSeg(ctx,c,fn,t0,t1,steps=80){ctx.beginPath();for(let i=0;i<=steps;i++){const t=t0+(t1-t0)*i/steps,r=fn(t);const x=c+Math.cos(t)*r,y=c+Math.sin(t)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}}
function annulus(ctx,c,outerFn,ri,fill){polar(ctx,c,outerFn);ctx.moveTo(c+ri,c);ctx.arc(c,c,ri,0,TAU,true);ctx.fillStyle=fill;ctx.fill('evenodd');}
function clipBand(ctx,c,R,ri){ctx.beginPath();ctx.arc(c,c,R,0,TAU);ctx.moveTo(c+ri,c);ctx.arc(c,c,ri,0,TAU,true);ctx.clip('evenodd');}
function ringStroke(ctx,c,r,lw,style){ctx.beginPath();ctx.arc(c,c,r,0,TAU);ctx.lineWidth=lw;ctx.strokeStyle=style;ctx.stroke();}
function lightGrad(ctx,c,R,a0,a1){const[x,y]=pol(c,LIGHT.p,R),[x2,y2]=pol(c,LIGHT.p+Math.PI,R),g=ctx.createLinearGradient(x,y,x2,y2),q=a=>'rgba(255,255,255,'+Math.min(1,a*LIGHT.i)+')';
  g.addColorStop(0,q(a0));g.addColorStop(.5,q(a1));g.addColorStop(1,'rgba(255,255,255,0)');return g;}
function innerShadow(k){const{ctx,c,ri,R}=k;ctx.save();ctx.beginPath();ctx.arc(c,c,ri,0,TAU);ctx.clip();
  const g=ctx.createRadialGradient(c,c,ri*.9,c,c,ri);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.38)');
  ctx.fillStyle=g;ctx.fillRect(c-R,c-R,R*2,R*2);ctx.restore();}
function edges(k,outerFn){const{ctx,c,R,ri}=k;const lw=Math.max(1,R*.007);
  if(outerFn){polar(ctx,c,outerFn);ctx.lineWidth=lw;ctx.strokeStyle='rgba(0,0,0,.5)';ctx.stroke();}else ringStroke(ctx,c,R-lw/2,lw,'rgba(0,0,0,.5)');
  ringStroke(ctx,c,ri,lw,'rgba(0,0,0,.55)');innerShadow(k);}
function bevel(k,grooves=1){const{ctx,c,R,ri,w}=k;const lw=Math.max(1,R*.007);
  ringStroke(ctx,c,R-lw/2,lw,'rgba(0,0,0,.5)');
  ringStroke(ctx,c,R-w*.1,w*.1,lightGrad(ctx,c,R,.75,.05));
  for(let j=1;j<=grooves;j++){const rr=ri+w*j/(grooves+1);
    ringStroke(ctx,c,rr,w*.035,'rgba(0,0,0,.35)');
    ringStroke(ctx,c,rr+w*.04,w*.025,'rgba(255,255,255,.28)');}
  ringStroke(ctx,c,ri,lw,'rgba(0,0,0,.6)');innerShadow(k);}
const pol=(c,a,r)=>[c+Math.cos(a)*r,c+Math.sin(a)*r];
function sphere(ctx,x,y,r,col){const g=ctx.createRadialGradient(x+Math.cos(LIGHT.p)*r*.35,y+Math.sin(LIGHT.p)*r*.35,r*.1,x,y,r);
  g.addColorStop(0,mix(col,'#fff',.75));g.addColorStop(.55,col);g.addColorStop(1,mix(col,'#000',.6));
  ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=g;ctx.fill();ctx.lineWidth=Math.max(.6,r*.07);ctx.strokeStyle='rgba(0,0,0,.45)';ctx.stroke();}

/* cl/dl = labels of the Count/Depth sliders (absent = slider hidden), acc = uses the accent colour */
const PAT={
 plain:{name:'Plain',n:1,min:0,max:5,d:.5,cl:'Grooves',fn(k){annulus(k.ctx,k.c,()=>k.R,k.ri,k.g);bevel(k,Math.round(k.n));}},
 ridge:{name:'Ridge',n:1,min:1,max:2,d:.75,dl:'Ridge height',fn(k){const{ctx,c,R,ri,w,rm,d}=k,I=LIGHT.i,P=LIGHT.p,[lx,ly]=pol(c,P,R),[ox,oy]=pol(c,P+Math.PI,R);
   annulus(ctx,c,()=>R,ri,k.g);
   const slope=(r0,r1,sign)=>{const g=ctx.createLinearGradient(lx,ly,ox,oy),a=Math.min(.95,1.0*d*I),b=Math.min(.95,1.0*d*I);
     g.addColorStop(0,sign>0?'rgba(255,255,255,'+a+')':'rgba(0,0,0,'+b+')');g.addColorStop(1,sign>0?'rgba(0,0,0,'+b+')':'rgba(255,255,255,'+a+')');
     ringStroke(ctx,c,(r0+r1)/2,r1-r0,g);};
   slope(rm,R,1);slope(ri,rm,-1);
   const rg=ctx.createRadialGradient(c,c,ri,c,c,R);rg.addColorStop(0,'rgba(0,0,0,'+.6*d+')');rg.addColorStop(.5,'rgba(255,255,255,'+.25*d*I+')');rg.addColorStop(1,'rgba(0,0,0,'+.6*d+')');
   ringStroke(ctx,c,rm,w,rg);ringStroke(ctx,c,rm,Math.max(1,w*.05),'rgba(255,255,255,'+Math.min(.7,.45*I)+')');edges(k);}},
 gear:{name:'Gear',n:24,min:6,max:60,d:.55,cl:'Teeth',dl:'Tooth depth',fn(k){const{ctx,c,R,w,ri,n,d,g}=k;
   const f=t=>R-w*d*.9*(1-clamp(.5+Math.sin(n*t)*1.5,0,1));annulus(ctx,c,f,ri,g);edges(k,f);}},
 scallop:{name:'Scallop',n:18,min:6,max:48,d:.6,cl:'Scallops',dl:'Scallop depth',fn(k){const{ctx,c,R,w,ri,n,d,g}=k;
   const f=t=>R-w*d*.75*(1-Math.abs(Math.sin(n*t/2)));annulus(ctx,c,f,ri,g);edges(k,f);}},
 facet:{name:'Faceted',n:8,min:3,max:16,d:.5,cl:'Sides',dl:'Bevel',fn(k){const{ctx,c,R,ri,n,d,g}=k,s=TAU/n;
   const f=t=>{const x=((t%s)+s)%s-s/2;return R*Math.cos(Math.PI/n)/Math.cos(x);};
   annulus(ctx,c,f,ri,g);ctx.save();clipBand(ctx,c,R,ri);
   for(let i=0;i<n;i++){const t0=i*s,t1=t0+s;polarSeg(ctx,c,f,t0,t1,6);ctx.arc(c,c,ri,t1,t0,true);ctx.closePath();
     ctx.fillStyle=i%2?'rgba(255,255,255,'+(.08+.2*d)+')':'rgba(0,0,0,'+(.06+.18*d)+')';ctx.fill();}
   ctx.restore();edges(k,f);}},
 segments:{name:'Segments',n:16,min:4,max:48,d:.5,cl:'Segments',acc:1,fn(k){const{ctx,c,R,ri,n,col,acc}=k;const g1=grad(ctx,c,R,col),g2=grad(ctx,c,R,acc);
   for(let i=0;i<n;i++){const a0=i*TAU/n,a1=(i+1)*TAU/n;ctx.beginPath();ctx.arc(c,c,R,a0,a1);ctx.arc(c,c,ri,a1,a0,true);ctx.closePath();
     ctx.fillStyle=i%2?g2:g1;ctx.fill();ctx.lineWidth=Math.max(.6,R*.004);ctx.strokeStyle='rgba(0,0,0,.4)';ctx.stroke();}edges(k);}},
 rope:{name:'Rope',n:44,min:12,max:90,d:.5,cl:'Strands',dl:'Twist',fn(k){const{ctx,c,R,w,ri,n,d,col}=k;ctx.save();clipBand(ctx,c,R,ri);
   ctx.fillStyle=mix(col,'#000',.6);ctx.fillRect(c-R,c-R,R*2,R*2);const skew=.1+d*.5,sw=TAU*(ri+w/2)/n*.7;ctx.lineCap='round';
   for(let i=0;i<n;i++){const a=i*TAU/n,a2=a+skew;ctx.beginPath();ctx.moveTo(c+Math.cos(a)*(ri-w*.2),c+Math.sin(a)*(ri-w*.2));
     ctx.lineTo(c+Math.cos(a2)*(R+w*.2),c+Math.sin(a2)*(R+w*.2));ctx.lineWidth=sw;ctx.strokeStyle=i%2?mix(col,'#000',.25):col;ctx.stroke();
     ctx.lineWidth=sw*.25;ctx.strokeStyle=mix(col,'#fff',.5);ctx.stroke();}ctx.restore();edges(k);}},
 chain:{name:'Chain',n:28,min:12,max:44,d:.5,cl:'Links',dl:'Link thickness',acc:1,fn(k){const{ctx,c,w,ri,rm,R,n:n0,d,col,acc}=k;
   const n=Math.max(4,Math.round(n0/2)*2),s=TAU*rm/n,hw=w*.36,th=w*(.12+.14*d),Lh=s*.98;
   annulus(ctx,c,()=>R,ri,mix(acc,'#000',.5));
   const lg=(i,rad)=>{const a=LIGHT.p-(i*TAU/n+Math.PI/2),dx=Math.cos(a)*rad,dy=Math.sin(a)*rad,g=ctx.createLinearGradient(dx,dy,-dx,-dy);
     stops(col).forEach((q,j,aa)=>g.addColorStop(j/(aa.length-1),q));return g;};
   const at=(i,fn)=>{const[x,y]=pol(c,i*TAU/n,rm);ctx.save();ctx.translate(x,y);ctx.rotate(i*TAU/n+Math.PI/2);fn();ctx.restore();};
   const face=i=>{ctx.beginPath();ctx.roundRect(-Lh,-hw,Lh*2,hw*2,hw);ctx.lineJoin='round';ctx.lineWidth=th*1.45;ctx.strokeStyle='rgba(0,0,0,.72)';ctx.stroke();ctx.lineWidth=th;ctx.strokeStyle=lg(i,hw+th);ctx.stroke();};
   const edge=i=>{const eh=th*1.05,el=s*.8;ctx.beginPath();ctx.roundRect(-el,-eh,el*2,eh*2,eh);ctx.fillStyle=lg(i,eh*2);ctx.fill();ctx.lineWidth=Math.max(1,th*.28);ctx.strokeStyle='rgba(0,0,0,.72)';ctx.stroke();};
   for(let i=1;i<n;i+=2)at(i,()=>edge(i));
   for(let i=0;i<n;i+=2)at(i,()=>face(i));
   for(let i=1;i<n;i+=2)at(i,()=>{ctx.beginPath();ctx.rect(0,-hw*2,s*2,hw*4);ctx.clip();edge(i);});
   edges(k);}},
 braid:{name:'Braid',n:10,min:3,max:24,d:.6,cl:'Weaves',dl:'Wave height',acc:1,fn(k){const{ctx,c,R,w,ri,rm,n,d,col,acc}=k;
   annulus(ctx,c,()=>R,ri,acc);const A=w*(.14+.2*d),sw=w*.3,g=grad(ctx,c,R,col);
   const f1=t=>rm+A*Math.sin(n*t),f2=t=>rm-A*Math.sin(n*t);
   const draw=(fn,t0,t1)=>{polarSeg(ctx,c,fn,t0,t1,t1-t0>6?900:60);ctx.lineCap='butt';ctx.lineWidth=sw*1.35;ctx.strokeStyle='rgba(0,0,0,.65)';ctx.stroke();ctx.lineWidth=sw;ctx.strokeStyle=g;ctx.stroke();};
   draw(f1,0,TAU);draw(f2,0,TAU);
   for(let j=0;j<n;j++){const t0=(-Math.PI/2+j*TAU)/n,t1=(Math.PI/2+j*TAU)/n;draw(f1,t0,t1);}
   edges(k);}},
 moire:{name:'Moiré',n:9,min:2,max:30,d:.5,cl:'Waves',dl:'Wave height',xl:'Line width',xd:.06,xmin:2,xmax:16,acc:1,fn(k){const{ctx,c,R,w,ri,rm,n,d,col,acc,lw}=k;annulus(ctx,c,()=>R,ri,acc);
   const A=w*(.06+.2*d),lane=w*.2,tw=Math.max(1.2,w*lw);ctx.save();clipBand(ctx,c,R,ri);
   [-1,0,1].forEach((o,j)=>{const f=t=>rm+o*lane+A*Math.sin((n+j*2)*t+j*2.1);polar(ctx,c,f,900);
     ctx.lineWidth=tw+Math.max(1,w*.03);ctx.strokeStyle='rgba(0,0,0,.4)';ctx.stroke();ctx.lineWidth=tw;ctx.strokeStyle=[mix(col,'#fff',.45),col,mix(col,'#000',.2)][j];ctx.stroke();});
   ctx.restore();edges(k);}},
 studs:{name:'Studs',n:16,min:6,max:40,d:.5,cl:'Studs',dl:'Stud size',acc:1,fn(k){const{ctx,c,R,w,ri,rm,n,d,g,col,acc}=k;
   annulus(ctx,c,()=>R,ri,acc);ringStroke(ctx,c,rm,w*.8,g);const r=Math.min(w*(.16+.18*d),Math.PI*rm/n*.8);
   for(let i=0;i<n;i++){const[x,y]=pol(c,(i+.5)*TAU/n,rm);ctx.beginPath();ctx.arc(x+r*.12,y+r*.2,r*1.08,0,TAU);ctx.fillStyle='rgba(0,0,0,.4)';ctx.fill();sphere(ctx,x,y,r,col);}
   edges(k);}},
 gems:{name:'Gems',n:12,min:4,max:30,d:.5,cl:'Gems',dl:'Gem size',acc:1,fn(k){const{ctx,c,R,w,rm,n,d,acc}=k;annulus(ctx,c,()=>R,k.ri,k.g);bevel(k);
   const r=Math.min(w*(.3+.22*d),Math.PI*rm/n*.85);
   for(let i=0;i<n;i++){const[x,y]=pol(c,(i+.5)*TAU/n,rm);ctx.save();ctx.translate(x,y);ctx.rotate((i+.5)*TAU/n);
     const gr=ctx.createLinearGradient(-r,-r,r,r);gr.addColorStop(0,mix(acc,'#fff',.8));gr.addColorStop(.5,acc);gr.addColorStop(1,mix(acc,'#000',.55));
     ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(0,r*.85);ctx.lineTo(-r,0);ctx.lineTo(0,-r*.85);ctx.closePath();
     ctx.lineWidth=r*.4;ctx.lineJoin='round';ctx.strokeStyle='rgba(0,0,0,.6)';ctx.stroke();ctx.fillStyle=gr;ctx.fill();
     ctx.lineWidth=Math.max(.6,r*.06);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.moveTo(0,-r*.85);ctx.lineTo(0,r*.85);ctx.stroke();ctx.restore();}}},
 thorns:{name:'Thorns',n:20,min:6,max:48,d:.6,cl:'Spikes',dl:'Spike length',fn(k){const{ctx,c,R,w,ri,n,d,g}=k;const rb=ri+Math.max(.3*w,w*(1-.75*d));
   annulus(ctx,c,()=>rb,ri,g);const h=Math.PI/n;
   for(let i=0;i<n;i++){const a=(i+.5)*TAU/n;ctx.beginPath();ctx.moveTo(...pol(c,a-h,rb-1));ctx.lineTo(...pol(c,a,R));ctx.lineTo(...pol(c,a+h,rb-1));ctx.closePath();
     ctx.fillStyle=g;ctx.fill();ctx.lineWidth=Math.max(.6,R*.004);ctx.strokeStyle='rgba(0,0,0,.5)';ctx.stroke();}
   ringStroke(ctx,c,ri,Math.max(1,R*.007),'rgba(0,0,0,.6)');innerShadow(k);}},
 flames:{name:'Flames',n:16,min:5,max:30,d:.6,cl:'Flames',dl:'Flame height',fn(k){const{ctx,c,R,w,ri,n,d,col,g}=k;
   const rb=ri+w*.3;annulus(ctx,c,()=>rb,ri,g);
   const tongue=(H,L,b)=>{ctx.moveTo(0,-b);ctx.bezierCurveTo(H*.3,-b*1.35,H*.6,-b*.6+L*.2,H,L);ctx.bezierCurveTo(H*.72,b*.05+L*.55,H*.4,b*1.45,0,b);ctx.closePath();};
   const lay=(sx,sy)=>{ctx.beginPath();for(let i=0;i<n;i++)for(const small of[1,0]){const r=hash(i*2+small,3,11),ang=(i+(small?0:.5))*TAU/n,[px,py]=pol(c,ang,ri+w*.12),
     H=w*.88*(.5+.5*d)*(.75+.25*r)*(small?.55:1),L=H*(.2+.3*r),bw=Math.min(Math.PI*ri/n*.9,H*.3);
     ctx.save();ctx.translate(px,py);ctx.rotate(ang);ctx.scale(sx,sy);tongue(H,L,bw);ctx.restore();}};
   lay(1,1);ctx.fillStyle=g;ctx.fill();ctx.lineWidth=Math.max(.8,R*.005);ctx.lineJoin='round';ctx.strokeStyle='rgba(0,0,0,.55)';ctx.stroke();
   lay(.7,.62);ctx.fillStyle=grad(ctx,c,R,mix(col,'#ffe9a8',.45));ctx.fill();
   lay(.42,.36);ctx.fillStyle=grad(ctx,c,R,mix(col,'#ffffff',.78));ctx.fill();
   ringStroke(ctx,c,ri,Math.max(1,R*.007),'rgba(0,0,0,.6)');innerShadow(k);}},
 tally:{name:'Runic ticks',n:40,min:12,max:90,d:.7,cl:'Ticks',dl:'Tick length',xl:'Tick width',xd:.1,xmin:3,xmax:30,acc:1,fn(k){const{ctx,c,R,w,ri,n,d,g,col,acc,lw}=k,gc=grad(ctx,c,R,col),ga=grad(ctx,c,R,acc);annulus(ctx,c,()=>ri+w*.34,ri,g);
   ctx.lineCap='round';const tw=Math.max(1.2,w*lw);
   for(let i=0;i<n;i++){const a=i*TAU/n,fr=Math.abs((Math.sin(i*12.9898)*43758.5453)%1);const L=w*(.45+.55*d*fr);
     ctx.beginPath();ctx.moveTo(...pol(c,a,ri+w*.2));ctx.lineTo(...pol(c,a,ri+L));
     ctx.lineWidth=tw+Math.max(1,R*.006);ctx.strokeStyle='rgba(0,0,0,.45)';ctx.stroke();ctx.lineWidth=tw;ctx.strokeStyle=i%5===0?ga:gc;ctx.stroke();}
   ringStroke(ctx,c,ri,Math.max(1,R*.007),'rgba(0,0,0,.6)');innerShadow(k);}},
 twin:{name:'Twin lines',n:12,min:2,max:12,d:.5,dl:'Line balance',acc:1,fn(k){const{ctx,c,R,w,ri,d,g,acc}=k;annulus(ctx,c,()=>R,ri,acc);
   const tO=w*.34,tI=w*(.1+.2*(1-d));ringStroke(ctx,c,R-tO/2,tO,g);ringStroke(ctx,c,ri+tI/2,tI,g);
   ringStroke(ctx,c,R-tO/2,tO*.22,'rgba(255,255,255,.35)');edges(k);}},
 scales:{name:'Scales',n:20,min:8,max:40,d:.5,cl:'Scales',dl:'Scale size',fn(k){const{ctx,c,R,w,ri,rm,n,d,col,g}=k;ctx.save();clipBand(ctx,c,R,ri);
   ctx.fillStyle=mix(col,'#000',.7);ctx.fillRect(c-R,c-R,R*2,R*2);
   /* fish scales: rounded edges facing outward, each one overlapping its neighbour sideways and the row before it */
   const s=TAU*rm/n,rs=Math.min(s*(.62+.3*d),w*.8),step=rs*.58,lw=Math.max(1,R*.006);let j=0;
   for(let r=R+rs*.7;r>=ri-rs*.5;r-=step,j++){const nj=Math.max(6,Math.round(TAU*r/Math.min(s,rs*1.45)));
     for(let i=0;i<nj;i++){const a=(i+(j%2?.5:0))*TAU/nj,[x,y]=pol(c,a,r);
       ctx.beginPath();ctx.arc(x,y,rs,0,TAU);ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=rs*.18;ctx.fillStyle=g;ctx.fill();ctx.restore();ctx.lineWidth=lw;ctx.strokeStyle='rgba(0,0,0,.6)';ctx.stroke();
       ctx.beginPath();ctx.arc(x,y,rs*.7,a-.95,a+.95);ctx.lineWidth=Math.max(1,w*.035);ctx.lineCap='round';ctx.strokeStyle='rgba(255,255,255,.28)';ctx.stroke();
       ctx.beginPath();ctx.arc(x,y,rs*.86,a-.8,a+.8);ctx.lineWidth=Math.max(1,w*.03);ctx.strokeStyle='rgba(0,0,0,.22)';ctx.stroke();}}
   ctx.restore();edges(k);}}
};
const PAT_ORDER=Object.keys(PAT);
function drawRingBase(ctx,c,R,p){const w=R*p.width,ri=R-w,rm=R-w/2;
  LIGHT.p=p.lAng;LIGHT.i=p.lInt;
  const k={ctx,c,R,w,ri,rm,col:p.color,acc:p.accent,n:p.count,d:p.depth,lw:p.lineW,g:grad(ctx,c,R,p.color)};
  ctx.save();PAT[p.formula].fn(k);ctx.restore();}
