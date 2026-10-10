const KEY='podokonnik-v1',VER=3,H=3600e3,D=24*H,SPROUT=2*60e3,SLOTS=6,MIST=12*H,LIFT=-210;
const NOTES={1:'Пусть растёт вместе с тобой 🌿',2:'Поливай и вспоминай меня 💧',3:'Кусочек моего подоконника для тебя',4:'Для уюта дома 🏡'};
const WINDOWS={N:{name:'на север',glass:3,deep:1},E:{name:'на восток',glass:3,deep:2},S:{name:'на юг',glass:4,deep:2},W:{name:'на запад',glass:4,deep:2}};
const REPOT_REAL='Пересадить по-настоящему: от 9 ₾ в Gorgia (горшок 1,8 л — 4,60 ₾, грунт 2 л — 4,55 ₾) или за 0 ₾: обрезанная пластиковая бутылка или стаканчик от йогурта, 3–4 дырки в дне горячим гвоздём, поддон — крышка от банки.';
const MIST_REAL='Опрыскиватель за 0 ₾: пустой флакон с распылителем от любого средства, хорошо промытый.';
let SP=[],S=load();
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const debug=Q.has('debug');
function load(){let s;try{s=JSON.parse(localStorage.getItem(KEY))}catch(e){}return migrate(s||{})}
// v1/v2 (без номера версии) → v3: добавляем окно, зону, поправки роста. Ничего не удаляем.
function migrate(s){s.plants=Array.isArray(s.plants)?s.plants:[];s.offset=s.offset||0;s.received=Array.isArray(s.received)?s.received:[];
 const v=s.v||2;
 if(v<3){s.window=s.window||null;s.plants.forEach(p=>{if(p.zone!=='glass'&&p.zone!=='deep')p.zone=null;p.adj=p.adj||0})}
 s.v=VER;return s}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
const now=()=>Date.now()+(S.offset||0);
const sp=id=>SP.find(s=>s.id===id);
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const win=()=>WINDOWS[S.window]||WINDOWS.E;
// ---- свет ----
function lightBad(p){if(!p.zone)return null;const s=sp(p.sp),l=win()[p.zone];return l>s.light[1]?'hot':l<s.light[0]?'dark':null}
function bestZone(id){const s=sp(id),ok=z=>{const l=win()[z];return l>=s.light[0]&&l<=s.light[1]};const o=s.zone==='glass'?'deep':'glass';return ok(s.zone)?s.zone:ok(o)?o:s.zone}
function relight(p){const t=now(),b=lightBad(p);
 if(b&&!p.badSince)p.badSince=t;
 if(!b&&p.badSince){if(p.firstWater)p.adj=(p.adj||0)-Math.max(0,t-Math.max(p.badSince,p.firstWater+SPROUT))/2;p.badSince=null}}
// первый росток всегда ровно через 2 мин: свет влияет на рост и настроение только после него; грусть от света — примерно через сутки (20 ч)
const lightSad=p=>!!p.badSince&&!!p.firstWater&&now()-Math.max(p.badSince,p.firstWater+SPROUT)>=20*H;
// ---- рост: реальное время ± поправки (полутень медленнее, опрыскивание быстрее) ----
function mistBonus(p,t){if(!p.mistAt||!p.firstWater)return 0;const from=Math.max(p.mistAt,p.firstWater+SPROUT);return Math.max(0,Math.min(t-from,p.mistAt+MIST-from))*.5}
function growAdj(p){const t=now();let a=p.adj||0;if(p.badSince&&p.firstWater)a-=Math.max(0,t-Math.max(p.badSince,p.firstWater+SPROUT))/2;return a+mistBonus(p,t)}
function rate(p){if(!p.firstWater||now()<p.firstWater+SPROUT)return 1;let r=1;if(p.badSince)r-=.5;if(p.mistAt&&now()<p.mistAt+MIST)r+=.5;return r}
function stageInfo(p){const s=sp(p.sp);if(!p.firstWater)return{stage:0,next:null};
 const e=now()-(p.firstWater+SPROUT)+growAdj(p),marks=[0,s.stageHours[1]*H,s.stageHours[2]*H];
 let st=0;marks.forEach((m,i)=>{if(e>=m)st=i+1});
 return{stage:st,next:st<3?now()+(marks[st]-e)/rate(p):null}}
