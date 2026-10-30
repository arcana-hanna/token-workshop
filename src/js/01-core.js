"use strict";
/* =====================================================================
   Token Workshop v3
   engine: procedural rings, generated textures, flood-fill selection
   shell:  toolbar + options bar + tabbed inspector, one undo history,
           editable-project metadata embedded in exported PNGs
   ===================================================================== */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const REDUCED=matchMedia('(prefers-reduced-motion:reduce)').matches;
const DESKTOP=matchMedia('(min-width:860px),(min-width:640px) and (orientation:landscape)');
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const mk=()=>document.createElement('canvas');
const WORK_MAX=1600,FULL_MAX=3072;

/* ---------- icons ---------- */
const IC={
 upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
 download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
 move:'<path d="M12 3v18M3 12h18M12 3 9 6M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
 wand:'<path d="M5 19 15 9"/><path d="m17 3 .9 2.1L20 6l-2.1.9L17 9l-.9-2.1L14 6l2.1-.9z"/><path d="m19 13 .5 1.2L20.7 15l-1.2.5L19 17l-.5-1.5-1.2-.5 1.2-.8z"/>',
 brush:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 spark:'<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="m19 16 .7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 more:'<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
 undo:'<path d="M1 4v6h6M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/>',
 redo:'<path d="M23 4v6h-6M20.5 15a9 9 0 1 1-2.1-9.4L23 10"/>',
 zin:'<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.6-4.6M11 8v6M8 11h6"/>',
 zout:'<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.6-4.6M8 11h6"/>',
 invert:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
 grow:'<rect x="8" y="8" width="8" height="8" rx="1.5"/><path d="M4 4h16v16H4z" stroke-dasharray="2 3"/>',
 shrink:'<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M9 9h6v6H9z" stroke-dasharray="2 2"/>',
 eye:'<path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 shuffle:'<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 iso:'<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><path d="M8 16l4-9 4 9z"/>'
};
$$('[data-ic]').forEach(e=>e.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+IC[e.dataset.ic]+'</svg>');

/* ---------- colour helpers ---------- */
function rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');return[0,2,4].map(i=>parseInt(h.substr(i,2),16));}
function mix(a,b,t){const A=rgb(a),B=rgb(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');}
const LIGHT={p:2.356,i:1};   // p = direction the light comes from (radians), i = strength
function stops(b,k=LIGHT.i){const m=(t,x)=>mix(b,t,clamp(x*k,0,1));return[m('#ffffff',.72),b,m('#000000',.5),m('#ffffff',.28),m('#000000',.62)];}
function grad(ctx,c,R,b,ang=LIGHT.p-Math.PI){const dx=Math.cos(ang)*R,dy=Math.sin(ang)*R,g=ctx.createLinearGradient(c-dx,c-dy,c+dx,c+dy);
  stops(b).forEach((s,i,a)=>g.addColorStop(i/(a.length-1),s));return g;}
