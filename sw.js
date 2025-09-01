// SwimRPE PWA Service Worker
const CACHE_NAME = 'swimrpe-v1.0.0';
const OFFLINE_URL = '/';

// 캐시할 파일들
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
  // 구글 폰트 (온라인일 때만)
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// 런타임에 캐시할 파일들 (동적 캐싱)
const RUNTIME_CACHE = 'swimrpe-runtime-v1.0.0';

// 서비스 워커 설치
self.addEventListener('install', (event) => {
  console.log('SwimRPE 서비스 워커 설치 중...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 오픈됨:', CACHE_NAME);
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // 새 서비스 워커를 즉시 활성화
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('캐시 추가 실패:', error);
      })
  );
});

// 서비스 워커 활성화
self.addEventListener('activate', (event) => {
  console.log('SwimRPE 서비스 워커 활성화됨');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 오래된 캐시 삭제
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // 모든 클라이언트에서 새 서비스 워커 활성화
        return self.clients.claim();
      })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') {
    return;
  }

  // 오프라인 우선 전략 (캐시 먼저 확인, 없으면 네트워크)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('캐시에서 응답:', event.request.url);
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // 응답이 유효하지 않으면 그대로 반환
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답을 복사 (스트림은 한 번만 사용 가능)
            const responseToCache = response.clone();

            // 런타임 캐시에 추가
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            console.log('네트워크에서 응답하고 캐시 추가:', event.request.url);
            return response;
          })
          .catch(() => {
            // 네트워크 실패 시 오프라인 페이지 제공
            if (event.request.destination === 'document') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// 백그라운드 동기화 (미래 기능)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('백그라운드 동기화 실행');
    event.waitUntil(syncData());
  }
});

// 푸시 알림 처리 (미래 기능)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || '수영 기록을 확인해보세요!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: '앱 열기'
        },
        {
          action: 'close',
          title: '닫기'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'SwimRPE', options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// 데이터 동기화 함수 (미래 구현)
async function syncData() {
  try {
    // 로컬 스토리지의 데이터를 서버와 동기화
    // 현재는 로컬 전용이므로 구현 없음
    console.log('데이터 동기화 완료');
  } catch (error) {
    console.error('데이터 동기화 실패:', error);
  }
}

// 앱 업데이트 알림
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 에러 처리
self.addEventListener('error', (event) => {
  console.error('서비스 워커 에러:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('처리되지 않은 Promise 거부:', event.reason);
});

console.log('SwimRPE 서비스 워커 로드 완료');
