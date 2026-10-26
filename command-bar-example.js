clear();
theme(2);

const B = `<style>
.au{--v:#8b5cf6;--c:#22d3ee;--p:#ec4899;position:relative;overflow:hidden;isolation:isolate}
.au *{box-sizing:border-box}
.au .gr{background:linear-gradient(100deg,var(--c),var(--v),var(--p),var(--c));background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:auS 6s linear infinite}
@keyframes auS{to{background-position:250% 0}}
.au .b{display:inline-flex;align-items:center;gap:8px;padding:14px 26px;border-radius:999px;font-weight:600;cursor:pointer;transition:transform .25s,box-shadow .25s,background .25s}
.au .b1{background:linear-gradient(100deg,var(--v),var(--p));color:#fff;box-shadow:0 10px 30px -8px var(--v)}
.au .b1:hover{transform:translateY(-3px);box-shadow:0 18px 40px -8px var(--p)}
.au .b2{border:1px solid rgba(255,255,255,.25)}
.au .b2:hover{background:rgba(255,255,255,.1);transform:translateY(-3px)}
.au .chip{display:inline-block;padding:7px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);font-size:13px;letter-spacing:.04em}
.au .chip .d{display:inline-block;width:8px;height:8px;border-radius:50%;background:#4ade80;margin-right:8px;animation:auP 2s infinite}
@keyframes auP{0%{box-shadow:0 0 0 0 rgba(74,222,128,.7)}70%,100%{box-shadow:0 0 0 10px rgba(74,222,128,0)}}
@keyframes auU{from{transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes auV{from{opacity:0;transform:translateY(50px)}}
@property --a{syntax:"<angle>";inherits:false;initial-value:0deg}
</style>`;

add('header', {br:'AURA', nav:['Work','Studio','Journal','Contact']});

html(`<section class="s au au-hero">${B}<style>
.s.au-hero{padding:130px 48px 0;min-height:700px;text-align:center;background:radial-gradient(1200px 600px at 50% -10%,rgba(139,92,246,.35),transparent 60%),var(--pb)}
.au-hero .o{position:absolute;border-radius:50%;filter:blur(80px);z-index:-1;opacity:.5;animation:auF 12s ease-in-out infinite alternate}
.au-hero .o1{width:420px;height:420px;background:var(--v);left:-100px;top:60px}
.au-hero .o2{width:360px;height:360px;background:var(--c);right:-80px;top:200px;animation-delay:-4s}
.au-hero .o3{width:300px;height:300px;background:var(--p);left:42%;top:-80px;animation-delay:-8s}
@keyframes auF{to{transform:translate(70px,50px) scale(1.25)}}
.au-hero:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px) 0 0/60px 60px,linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px) 0 0/60px 60px;-webkit-mask-image:radial-gradient(ellipse at 50% 30%,#000,transparent 70%);mask-image:radial-gradient(ellipse at 50% 30%,#000,transparent 70%)}
.s.au-hero h1{font-size:clamp(40px,9cqw,104px);line-height:1;letter-spacing:-.04em;max-width:15ch;margin:26px auto 22px;perspective:800px}
.au-hero h1 span{display:inline-block;opacity:0;transform:translateY(46px) rotateX(-70deg);transform-origin:50% 100%;animation:auR 1s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--i)*.1s + .15s)}
.au-hero h1 .gr{animation:auR 1s cubic-bezier(.2,.8,.2,1) forwards,auS 6s linear infinite;animation-delay:calc(var(--i)*.1s + .15s),0s}
@keyframes auR{to{opacity:1;transform:none}}
.s.au-hero p{max-width:56ch;margin:0 auto 34px;font-size:clamp(16px,2.4cqw,20px);color:var(--pm);opacity:0;animation:auU .9s .9s forwards}
.au-hero .cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;opacity:0;animation:auU .9s 1.1s forwards}
.au-hero .st{display:flex;justify-content:center;gap:clamp(24px,6cqw,70px);margin:64px 0 44px;opacity:0;animation:auU .9s 1.3s forwards}
.au-hero .st b{display:block;font-size:clamp(26px,4cqw,38px);letter-spacing:-.03em;background:linear-gradient(180deg,#fff,rgba(255,255,255,.5));-webkit-background-clip:text;background-clip:text;color:transparent}
.au-hero .st span{font-size:13px;color:var(--pm);letter-spacing:.06em;text-transform:uppercase}
.au-hero .tk{margin:0 -48px;padding:18px 0;overflow:hidden;border-top:1px solid rgba(255,255,255,.1);border-bottom:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.au-hero .tt{display:flex;width:max-content;animation:auM 28s linear infinite}
.au-hero .tt span{padding-right:48px;font-size:clamp(20px,3cqw,30px);font-weight:600;letter-spacing:-.02em;white-space:nowrap;color:rgba(255,255,255,.6)}
.au-hero .tt span:nth-child(even){color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.55)}
@keyframes auM{to{transform:translateX(-50%)}}
@container(max-width:600px){.s.au-hero{padding:100px 22px 0;min-height:600px}.au-hero .tk{margin:0 -22px}}
</style>
<i class="o o1"></i><i class="o o2"></i><i class="o o3"></i>
<span class="chip" contenteditable><i class="d"></i>Booking projects for Q1</span>
<h1 contenteditable><span style="--i:0">We</span> <span style="--i:1" class="gr">build</span> <span style="--i:2">brands</span> <span style="--i:3">that</span> <span style="--i:4" class="gr">move.</span></h1>
<p contenteditable>AURA is a motion-first studio crafting identities, products and 3D experiences that feel alive.</p>
<div class="cta"><span class="b b1">See our work &rarr;</span><span class="b b2">Meet the studio</span></div>
<div class="st"><div><b>120+</b><span>Launches</span></div><div><b>14</b><span>Awards</span></div><div><b>9</b><span>Countries</span></div></div>
<div class="tk"><div class="tt"><span>Identity</span><span>Motion</span><span>Product</span><span>3D</span><span>Sound</span><span>Packaging</span><span>Campaigns</span><span>Web</span><span>Identity</span><span>Motion</span><span>Product</span><span>3D</span><span>Sound</span><span>Packaging</span><span>Campaigns</span><span>Web</span></div></div>
</section>`);

