const KEY='podokonnik-v1',H=3600e3,D=24*H,SPROUT=2*60e3;
let SP=[],S=load();
const $=id=>document.getElementById(id);
const debug=new URLSearchParams(location.search).has('debug');
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{plants:[],offset:0}}catch(e){return{plants:[],offset:0}}}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
const now=()=>Date.now()+(S.offset||0);
const sp=id=>SP.find(s=>s.id===id);
function stageInfo(p){const s=sp(p.sp);if(!p.firstWater)return{stage:0,next:null};
 const t0=p.firstWater+SPROUT,t=now();
 const marks=[t0,t0+s.stageHours[1]*H,t0+s.stageHours[2]*H];
 let st=0;marks.forEach((m,i)=>{if(t>=m)st=i+1});
 return{stage:st,next:st<3?marks[st]:null}}
function moist(p){if(!p.lastWater)return 0;const s=sp(p.sp);return Math.max(0,1-(now()-p.lastWater)/(s.waterDays*D))}
function isSad(p){if(!p.lastWater)return false;const s=sp(p.sp);return now()-p.lastWater>(s.waterDays+1)*D}
function fmt(ms){if(ms<60e3)return Math.ceil(ms/1e3)+' с';if(ms<H)return Math.ceil(ms/60e3)+' мин';if(ms<2*D)return'~'+Math.round(ms/H)+' ч';return'~'+Math.round(ms/D)+' дн'}
const STAGES=['черенок в воде','росток','молодое','взрослое'];
function sky(){const h=new Date(now()).getHours();$('sky').className='sky '+(h>=7&&h<17?'day':h>=17&&h<21?'eve':'night')}
function hint(){const p=S.plants[0];let t='';
 if(!S.plants.length)t='Выбери первое растение';
 else if(!p.firstWater)t='Тапни по горшку, чтобы полить 💧';
 else if(stageInfo(p).stage===0)t='Посажено! Росток появится совсем скоро';
 else t='Тап — полить. Долгий тап — карточка растения';
 $('hint').textContent=t}
function render(){sky();hint();const sill=$('sill');sill.innerHTML='';
 for(let i=0;i<6;i++){const p=S.plants.find(x=>x.slot===i);const b=document.createElement('button');b.className='slot';
  if(!p){b.innerHTML='<div class="empty">+</div><div class="name">свободно</div>';b.onclick=()=>openPicker(i);sill.appendChild(b);continue}
  const s=sp(p.sp),si=stageInfo(p),m=moist(p);
  if(isSad(p))b.classList.add('sad');if(m>.6)b.classList.add('wet');
  let top='';
  if(p.firstWater&&si.stage===0)top=`<div class="timer">🌱 через ${fmt(si.next-now())}</div>`;
  else if(p.lastWater&&m<.25)top=`<div class="bubble">${isSad(p)?'Мне грустно… 💧':'Хочу пить'}</div>`;
  if(!p.firstWater)top+='<div class="finger">👆</div>';
  b.innerHTML=`${top}<img class="plant" src="img/${s.id}-${si.stage}.svg" alt=""><img class="pot" src="img/pot.svg" alt=""><div class="name">${s.name}</div>`;
  bindPress(b,()=>water(p,b),()=>openCard(p));sill.appendChild(b)}}
function bindPress(el,tap,long){let tm,done=false;
 el.addEventListener('pointerdown',()=>{done=false;tm=setTimeout(()=>{done=true;long()},500)});
 ['pointerup','pointerleave','pointercancel'].forEach(e=>el.addEventListener(e,ev=>{clearTimeout(tm);if(e==='pointerup'&&!done)tap()}));
 el.addEventListener('contextmenu',e=>e.preventDefault())}
function water(p,el){const t=now();if(!p.firstWater)p.firstWater=t;p.lastWater=t;save();
 for(let k=0;k<4;k++){const d=document.createElement('span');d.className='drop';d.textContent='💧';d.style.left=(35+k*18)+'px';d.style.animationDelay=k*.1+'s';el.appendChild(d)}
 const pl=document.createElement('span');pl.className='plus';pl.textContent='+💧';el.appendChild(pl);
 setTimeout(render,1000)}
function openPicker(slot){$('pickGrid').innerHTML='';
 SP.forEach(s=>{const b=document.createElement('button');b.className='pick';b.innerHTML=`<img src="img/${s.id}-3.svg" alt=""><div>${s.name}</div><div class="muted">${s.speed}</div>`;
  b.onclick=()=>{S.plants.push({slot,sp:s.id,planted:now()});save();$('picker').hidden=true;render()};$('pickGrid').appendChild(b)});
 $('picker').hidden=false}
function openCard(p){const s=sp(p.sp),si=stageInfo(p),m=moist(p);
 const next=!p.firstWater?'Полей, и через 2 минуты появится росток':si.next?`Следующая стадия примерно через ${fmt(si.next-now())}`:'Уже взрослое 🌿';
 const drink=!p.lastWater?'Ещё не поливали':m<=0?'Хочет пить прямо сейчас':`Пьёт через ${fmt(m*s.waterDays*D)}`;
 $('cardBody').innerHTML=`<img class="big" src="img/${s.id}-${si.stage}.svg" alt=""><h2>${s.name}</h2>
 <p>Стадия: <b>${STAGES[si.stage]}</b></p><p class="muted">${next}<br>${drink}</p>
 <ul>${s.facts.map(f=>`<li>${f}</li>`).join('')}</ul>
 <button class="btn primary" id="real">Вырастить по-настоящему</button><div id="soon"></div>
 <button class="btn soft" id="close">Закрыть</button>`;
 $('real').onclick=()=>{$('soon').innerHTML=`<div class="soon"><b>Купить в Батуми:</b> ${s.buy} в частных объявлениях, плюс ~9 ₾ горшок и грунт в Gorgia. Цену уточняй у продавца.<br><br><b>Бесплатно, за 0 ₾:</b> попроси черенок у знакомых или в чате обмена растений. ${s.free}</div>`};
 $('close').onclick=()=>$('card').hidden=true;$('card').hidden=false}
$('card').onclick=e=>{if(e.target.id==='card')$('card').hidden=true};
$('picker').onclick=e=>{if(e.target.id==='picker'&&S.plants.length)$('picker').hidden=true};
if(debug){$('debug').hidden=false;$('ff').onclick=()=>{S.offset=(S.offset||0)+D;save();render()};$('ff2').onclick=()=>{S.offset=(S.offset||0)+SPROUT;save();render()};$('reset').onclick=()=>{localStorage.removeItem(KEY);S={plants:[],offset:0};render();openPicker(0)}}
fetch('species.json').then(r=>r.json()).then(j=>{SP=j;render();if(!S.plants.length)openPicker(0);setInterval(render,1000)});
