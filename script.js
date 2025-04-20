document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM内容已加载，初始化应用');
    
    // 注释掉强制重置 - 这会导致每次刷新时都重置计数器
    // forceResetData();
    
    // 添加调试面板
    addDebugPanel();
    
    // 清除过期的号码数据 - 重要：确保在每次加载时都检查日期
    clearExpiredNumberData();
    
    // 初始化选号次数限制 - 重要：确保在每次加载时都初始化限制
    initLimitStatus();
    
    // 在页面加载时显示已保存的号码
    setTimeout(() => {
        displaySavedNumbers();
    }, 500);
    
    // 显示剩余选号次数
    updateRemainingCountDisplay();
    
    // 在页面加载时注册或更新Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker 注册成功:', registration.scope);
                
                // 检查更新
                registration.update();
                
                // 确保Service Worker已激活
                if (registration.active) {
                    console.log('Service Worker 已激活');
                }
            })
            .catch(error => {
                console.error('Service Worker 注册失败:', error);
            });
    }
    
    // Constants for the lottery
    const RED_BALL_COUNT = 33;    // 红球总数 (1-33)
    const BLUE_BALL_COUNT = 16;   // 蓝球总数 (1-16)
    const RED_SELECTION_COUNT = 6; // 选择6个红球
    const BLUE_SELECTION_COUNT = 1; // 选择1个蓝球
    
    // DOM Elements
    const redBallsCircle = document.getElementById('redBallsCircle');
    const blueBallsCircle = document.getElementById('blueBallsCircle');
    const generateBtn = document.getElementById('generateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const redNumbers = document.getElementById('redNumbers');
    const blueNumbers = document.getElementById('blueNumbers');
    const luckyMessage = document.getElementById('luckyMessage');
    const installTip = document.querySelector('.install-tip');
    const offlineStatus = document.getElementById('offlineStatus');
    
    console.log('DOM元素初始化:', 
        redBallsCircle ? '✓' : '✗',
        blueBallsCircle ? '✓' : '✗',
        generateBtn ? '✓' : '✗',
        resetBtn ? '✓' : '✗');
    
    // State variables
    let redBalls = [];
    let blueBalls = [];
    let selectedRedBalls = [];
    let selectedBlueBalls = [];
    let isSelecting = false;
    
    // 更新全局状态变量，确保与HTML中的处理函数协同工作
    window.appIsSelecting = isSelecting;
    window.selectedRedBalls = selectedRedBalls;
    window.selectedBlueBalls = selectedBlueBalls;
    
    // Check if running as standalone app (added to home screen)
    const isInStandaloneMode = () => 
        (window.matchMedia('(display-mode: standalone)').matches) || 
        (window.navigator.standalone) || 
        document.referrer.includes('android-app://');
        
    // 显示离线状态
    function updateOfflineStatus() {
        if (offlineStatus) {
            offlineStatus.style.display = navigator.onLine ? 'none' : 'block';
        }
    }
    
    // 初始检查网络状态
    updateOfflineStatus();
    
    // Hide install tip if already installed
    if (isInStandaloneMode()) {
        console.log('应用以独立模式运行');
        if (installTip) installTip.style.display = 'none';
    }
    
    // Initialize the lottery balls
    try {
        initializeBalls();
    } catch (e) {
        console.error('初始化球出错:', e);
    }
    
    // 立即绑定全局函数，确保HTML可访问
    window.startSelection = startSelection;
    window.resetSelection = resetSelection;
    
    // Prevent double tap to zoom on mobile
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        
        if (typeof lastTouchEnd === 'undefined') {
            lastTouchEnd = now;
            return;
        }
        
        if (now - lastTouchEnd < DOUBLE_TAP_DELAY) {
            event.preventDefault();
        }
        
        lastTouchEnd = now;
    }, false);
    
    // Initialize the balls in the lottery machine
    function initializeBalls() {
        console.log('初始化双色球');
        // 清除之前的球
        if (!redBallsCircle || !blueBallsCircle) {
            console.error('找不到球容器元素');
            return;
        }
        
        // Clear any existing balls
        redBallsCircle.innerHTML = '';
        blueBallsCircle.innerHTML = '';
        redBalls = [];
        blueBalls = [];
        
        // Get container dimensions for proper positioning
        const redContainerRect = redBallsCircle.getBoundingClientRect();
        const blueContainerRect = blueBallsCircle.getBoundingClientRect();
        
        // Adjust radius based on container size
        const redRadius = Math.min(redContainerRect.width, redContainerRect.height) / 2.5;
        const blueRadius = Math.min(blueContainerRect.width, blueContainerRect.height) / 2.5;
        
        // Create red balls
        for (let i = 1; i <= RED_BALL_COUNT; i++) {
            const ball = createBall(i, 'red-ball');
            redBallsCircle.appendChild(ball);
            redBalls.push(ball);
            
            // Positioning the ball randomly in the circle
            const angle = Math.random() * 2 * Math.PI;
            const radius = Math.random() * redRadius; 
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            
            ball.style.left = `calc(50% + ${x}px)`;
            ball.style.top = `calc(50% + ${y}px)`;
            
            // Apply random floating animation
            ball.style.animation = `float ${3 + Math.random() * 2}s ease-in-out infinite`;
            ball.style.animationDelay = `${Math.random() * 2}s`;
        }
        
        // Create blue balls
        for (let i = 1; i <= BLUE_BALL_COUNT; i++) {
            const ball = createBall(i, 'blue-ball');
            blueBallsCircle.appendChild(ball);
            blueBalls.push(ball);
            
            // Positioning the ball randomly in the circle
            const angle = Math.random() * 2 * Math.PI;
            const radius = Math.random() * blueRadius;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            
            ball.style.left = `calc(50% + ${x}px)`;
            ball.style.top = `calc(50% + ${y}px)`;
            
            // Apply random floating animation
            ball.style.animation = `float ${3 + Math.random() * 2}s ease-in-out infinite`;
            ball.style.animationDelay = `${Math.random() * 2}s`;
        }
        
        console.log(`初始化完成：${redBalls.length}个红球，${blueBalls.length}个蓝球`);
    }
    
    // Create a ball element
    function createBall(number, className) {
        const ball = document.createElement('div');
        ball.className = `ball ${className}`;
        ball.textContent = number;
        ball.dataset.number = number;
        return ball;
    }
    
    // 获取日期的通用函数，确保使用本地日期
    function getTodayDate() {
        // 创建新的日期对象确保使用当前时间
        const now = new Date();
        
        // 使用中国本地日期格式
        const today = now.toLocaleDateString('zh-CN');
        
        // 记录日期信息用于调试
        console.log(`获取今日日期: ${today}, 原始时间: ${now.toString()}`);
        
        return today;
    }
    
    // 强制重置所有数据
    function forceResetData() {
        try {
            console.log('强制重置所有数据开始');
            
            // 使用通用函数获取日期
            const today = getTodayDate();
            
            console.log(`当前实际日期: ${today}`);
            
            // 1. 清除localStorage数据
            localStorage.removeItem('selectedNumbersHistory');
            localStorage.setItem('lastSelectionDate', today);
            localStorage.setItem('selectionCount', '0');
            
            // 2. 尝试清除IndexedDB数据
            if (window.indexedDB) {
                const request = indexedDB.open('LotteryAppDB', 1);
                
                request.onsuccess = function(event) {
                    const db = event.target.result;
                    
                    if (db.objectStoreNames.contains('lotteryData')) {
                        const transaction = db.transaction(['lotteryData'], 'readwrite');
                        const store = transaction.objectStore('lotteryData');
                        
                        store.clear();
                        console.log('已清除IndexedDB数据');
                    }
                    
                    db.close();
                };
            }
            
            // 3. 通知Service Worker清除缓存数据
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CLEAR_LOTTERY_DATA'
                });
                
                navigator.serviceWorker.controller.postMessage({
                    type: 'SAVE_LIMIT_DATA',
                    data: {
                        selectionCount: 0,
                        lastSelectionDate: today
                    }
                });
                
                console.log('已通知Service Worker清除数据');
            }
            
            console.log('强制重置所有数据完成');
        } catch (error) {
            console.error('强制重置数据出错:', error);
        }
    }
    
    // 修改clearExpiredNumberData函数
    async function clearExpiredNumberData() {
        // 使用通用函数获取日期
        const today = getTodayDate();
        const lastDate = localStorage.getItem('lastSelectionDate');
        
        console.log(`检查日期: 当前日期: ${today}, 上次日期: ${lastDate}`);
        
        // 只有日期不同时才清除数据（隔天清除）
        if (lastDate && lastDate !== today) {
            console.log(`上次选号日期(${lastDate})与今天(${today})不同，清除过期数据`);
            
            // 清除localStorage数据
            localStorage.removeItem('selectedNumbersHistory');
            localStorage.setItem('lastSelectionDate', today);
            localStorage.setItem('selectionCount', '0'); // Reset selection count
            
            // 清除IndexedDB数据
            try {
                if (window.indexedDB) {
                    const db = await new Promise((resolve, reject) => {
                        const request = indexedDB.open('LotteryAppDB', 1);
                        request.onerror = (event) => reject(event);
                        request.onsuccess = (event) => resolve(event.target.result);
                    });
                    
                    const transaction = db.transaction(['lotteryData'], 'readwrite');
                    const store = transaction.objectStore('lotteryData');
                    await store.delete('selectedNumbersHistory');
                    await store.delete('limitStatus');
                    db.close();
                }
            } catch (error) {
                console.error('清除IndexedDB数据出错:', error);
            }
            
            // 通知Service Worker清除缓存数据
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'CLEAR_LOTTERY_DATA'
                });
                navigator.serviceWorker.controller.postMessage({
                    type: 'SAVE_LIMIT_DATA',
                    data: {
                        selectionCount: 0,
                        lastSelectionDate: today
                    }
                });
            }
            
            console.log('已清除过期的号码数据');
        } else {
            // 如果日期相同，确保lastSelectionDate已设置
            if (!lastDate) {
                console.log('首次使用，设置初始日期');
                localStorage.setItem('lastSelectionDate', today);
            } else {
                console.log('今天的号码数据保持有效');
            }
        }
    }
    
    // 修改initLimitStatus函数
    async function initLimitStatus() {
        // 使用通用函数获取日期
        const today = getTodayDate();
        
        console.log(`初始化限制状态，当前日期: ${today}`);
        
        // 尝试从多个来源获取选号限制状态
        let selectionCount = 0;
        let lastDate = '';
        
        try {
            // 1. 先尝试从localStorage获取
            lastDate = localStorage.getItem('lastSelectionDate') || '';
            selectionCount = parseInt(localStorage.getItem('selectionCount') || '0');
            
            // 2. 如果localStorage没有数据，尝试从IndexedDB获取
            if (lastDate === '') {
                const dbData = await loadFromIndexedDB();
                if (dbData && dbData.selectionCount !== undefined) {
                    selectionCount = dbData.selectionCount;
                    lastDate = dbData.lastSelectionDate || '';
                }
            }
            
            // 3. 如果IndexedDB也没有数据，尝试从Service Worker获取
            if (lastDate === '' && navigator.serviceWorker && navigator.serviceWorker.controller) {
                const swData = await new Promise((resolve) => {
                    const messageHandler = (event) => {
                        if (event.data.type === 'LIMIT_DATA_RESPONSE') {
                            navigator.serviceWorker.removeEventListener('message', messageHandler);
                            resolve(event.data.data);
                        }
                    };
                    
                    navigator.serviceWorker.addEventListener('message', messageHandler);
                    
                    navigator.serviceWorker.controller.postMessage({
                        type: 'GET_LIMIT_DATA'
                    });
                    
                    setTimeout(() => {
                        navigator.serviceWorker.removeEventListener('message', messageHandler);
                        resolve(null);
                    }, 5000);
                });
                
                if (swData) {
                    selectionCount = swData.selectionCount || 0;
                    lastDate = swData.lastSelectionDate || '';
                }
            }
        } catch (error) {
            console.error('获取选号限制状态出错:', error);
        }
        
        // 打印获取到的数据
        console.log(`初始化限制状态: 上次日期=${lastDate}, 选号次数=${selectionCount}`);
        
        // 如果日期不同或没有上次日期记录，重置选号次数
        if (lastDate !== today || lastDate === '') {
            // 重置计数
            console.log('日期已变更或首次使用，重置选号次数');
            selectionCount = 0;
            
            // 保存到所有存储
            localStorage.setItem('selectionCount', '0');
            localStorage.setItem('lastSelectionDate', today);
            
            saveToIndexedDB({
                id: 'limitStatus',
                selectionCount: 0,
                lastSelectionDate: today
            });
            
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SAVE_LIMIT_DATA',
                    data: {
                        selectionCount: 0,
                        lastSelectionDate: today
                    }
                });
            }
        } else {
            // 日期相同，保持当前计数
            console.log('日期未变更，保持当前选号次数');
            localStorage.setItem('selectionCount', selectionCount.toString());
        }
        
        // 显示剩余次数
        updateRemainingCountDisplay();
    }
    
    // 修改checkSelectionLimit函数
    async function checkSelectionLimit() {
        // 使用通用函数获取日期
        const today = getTodayDate();
        
        console.log(`检查选号限制，当前日期: ${today}`);
        
        // 尝试从多个来源获取选号限制状态
        let selectionCount = 0;
        let lastDate = '';
        
        try {
            // 先尝试从localStorage获取
            lastDate = localStorage.getItem('lastSelectionDate') || '';
            selectionCount = parseInt(localStorage.getItem('selectionCount') || '0');
            
            // 如果没有数据，尝试从IndexedDB获取
            if (lastDate === '') {
                const dbData = await loadFromIndexedDB();
                if (dbData && dbData.selectionCount !== undefined) {
                    selectionCount = dbData.selectionCount;
                    lastDate = dbData.lastSelectionDate || '';
                }
            }
        } catch (error) {
            console.error('获取选号限制状态出错:', error);
        }
        
        // 如果日期不同，重置计数
        if (lastDate !== today) {
            selectionCount = 0;
        }
        
        // 检查是否达到限制
        if (selectionCount >= 3) {
            return false; // 已达到今日限制
        }
        
        // 更新计数并存储
        selectionCount++;
        
        // 保存到所有存储
        localStorage.setItem('selectionCount', selectionCount.toString());
        localStorage.setItem('lastSelectionDate', today);
        
        saveToIndexedDB({
            id: 'limitStatus',
            selectionCount: selectionCount,
            lastSelectionDate: today
        });
        
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SAVE_LIMIT_DATA',
                data: {
                    selectionCount: selectionCount,
                    lastSelectionDate: today
                }
            });
        }
        
        return true; // 未达到限制，可以继续
    }
    
    // 修改saveSelectedNumbers函数
    function saveSelectedNumbers() {
        // 使用通用函数获取日期
        const today = getTodayDate();
        
        // 创建当前选择的组合
        const currentRedBalls = [...selectedRedBalls].sort((a, b) => a - b);
        const currentBlueBalls = [...selectedBlueBalls];
        
        // 确保只有在选择完整的情况下才保存
        if (currentRedBalls.length !== RED_SELECTION_COUNT || currentBlueBalls.length !== BLUE_SELECTION_COUNT) {
            console.log('选择不完整，不保存');
            return;
        }
        
        console.log('保存选号:', '红球:', currentRedBalls, '蓝球:', currentBlueBalls);
        
        // 创建要保存的数据对象，确保属性名称一致
        const selectionData = {
            today: today,
            redBalls: currentRedBalls,
            blueBalls: currentBlueBalls,
            red: currentRedBalls,
            blue: currentBlueBalls,
            timestamp: new Date().toISOString()
        };
        
        // 1. 保存到localStorage
        try {
            // 获取已有的保存数据
            let savedSelections = JSON.parse(localStorage.getItem('selectedNumbersHistory') || '[]');
            
            // 限制最多保存3组数据
            if (savedSelections.length >= 3) {
                // 只保留最近的2组，加上新的一组
                savedSelections = savedSelections.slice(-2);
            }
            
            // 添加新选择
            savedSelections.push(selectionData);
            
            // 保存到localStorage
            localStorage.setItem('selectedNumbersHistory', JSON.stringify(savedSelections));
            localStorage.setItem('lastSelectionDate', today);
            
            console.log('已保存到localStorage:', savedSelections);
        } catch (error) {
            console.error('保存到localStorage出错:', error);
        }
        
        // 2. 如果有Service Worker，通过消息传递保存到Service Worker缓存
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            try {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SAVE_LOTTERY_DATA',
                    data: {
                        selectedNumbers: selectionData,
                        redBalls: currentRedBalls,
                        blueBalls: currentBlueBalls,
                        red: currentRedBalls,
                        blue: currentBlueBalls,
                        lastSelectionDate: today
                    }
                });
                console.log('已发送数据到Service Worker');
            } catch (error) {
                console.error('发送数据到Service Worker出错:', error);
            }
        }
        
        console.log('已完成所有保存操作');
        
        // 延迟显示保存的号码，确保数据已保存
        setTimeout(() => {
            displaySavedNumbers();
        }, 300);
    }
    
    // 使用IndexedDB保存数据
    function saveToIndexedDB(data) {
        // 检查浏览器是否支持IndexedDB
        if (!window.indexedDB) {
            console.log('您的浏览器不支持IndexedDB，无法使用持久存储');
            return;
        }
        
        // 打开数据库
        const request = indexedDB.open('LotteryAppDB', 1);
        
        // 数据库打开失败
        request.onerror = function(event) {
            console.error('无法打开IndexedDB数据库', event);
        };
        
        // 数据库需要升级（首次创建时）
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // 创建存储对象
            if (!db.objectStoreNames.contains('lotteryData')) {
                db.createObjectStore('lotteryData', { keyPath: 'id' });
            }
        };
        
        // 数据库打开成功
        request.onsuccess = function(event) {
            const db = event.target.result;
            
            // 开始事务
            const transaction = db.transaction(['lotteryData'], 'readwrite');
            const store = transaction.objectStore('lotteryData');
            
            // 保存数据
            const saveRequest = store.put({
                id: 'lotteryNumbers',
                ...data
            });
            
            // 保存成功
            saveRequest.onsuccess = function() {
                console.log('数据已成功保存到IndexedDB');
            };
            
            // 保存失败
            saveRequest.onerror = function(event) {
                console.error('保存到IndexedDB失败', event);
            };
            
            // 事务完成
            transaction.oncomplete = function() {
                db.close();
            };
        };
    }
    
    // 从IndexedDB加载数据
    function loadFromIndexedDB() {
        return new Promise((resolve, reject) => {
            // 检查浏览器是否支持IndexedDB
            if (!window.indexedDB) {
                console.log('您的浏览器不支持IndexedDB，无法使用持久存储');
                resolve(null);
                return;
            }
            
            // 打开数据库
            const request = indexedDB.open('LotteryAppDB', 1);
            
            // 数据库打开失败
            request.onerror = function(event) {
                console.error('无法打开IndexedDB数据库', event);
                resolve(null);
            };
            
            // 数据库需要升级（首次创建时）
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                
                // 创建存储对象
                if (!db.objectStoreNames.contains('lotteryData')) {
                    db.createObjectStore('lotteryData', { keyPath: 'id' });
                }
            };
            
            // 数据库打开成功
            request.onsuccess = function(event) {
                const db = event.target.result;
                
                // 如果数据库刚刚创建，还没有数据
                if (db.objectStoreNames.length === 0) {
                    resolve(null);
                    return;
                }
                
                // 开始事务
                const transaction = db.transaction(['lotteryData'], 'readonly');
                const store = transaction.objectStore('lotteryData');
                
                // 获取数据
                const getRequest = store.get('lotteryNumbers');
                
                // 获取成功
                getRequest.onsuccess = function() {
                    const result = getRequest.result;
                    resolve(result);
                };
                
                // 获取失败
                getRequest.onerror = function(event) {
                    console.error('从IndexedDB获取数据失败', event);
                    resolve(null);
                };
                
                // 事务完成
                transaction.oncomplete = function() {
                    db.close();
                };
            };
        });
    }
    
    // 完全重写显示保存的号码函数
    async function displaySavedNumbers() {
        console.log('开始显示已保存的号码');
        
        // 获取存放结果的容器
        const savedResultsContainer = document.getElementById('savedResults');
        const savedSelectionsList = document.getElementById('savedSelectionsList');
        
        if (!savedResultsContainer || !savedSelectionsList) {
            console.error('找不到保存结果的容器元素');
            return;
        }
        
        // 清空现有内容
        savedSelectionsList.innerHTML = '';
        
        // 使用通用函数获取日期
        const today = getTodayDate();
        
        console.log(`显示已保存号码，当前日期: ${today}`);
        
        // 从多个来源获取数据
        let savedSelections = [];
        
        try {
            // 1. 从localStorage获取
            const localData = JSON.parse(localStorage.getItem('selectedNumbersHistory') || '[]');
            if (localData && localData.length > 0) {
                savedSelections = localData;
                console.log('从localStorage加载数据:', localData);
            }
        } catch (error) {
            console.error('从localStorage获取数据出错:', error);
        }
        
        // 如果没有数据，尝试从Service Worker获取
        if (savedSelections.length === 0 && navigator.serviceWorker && navigator.serviceWorker.controller) {
            try {
                const swData = await new Promise((resolve) => {
                    const messageHandler = (event) => {
                        if (event.data && event.data.type === 'LOTTERY_DATA_RESPONSE') {
                            navigator.serviceWorker.removeEventListener('message', messageHandler);
                            resolve(event.data.data);
                        }
                    };
                    
                    navigator.serviceWorker.addEventListener('message', messageHandler);
                    
                    // 发送数据请求到Service Worker
                    navigator.serviceWorker.controller.postMessage({
                        type: 'GET_LOTTERY_DATA'
                    });
                    
                    // 5秒超时
                    setTimeout(() => {
                        navigator.serviceWorker.removeEventListener('message', messageHandler);
                        resolve(null);
                    }, 5000);
                });
                
                console.log('从SW获取的数据:', swData);
                
                if (swData && swData.selectedNumbers) {
                    // 处理SW返回的数据
                    const selectedNumbers = swData.selectedNumbers;
                    if (Array.isArray(selectedNumbers)) {
                        savedSelections = selectedNumbers;
                    } else {
                        savedSelections = [selectedNumbers];
                    }
                }
            } catch (error) {
                console.error('从Service Worker获取数据出错:', error);
            }
        }
        
        console.log('合并后的数据:', savedSelections);
        
        // 如果没有获取到数据，直接返回
        if (!savedSelections || savedSelections.length === 0) {
            console.log('没有找到保存的号码数据');
            savedResultsContainer.style.display = 'none';
            return;
        }
        
        // 过滤出今天的选择
        const todaySelections = savedSelections.filter(selection => {
            return selection && 
                  (selection.today === today || 
                   selection.lastSelectionDate === today ||
                   (selection.timestamp && selection.timestamp.startsWith(today)));
        });
        
        console.log('今天的选择:', todaySelections);
        
        if (todaySelections.length === 0) {
            console.log('没有今天的选择');
            savedResultsContainer.style.display = 'none';
            return;
        }
        
        // 显示容器
        savedResultsContainer.style.display = 'block';
        
        // 显示最多3注号码
        const maxToShow = Math.min(todaySelections.length, 3);
        for (let i = 0; i < maxToShow; i++) {
            const selection = todaySelections[i];
            
            // 创建单组号码的容器
            const selectionGroup = document.createElement('div');
            selectionGroup.className = 'saved-result-group';
            
            // 添加序号
            const index = document.createElement('span');
            index.className = 'saved-index';
            index.textContent = `#${i + 1}: `;
            selectionGroup.appendChild(index);
            
            // 获取红球和蓝球数据
            let redNumbers = [];
            if (selection.redBalls && selection.redBalls.length > 0) {
                redNumbers = selection.redBalls;
                console.log('使用redBalls数据', redNumbers);
            } else if (selection.red && selection.red.length > 0) {
                redNumbers = selection.red;
                console.log('使用red数据', redNumbers);
            } else if (selection.selectedRedBalls && selection.selectedRedBalls.length > 0) {
                redNumbers = selection.selectedRedBalls;
                console.log('使用selectedRedBalls数据', redNumbers);
            } else {
                console.warn('未找到红球数据', selection);
            }
            
            let blueNumbers = [];
            if (selection.blueBalls && selection.blueBalls.length > 0) {
                blueNumbers = selection.blueBalls;
                console.log('使用blueBalls数据', blueNumbers);
            } else if (selection.blue && selection.blue.length > 0) {
                blueNumbers = selection.blue;
                console.log('使用blue数据', blueNumbers);
            } else if (selection.selectedBlueBalls && selection.selectedBlueBalls.length > 0) {
                blueNumbers = selection.selectedBlueBalls;
                console.log('使用selectedBlueBalls数据', blueNumbers);
            } else {
                console.warn('未找到蓝球数据', selection);
            }
            
            console.log(`选择#${i+1} 红球:`, redNumbers, '蓝球:', blueNumbers);
            
            // 添加红球
            redNumbers.forEach(number => {
                const ball = document.createElement('div');
                ball.className = 'saved-red-ball';
                ball.textContent = number;
                selectionGroup.appendChild(ball);
            });
            
            // 添加 + 号
            const plus = document.createElement('span');
            plus.className = 'saved-plus';
            plus.textContent = ' + ';
            selectionGroup.appendChild(plus);
            
            // 添加蓝球
            blueNumbers.forEach(number => {
                const ball = document.createElement('div');
                ball.className = 'saved-blue-ball';
                ball.textContent = number;
                selectionGroup.appendChild(ball);
            });
            
            // 添加到列表
            savedSelectionsList.appendChild(selectionGroup);
        }
        
        // 添加样式
        if (!document.getElementById('saved-results-style')) {
            const style = document.createElement('style');
            style.id = 'saved-results-style';
            style.textContent = `
                .saved-results {
                    margin-top: 20px;
                    width: 100%;
                    background-color: rgba(255, 255, 255, 0.9);
                    border-radius: 10px;
                    padding: 15px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }
                
                .saved-result-group {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: center;
                    margin: 10px 0;
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                    flex-wrap: wrap;
                }
                
                .saved-index {
                    font-weight: bold;
                    margin-right: 10px;
                    color: #666;
                }
                
                .saved-plus {
                    margin: 0 10px;
                    font-weight: bold;
                    color: #666;
                }
                
                .saved-red-ball {
                    width: 30px;
                    height: 30px;
                    line-height: 30px;
                    font-size: 14px;
                    margin: 0 3px;
                    background-color: #e60012;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                
                .saved-blue-ball {
                    width: 30px;
                    height: 30px;
                    line-height: 30px;
                    font-size: 14px;
                    margin: 0 3px;
                    background-color: #0066cc;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                
                @media (max-width: 600px) {
                    .saved-red-ball, .saved-blue-ball {
                        width: 25px;
                        height: 25px;
                        line-height: 25px;
                        font-size: 12px;
                        margin: 0 2px;
                    }
                    
                    .saved-result-group {
                        justify-content: flex-start;
                        padding: 8px 5px;
                    }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        console.log('已显示保存的号码');
    }
    
    // 修改updateRemainingCountDisplay函数
    function updateRemainingCountDisplay() {
        // 使用通用函数获取日期
        const today = getTodayDate();
        const storedDate = localStorage.getItem('lastSelectionDate') || '';
        const selectionCount = parseInt(localStorage.getItem('selectionCount') || '0');
        
        console.log(`更新剩余次数显示，当前日期: ${today}, 存储日期: ${storedDate}`);
        
        // 如果日期不同，重置计数
        const count = (storedDate !== today) ? 0 : selectionCount;
        const remaining = 3 - count;
        
        // 创建或更新显示元素
        let countElement = document.getElementById('remaining-count');
        if (!countElement) {
            countElement = document.createElement('div');
            countElement.id = 'remaining-count';
            
            // 查找controls元素添加，如果没有，则添加到body
            const controls = document.querySelector('.controls');
            if (controls) {
                controls.appendChild(countElement);
            } else {
                // 如果找不到controls，则插入到按钮之后
                const generateBtn = document.getElementById('generateBtn');
                if (generateBtn && generateBtn.parentNode) {
                    generateBtn.parentNode.appendChild(countElement);
                } else {
                    // 最后的备选方案，添加到body
                    document.body.appendChild(countElement);
                }
            }
            
            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                #remaining-count {
                    margin-top: 10px;
                    font-size: 16px;
                    color: #666;
                    text-align: center;
                    padding: 5px;
                    background-color: #f8f8f8;
                    border-radius: 4px;
                    width: 100%;
                    max-width: 300px;
                    margin-left: auto;
                    margin-right: auto;
                }
                
                #remaining-count.warning {
                    color: #e60012;
                    font-weight: bold;
                }
            `;
            document.head.appendChild(style);
        }
        
        // 更新内容
        countElement.textContent = `今日剩余选号次数: ${remaining}次`;
        
        // 当剩余次数为1时添加警告样式
        if (remaining <= 1) {
            countElement.classList.add('warning');
        } else {
            countElement.classList.remove('warning');
        }
    }
    
    // 修改showLimitMessage函数
    function showLimitMessage() {
        // 使用通用函数获取日期
        const today = getTodayDate();
        
        // 获取明天的日期
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString('zh-CN');
        
        console.log(`显示限制消息，今天: ${today}, 明天: ${tomorrowStr}`);
        
        // 创建消息元素
        const messageContainer = document.createElement('div');
        messageContainer.className = 'limit-message';
        messageContainer.innerHTML = `
            <div class="limit-content">
                <h3>今日选号次数已用完</h3>
                <p>每天最多可进行3次选号，您今天（${today}）的次数已用完。</p>
                <p>请明天（${tomorrowStr}）再来尝试您的幸运！</p>
                <button class="btn close-btn">我知道了</button>
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .limit-message {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                animation: fadeIn 0.3s ease;
            }
            
            .limit-content {
                background-color: white;
                padding: 20px;
                border-radius: 15px;
                max-width: 80%;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
                text-align: center;
            }
            
            .limit-content h3 {
                color: #e60012;
                margin-top: 0;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(messageContainer);
        
        // 添加关闭按钮事件
        messageContainer.querySelector('.close-btn').addEventListener('click', () => {
            messageContainer.remove();
        });
    }
    
    // 处理窗口大小调整，重新计算球的位置
    window.addEventListener('resize', () => {
        // 如果不在选号过程中，可以重新初始化球的位置
        if (!isSelecting) {
            try {
                initializeBalls();
            } catch (e) {
                console.error('窗口大小改变时重新初始化球出错:', e);
            }
        }
    });
    
    // 监听网络状态变化
    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
    
    // 添加午夜日期检查 - 当午夜跨天时自动更新
    let lastCheckedDate = getTodayDate();
    console.log(`初始化日期检查，当前日期: ${lastCheckedDate}`);
    
    // 每分钟检查一次日期变更
    setInterval(() => {
        const currentDate = getTodayDate();
        if (currentDate !== lastCheckedDate) {
            console.log(`检测到日期变更: ${lastCheckedDate} -> ${currentDate}`);
            lastCheckedDate = currentDate;
            
            // 执行日期变更时的操作 - 这里不再调用forceResetData
            clearExpiredNumberData();  // 这个函数已经修改为只在日期变更时重置
            initLimitStatus();         // 这个函数已经修改为只在日期变更时重置
            updateRemainingCountDisplay();
            
            // 刷新页面上的显示
            displaySavedNumbers();
        } else {
            // 日期未变更，不做任何操作
            console.log(`日期检查: 未变更 (${currentDate})`);
        }
    }, 60000); // 每分钟检查一次
    
    // Helper function for async delays
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    console.log('脚本初始化完成');
    
    function applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .btn.touch-active {
                background-color: #bb000e;
                transform: scale(0.97);
                box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
            
            .btn {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
            }
        `;
        document.head.appendChild(style);
    }

    applyStyles();
    
    // Add touch event handlers for mobile devices
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function(e) {
            e.preventDefault(); // 防止点击事件触发
            this.classList.add('touch-active');
            
            // 确定是哪个按钮
            if (this.id === 'generateBtn') {
                startSelection();
            } else if (this.id === 'resetBtn') {
                resetSelection();
            }
        }, { passive: false });
        
        button.addEventListener('touchend', function() {
            this.classList.remove('touch-active');
        });
        
        button.addEventListener('touchcancel', function() {
            this.classList.remove('touch-active');
        });
        
        // 点击事件 - 桌面设备后备
        button.addEventListener('click', function(e) {
            // 只在非触摸设备上响应点击
            if (!('ontouchstart' in window)) {
                if (this.id === 'generateBtn') {
                    startSelection();
                } else if (this.id === 'resetBtn') {
                    resetSelection();
                }
            }
        });
    });
    
    // 修复startSelection函数，确保每天只能选号3次
    function startSelection() {
        console.log('开始选号函数被调用');
        if (isSelecting) {
            console.log('已经在选号中，忽略点击');
            return;
        }
        
        // 检查选号次数限制
        checkSelectionLimit().then(canProceed => {
            if (!canProceed) {
                showLimitMessage();
                return;
            }
            
            if (!generateBtn || !resetBtn || !redNumbers || !blueNumbers || !luckyMessage) {
                console.error('无法找到所需DOM元素');
                return;
            }
            
            try {
                isSelecting = true;
                window.appIsSelecting = true; // 更新全局状态
                
                generateBtn.disabled = true;
                resetBtn.disabled = true;
                
                // Add visual feedback for mobile
                generateBtn.style.opacity = '0.7';
                
                // Trigger vibration on mobile devices if supported
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
                
                // Clear previous selections
                redNumbers.innerHTML = '';
                blueNumbers.innerHTML = '';
                luckyMessage.textContent = '';
                selectedRedBalls = [];
                selectedBlueBalls = [];
                
                // 同步更新全局数组
                window.selectedRedBalls = [];
                window.selectedBlueBalls = [];
                
                // Shake the balls animation
                shakeBalls();
                
                // 使用Promise和async/await处理顺序执行
                (async function() {
                    await delay(1500); // Wait for shaking to complete
                    
                    // Select red balls
                    for (let i = 0; i < RED_SELECTION_COUNT; i++) {
                        const num = await selectRandomBall(redBalls, selectedRedBalls, redNumbers, 'selected-red');
                        if (num) window.selectedRedBalls.push(num); // 更新全局数组
                        
                        // Vibrate slightly for each ball selection
                        if (navigator.vibrate) {
                            navigator.vibrate(50);
                        }
                        await delay(800); // Pause between selections
                    }
                    
                    // Select blue balls
                    for (let i = 0; i < BLUE_SELECTION_COUNT; i++) {
                        const num = await selectRandomBall(blueBalls, selectedBlueBalls, blueNumbers, 'selected-blue');
                        if (num) window.selectedBlueBalls.push(num); // 更新全局数组
                        
                        // Stronger vibration for blue ball
                        if (navigator.vibrate) {
                            navigator.vibrate(100);
                        }
                        await delay(800); // Pause between selections
                    }
                    
                    // Display lucky message
                    await delay(500);
                    displayLuckyMessage();
                    
                    // 保存当前选择的号码
                    saveSelectedNumbers();
                    
                    // Final vibration pattern for completion
                    if (navigator.vibrate) {
                        navigator.vibrate([100, 50, 100]);
                    }
                    
                    // 更新选号次数显示
                    updateRemainingCountDisplay();
                    
                    // 完成选号
                    isSelecting = false;
                    window.appIsSelecting = false; // 更新全局状态
                    
                    if (generateBtn) {
                        generateBtn.disabled = false;
                        generateBtn.style.opacity = '1';
                    }
                    if (resetBtn) {
                        resetBtn.disabled = false;
                    }
                })().catch(error => {
                    console.error('选号过程出错:', error);
                    // 确保错误时也会重置状态
                    isSelecting = false;
                    window.appIsSelecting = false;
                    
                    if (generateBtn) {
                        generateBtn.disabled = false;
                        generateBtn.style.opacity = '1';
                    }
                    if (resetBtn) {
                        resetBtn.disabled = false;
                    }
                });
            } catch (error) {
                console.error('选号过程出错:', error);
                // 确保错误时也会重置状态
                isSelecting = false;
                window.appIsSelecting = false;
                
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.style.opacity = '1';
                }
                if (resetBtn) {
                    resetBtn.disabled = false;
                }
            }
            
            console.log('选号开始，异步继续');
        }).catch(error => {
            console.error('检查选号限制出错:', error);
        });
    }

    // 修改resetSelection函数，只清除当前显示的号码
    function resetSelection() {
        console.log('重新开始函数被调用');
        if (isSelecting) {
            console.log('正在选号中，忽略重置点击');
            return;
        }
        
        if (!resetBtn || !redNumbers || !blueNumbers || !luckyMessage) {
            console.error('无法找到所需DOM元素');
            return;
        }
        
        try {
            // Add visual feedback for mobile
            resetBtn.style.opacity = '0.7';
            setTimeout(() => resetBtn.style.opacity = '1', 300);
            
            // Small vibration for reset
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            // 只清除当前显示的号码
            redNumbers.innerHTML = '';
            blueNumbers.innerHTML = '';
            luckyMessage.textContent = '';
            
            // 清除当前选择
            selectedRedBalls = [];
            selectedBlueBalls = [];
            
            // 同步更新全局数组
            window.selectedRedBalls = [];
            window.selectedBlueBalls = [];
            
            // 移除选中类
            redBalls.forEach(ball => {
                if (ball && ball.classList) {
                    ball.classList.remove('selected');
                }
            });
            
            blueBalls.forEach(ball => {
                if (ball && ball.classList) {
                    ball.classList.remove('selected');
                }
            });
            
            // 重新初始化球
            initializeBalls();
            
            console.log('已清除当前号码显示');
        } catch (error) {
            console.error('重置过程出错:', error);
        }
        
        console.log('重置完成');
    }

    // Shake the balls to simulate mixing
    function shakeBalls(balls, duration) {
        // 如果未指定参数，使用默认值
        const ballsToShake = balls || [...redBalls, ...blueBalls];
        const shakeDuration = duration || 1000;
        
        ballsToShake.forEach(ball => {
            if (!ball) return;
            
            // Stop floating animation
            ball.style.animation = '';
            
            // Apply random movements
            const interval = setInterval(() => {
                const x = (Math.random() - 0.5) * 20;
                const y = (Math.random() - 0.5) * 20;
                ball.style.transform = `translate(${x}px, ${y}px)`;
            }, 50);
            
            // Stop shaking after duration
            setTimeout(() => {
                clearInterval(interval);
                if (ball) {
                    ball.style.transform = '';
                    
                    // Reapply floating animation
                    ball.style.animation = `float ${3 + Math.random() * 2}s ease-in-out infinite`;
                    ball.style.animationDelay = `${Math.random() * 2}s`;
                }
            }, shakeDuration);
        });
    }

    // Select a random ball from the array
    async function selectRandomBall(ballsArray, selectedArray, displayContainer, selectedClass) {
        // Filter out already selected balls
        const availableBalls = ballsArray.filter(ball => 
            ball && ball.dataset && !selectedArray.includes(parseInt(ball.dataset.number))
        );
        
        if (availableBalls.length === 0) {
            console.error('没有可用的球进行选择');
            return null;
        }
        
        // Pick a random ball
        const randomIndex = Math.floor(Math.random() * availableBalls.length);
        const selectedBall = availableBalls[randomIndex];
        const ballNumber = parseInt(selectedBall.dataset.number);
        
        // Highlight the ball in the machine
        selectedBall.classList.add('selected');
        
        // Add to selected array
        selectedArray.push(ballNumber);
        
        // Sort the arrays (red balls should be in ascending order)
        if (selectedClass === 'selected-red') {
            selectedArray.sort((a, b) => a - b);
        }
        
        // Display in the result section
        displaySelectedBalls(selectedArray, displayContainer, selectedClass);
        
        // Return the selected number
        return ballNumber;
    }

    // Display the selected balls in the results area
    function displaySelectedBalls(numbers, container, className) {
        if (!container) return;
        
        container.innerHTML = '';
        
        numbers.forEach(number => {
            const ball = document.createElement('div');
            ball.className = `selected-ball ${className}`;
            ball.textContent = number;
            container.appendChild(ball);
            
            // Apply appear animation
            ball.style.animation = 'popIn 0.5s forwards';
        });
    }

    // Display a lucky message after all balls are selected
    function displayLuckyMessage() {
        if (!luckyMessage) return;
        
        const messages = [
            "祝您好运!",
            "这组号码看起来很幸运!",
            "财富即将降临!",
            "您的幸运号码已准备就绪!",
            "大奖可能就在眼前!",
            "希望这些数字能带给您好运!",
            "梦想即将成真!"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        luckyMessage.textContent = randomMessage;
        
        // Fade in animation
        luckyMessage.style.opacity = 0;
        setTimeout(() => {
            luckyMessage.style.transition = 'opacity 1s ease';
            luckyMessage.style.opacity = 1;
        }, 100);
    }

    // 添加调试面板函数
    function addDebugPanel() {
        // 默认关闭调试面板
        const debugEnabled = localStorage.getItem('debugEnabled') === 'true';
        if (!debugEnabled) return;
        
        // 创建调试面板
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            font-family: monospace;
            z-index: 9999;
            max-width: 80%;
            max-height: 200px;
            overflow: auto;
        `;
        
        // 添加内容
        let debugContent = '';
        
        // 当前时间
        const now = new Date();
        const localTimeString = now.toLocaleTimeString();
        debugContent += `<div>调试信息 (${localTimeString}更新)</div>`;
        
        // 本地日期信息
        const today = getTodayDate();
        const localDateStr = now.toLocaleDateString('zh-CN');
        const isoDateStr = now.toISOString().split('T')[0];
        const isoFullStr = now.toISOString();
        const tzOffset = now.getTimezoneOffset();
        
        debugContent += `<div style="color: lime;">当前本地时间: ${localTimeString}</div>`;
        debugContent += `<div>本地日期(默认): ${localDateStr}</div>`;
        debugContent += `<div>本地日期(中国): ${today}</div>`;
        debugContent += `<div>时区偏移: ${-tzOffset}分钟</div>`;
        debugContent += `<div>ISO日期: ${isoFullStr}</div>`;
        debugContent += `<div>ISO日期分割: ${isoDateStr}</div>`;
        
        // 分割线
        debugContent += `<div style="border-top: 1px dashed #666; margin: 5px 0;"></div>`;
        
        // 存储信息
        const storedDate = localStorage.getItem('lastSelectionDate') || '未设置';
        const selectionCount = localStorage.getItem('selectionCount') || '0';
        
        debugContent += `<div style="color: orange;">存储信息</div>`;
        debugContent += `<div>存储日期: ${storedDate}</div>`;
        debugContent += `<div>选号次数: ${selectionCount}</div>`;
        debugContent += `<div>Service Worker: ${navigator.serviceWorker.controller ? '已激活' : '未激活'}</div>`;
        
        // 添加刷新按钮
        debugContent += `<button id="refresh-debug" style="background: #444; color: white; border: none; padding: 5px; margin-top: 5px; border-radius: 3px;">刷新信息</button>`;
        
        // 添加强制重置按钮
        debugContent += `<button id="force-reset" style="background: #900; color: white; border: none; padding: 5px; margin-top: 5px; margin-left: 5px; border-radius: 3px;">强制重置数据</button>`;
        
        // 设置内容
        debugPanel.innerHTML = debugContent;
        
        // 添加到文档
        document.body.appendChild(debugPanel);
        
        // 添加事件监听
        document.getElementById('refresh-debug').addEventListener('click', function() {
            document.body.removeChild(debugPanel);
            addDebugPanel();
        });
        
        // 添加强制重置事件
        document.getElementById('force-reset').addEventListener('click', function() {
            forceResetData();
            alert('数据已重置，选号次数已清零');
            document.body.removeChild(debugPanel);
            addDebugPanel();
            updateRemainingCountDisplay();
        });
    }
});