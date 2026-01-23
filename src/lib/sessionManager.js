/**
 * Session ID 管理器
 * 使用 localStorage 持久化 sessionId
 */

const SESSION_KEY = 'fc_session_id';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30天

/**
 * 获取或创建 sessionId
 * @returns {string} sessionId
 */
export function getOrCreateSessionId() {
    try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
            const { sessionId, timestamp } = JSON.parse(stored);
            // 检查是否过期
            if (Date.now() - timestamp < SESSION_DURATION) {
                return sessionId;
            }
        }
    } catch (e) {
        console.error('Failed to read sessionId:', e);
    }

    // 生成新的 sessionId
    const sessionId = generateUUID();
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            sessionId,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.error('Failed to save sessionId:', e);
    }

    return sessionId;
}

/**
 * 生成 UUID
 * @returns {string} UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 获取设备信息
 * @returns {object} 设备信息对象
 */
export function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
        }
    };
}
