// Service worker: deixa o app funcionando offline quando instalado como PWA (PC/celular via navegador)
const CACHE = 'fitpro-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network-first: pega a versão nova quando online, cai pro cache quando offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // só arquivos do app e o SDK do Firebase; Firestore/IA/Auth vão direto para a rede
  const u = new URL(e.request.url);
  if (u.origin !== location.origin && u.host !== 'www.gstatic.com') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
