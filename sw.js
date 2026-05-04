const CACHE_NAME = 'hymn-viewer-v1';
const ASSETS = [
  'index.html',
  'style.css',
  'app.js',
  'hymns.js',
  'manifest.json'
];

// 설치 시 기본 에셋 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 캐시에 있으면 캐시 반환, 없으면 네트워크 요청
      return response || fetch(event.request).then((fetchResponse) => {
        // 이미지 파일인 경우 캐시에 저장 (오프라인 대비)
        if (event.request.url.includes('.gif')) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        }
        return fetchResponse;
      });
    })
  );
});