function moist(p){if(!p.lastWater)return 0;const s=sp(p.sp);return Math.max(0,1-(now()-p.lastWater)/(s.waterDays*D))}
const thirstSad=p=>{if(!p.lastWater)return false;const s=sp(p.sp);return now()-p.lastWater>(s.waterDays+1)*D};
const isSad=p=>thirstSad(p)||lightSad(p);
const cramped=p=>!p.repotted&&!!p.firstWater&&stageInfo(p).stage===3&&now()-p.firstWater>=sp(p.sp).repotDays*D;
function fmt(ms){ms=Math.max(0,ms);if(ms<H){const s=Math.ceil(ms/1e3);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
 if(ms<2*D){const m=Math.ceil(ms/60e3);return Math.floor(m/60)+' ч '+(m%60)+' мин'}const h=Math.round(ms/H);return Math.floor(h/24)+' дн '+(h%24)+' ч'}
const plural=(n,a,b,c)=>{const m=n%10,h=n%100;return m===1&&h!==11?a:m>=2&&m<=4&&(h<12||h>14)?b:c};
function approx(ms){const h=Math.max(1,Math.round(ms/H));if(h<20)return`~${h} ч`;const d=Math.max(1,Math.round(ms/D));return`~${d} ${plural(d,'день','дня','дней')}`}
const STAGES=['черенок в воде','росток','молодое','взрослое'];
const freeSlot=()=>{for(let i=0;i<SLOTS;i++)if(!S.plants.some(p=>p.slot===i))return i;return -1};
const plantAt=i=>S.plants.find(x=>x.slot===i);
function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.tm);toast.tm=setTimeout(()=>el.hidden=true,2600)}
function sky(){const h=new Date(now()).getHours();$('sky').className='sky '+(h>=7&&h<17?'day':h>=17&&h<21?'eve':'night');document.querySelector('.sill-wrap').dataset.win=S.window||'E'}
function hint(){const p=S.plants[0];let t='';
 if(!S.plants.length)t=(S.pending||!$('gift').hidden)?'Тебе подарили черенок 🎁':'Выбери первое растение';
 else if(!p.firstWater)t='Тапни по горшку, чтобы полить 💧';
 else if(stageInfo(p).stage===0)t=`Посажено! Росток появится через ${fmt(stageInfo(p).next-now())}`;
 else t='Тап — полить. Долгий тап — карточка, потяни вверх или вниз — переставить';
 $('hint').textContent=t;$('winBtn').textContent=`🪟 Окно ${S.window?win().name:'не выбрано'}`;
 const g=S.pending&&sp(S.pending.sp);$('pending').hidden=!g;
 if(g)$('pending').textContent=`🎁 Черенок ${g.gen} (дарит ${S.pending.from}) ждёт: ${freeSlot()<0?'освободи место':'тапни, чтобы посадить'}`}
// «что ему сейчас нужно» — одна строка
function need(p){const s=sp(p.sp),m=moist(p),b=lightBad(p),thirstIn=(m-.25)*s.waterDays*D;
 if(!p.firstWater)return'Полей, и черенок пустит корни';
 if(b==='hot')return'Переставь в глубину комнаты: у стекла слишком жарко на солнце';
 if(b==='dark')return'Переставь ближе к стеклу: тут темновато';
 if(m<=0)return'Полей прямо сейчас, очень хочет пить';
 if(m<.25)return'Хочет пить, полей сегодня';
 if(cramped(p))return'Тесно в горшке: пересади в горшок побольше';
 if(thirstIn<1.5*D)return`Хочет пить через ${approx(thirstIn)}`;
 return'Всё хорошо 🌿'}
const shown={},flash={};
function say(i,text,ms){flash[i]={text,until:Date.now()+(ms||2500)};render();setTimeout(render,(ms||2500)+50)}
function slotState(p){const si=stageInfo(p),m=moist(p),sad=isSad(p),left=cutLeft(p),b=lightBad(p),f=flash[p.slot];let top='',eta='';
 if(f&&f.until>Date.now())top='flash';
 else if(p.firstWater&&si.stage===0)top='timer';else if(p.lastWater&&m<.25)top=thirstSad(p)?'sad':'thirst';
 else if(b)top=b;else if(cramped(p))top='cramped';else if(si.stage===3&&!sad&&left<=0)top='cut';
 if(!p.firstWater)eta='полей меня 💧';else if(si.stage===0)eta='черенок пускает корни';
 else if(si.stage<3)eta=`до стадии «${STAGES[si.stage+1]}»: ${fmt(si.next-now())}`;
 else if(left>0)eta=`✂️ черенок через ${fmt(left)}`;else eta='взрослое 🌿';
 return{si,m,sad,top,eta,f,timer:si.next?fmt(si.next-now()):''}}
