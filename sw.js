// Service Worker for Lottery App

// Cache name with version number
const CACHE_NAME = 'lottery-app-v13';

// 额外存储的应用数据
let lotteryData = null;
let limitData = null;

// 需要缓存的资源列表 - 确保包含所有可能的路径格式
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    'index.html',
    './index.html',
    'styles.css',
    './styles.css',
    'script.js',
    './script.js',
    'manifest.json',
    './manifest.json',
    'icon-192.png',
    './icon-192.png',
    'favicon.ico',
    './favicon.ico',
    'apple-touch-icon.png',
    './apple-touch-icon.png',
    'apple-touch-icon-precomposed.png',
    './apple-touch-icon-precomposed.png',
    'offline.html',
    './offline.html',
    'sw.js',
    './sw.js',
    'service-worker.js',
    './service-worker.js'
];

// 数据过期检查
function isDataExpired(date) {
    if (!date) return true;
    
    // 获取当前日期（只保留年月日部分）
    const today = new Date().toISOString().split('T')[0];
    // 获取数据的日期
    const dataDate = new Date(date).toISOString().split('T')[0];
    
    // 数据日期不是今天，而是之前的，则数据过期
    return dataDate !== today;
}

// Service Worker安装事件
self.addEventListener('install', function(event) {
    console.log('[Service Worker] 安装中 (sw.js)');
    
    // 跳过等待，立即激活
    self.skipWaiting();
    
    // 缓存所有指定资源
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('[Service Worker] 缓存应用资源');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(function(error) {
                console.error('[Service Worker] 缓存资源失败:', error);
            })
    );
});

// Service Worker激活事件
self.addEventListener('activate', function(event) {
    console.log('[Service Worker] 激活中 (sw.js)');
    
    // 清理旧缓存，但保留数据缓存
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName !== CACHE_NAME && 
                           cacheName.startsWith('lottery-app-') && 
                           cacheName !== 'lottery-data-cache';
                }).map(function(cacheName) {
                    console.log('[Service Worker] 删除旧缓存:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
    
    // 立即接管页面
    return self.clients.claim();
});

// Service Worker拦截请求
self.addEventListener('fetch', function(event) {
    // 忽略浏览器扩展和其他非项目资源的请求
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.startsWith('http://localhost') && 
        !event.request.url.startsWith('http://127.0.0.1')) {
        return;
    }
    
    // 只处理GET请求
    if (event.request.method !== 'GET') return;
    
    // 优先从缓存获取，失败则从网络获取（缓存优先策略）
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // 如果找到缓存的响应，直接返回
                if (response) {
                    return response;
                }
                
                // 没有找到缓存，尝试从网络获取
                return fetch(event.request)
                    .then(function(networkResponse) {
                        // 检查响应是否有效
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        // 将响应克隆一份，一份返回，一份缓存
                        const responseToCache = networkResponse.clone();
                        
                        // 缓存响应
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(function(error) {
                                console.error('[Service Worker] 缓存响应失败:', error);
                            });
                        
                        return networkResponse;
                    })
                    .catch(function(error) {
                        console.error('[Service Worker] 网络请求失败:', error);
                        
                        // 如果是导航请求（HTML页面），返回离线页面
                        if (event.request.mode === 'navigate') {
                            return caches.match('./offline.html')
                                .then(function(offlineResponse) {
                                    return offlineResponse || new Response('无法连接网络，请检查您的网络连接', {
                                        status: 503,
                                        statusText: 'Service Unavailable',
                                        headers: new Headers({
                                            'Content-Type': 'text/html'
                                        })
                                    });
                                });
                        }
                        
                        // 其他资源无法获取
                        return new Response('资源不可用', {
                            status: 404,
                            statusText: 'Not Found'
                        });
                    });
            })
    );
});

