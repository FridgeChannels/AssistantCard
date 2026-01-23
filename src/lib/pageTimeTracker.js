/**
 * 页面停留时长追踪器
 * 追踪用户在各个页面的停留时间
 */

import { logUserAction } from './loggingService';

class PageTimeTracker {
    constructor() {
        this.pageEnterTime = null;
        this.currentPage = null;
        this.cId = null;
    }

    /**
     * 开始追踪页面
     * @param {string} page - 页面名称 (briefing, chat, history)
     * @param {string} cId - Customer/Magnet ID
     */
    startTracking(page, cId) {
        // 如果之前有页面，先记录离开
        if (this.currentPage && this.pageEnterTime && this.cId) {
            this.endTracking();
        }

        this.currentPage = page;
        this.cId = cId;
        this.pageEnterTime = Date.now();

        // 记录进入日志
        const actionType = `view_${page}`;
        logUserAction({
            cId: cId,
            actionType: actionType,
            context: {
                enterTime: new Date().toISOString(),
                page: page,
            },
        });
    }

    /**
     * 结束追踪当前页面
     */
    endTracking() {
        if (!this.currentPage || !this.pageEnterTime || !this.cId) return;

        const duration = Math.floor((Date.now() - this.pageEnterTime) / 1000); // 秒
        const actionType = `leave_${this.currentPage}`;

        logUserAction({
            cId: this.cId,
            actionType: actionType,
            context: {
                leaveTime: new Date().toISOString(),
                page: this.currentPage,
                durationSeconds: duration,
            },
        });

        this.currentPage = null;
        this.pageEnterTime = null;
    }

    /**
     * 页面卸载时调用
     */
    onPageUnload() {
        this.endTracking();

        // 记录页面离开
        if (this.cId) {
            logUserAction({
                cId: this.cId,
                actionType: 'page_leave',
                context: {
                    leaveTime: new Date().toISOString(),
                },
            });
        }
    }
}

export const pageTimeTracker = new PageTimeTracker();

// 监听页面卸载
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        pageTimeTracker.onPageUnload();
    });

    // 监听页面隐藏（用户切换标签页）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // 页面隐藏时，记录当前页面的离开
            pageTimeTracker.endTracking();
        }
    });
}
