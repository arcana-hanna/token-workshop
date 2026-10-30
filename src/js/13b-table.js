/* ---------- table-size preview: the token as it will look small, on the chosen preview background ---------- */
let stripOn=false,stripT=0;
function stripSoon(){if(!stripOn)return;clearTimeout(stripT);stripT=setTimeout(drawStrip,140);}
function drawStrip(){if(!stripOn||!st.src)return;const dpr=Math.min(2,devicePixelRatio||1),S=Math.round(120*dpr),big=mk();big.width=big.height=S;
  render(big.getContext('2d'),S,{clean:true,pad:exportPad()});
  $$('#tableStrip canvas').forEach(c=>{const px=+c.dataset.px,n=Math.round(px*dpr);c.width=c.height=n;c.style.width=c.style.height=px+'px';
    const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(big,0,0,n,n);});}
function setStrip(on){stripOn=on;$('#tableStrip').hidden=!on;$('.canvas-col').classList.toggle('with-strip',on);store.set('tw_table',on?'1':'0');$('#mTable').setAttribute('aria-checked',String(on));if(on)drawStrip();}
$('#mTable').onclick=()=>{closeMenu();setStrip(!stripOn);};

/* grid cells are a tenth of the board width in pixels, set here so they stay square on the board and on the wide, short strip */
{const col=$('.canvas-col'),board=$('#board'),sync=()=>{const w=board.clientWidth;if(w)col.style.setProperty('--cell',(w/10)+'px');};
 new ResizeObserver(sync).observe(board);sync();}
