# 播放列表：本地自然日 + order_index 槽位（周一=1 … 周日=7，跨周 8+）

**类型**: improvement  
**优先级**: normal  
**投入**: medium  
**整体进度**: 100% ✅

---

## 进度

| 步骤 | 说明 | 状态 |
|------|------|------|
| 1 | `GET /api/play-content/list` 的 `items[]` 增加 `order_index` | 🟩 已完成 |
| 2 | 抽离 `src/lib/playContentSlot.js`（S 计算 + 同类回退公式） | 🟩 已完成 |
| 3 | `MorningBriefing.jsx`：`latest` 多条 + `long_text_sequential` 按槽位选条；去掉 `localStorage` 推进与 `ended` 换条 | 🟩 已完成 |
| 4 | 前端 JSDoc 补充 `order_index` | 🟩 已完成 |

---

## TL;DR（已实现）

- **范围**：`playback_rule === 'long_text_sequential'`（有 `config_id`）与 **`latest` 且多条** 共用一套逻辑；`rss` / 单条 `latest` 不变。
- **选条**：页面**加载时**（含从父级缓存恢复 briefing）用**本机本地日历日**算目标槽位 **S**，再按 `order_index` 与 **(S−1) mod 7** 的星期类选一条；**播完不换条**。
- **后端**：列表项带上 **`order_index`**，仍按原查询排序。

---

## 槽位 S 与回退（公式）

- **锚定**：本地日历 **1970-01-05（周一）** 当日 00:00。
- **S**：`S = max(1, 本地今日午夜与锚定日午夜的日历日差 + 1)`。
- **选 `order_index`**：记 `c = (S - 1) mod 7`（与 `(order_index - 1) mod 7` 对齐）；同类集合 `T_c`；若存在 `order_index === S` 则取之；否则取 `max(T_c ∩ (−∞, S))`，若空则 `max(T_c)`。重复 `order_index` 时 **`order_index` 升序再 `id` 升序**取第一条。
- **无 `order_index` 的降级**：接口缺字段时退回 **`items[0]`**（兼容旧缓存）。

---

## 涉及文件

| 文件 | 变更 |
|------|------|
| `server/apiRoutes.js` | `toItem` 增加 `order_index` |
| `src/lib/playContentSlot.js` | **新增**：`computePlaySlotS`、`pickPlayContentItemByLocalCalendar` 等 |
| `src/components/briefing/MorningBriefing.jsx` | 移除 `playIndexStorageKey` / `localStorage` 顺序索引；接入 slot 选条 |
| `src/lib/playContentService.js` / `src/api/backendClient.js` | JSDoc 中 `items` 类型补充 `order_index` |

---

## 验收要点

- 同一本地自然日内多次进入 briefing：**同一条**（同一 `order_index` 解析结果）。
- 换本地日：**S 变**，按上式与列表变化重算；周内位置与「周一=1…周日=7」一致。
- 播完音频：**不**因 `ended` 改写次日条。
- 缺号：例如目标 8 仅有 1～7 时，按同类回退落到 **1**（周一类）。

---

## 风险 / 备注

- **旧 `localStorage` 键** `play_content_index_*` 已不再读取，可保留无害。
- **锚定周一**写死在 `playContentSlot.js`，若产品要改纪元仅需改常量三行。
