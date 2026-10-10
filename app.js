const KEY='podokonnik-v1',H=3600e3,D=24*H,SPROUT=2*60e3,SLOTS=6;
const NOTES={1:'Пусть растёт вместе с тобой 🌿',2:'Поливай и вспоминай меня 💧',3:'Кусочек моего подоконника для тебя',4:'Для уюта дома 🏡'};
let SP=[],S=load();
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const debug=Q.has('debug');
function load(){let s;try{s=JSON.parse(localStorage.getItem(KEY))}catch(e){}s=s||{};s.plants=s.plants||[];s.offset=s.offset||0;s.received=s.received||[];return s}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
const now=()=>Date.now()+(S.offset||0);
const sp=id=>SP.find(s=>s.id===id);
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function stageInfo(p){const s=sp(p.sp);if(!p.firstWater)return{stage:0,next:null};
 const t0=p.firstWater+SPROUT,t=now();
 const marks=[t0,t0+s.stageHours[1]*H,t0+s.stageHours[2]*H];
 let st=0;marks.forEach((m,i)=>{if(t>=m)st=i+1});
 return{stage:st,next:st<3?marks[st]:null}}
function moist(p){if(!p.lastWater)return 0;const s=sp(p.sp);return Math.max(0,1-(now()-p.lastWater)/(s.waterDays*D))}
function isSad(p){if(!p.lastWater)return false;const s=sp(p.sp);return now()-p.lastWater>(s.waterDays+1)*D}
function fmt(ms){ms=Math.max(0,ms);if(ms<H){const s=Math.ceil(ms/1e3);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
 if(ms<2*D){const m=Math.ceil(ms/60e3);return Math.floor(m/60)+' ч '+(m%60)+' мин'}const h=Math.round(ms/H);return Math.floor(h/24)+' дн '+(h%24)+' ч'}
const STAGES=['черенок в воде','росток','молодое','взрослое'];
const freeSlot=()=>{for(let i=0;i<SLOTS;i++)if(!S.plants.some(p=>p.slot===i))return i;return -1};
const plantAt=i=>S.plants.find(x=>x.slot===i);
function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.tm);toast.tm=setTimeout(()=>el.hidden=true,2600)}
function sky(){const h=new Date(now()).getHours();$('sky').className='sky '+(h>=7&&h<17?'day':h>=17&&h<21?'eve':'night')}
function hint(){const p=S.plants[0];let t='';
 if(!S.plants.length)t=(S.pending||!$('gift').hidden)?'Тебе подарили черенок 🎁':'Выбери первое растение';
 else if(!p.firstWater)t='Тапни по горшку, чтобы полить 💧';
 else if(stageInfo(p).stage===0)t=`Посажено! Росток появится через ${fmt(stageInfo(p).next-now())}`;
 else t='Тап — полить. Долгий тап — карточка растения';
 $('hint').textContent=t;
 const g=S.pending&&sp(S.pending.sp);$('pending').hidden=!g;
 if(g)$('pending').textContent=`🎁 Черенок ${g.gen} (дарит ${S.pending.from}) ждёт: ${freeSlot()<0?'освободи место':'тапни, чтобы посадить'}`}
const shown={};
function slotState(p){const si=stageInfo(p),m=moist(p),sad=isSad(p),left=cutLeft(p);let top='',eta='';
 if(p.firstWater&&si.stage===0)top='timer';else if(p.lastWater&&m<.25)top=sad?'sad':'thirst';else if(si.stage===3&&!sad&&left<=0)top='cut';
 if(!p.firstWater)eta='полей меня 💧';else if(si.stage===0)eta='черенок пускает корни';
 else if(si.stage<3)eta=`до стадии «${STAGES[si.stage+1]}»: ${fmt(si.next-now())}`;
 else if(left>0)eta=`✂️ черенок через ${fmt(left)}`;else eta='взрослое 🌿';
 return{si,m,sad,top,eta,timer:si.next?fmt(si.next-now()):''}}
