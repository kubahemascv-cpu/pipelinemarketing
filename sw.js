// SW Executive Marketing Dashboard — Kubah Emas
// File statis, permanen di repo. Sebelumnya file ini SAMA SEKALI belum
// punya Service Worker, jadi gak pernah dikenali Android sebagai app
// yang bisa diinstall permanen — cuma jadi bookmark biasa.

const CACHE = 'exec-dash-v39';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(['./', 'manifest.json', 'icon-192.png', 'icon-512.png']).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
      .then(function () {
        // Begitu versi baru ini aktif, paksa semua halaman yang lagi
        // kebuka buat reload sendiri — jadi cukup refresh biasa, gak
        // perlu tutup app total lagi buat kepake versi terbaru.
        return self.clients.matchAll({ type: 'window' }).then(function (clientsList) {
          clientsList.forEach(function (client) { client.navigate(client.url); });
        });
      })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  // Data live dari Google Sheets (JSONP/gviz, 4 sumber): selalu
  // langsung ke internet, jangan pernah di-cache.
  if (/docs\.google\.com|googleapis\.com/.test(e.request.url)) {
    e.respondWith(fetch(e.request));
    return;
  }

  // File app (HTML/JS/CSS/icon/manifest): cache-first.
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(e.request).then(function (r) {
        return r || fetch(e.request).then(function (res) {
          if (res && res.status === 200) c.put(e.request, res.clone());
          return res;
        }).catch(function () { return r; });
      });
    })
  );
});