function render(){sky();hint();const sill=$('sill');
 if(!sill.children.length)for(let i=0;i<SLOTS;i++){const b=document.createElement('button');b.className='slot';b.dataset.i=i;b.innerHTML='<div class="inner"></div>';bindSlot(b,i);sill.appendChild(b)}
 for(let i=0;i<SLOTS;i++){const b=sill.children[i],p=plantAt(i),inner=b.firstChild;
  if(!p){if(b.dataset.sig!=='empty'){b.dataset.sig='empty';b.className='slot';inner.innerHTML='<div class="empty">+</div><div class="name">свободно</div>';delete shown[i]}continue}
  const s=sp(p.sp),st=slotState(p);
  b.classList.toggle('sad',st.sad);b.classList.toggle('wet',st.m>.6);b.classList.toggle('glass',p.zone==='glass');b.classList.toggle('bigpot',!!p.repotted);
  const sig=[p.sp,st.si.stage,st.top,st.top==='flash'?st.f.text:'',!p.firstWater,!!p.from,p.planted,showoffReady(p)&&!p.showoffDone].join('|');
  if(b.dataset.sig!==sig){b.dataset.sig=sig;
   const top={timer:'<div class="timer">🌱 через <span class="tm"></span></div>',thirst:'<div class="bubble">Хочу пить</div>',sad:'<div class="bubble">Мне грустно… 💧</div>',cut:'<div class="bubble">✂️ Черенок готов</div>',
    hot:`<div class="bubble">${lightSad(p)?'Жарко на солнце 🥵':'Жарко на солнце'}</div>`,dark:`<div class="bubble">${lightSad(p)?'Темновато… 🌥':'Темновато'}</div>`,cramped:'<div class="bubble">Тесно в горшке 🪴</div>',
    flash:st.f?`<div class="bubble pop">${st.f.text}</div>`:''}[st.top]||'';
   const prev=shown[i];const grew=prev&&prev.sp===p.sp&&st.si.stage>prev.stage;
   inner.innerHTML=`${top}${!p.firstWater?'<div class="finger">👆</div>':''}<img draggable="false" class="plant${grew?' grow':''}" src="img/${s.id}-${st.si.stage}.svg" alt="${s.name}"><img draggable="false" class="pot" src="img/pot.svg" alt=""><div class="name">${p.from?'🎁 ':''}${s.name}</div><div class="eta"></div>${showoffReady(p)&&!p.showoffDone?'<div class="showoff" role="button">📸 Показать дарителю</div>':''}`;
   const so=inner.querySelector('.showoff');if(so){['pointerdown','pointerup'].forEach(ev=>so.addEventListener(ev,e=>e.stopPropagation()));so.onclick=e=>{e.stopPropagation();p.showoffDone=true;save();render();showOff(p)}}
   if(grew)toast(st.si.stage===1?'Появился росток! 🌱':st.si.stage===3?'Совсем взрослое! Можно взять черенок ✂️':'Подросло! 🌿');
   shown[i]={sp:p.sp,stage:st.si.stage}}
  const tm=inner.querySelector('.tm');if(tm)tm.textContent=st.timer;inner.querySelector('.eta').textContent=st.eta}}