function render(){sky();hint();const sill=$('sill');
 if(!sill.children.length)for(let i=0;i<SLOTS;i++){const b=document.createElement('button');b.className='slot';b.dataset.i=i;b.innerHTML='<div class="inner"></div>';bindSlot(b,i);sill.appendChild(b)}
 for(let i=0;i<SLOTS;i++){const b=sill.children[i],p=plantAt(i),inner=b.firstChild;
  if(!p){if(b.dataset.sig!=='empty'){b.dataset.sig='empty';b.className='slot';inner.innerHTML='<div class="empty">+</div><div class="name">свободно</div>';delete shown[i]}continue}
  const s=sp(p.sp),st=slotState(p);
  b.classList.toggle('sad',st.sad);b.classList.toggle('wet',st.m>.6);
  const sig=[p.sp,st.si.stage,st.top,!p.firstWater,!!p.from,p.planted].join('|');
  if(b.dataset.sig!==sig){b.dataset.sig=sig;
   const top={timer:'<div class="timer">🌱 через <span class="tm"></span></div>',thirst:'<div class="bubble">Хочу пить</div>',sad:'<div class="bubble">Мне грустно… 💧</div>',cut:'<div class="bubble">✂️ Черенок готов</div>'}[st.top]||'';
   const prev=shown[i];const grew=prev&&prev.sp===p.sp&&st.si.stage>prev.stage;
   inner.innerHTML=`${top}${!p.firstWater?'<div class="finger">👆</div>':''}<img class="plant${grew?' grow':''}" src="img/${s.id}-${st.si.stage}.svg" alt="${s.name}"><img class="pot" src="img/pot.svg" alt=""><div class="name">${p.from?'🎁 ':''}${s.name}</div><div class="eta"></div>`;
   if(grew)toast(st.si.stage===1?'Появился росток! 🌱':st.si.stage===3?'Совсем взрослое! Можно взять черенок ✂️':'Подросло! 🌿');
   shown[i]={sp:p.sp,stage:st.si.stage}}
  const tm=inner.querySelector('.tm');if(tm)tm.textContent=st.timer;inner.querySelector('.eta').textContent=st.eta}}
function bindSlot(el,i){let tm,done=false;
 el.addEventListener('pointerdown',()=>{done=false;el.classList.add('press');if(plantAt(i))tm=setTimeout(()=>{done=true;el.classList.remove('press');if(navigator.vibrate)navigator.vibrate(15);openCard(plantAt(i))},500)});
 ['pointerup','pointerleave','pointercancel'].forEach(e=>el.addEventListener(e,()=>{clearTimeout(tm);el.classList.remove('press');if(e==='pointerup'&&!done){const p=plantAt(i);if(p)water(p,el);else if(S.pending)openGift(S.pending);else openPicker(i)}}));
 el.addEventListener('contextmenu',e=>e.preventDefault())}
function water(p,el){const t=now();if(!p.firstWater)p.firstWater=t;p.lastWater=t;save();
 for(let k=0;k<5;k++){const d=document.createElement('span');d.className='drop';d.textContent='💧';d.style.left=(28+k*17)+'px';d.style.animationDelay=k*.08+'s';el.appendChild(d);setTimeout(()=>d.remove(),1300)}
 const pl=document.createElement('span');pl.className='plus';pl.textContent='+💧';el.appendChild(pl);setTimeout(()=>pl.remove(),1400);
 render()}
function openPicker(slot){$('pickGrid').innerHTML='';
 SP.forEach(s=>{const b=document.createElement('button');b.className='pick';b.innerHTML=`<img src="img/${s.id}-3.svg" alt=""><div>${s.name}</div><div class="muted">${s.speed}</div>`;
  b.onclick=()=>{S.plants.push({slot,sp:s.id,planted:now()});save();$('picker').hidden=true;render()};$('pickGrid').appendChild(b)});
 $('picker').hidden=false}
// ---- черенки ----
function cutLeft(p){const s=sp(p.sp);return p.cutAt?p.cutAt+(s.cutHours||24)*H-now():0}
function cutButton(p){const si=stageInfo(p);
 if(si.stage<3)return'<button class="btn cut" disabled>✂️ Черенок можно взять у взрослого растения</button>';
 if(isSad(p))return'<button class="btn cut" disabled>✂️ Сначала полей: грустному не до черенков</button>';
 const left=cutLeft(p);
 if(left>0)return`<button class="btn cut" disabled>✂️ Отдыхает, следующий черенок через <span id="ccut">${fmt(left)}</span></button>`+(p.gift?'<button class="btn soft" id="resend">Отправить взятый черенок ещё раз</button>':'');
 return'<button class="btn cut on" id="cut">✂️ Взять черенок</button>'}
