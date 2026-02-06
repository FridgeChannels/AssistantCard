# Feature Implementation Plan: 播放结束 UI 未停 + NFC Long Text 逻辑

**Overall Progress:** `100%`

## TLDR

修复两件事：(1) longtext 下音频播完但 UI 未停——加 `ended` 日志与 `timeupdate` 兜底；(2) NFC longtext 行为——第一次贴显示第 0 条、之后每贴播下一条（方案 B），应用内返回 briefing 时严格同一条并尽量恢复播放进度。rss/latest 单条逻辑不改；TpPage 仅兼容新回调签名。

## Critical Decisions

- **方案 B**：第一次 NFC 打开显示第 0 条，之后每次新开页（Fetch、有效 idx）再推进索引；rss/latest 不读不写 longtext 的 localStorage。
- **回来同一条**：Cache 路径 longtext 优先用 `cachedPlayContent.currentLongTextIndex`，无则回退 localStorage；离开时通过 `onSavePlaybackState(currentTime, longTextIndex)` 与 ended 时 `onLongTextIndexChange(nextIndex)` 同步 cache。
- **播完未停**：仅 longtext 两处加 `console.log` 与 `timeupdate` 兜底，不碰 rss/latest 单条路径。

## Tasks

- [x] 🟩 **Step 1: MorningBriefing — longtext 播完未停：ended 日志 + timeupdate 兜底**
  - [x] 🟩 在 Fetch 路径 longtext 的 `audio.addEventListener('ended', ...)` 内加 `console.log('audio ended', { longtext: true })`。
  - [x] 🟩 在 Cache 路径 longtext 的 `applyItem` 内 `audio.addEventListener('ended', ...)` 加同上 log。
  - [x] 🟩 在上述两处创建 Audio 后，增加 `timeupdate` 监听：当 `currentTime >= duration && duration > 0` 时执行一次 `setIsPlaying(false)` 并移除该 listener，避免重复。

- [x] 🟩 **Step 2: MorningBriefing — Fetch 路径 longtext 方案 B + currentLongTextIndex**
  - [x] 🟩 在 `loadPlayContent` 的 longtext 分支：读 `idx = parseInt(localStorage.getItem(longTextKey), 10)`；若 `Number.isNaN(idx) || idx < 0 || idx >= items.length` 则首次不推进：`idx = 0`，`localStorage.setItem(longTextKey, String(0))`，`currentItem = items[0]`；否则 `nextIdx = (idx + 1) % N`，写回 localStorage，`currentItem = items[nextIdx]`。
  - [x] 🟩 调用 `onPlayContentLoaded` 时，longtext 分支传入 `currentLongTextIndex`（首次为 0，非首次为 nextIdx）：`onPlayContentLoaded({ ...response, currentLongTextIndex: 展示条索引 })`。

- [x] 🟩 **Step 3: MorningBriefing — Cache 路径 longtext 用 currentLongTextIndex**
  - [x] 🟩 在「有 cache 且 rule === long_text_sequential」分支：若 `cachedPlayContent.currentLongTextIndex != null` 且有效，用该值取 `items[cachedPlayContent.currentLongTextIndex]`；否则回退为当前逻辑（从 localStorage 读 idx 再取 item）。

- [x] 🟩 **Step 4: MorningBriefing — currentLongTextIndexRef、卸载与 ended 同步 cache**
  - [x] 🟩 新增 ref `currentLongTextIndexRef`；在应用 longtext 条时（Fetch 与 Cache 两处）设置 `currentLongTextIndexRef.current = 本次展示的索引`。
  - [x] 🟩 卸载 cleanup 中：在调用 `onSavePlaybackState(audio.currentTime)` 处扩展为 `onSavePlaybackState(audio.currentTime, currentLongTextIndexRef.current)`（仅 longtext 时传第二参数）。
  - [x] 🟩 longtext 的 ended 回调内：写 localStorage 后，设置 `currentLongTextIndexRef.current = next`，并调用 `onLongTextIndexChange?.(next)`。

- [x] 🟩 **Step 5: MorningBriefing — 新增 prop onLongTextIndexChange**
  - [x] 🟩 在 `MorningBriefing` 的 props 中增加可选 `onLongTextIndexChange?: (nextIndex: number) => void`，在 longtext ended 时调用。

- [x] 🟩 **Step 6: App.jsx — 扩展 onSavePlaybackState、新增 onLongTextIndexChange**
  - [x] 🟩 `handleSavePlaybackState(currentTime, longTextIndex?)`：当 `longTextIndex != null` 时，更新 `playContentCacheRef.current = { ...playContentCacheRef.current, savedCurrentTime: currentTime, currentLongTextIndex: longTextIndex }`；否则仅更新 `savedCurrentTime`。
  - [x] 🟩 新增 `handleLongTextIndexChange(nextIndex)`：`playContentCacheRef.current = { ...playContentCacheRef.current, currentLongTextIndex: nextIndex }`。
  - [x] 🟩 将 `onSavePlaybackState={handleSavePlaybackState}`、`onLongTextIndexChange={handleLongTextIndexChange}` 传给 `MorningBriefing`。

- [x] 🟩 **Step 7: TpPage.jsx — 兼容 onSavePlaybackState 第二参数**
  - [x] 🟩 `handleSavePlaybackState(currentTime, longTextIndex?)`：签名允许第二参数，实现中仅用 `currentTime` 更新 `savedCurrentTime`（TpPage 无 longtext 列表，可不写 `currentLongTextIndex`）；不传 `onLongTextIndexChange` 给 `MorningBriefing`。