// тап — полить; долгий тап — карточка; долгий тап и потянуть вверх/вниз — переставить
function bindSlot(el,i){let tm,lifted=false,y0=0,x0=0,dy=0,id=null;
 const end=()=>{clearTimeout(tm);el.classList.remove('press','lift','to-glass','to-deep');el.style.removeProperty('--dy');id=null};
 el.addEventListener('pointerdown',e=>{lifted=false;dy=0;y0=e.clientY;x0=e.clientX;id=e.pointerId;el.classList.add('press');
  if(plantAt(i))tm=setTimeout(()=>{lifted=true;el.classList.remove('press');el.classList.add('lift');try{el.setPointerCapture(id)}catch(_){}if(navigator.vibrate)navigator.vibrate(15)},500)});
 el.addEventListener('pointermove',e=>{if(id!==e.pointerId)return;
  if(!lifted){if(Math.abs(e.clientX-x0)>12||Math.abs(e.clientY-y0)>12){clearTimeout(tm);el.classList.remove('press')}return}
  dy=e.clientY-y0;el.style.setProperty('--dy',dy+'px');el.classList.toggle('to-glass',dy<-40);el.classList.toggle('to-deep',dy>40)});
 el.addEventListener('pointerup',e=>{const wasLift=lifted,d=dy,p=plantAt(i),pressed=el.classList.contains('press');end();
  if(!p){if(pressed){if(S.pending)openGift(S.pending);else openPicker(i)}return}
  if(wasLift){if(d<-40)move(p,'glass');else if(d>40)move(p,'deep');else openCard(p)}
  else if(pressed)water(p,el)});
 el.addEventListener('pointercancel',()=>{lifted=false;end()});
 el.addEventListener('pointerleave',()=>{if(!lifted){clearTimeout(tm);el.classList.remove('press')}});
 el.addEventListener('contextmenu',e=>e.preventDefault());el.addEventListener('dragstart',e=>e.preventDefault())}
function move(p,zone){if(p.zone===zone){render();return}p.zone=zone;relight(p);save();render();const b=lightBad(p);
 toast(zone==='glass'?(b==='hot'?'Переставлено к стеклу, но тут жарко на солнце':b==='dark'?'Переставлено к стеклу, но тут всё ещё темновато':'Переставлено к стеклу ☀️ Тут ему хорошо')
  :(b==='dark'?'Переставлено в глубину, но тут темновато':b==='hot'?'Переставлено в глубину, но и тут жарко':'Переставлено в глубину комнаты 🌿 Тут ему хорошо'))}
function water(p,el){const t=now();
 if(p.firstWater&&moist(p)>.5){say(p.slot,'Мне уже хватит 💧');return}
 if(!p.firstWater)p.firstWater=t;p.lastWater=t;save();
 for(let k=0;k<5;k++){const d=document.createElement('span');d.className='drop';d.textContent='💧';d.style.left=(28+k*17)+'px';d.style.animationDelay=k*.08+'s';el.appendChild(d);setTimeout(()=>d.remove(),1300)}
 const pl=document.createElement('span');pl.className='plus';pl.textContent='+💧';el.appendChild(pl);setTimeout(()=>pl.remove(),1400);
 render()}
function mist(p){const s=sp(p.sp),el=$('sill').children[p.slot];
 if(s.mist!=='love'){toast(s.mistTip);return false}
 const t=now();p.adj=(p.adj||0)+mistBonus(p,t);p.mistAt=t;save();
 if(el)for(let k=0;k<6;k++){const d=document.createElement('span');d.className='mistdrop';d.textContent='💦';d.style.left=(20+k*16)+'px';d.style.animationDelay=k*.07+'s';el.appendChild(d);setTimeout(()=>d.remove(),1400)}
 say(p.slot,'Спасибо! 😊',2200);toast(`${s.name} радуется! 12 ч растёт быстрее 💦`);return true}
function repot(p){if(!cramped(p))return;p.repotted=now();save();render();toast('Пересажено! В просторном горшке черенки отрастают быстрее 🪴')}
function plant(slot,id,extra){const p=Object.assign({slot,sp:id,planted:now(),zone:bestZone(id),adj:0},extra||{});S.plants.push(p);relight(p);save();return p}
function openPicker(slot){if(!S.window)return askWindow(()=>openPicker(slot));$('pickGrid').innerHTML='';
 SP.forEach(s=>{const b=document.createElement('button');b.className='pick';b.innerHTML=`<img src="img/${s.id}-3.svg" alt=""><div>${s.name}</div><div class="muted">${s.speed}</div>`;
  b.onclick=()=>{plant(slot,s.id);$('picker').hidden=true;render()};$('pickGrid').appendChild(b)});
 $('picker').hidden=false}