function code(){const a='abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=new Uint32Array(10);crypto.getRandomValues(r);return Array.from(r,x=>a[x%a.length]).join('')}
let cardP=null;
function tick(){render();if(!$('card').hidden&&cardP){const si=stageInfo(cardP);if($('cnext')&&si.next)$('cnext').textContent=fmt(si.next-now());if($('ccut'))$('ccut').textContent=fmt(cutLeft(cardP))}}
function openCard(p){cardP=p;const s=sp(p.sp),si=stageInfo(p),m=moist(p);
 const next=!p.firstWater?'Полей, и через 2 минуты появится росток':si.next?`Следующая стадия через <span id="cnext">${fmt(si.next-now())}</span>`:'Уже взрослое 🌿';
 const drink=!p.lastWater?'Ещё не полито':m<=0?'Хочет пить прямо сейчас':`Захочет пить через ${fmt(m*s.waterDays*D)}`;
 $('cardBody').innerHTML=`<img class="big" src="img/${s.id}-${si.stage}.svg" alt=""><h2>${s.name}</h2>
 ${p.from?`<p class="giftmark">🎁 Подарок, дарит ${esc(p.from)}</p>`:''}
 <p>Стадия: <b>${STAGES[si.stage]}</b></p><p class="muted">${next}<br>${drink}</p>
 <ul>${s.facts.map(f=>`<li>${f}</li>`).join('')}</ul>
 ${cutButton(p)}
 <button class="btn primary" id="real">Вырастить по-настоящему</button><div id="soon"></div>
 <button class="btn soft" id="remove">Убрать с подоконника</button>
 <button class="btn soft" id="close">Закрыть</button>`;
 $('real').onclick=()=>{$('soon').innerHTML=`<div class="soon"><b>Купить в Батуми:</b> ${s.buy} в частных объявлениях, ${s.extra}. Цену уточняй у продавца.<br><br><b>Бесплатно, за 0 ₾:</b> попроси черенок у знакомых или в чате обмена растений. Как укоренить: ${s.free}</div>`};
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
 else $('take').onclick=()=>{const slot=freeSlot();S.plants.push({slot,sp:g.sp,planted:now(),from:g.from,gift:null,giftCode:g.c});
  S.received.push(g.c);if(S.pending&&S.pending.c===g.c)S.pending=null;save();$('gift').hidden=true;render();
  setTimeout(()=>{const el=$('sill').children[slot];el&&el.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})},50);toast('Черенок посажен 🌱 Полей его!')};
 $('gift').hidden=false}
$('pending').onclick=()=>S.pending&&openGift(S.pending);
$('card').onclick=e=>{if(e.target.id==='card')$('card').hidden=true};
$('picker').onclick=e=>{if(e.target.id==='picker'&&S.plants.length)$('picker').hidden=true};
if(debug){$('debug').hidden=false;
 $('ff').onclick=()=>{S.offset=(S.offset||0)+D;save();render()};
 $('ff2').onclick=()=>{S.offset=(S.offset||0)+SPROUT;save();render()};
 $('adult').onclick=()=>{S.plants.forEach(p=>{const s=sp(p.sp);p.firstWater=now()-SPROUT-s.stageHours[2]*H-1e3;p.lastWater=now()});save();render()};
 $('fill').onclick=()=>{let i;while((i=freeSlot())>=0){const s=SP[i%SP.length];S.plants.push({slot:i,sp:s.id,planted:now(),firstWater:now(),lastWater:now()})}save();render()};
 $('reset').onclick=()=>{localStorage.removeItem(KEY);S=load();render();openPicker(0)}}
fetch('species.json').then(r=>r.json()).then(j=>{SP=j;render();
 const g=parseGift();
 if(g){const keep=new URLSearchParams();if(debug)keep.set('debug','1');history.replaceState(null,'',location.pathname+(keep.toString()?'?'+keep:''));openGift(g)}
 else if(S.pending)openGift(S.pending);
 else if(!S.plants.length)openPicker(0);
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
