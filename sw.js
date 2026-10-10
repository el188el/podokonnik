// Подоконник: кэш оболочки, работает офлайн
const CACHE='podokonnik-v2';
const SHELL=["./", "index.html", "style.css", "app.js", "species.json", "manifest.webmanifest", "img/chlorophytum-0.svg", "img/chlorophytum-1.svg", "img/chlorophytum-2.svg", "img/chlorophytum-3.svg", "img/geranium-0.svg", "img/geranium-1.svg", "img/geranium-2.svg", "img/geranium-3.svg", "img/monstera-0.svg", "img/monstera-1.svg", "img/monstera-2.svg", "img/monstera-3.svg", "img/pot.svg", "img/scindapsus-0.svg", "img/scindapsus-1.svg", "img/scindapsus-2.svg", "img/scindapsus-3.svg", "img/tradescantia-0.svg", "img/tradescantia-1.svg", "img/tradescantia-2.svg", "img/tradescantia-3.svg", "img/violet-0.svg", "img/violet-1.svg", "img/violet-2.svg", "img/violet-3.svg", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "gift/chlorophytum.html", "gift/geranium.html", "gift/monstera.html", "gift/scindapsus.html", "gift/tradescantia.html", "gift/violet.html"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(caches.open(CACHE).then(async c=>{
  const hit=await c.match(r,{ignoreSearch:true});
  const net=fetch(r).then(res=>{if(res.ok&&!new URL(r.url).search)c.put(r,res.clone());return res}).catch(()=>null);
  if(hit){e.waitUntil(net);return hit}
  const res=await net;if(res)return res;
  if(r.mode==='navigate')return c.match('index.html');
  return Response.error()}))});