// ---- окно ----
function askWindow(then){$('winBody').innerHTML=`<h2>Куда смотрит твоё окно?</h2><p class="muted">Так растения поймут, где светлее. Потом можно поменять, кнопка «Окно» вверху.</p>
 <div class="wingrid">${[['N','⬆️ Север'],['E','➡️ Восток'],['S','⬇️ Юг'],['W','⬅️ Запад']].map(([k,v])=>`<button class="chip${S.window===k?' on':''}" data-w="${k}">${v}</button>`).join('')}</div>
 <button class="btn soft" data-w="E">🤷 Не знаю (будет восток)</button>
 <p class="muted small">Солнце заглядывает утром — восток, днём — юг, вечером — запад, почти никогда — север.</p>`;
 $('winBody').onclick=e=>{const b=e.target.closest('[data-w]');if(!b)return;const first=!S.window;S.window=b.dataset.w;
  S.plants.forEach(p=>{if(!p.zone)p.zone=bestZone(p.sp);relight(p)});save();$('win').hidden=true;render();
  if(!first){const bad=S.plants.filter(p=>lightBad(p)).length;toast(bad?`Окно ${win().name}. Проверь растения с пузырями: им нужен другой свет`:`Окно ${win().name}. Всем растениям свет подходит 🌿`)}
  if(then)then()};
 $('win').hidden=false}
// ---- черенки ----
function cutLeft(p){const s=sp(p.sp);return p.cutAt?p.cutAt+(s.cutHours||24)*(p.repotted&&p.cutAt>=p.repotted?.75:1)*H-now():0}
function cutButton(p){const si=stageInfo(p);
 if(si.stage<3)return'<button class="btn cut" disabled>✂️ Черенок можно взять у взрослого растения</button>';
 if(isSad(p))return`<button class="btn cut" disabled>✂️ ${thirstSad(p)?'Сначала полей':'Сначала переставь'}: грустному не до черенков</button>`;
 const left=cutLeft(p);
 if(left>0)return`<button class="btn cut" disabled>✂️ Отдыхает, следующий черенок через <span id="ccut">${fmt(left)}</span></button>`+(p.gift?'<button class="btn soft" id="resend">Отправить взятый черенок ещё раз</button>':'');
 return'<button class="btn cut on" id="cut">✂️ Взять черенок</button>'}
