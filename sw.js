const CACHE='nutricasa-static-v1';
const STATIC=['/','/index.html','/styles.css','/app.js','/manifest.webmanifest','/assets/icons/icon.svg','/assets/icons/icon-192.png','/assets/icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return res; }).catch(()=>caches.match('/index.html'))));
});