// 保存数据到缓存存储
async function saveDataToCache(key, data) {
    try {
        const cache = await caches.open('lottery-data-cache');
        const response = new Response(JSON.stringify({
            data: data,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(`lottery-data-${key}`, response);
        console.log(`[Service Worker] 已将 ${key} 数据保存到缓存`);
        return true;
    } catch (error) {
        console.error(`[Service Worker] 保存 ${key} 数据到缓存失败:`, error);
        return false;
    }
}

// 从缓存存储加载数据
async function loadDataFromCache(key) {
    try {
        const cache = await caches.open('lottery-data-cache');
        const response = await cache.match(`lottery-data-${key}`);
        if (!response) return null;
        
        const data = await response.json();
        
        // 检查数据是否过期
        if (isDataExpired(data.timestamp)) {
            console.log(`[Service Worker] ${key} 数据已过期，不加载`);
            return null;
        }
        
        console.log(`[Service Worker] 已从缓存加载 ${key} 数据`);
        return data.data;
    } catch (error) {
        console.error(`[Service Worker] 从缓存加载 ${key} 数据失败:`, error);
        return null;
    }
}

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
            // 确保数据格式一致
            lotteryData = event.data.data;
            console.log('[Service Worker] 接收到的彩票数据:', lotteryData);
            
            // 立即保存到缓存存储
            saveDataToCache('lottery', lotteryData)
                .then(success => {
                    console.log('[Service Worker] 彩票数据保存结果:', success ? '成功' : '失败');
                })
                .catch(error => {
                    console.error('[Service Worker] 保存彩票数据出错:', error);
                });
            
            break;
        
        // 获取彩票数据
        case 'GET_LOTTERY_DATA':
            console.log('[Service Worker] 处理获取彩票数据请求');
            
            // 检查内存数据
            if (lotteryData) {
                console.log('[Service Worker] 使用内存中的数据响应请求');
                event.source.postMessage({
                    type: 'LOTTERY_DATA_RESPONSE',
                    data: lotteryData
                });
            } else {
                // 从缓存加载
                loadDataFromCache('lottery')
                    .then(data => {
                        console.log('[Service Worker] 从缓存加载的数据:', data);
                        if (data) {
                            lotteryData = data;
                            
                            // 响应请求
                            event.source.postMessage({
                                type: 'LOTTERY_DATA_RESPONSE',
                                data: lotteryData
                            });
                        } else {
                            // 没有缓存数据
                            event.source.postMessage({
                                type: 'LOTTERY_DATA_RESPONSE',
                                data: null
                            });
                        }
                    })
                    .catch(error => {
                        console.error('[Service Worker] 从缓存加载数据出错:', error);
                        // 响应错误
                        event.source.postMessage({
                            type: 'LOTTERY_DATA_RESPONSE',
                            data: null,
                            error: '加载数据出错'
                        });
                    });
            }
            break;
        
        // 清除彩票数据
        case 'CLEAR_LOTTERY_DATA':
            lotteryData = null;
            
            // 从缓存存储中清除数据
            caches.open('lottery-data-cache').then(cache => {
                cache.delete('lottery-data-lottery');
            });
            
            console.log('[Service Worker] 已清除彩票数据');
            break;
        
        // 保存限制数据
        case 'SAVE_LIMIT_DATA':
            limitData = event.data.data;
            
            // 立即保存到缓存存储
            saveDataToCache('limit', limitData);
            
            console.log('[Service Worker] 已保存限制数据:', limitData);
            break;
        
        // 获取限制数据
        case 'GET_LIMIT_DATA':
            // 如果内存中没有数据，尝试从缓存加载
            if (!limitData) {
                loadDataFromCache('limit').then(data => {
                    if (data) {
                        limitData = data;
                        // 响应请求
                        event.source.postMessage({
                            type: 'LIMIT_DATA_RESPONSE',
                            data: limitData
                        });
                    } else {
                        // 没有缓存数据
                        event.source.postMessage({
                            type: 'LIMIT_DATA_RESPONSE',
                            data: null
                        });
                    }
                });
            } else {
                // 使用内存中的数据响应
                event.source.postMessage({
                    type: 'LIMIT_DATA_RESPONSE',
                    data: limitData
                });
            }
            break;
        
        // 清除限制数据
        case 'CLEAR_LIMIT_DATA':
            limitData = null;
            
            // 从缓存存储中清除数据
            caches.open('lottery-data-cache').then(cache => {
                cache.delete('lottery-data-limit');
            });
            
            console.log('[Service Worker] 已清除限制数据');
            break;
    }
});

// 定期将数据保存到Cache Storage中，这样即使Service Worker被终止也能恢复数据
setInterval(function() {
    if (lotteryData) {
        saveDataToCache('lottery', lotteryData);
    }
    
    if (limitData) {
        saveDataToCache('limit', limitData);
    }
}, 30000); // 每30秒执行一次

// 在启动时从Cache Storage恢复数据
Promise.all([
    loadDataFromCache('lottery'),
    loadDataFromCache('limit')
]).then(([loadedLotteryData, loadedLimitData]) => {
    if (loadedLotteryData) {
        lotteryData = loadedLotteryData;
        console.log('[Service Worker] 成功恢复彩票数据');
    }
    
    if (loadedLimitData) {
        limitData = loadedLimitData;
        console.log('[Service Worker] 成功恢复限制数据');
    }
});

// 通知Service Worker激活
console.log('[Service Worker] sw.js 脚本加载完成'); 