function code(){const a='abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=new Uint32Array(10);crypto.getRandomValues(r);return Array.from(r,x=>a[x%a.length]).join('')}
let cardP=null;
function tick(){render();if(!$('card').hidden&&cardP){const si=stageInfo(cardP);if($('cnext')&&si.next)$('cnext').textContent=fmt(si.next-now());if($('ccut'))$('ccut').textContent=fmt(cutLeft(cardP));if($('need'))$('need').textContent=need(cardP)}}
function openCard(p){cardP=p;const s=sp(p.sp),si=stageInfo(p);
 const next=!p.firstWater?'Полей, и через 2 минуты появится росток':si.next?`Следующая стадия через <span id="cnext">${fmt(si.next-now())}</span>`:'Уже взрослое 🌿';
 const boost=p.mistAt&&now()<p.mistAt+MIST?`<p class="muted">💦 Бонус к росту ещё ${fmt(p.mistAt+MIST-now())}</p>`:'';
 const repotBlock=si.stage<3?'':cramped(p)?`<button class="btn primary" id="repot">🪴 Пересадить в горшок побольше</button><p class="soon">${REPOT_REAL}</p>`
  :p.repotted?`<button class="btn cut" disabled>🪴 Уже в большом горшке, второй раз пересаживать не нужно</button><p class="soon">${REPOT_REAL}</p>`:'';
 $('cardBody').innerHTML=`<img class="big${p.repotted?' grown':''}" src="img/${s.id}-${si.stage}.svg" alt=""><h2>${s.name}</h2>
 ${p.from?`<p class="giftmark">🎁 Подарок, дарит ${esc(p.from)}</p>`:''}${p.from?'<button class="btn soft" id="thanks">Сказать спасибо 🌱</button>':''}${showoffReady(p)?'<button class="btn primary" id="showoff">Показать дарителю, как подросло 📸</button>':''}
 <p class="need">💡 <span id="need">${need(p)}</span></p>
 <p>Стадия: <b>${STAGES[si.stage]}</b> · ${p.zone==='glass'?'у стекла':'в глубине комнаты'}</p><p class="muted">${next}</p>${boost}
 <div class="row2"><button class="btn soft" id="move">${p.zone==='glass'?'↓ Переставить в глубину':'↑ Переставить к стеклу'}</button><button class="btn soft" id="mist">💦 Опрыскать</button></div>
 <div id="mistTip">${s.mist==='love'?`<p class="muted small">${s.mistTip} ${MIST_REAL}</p>`:''}</div>
 ${repotBlock}
 <ul>${s.facts.map(f=>`<li>${f}</li>`).join('')}</ul>
 ${cutButton(p)}
 <button class="btn primary" id="real">Вырастить по-настоящему</button><div id="soon"></div>
 <button class="btn soft" id="remove">Убрать с подоконника</button>
 <button class="btn soft" id="close">Закрыть</button>`;
 $('real').onclick=()=>{$('soon').innerHTML=`<div class="soon"><b>Купить в Батуми:</b> ${s.buy} в частных объявлениях, ${s.extra}. Цену уточняй у продавца.<br><br><b>Бесплатно, за 0 ₾:</b> попроси черенок у знакомых или в чате обмена растений. Как укоренить: ${s.free}</div>`};
 $('move').onclick=()=>{$('card').hidden=true;move(p,p.zone==='glass'?'deep':'glass')};
 $('mist').onclick=()=>{if(mist(p))openCard(p);else $('mistTip').innerHTML=`<p class="soon">${s.mistTip} Ничего страшного, просто в следующий раз не надо 🙂</p>`};
 if($('repot'))$('repot').onclick=()=>{repot(p);openCard(p)};
 if($('thanks'))$('thanks').onclick=()=>thank(p.sp);
 if($('showoff'))$('showoff').onclick=()=>{p.showoffDone=true;save();render();showOff(p)};
 if($('cut'))$('cut').onclick=()=>{p.cutAt=now();p.gift={c:code()};save();render();openSend(p)};
 if($('resend'))$('resend').onclick=()=>openSend(p);
 $('remove').onclick=e=>{const b=e.target;if(!b.dataset.sure){b.dataset.sure=1;b.textContent='Точно убрать? Нажми ещё раз';b.classList.add('warn');return}
  S.plants=S.plants.filter(x=>x!==p);save();$('card').hidden=true;render();if(S.pending)openGift(S.pending)};
 $('close').onclick=()=>$('card').hidden=true;$('card').hidden=false}
function giftUrl(p,from,note){const u=new URL('gift/'+p.sp+'.html',location.href);u.search='';u.hash='';
 u.searchParams.set('from',from);u.searchParams.set('note',note);u.searchParams.set('c',p.gift.c);return u.toString()}
function openSend(p){cardP=null;const s=sp(p.sp);let note=p.gift.note||1;
 $('cardBody').innerHTML=`<h2>Подарить черенок</h2>
 <div class="postcard"><img src="img/${s.id}-0.svg" alt=""><div><b>Черенок ${s.gen}</b><div class="muted">Получатель посадит его на свой подоконник</div></div></div>
 <label class="lbl" for="from">От кого</label><input id="from" class="inp" maxlength="24" placeholder="Твоё имя" value="${esc(S.name||'')}">
 <div class="lbl">Пожелание</div><div class="notes" id="notes">${Object.entries(NOTES).map(([k,v])=>`<button class="chip${+k===note?' on':''}" data-n="${k}">${v}</button>`).join('')}</div>
 <button class="btn primary" id="send">Отправить</button><div id="linkbox"></div>
 <button class="btn soft" id="close">Готово</button>`;
 $('notes').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;note=+b.dataset.n;[...$('notes').children].forEach(c=>c.classList.toggle('on',c===b))};
 $('send').onclick=async()=>{const from=$('from').value.trim().replace(/\s+/g,' ');if(!from){$('from').focus();toast('Напиши, от кого черенок');return}
  S.name=from;p.gift.note=note;save();const url=giftUrl(p,from,note);
  const text=`Дарю тебе черенок ${s.gen} 🌱 ${NOTES[note]}. Забирай на свой подоконник:`;
  $('linkbox').innerHTML=`<div class="soon linkbox">${esc(decodeURI(url))}</div>`;
  if(navigator.share){try{await navigator.share({title:'Черенок в подарок',text,url});return}catch(e){if(e.name==='AbortError')return}}
  if(await copy(text+' '+url))toast('Ссылка скопирована, отправь её в чат');else toast('Скопируй ссылку ниже')};
 $('close').onclick=()=>$('card').hidden=true;$('card').hidden=false}
