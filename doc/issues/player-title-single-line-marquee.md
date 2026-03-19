# 播放器标题：单行展示，过长时滚动显示

**进度：100%** ✅ 已完成

## TL;DR

播放器/简报页中展示的 title 应始终单行显示；当文案过长时用横向滚动（marquee/scroll）展示，避免换行或截断。

## 当前状态 vs 期望

| 项目 | 当前 | 期望 |
|------|------|------|
| 布局 | title 可能多行换行或溢出 | 固定单行 |
| 过长时 | 换行/截断/溢出 | 单行内横向滚动（marquee）展示 |

## 涉及文件

- ✅ `src/components/SingleLineMarqueeTitle.jsx` — 新增：单行 + 过长滚动（B：滚完停顿再滚）+ `prefers-reduced-motion` 降级
- ✅ `src/components/player/CuratedPlayer.jsx` — 标题区 `min-w-0 flex-1`，用 `SingleLineMarqueeTitle` 包 `content.title`
- ✅ `src/components/briefing/MorningBriefing.jsx` — `displayTitle` 改用 `SingleLineMarqueeTitle`（as="h2"）
- ✅ `src/index.css` — 新增 `@keyframes marquee-scroll` 与 `.animate-marquee-scroll`

## 实现要点

- ✅ 单行：`whitespace-nowrap` + 容器 `overflow: hidden`、`min-w-0`
- ✅ 过长滚动：仅当 `scrollWidth > clientWidth` 时启用；动画为右→左滚完 → 停顿 → 再滚（12s 周期，CSS keyframes + `--marquee-offset`）
- ✅ 共用组件 `SingleLineMarqueeTitle`，支持 `as`（h2/h3/span）与 `className`

## 风险 / 备注

- ✅ 无障碍：`prefers-reduced-motion` 时禁用滚动，降级为单行 `text-ellipsis` + `title` 提示
- CuratedPlayer 当前为 mock 数据，后续接真实 content 时同样适用本规则
- History 列表的 session.title 未改（按需求不纳入）

---

**Type:** improvement  
**Priority:** normal  
**Effort:** small
