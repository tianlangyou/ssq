// 更新缓存版本
const CACHE_NAME = 'lottery-app-v13';

// 额外存储的应用数据
let lotteryData = null;
let limitData = null;

// 需要缓存的资源列表
const CACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './script.js',
  './styles.css',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './screenshot.png',
  './fonts/DIN-Bold.woff2',
  './fonts/PingFang-SC-Medium.woff2',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'favicon.ico',
  './favicon.ico',
  'apple-touch-icon-precomposed.png',
  './apple-touch-icon-precomposed.png',
  'offline.html',
  './offline.html'
];

// 安装Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  // 跳过等待，直接激活
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .catch(error => {
        console.error('[Service Worker] Caching assets failed:', error);
      })
  );
});

// 激活Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  // 立即控制所有页面
  self.clients.claim();
  
  // 清理旧版本缓存
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 处理资源请求
self.addEventListener('fetch', event => {
  // 排除跨域请求
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('fonts.googleapis.com')) {
    return;
  }
  
  // 网络优先策略，适用于经常更新的内容
  if (event.request.url.includes('api') || event.request.url.includes('data')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 请求成功，复制响应并缓存
          let responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // 离线时从缓存获取
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // 缓存优先策略，适用于静态资源
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 有缓存则返回缓存
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 无缓存则请求网络
        return fetch(event.request)
          .then(response => {
            // 请求成功，复制响应并缓存
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            let responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseClone);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch error:', error);
            // 对于导航请求，在离线时显示自定义离线页面
            if (event.request.mode === 'navigate') {
              return caches.match('./offline.html');
            }
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// 监听推送消息
self.addEventListener('push', event => {
  const options = {
    body: '新一期双色球开奖啦！',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情'
      },
      {
        action: 'close',
        title: '关闭'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('双色球选号助手', options)
  );
});

// 监听通知点击
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// 监听同步事件
self.addEventListener('sync', event => {
  if (event.tag === 'lottery-update') {
    event.waitUntil(
      // 执行数据同步
      fetch('./data/latest.json')
        .then(response => response.json())
        .then(data => {
          console.log('[Service Worker] Background sync successful', data);
          // 这里可以存储到IndexedDB
        })
        .catch(error => {
          console.log('[Service Worker] Background sync failed', error);
        })
    );
  }
});

// 监听来自客户端的消息
self.addEventListener('message', function(event) {
    console.log('[Service Worker] 收到消息:', event.data);
    
    // 根据消息类型处理
    switch (event.data.type) {
        // 检查版本
        case 'CHECK_VERSION':
            if (event.data.version !== CACHE_NAME) {
                // 通知客户端重新加载页面以使用新版本
                event.source.postMessage({
                    type: 'RELOAD_PAGE'
                });
            }
            break;
        
        // 保存彩票数据
        case 'SAVE_LOTTERY_DATA':
            lotteryData = event.data.data;
            console.log('[Service Worker] 已保存彩票数据:', lotteryData);
            break;
        
        // 获取彩票数据
        case 'GET_LOTTERY_DATA':
            event.source.postMessage({
                type: 'LOTTERY_DATA_RESPONSE',
                data: lotteryData
            });
            break;
        
        // 清除彩票数据
        case 'CLEAR_LOTTERY_DATA':
            lotteryData = null;
            console.log('[Service Worker] 已清除彩票数据');
            break;
        
        // 保存限制数据
        case 'SAVE_LIMIT_DATA':
            limitData = event.data.data;
            console.log('[Service Worker] 已保存限制数据:', limitData);
            break;
        
        // 获取限制数据
        case 'GET_LIMIT_DATA':
            event.source.postMessage({
                type: 'LIMIT_DATA_RESPONSE',
                data: limitData
            });
            break;
        
        // 清除限制数据
        case 'CLEAR_LIMIT_DATA':
            limitData = null;
            console.log('[Service Worker] 已清除限制数据');
            break;
    }
});

// 通知Service Worker激活
console.log('[Service Worker] 脚本加载完成'); 