async function copy(t){try{await navigator.clipboard.writeText(t);return true}catch(e){}
 try{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity=0;document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return ok}catch(e){return false}}
const GAME='https://el188el.github.io/podokonnik/';
async function thank(id){const s=sp(id),text=`${s.poss} уже у меня на подоконнике 🌱 Мой подоконник:`;
 if(navigator.share){try{await navigator.share({text:text+' '+GAME});return}catch(e){if(e.name==='AbortError')return}}
 window.open('https://t.me/share/url?url='+encodeURIComponent(GAME)+'&text='+encodeURIComponent(text),'_blank')}
const showoffReady=p=>!!p.from&&now()-(p.claimedAt||p.planted)>=72*H;
function loadImg(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})}
async function plantPng(p){const st=stageInfo(p).stage,c=document.createElement('canvas');c.width=c.height=800;const x=c.getContext('2d');
 x.fillStyle='#DDF3EC';x.fillRect(0,0,800,800);x.fillStyle='#E9C9A0';x.fillRect(0,700,800,100);
 const [pl,pot]=await Promise.all([loadImg(`img/${p.sp}-${st}.svg`),loadImg('img/pot.svg')]);
 x.drawImage(pl,190,70,420,490);x.drawImage(pot,200,540,400,233);
 return new Promise(r=>c.toBlob(b=>r(b&&new File([b],`podokonnik-${p.sp}.png`,{type:'image/png'})),'image/png'))}
async function showOff(p){const s=sp(p.sp),text=`Смотри, как ${s.grown} 🌱 Мой подоконник:`;
 if(navigator.canShare){try{const f=await plantPng(p);if(f&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:text+' '+GAME});return}}catch(e){if(e.name==='AbortError')return}}
 window.open('https://t.me/share/url?url='+encodeURIComponent(GAME)+'&text='+encodeURIComponent(text),'_blank')}
// ---- получение ----
function parseGift(){if(!Q.has('gift'))return null;
 const g={sp:Q.get('gift'),from:(Q.get('from')||'').trim().slice(0,24),note:+Q.get('note')||0,c:Q.get('c')||''};
 g.ok=!!sp(g.sp)&&/^[A-Za-z0-9]{8,32}$/.test(g.c)&&!!g.from;if(!NOTES[g.note])g.note=0;return g}
function showMsg(icon,title,text){$('giftBody').innerHTML=`<div class="gicon">${icon}</div><h2>${title}</h2><p class="muted">${text}</p><button class="btn primary" id="gok">На подоконник</button>`;
 $('gok').onclick=()=>{$('gift').hidden=true;if(!S.plants.length&&!S.pending)openPicker(0)};$('gift').hidden=false}
function openGift(g){
 if(!g.ok)return showMsg('🍃','Черенок потерялся в пути','Ссылка повредилась по дороге. Попроси прислать её ещё раз, а пока загляни на свой подоконник.');
 if(S.received.includes(g.c))return showMsg('🌿','Этот черенок уже у тебя',"Он уже растёт на твоём подоконнике. Одну ссылку можно забрать только один раз.");
 const s=sp(g.sp),newbie=!S.plants.length,full=freeSlot()<0;
 $('giftBody').innerHTML=`<div class="postcard big2"><img src="img/${s.id}-0.svg" alt=""></div>
 <h2>${esc(g.from)} дарит тебе черенок ${s.gen}</h2>${g.note?`<p class="note">«${NOTES[g.note]}»</p>`:''}
 <p class="muted">${newbie?'Это будет твоё первое растение на подоконнике.':full?'':'Посадим его в свободный горшок.'}</p>
 ${full?'<div class="soon">Подоконник занят, освободи место. Подарок никуда не денется, он подождёт.</div><button class="btn primary" id="gok">Понятно</button>':'<button class="btn primary" id="take">Забрать</button>'}`;
 if(full){S.pending={sp:g.sp,from:g.from,note:g.note,c:g.c,ok:true};save();$('gok').onclick=()=>{$('gift').hidden=true;render()}}
 else $('take').onclick=()=>{const slot=freeSlot();plant(slot,g.sp,{claimedAt:now(),from:g.from,gift:null,giftCode:g.c});
  S.received.push(g.c);if(S.pending&&S.pending.c===g.c)S.pending=null;save();render();
  $('giftBody').innerHTML=`<div class="gicon">🌱</div><h2>Черенок посажен!</h2><p class="muted">Полей его, и скоро появится росток. Даритель: ${esc(g.from)}. Скажи спасибо!</p><button class="btn primary" id="thanks">Сказать спасибо 🌱</button><button class="btn soft" id="gok">На подоконник</button>`;
  $('thanks').onclick=()=>thank(g.sp);$('gok').onclick=()=>{$('gift').hidden=true;render();if(!S.window)askWindow()};
  setTimeout(()=>{const el=$('sill').children[slot];el&&el.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})},50);};
 $('gift').hidden=false}
