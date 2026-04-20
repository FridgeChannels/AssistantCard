/**
 * 按「本地自然日 + play_news_contents.order_index」从列表中选当日一条。
 * 槽位 S：自锚定本地周一 00:00 起每个本地自然日 +1（S=1,2,…）；库内 1～7 对应周一～周日，8 起为后续周同日槽。
 * 找不到精确 S 时：与 S 同星期类 (order_index-1)≡(S-1) (mod 7) 的条目中取 max{<S}，若无则取该类 max（回环）。
 * 规格：doc/issues/playlist-one-per-calendar-day-order-index.md
 */

/** 锚定周一（本地日历 1970-01-05，星期一） */
const ANCHOR_Y = 1970;
const ANCHOR_M0 = 0;
const ANCHOR_D = 5;

export function startOfLocalDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function calendarDaysBetweenLocal(earlier, later) {
    const a = startOfLocalDay(earlier).getTime();
    const b = startOfLocalDay(later).getTime();
    return Math.round((b - a) / 86400000);
}

export function getPlaySlotAnchorMondayLocal() {
    return startOfLocalDay(new Date(ANCHOR_Y, ANCHOR_M0, ANCHOR_D));
}

/**
 * 今日目标槽位 S（正整数）。
 */
export function computePlaySlotS(now = new Date()) {
    const anchor = getPlaySlotAnchorMondayLocal();
    const today = startOfLocalDay(now);
    const d = calendarDaysBetweenLocal(anchor, today);
    return Math.max(1, d + 1);
}

function weekdayClass(oi) {
    return ((oi - 1) % 7 + 7) % 7;
}

function compareIds(a, b) {
    const na = Number(a);
    const nb = Number(b);
    const aIsInt = Number.isFinite(na) && String(a) === String(Math.trunc(na));
    const bIsInt = Number.isFinite(nb) && String(b) === String(Math.trunc(nb));
    if (aIsInt && bIsInt) return na - nb;
    return String(a ?? '').localeCompare(String(b ?? ''));
}

/**
 * @param {Array<{ id?: unknown, order_index?: number }>} items
 * @param {number} S
 * @returns {{ item: object|null, arrayIndex: number, slotS: number, resolvedOrderIndex: number|null }}
 */
export function pickItemForOrderSlot(items, S) {
    if (!items?.length) {
        return { item: null, arrayIndex: -1, slotS: S, resolvedOrderIndex: null };
    }

    const sortedMeta = items
        .map((item, arrayIndex) => ({
            item,
            arrayIndex,
            oi: item.order_index != null && Number.isFinite(Number(item.order_index)) ? Number(item.order_index) : null,
        }))
        .filter((x) => x.oi != null)
        .sort((a, b) => (a.oi !== b.oi ? a.oi - b.oi : compareIds(a.item.id, b.item.id)));

    if (sortedMeta.length === 0) {
        return { item: items[0], arrayIndex: 0, slotS: S, resolvedOrderIndex: null };
    }

    const distinctOi = [...new Set(sortedMeta.map((x) => x.oi))].sort((a, b) => a - b);
    const c = weekdayClass(S);
    const Tc = distinctOi.filter((oi) => weekdayClass(oi) === c);

    if (Tc.length === 0) {
        const fallback = sortedMeta[0];
        return { item: fallback.item, arrayIndex: fallback.arrayIndex, slotS: S, resolvedOrderIndex: fallback.oi };
    }

    let targetOi;
    if (distinctOi.includes(S)) {
        targetOi = S;
    } else {
        const U = Tc.filter((oi) => oi < S);
        targetOi = U.length > 0 ? Math.max(...U) : Math.max(...Tc);
    }

    const chosen = sortedMeta.find((x) => x.oi === targetOi);
    return {
        item: chosen.item,
        arrayIndex: chosen.arrayIndex,
        slotS: S,
        resolvedOrderIndex: targetOi,
    };
}

/**
 * 根据本机「今天」从 items 中选一条。
 */
export function pickPlayContentItemByLocalCalendar(items, now = new Date()) {
    const S = computePlaySlotS(now);
    return pickItemForOrderSlot(items, S);
}
