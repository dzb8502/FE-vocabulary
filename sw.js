const CACHE='fe-vocab-v1.2';
const ASSETS=['./','./index.html','./styles.v12.css','./app.v12.js','./manifest.webmanifest','./data/vocab.v12.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{let x=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',x));return r}).catch(()=>caches.match('./index.html')));return;}
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){let x=r.clone();caches.open(CACHE).then(c=>c.put(e.request,x))}return r}).catch(()=>caches.match(e.request)));
});