$('pending').onclick=()=>S.pending&&openGift(S.pending);
$('winBtn').onclick=()=>askWindow();
$('card').onclick=e=>{if(e.target.id==='card')$('card').hidden=true};
$('picker').onclick=e=>{if(e.target.id==='picker'&&S.plants.length)$('picker').hidden=true};
$('win').onclick=e=>{if(e.target.id==='win'&&S.window)$('win').hidden=true};
if(debug){$('debug').hidden=false;
 $('ff').onclick=()=>{S.offset=(S.offset||0)+D;save();render()};
 $('ff2').onclick=()=>{S.offset=(S.offset||0)+SPROUT;save();render()};
 $('ff12').onclick=()=>{S.offset=(S.offset||0)+12*H;save();render()};
 $('adult').onclick=()=>{S.plants.forEach(p=>{const s=sp(p.sp);p.firstWater=now()-SPROUT-s.stageHours[2]*H-H-growAdj(p);p.lastWater=now()});save();render()};
 $('cramp').onclick=()=>{S.plants.forEach(p=>{const s=sp(p.sp);p.firstWater=Math.min(p.firstWater||now(),now()-s.repotDays*D-1e3);p.lastWater=now()});save();render()};
 $('fill').onclick=()=>{let i;while((i=freeSlot())>=0){const s=SP[i%SP.length];plant(i,s.id,{firstWater:now(),lastWater:now()})}save();render()};
 $('reset').onclick=()=>{localStorage.removeItem(KEY);S=load();render();openPicker(0)}}
fetch('species.json').then(r=>r.json()).then(j=>{SP=j;
 if(S.window)S.plants.forEach(p=>{if(!p.zone){p.zone=bestZone(p.sp);relight(p)}});save();render();
 const g=parseGift();
 if(g){const keep=new URLSearchParams();if(debug)keep.set('debug','1');history.replaceState(null,'',location.pathname+(keep.toString()?'?'+keep:''));openGift(g)}
 else if(S.pending)openGift(S.pending);
 else if(!S.plants.length)openPicker(0);
 else if(!S.window)askWindow();
 setInterval(tick,1000)});
// ---- PWA ----
let deferred=null;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if(!standalone())$('install').hidden=false;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;if(!standalone())$('install').hidden=false});
addEventListener('appinstalled',()=>{$('install').hidden=true;deferred=null;toast('Подоконник теперь на главном экране 🌱')});
$('install').onclick=async()=>{if(deferred){deferred.prompt();const r=await deferred.userChoice.catch(()=>null);deferred=null;if(r&&r.outcome==='accepted')$('install').hidden=true;return}
 cardP=null;$('cardBody').innerHTML=`<h2>Подоконник на главный экран</h2>
 <p class="muted">Так игра будет открываться как приложение, одним тапом.</p>
 <p><b>Chrome:</b></p><ol class="steps"><li>Нажми меню ⋮ справа вверху.</li><li>Выбери «Добавить на главный экран».</li></ol>
 <p><b>Samsung Internet:</b></p><ol class="steps"><li>Нажми меню ≡ справа внизу.</li><li>Выбери «Добавить страницу на» → «Главный экран».</li></ol>
 <button class="btn soft" id="close">Понятно</button>`;$('close').onclick=()=>$('card').hidden=true;$('card').hidden=false};
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
