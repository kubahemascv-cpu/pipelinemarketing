// SW Kalkulator Funnel & Budget
const CACHE = 'funnelcalc-v4';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(['./', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-192-maskable.png', 'icon-512-maskable.png']).catch(function () {});
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
        return self.clients.matchAll({ type: 'window' }).then(function (clientsList) {
          clientsList.forEach(function (client) { client.navigate(client.url); });
        });
      })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  // Data live ke Google Sheets: selalu langsung ke internet, gak di-cache.
  if (/docs\.google\.com|googleapis\.com|script\.google\.com/.test(e.request.url)) {
    e.respondWith(fetch(e.request));
    return;
  }

  // HTML: network-first, biar refresh biasa selalu keambil versi
  // terbaru (pelajaran dari Dashboard New Leads — cache-first bikin
  // update gak kelihatan tanpa hard refresh).
  var isHTML = e.request.mode === 'navigate' || e.request.url.endsWith('.html') || e.request.url.endsWith('/');
  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          caches.open(CACHE).then(function (c) { c.put(e.request, res.clone()); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }

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