html(`<section class="s au au-hd">${B}<style>
.s.au-hd{padding:100px 48px 10px;background:var(--pb)}
.au-hd .r{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;flex-wrap:wrap}
.s.au-hd h2{font-size:clamp(32px,6.4cqw,64px);letter-spacing:-.03em;line-height:1.05;margin:16px 0 0;max-width:16ch}
.s.au-hd p{max-width:36ch;margin:0;color:var(--pm)}
@supports (animation-timeline:view()){.au-hd .r{animation:auV linear both;animation-timeline:view();animation-range:entry 0% entry 60%}}
@container(max-width:600px){.s.au-hd{padding:70px 22px 0}}
</style>
<div class="r"><div><span class="chip" contenteditable>Selected work</span><h2 contenteditable>Projects that <span class="gr">refuse to sit still</span></h2></div>
<p contenteditable>Drag, swipe or use the arrows. Five cards in view, three in focus.</p></div>
</section>`);

code(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
html,body{height:100%}
body{background:#0e0e12;color:#f4f4f5;font-family:"Space Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden;-webkit-user-select:none;user-select:none}
.bg{position:absolute;inset:0;overflow:hidden}
.bg i{position:absolute;border-radius:50%;filter:blur(70px);opacity:.5;animation:drift 14s ease-in-out infinite alternate}
.bg i:nth-child(1){width:380px;height:380px;background:#7c3aed;left:-80px;top:-60px}
.bg i:nth-child(2){width:340px;height:340px;background:#06b6d4;right:-60px;top:120px;animation-delay:-5s}
.bg i:nth-child(3){width:300px;height:300px;background:#ec4899;left:38%;bottom:-120px;animation-delay:-9s}
@keyframes drift{to{transform:translate(60px,-40px) scale(1.2)}}
.floor{position:absolute;left:-50%;right:-50%;bottom:-8%;height:55%;transform:perspective(500px) rotateX(62deg);background:linear-gradient(rgba(139,92,246,.35) 1px,transparent 1px) 0 0/100% 48px,linear-gradient(90deg,rgba(139,92,246,.35) 1px,transparent 1px) 0 0/64px 100%;animation:grid 3s linear infinite;-webkit-mask-image:linear-gradient(transparent,#000 60%);mask-image:linear-gradient(transparent,#000 60%)}
@keyframes grid{to{background-position:0 48px,0 0}}
.stage{position:absolute;left:0;right:0;top:40px;bottom:130px;perspective:1500px;display:flex;align-items:center;justify-content:center;outline:0;touch-action:pan-y;cursor:grab;overflow:hidden}
.stage.dr{cursor:grabbing}
.card{position:absolute;width:var(--w);height:calc(var(--w)*1.32);transition:transform .9s cubic-bezier(.2,.8,.2,1),opacity .7s,filter .7s;transform-style:preserve-3d;will-change:transform}
.in{position:relative;width:100%;height:100%;border-radius:26px;padding:14px;display:flex;flex-direction:column;gap:10px;background:linear-gradient(160deg,rgba(40,38,58,.96),rgba(18,17,28,.96));border:1px solid rgba(255,255,255,.16);box-shadow:0 30px 60px -20px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.2);transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .2s ease-out;overflow:hidden}
.card.on .in{animation:bob 5s ease-in-out infinite}
@keyframes bob{50%{translate:0 -9px}}
.art{flex:1;min-height:0;border-radius:18px;position:relative;overflow:hidden;background:radial-gradient(circle at 30% 25%,hsl(var(--h) 95% 65%),transparent 55%),radial-gradient(circle at 75% 80%,hsl(calc(var(--h) + 60) 90% 55%),transparent 55%),hsl(var(--h) 60% 12%)}
.art:before{content:"";position:absolute;width:70%;aspect-ratio:1;left:15%;top:12%;border-radius:50%;border:1px solid rgba(255,255,255,.5);box-shadow:0 0 0 18px rgba(255,255,255,.08),0 0 0 40px rgba(255,255,255,.05);animation:pulse 4s ease-in-out infinite}
@keyframes pulse{50%{transform:scale(1.12)}}
.art:after{content:"";position:absolute;width:42%;aspect-ratio:1;left:29%;top:29%;border-radius:28%;background:conic-gradient(from 0deg,#fff,hsl(var(--h) 100% 70%),rgba(255,255,255,0),#fff);opacity:.85;mix-blend-mode:overlay;animation:spin 9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.num{position:absolute;right:12px;bottom:2px;font-size:78px;font-weight:700;line-height:1;color:rgba(255,255,255,.2);z-index:2}
.meta{display:flex;justify-content:space-between;align-items:center;padding:2px 4px 0}
.tag{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.65)}
.card h3{font-size:clamp(18px,calc(var(--w)*.075),24px);letter-spacing:-.02em;padding:0 4px;font-weight:600}
.card p{font-size:13px;line-height:1.45;color:#a1a1aa;padding:0 4px}
.go{font-size:13px;font-weight:600;display:flex;gap:6px;align-items:center;padding:0 4px 4px}
.go b{transition:transform .3s}
.card.on:hover .go b{transform:translateX(6px)}
.gl{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .3s;background:radial-gradient(420px circle at var(--mx,50%) var(--my,0%),rgba(255,255,255,.2),transparent 45%)}
.card.on .in:hover .gl{opacity:1}
.ctl{position:absolute;left:0;right:0;bottom:24px;display:flex;align-items:center;justify-content:center;gap:20px}
.mid{width:min(240px,46vw)}
.cnt{font:600 12px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.22em;color:#a1a1aa;text-align:center;margin-bottom:12px}
.dots{display:flex;gap:7px;justify-content:center}
.dots i{width:7px;height:7px;border-radius:7px;background:rgba(255,255,255,.28);cursor:pointer;transition:all .4s}
.dots i.on{width:26px;background:#fff}
.bar{height:2px;background:rgba(255,255,255,.14);border-radius:2px;margin-top:12px;overflow:hidden}
.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#8b5cf6,#ec4899)}
.nb{width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font-size:18px;cursor:pointer;transition:all .25s;outline:0}
.nb:hover{background:#fff;color:#000;transform:scale(1.1)}
.nb:focus-visible{box-shadow:0 0 0 2px rgba(255,255,255,.5)}
@media(max-width:560px){.ctl{gap:12px}.stage{bottom:124px}}
</style></head><body>
<div class="bg"><i></i><i></i><i></i><div class="floor"></div></div>
<div class="stage" id="st" tabindex="0" aria-label="Project carousel"></div>
<div class="ctl"><button class="nb" id="pv" aria-label="Previous project">&#8592;</button><div class="mid"><div class="cnt" id="cn"></div><div class="dots" id="dt"></div><div class="bar"><i id="pg"></i></div></div><button class="nb" id="nx" aria-label="Next project">&#8594;</button></div>
<script>
var SIDE=2; // cards visible on each side of the centre: 2 = five cards in view, 1 = three
var D=[['Lumen','Brand identity','A living identity system for a wellness-tech startup.',265],['Orbit','Product design','Dashboards that make complex data feel calm.',190],['Pulse','Motion','Launch film and animated UI language for a fintech app.',330],['Vertex','3D / WebGL','An interactive product configurator running at 60fps.',20],['Echo','Sound + brand','Sonic logo and audio identity for a streaming service.',150],['Prism','Packaging','Color-shifting packaging for a limited sneaker drop.',290],['Drift','Campaign','An out-of-home campaign across nine cities.',45],['Nova','App UI','A mobile banking app people actually enjoy opening.',210]];
var st=document.getElementById('st'),dt=document.getElementById('dt'),cn=document.getElementById('cn'),pg=document.getElementById('pg');
var N=D.length,a=0,W=300,timer=null,paused=false,moved=false,drag=false,x0=0;
var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
var cards=D.map(function(d,i){
 var c=document.createElement('div');c.className='card';c.style.setProperty('--h',d[3]);
 c.innerHTML='<div class="in"><div class="art"><span class="num">'+('0'+(i+1)).slice(-2)+'</span></div><div class="meta"><span class="tag">'+d[1]+'</span><span class="tag">2026</span></div><h3>'+d[0]+'</h3><p>'+d[2]+'</p><span class="go">View case study <b>&rarr;</b></span><div class="gl"></div></div>';
 c.addEventListener('click',function(){if(!moved&&i!==a)go(i)});
 st.appendChild(c);return c});
var dots=D.map(function(d,i){var e=document.createElement('i');e.addEventListener('click',function(){go(i)});dt.appendChild(e);return e});
function lay(){
 W=Math.max(190,Math.min(300,st.clientWidth*.5));st.style.setProperty('--w',W+'px');
 cards.forEach(function(c,i){
  var d=((i-a)%N+N)%N;if(d>N/2)d-=N;
  var s=d<0?-1:1,ad=Math.abs(d),t,o,f;
  if(ad===0){t='translate3d(0,0,0) rotateY(0deg) scale(1)';o=1;f='none'}
  else if(ad===1){t='translate3d('+(s*W*.64)+'px,0,-150px) rotateY('+(-s*38)+'deg) scale(.92)';o=1;f='brightness(.8)'}
  else if(ad===2){t='translate3d('+(s*W*1.12)+'px,0,-320px) rotateY('+(-s*52)+'deg) scale(.84)';o=.55;f='brightness(.55) blur(1px)'}
  else{t='translate3d('+(s*W*1.5)+'px,0,-520px) rotateY('+(-s*60)+'deg) scale(.7)';o=0;f='brightness(.4)'}
  if(ad>SIDE){o=0}
  c.style.transform=t;c.style.opacity=o;c.style.filter=f;c.style.zIndex=10-ad;
  c.style.pointerEvents=ad>SIDE?'none':'auto';c.classList.toggle('on',ad===0);
  var n=c.firstChild;n.style.setProperty('--rx','0deg');n.style.setProperty('--ry','0deg')});
 dots.forEach(function(e,i){e.className=i===a?'on':''});
 cn.textContent=('0'+(a+1)).slice(-2)+'  /  '+('0'+N).slice(-2)}
function arm(){
 clearTimeout(timer);pg.style.transition='none';pg.style.width='0';
 if(reduce||paused)return;
 void pg.offsetWidth;pg.style.transition='width 4.5s linear';pg.style.width='100%';
 timer=setTimeout(function(){go(a+1)},4500)}
function go(i){a=((i%N)+N)%N;lay();arm()}
document.getElementById('pv').onclick=function(){go(a-1)};
document.getElementById('nx').onclick=function(){go(a+1)};
st.addEventListener('keydown',function(e){if(e.key==='ArrowLeft')go(a-1);if(e.key==='ArrowRight')go(a+1)});
st.addEventListener('mouseenter',function(){paused=true;arm()});
st.addEventListener('mouseleave',function(){paused=false;arm()});
st.addEventListener('pointerdown',function(e){drag=true;moved=false;x0=e.clientX;st.classList.add('dr')});
addEventListener('pointermove',function(e){
 if(drag){var dx=e.clientX-x0;if(Math.abs(dx)>6)moved=true;if(Math.abs(dx)>60){go(a+(dx>0?-1:1));x0=e.clientX}return}
 if(reduce)return;
 var on=st.querySelector('.card.on .in');if(!on)return;
 var r=on.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
 if(px>=0&&px<=1&&py>=0&&py<=1){on.style.setProperty('--ry',((px-.5)*18)+'deg');on.style.setProperty('--rx',(-(py-.5)*14)+'deg');on.style.setProperty('--mx',(px*100)+'%');on.style.setProperty('--my',(py*100)+'%')}
 else{on.style.setProperty('--rx','0deg');on.style.setProperty('--ry','0deg')}});
addEventListener('pointerup',function(){drag=false;st.classList.remove('dr');setTimeout(function(){moved=false},0)});
addEventListener('resize',lay);
cards.forEach(function(c){c.style.transition='none';c.style.opacity=0;c.style.transform='translate3d(0,90px,-700px) scale(.6)'});
requestAnimationFrame(function(){requestAnimationFrame(function(){
 cards.forEach(function(c,i){c.style.transition='';c.style.transitionDelay=(i*70)+'ms'});
 lay();arm();
 setTimeout(function(){cards.forEach(function(c){c.style.transitionDelay=''})},1600)})});
</script></body></html>`, 780);

html(`<section class="s au au-pr">${B}<style>
.s.au-pr{padding:100px 48px;background:var(--pb)}
.s.au-pr h2{font-size:clamp(32px,6.4cqw,64px);letter-spacing:-.03em;line-height:1.05;margin:16px 0 0;max-width:18ch}
.au-pr .g{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:48px}
.au-pr .c{position:relative;padding:34px 28px 38px;border-radius:24px;background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02));transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.au-pr .c:before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.5px;background:conic-gradient(from var(--a),transparent 0 65%,var(--c),var(--v),var(--p));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);animation:auA 5s linear infinite}
@keyframes auA{to{--a:360deg}}
.au-pr .c:hover{transform:translateY(-10px) rotate(-.6deg)}
.au-pr .n{font-size:68px;font-weight:700;line-height:1;letter-spacing:-.04em;background:linear-gradient(180deg,#fff,rgba(255,255,255,0));-webkit-background-clip:text;background-clip:text;color:transparent}
.s.au-pr .c h3{margin:18px 0 8px;font-size:24px;letter-spacing:-.02em}
.s.au-pr .c p{margin:0;color:var(--pm);max-width:none}
@supports (animation-timeline:view()){.au-pr .c{animation:auV linear both;animation-timeline:view();animation-range:entry 0% entry 70%}}
@container(max-width:700px){.au-pr .g{grid-template-columns:1fr}.s.au-pr{padding:70px 22px}}
</style>
<span class="chip" contenteditable>How we work</span>
<h2 contenteditable>From spark to launch in <span class="gr">three moves</span></h2>
<div class="g">
<div class="c"><div class="n">01</div><h3 contenteditable>Discover</h3><p contenteditable>We dig into your product, your people and your audience until the real story shows up.</p></div>
<div class="c"><div class="n">02</div><h3 contenteditable>Design</h3><p contenteditable>Identity, interface and motion get built together so everything feels like one thing.</p></div>
<div class="c"><div class="n">03</div><h3 contenteditable>Deliver</h3><p contenteditable>We ship clean, fast, accessible work and stay close for the first hundred days.</p></div>
</div></section>`);

html(`<section class="s au au-cta">${B}<style>
.s.au-cta{padding:40px 48px 110px;background:var(--pb)}
.au-cta .pn{position:relative;text-align:center;padding:90px 30px;border-radius:36px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:radial-gradient(600px 300px at 15% 0,rgba(139,92,246,.55),transparent 60%),radial-gradient(500px 300px at 90% 100%,rgba(236,72,153,.45),transparent 60%),#15131f}
.s.au-cta h2{font-size:clamp(34px,7cqw,72px);letter-spacing:-.03em;line-height:1.02;margin:0 auto 14px;max-width:14ch}
.s.au-cta p{margin:0 auto 32px;color:var(--pm)}
.au-cta .sh{position:relative;overflow:hidden}
.au-cta .sh:after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:auH 3.2s ease-in-out infinite}
@keyframes auH{60%,100%{left:130%}}
@supports (animation-timeline:view()){.au-cta .pn{animation:auV linear both;animation-timeline:view();animation-range:entry 0% entry 60%}}
@container(max-width:600px){.s.au-cta{padding:30px 22px 80px}.au-cta .pn{padding:64px 22px}}
</style>
<div class="pn"><h2 contenteditable>Have a project in <span class="gr">mind?</span></h2><p contenteditable>Tell us what you are building. We reply within a day.</p><span class="b b1 sh" contenteditable>hello@aura.studio</span></div>
</section>`);

add('footer', {br:'AURA'});
return sections();
