# Feature Implementation Plan: Play Content 方案 B

**Overall Progress:** `100%`

## TLDR

新增播放内容接口，支持三种规则：Long Text（按列表顺序，每次打开播一条，播完推进索引下次播下一条）、RSS（播最新一条）、无 config（播最新一条）。zip_code 不参与取数；hasZipCode/locationFormatted 仅作 UI。仅 MorningBriefing 切新接口，TpPage 不改。

## Critical Decisions

- **新接口**：新增 `GET /api/play-content/list`，不替换旧 `/api/play-contents/today`；MorningBriefing 改用新接口，TpPage 不动。
- **三种类型**：`long_text_sequential`（全量列表 + 前端 magnet_id+config_id 存索引）、`rss`（单条最新）、`latest`（无 config 时单条最新）；取数逻辑不依赖 zip_code。
- **Long Text 推进时机**：`audio.ended` 时将索引 `(currentIndex+1)%N` 写入 localStorage，下次打开页面播下一条；本页不连播、无「下一首」按钮。
- **进度 key**：localStorage key = `magnet_id + config_id`（前端已有 cId=magnet_id，config_id 由新接口返回）。

## Tasks

- [x] 🟩 **Step 1: 后端 — 新增 GET /api/play-content/list**
  - [x] 🟩 路由：`GET /api/play-content/list`，query 支持 `sn` 或 `magnetId`（与现有 today 一致）。
  - [x] 🟩 解析 magnet：用 sn 或 magnetId 查 `magnet`，取 `id, magnet_config_id, zip_code, formatted`；无 magnet 则返回 `playback_rule: 'latest', items: [], hasZipCode, locationFormatted`。
  - [x] 🟩 查当前 config：按 `magnet_config_id` 查 `magnet_play_content_configs`，`ORDER BY created_at DESC LIMIT 1`，取 `id, source_type, processing_type`；无 config 进入「无 config」分支。

- [x] 🟩 **Step 2: 后端 — 三种分支取 play_news_contents**
  - [x] 🟩 无 config：与现有 `/api/play-contents/today` 无 zip 时一致——查 `magnet_config.industry_solution_id`，`play_news_contents` 按 `industry_solution_id`（若有）+ `created_at DESC LIMIT 1`；返回 `playback_rule: 'latest'`, `items: [一条]`，`hasZipCode`, `locationFormatted`（来自 magnet）。
  - [x] 🟩 有 config 且 RSS（source_type rss / processing_type periodic）：`play_news_contents` 按 `config_id`，`ORDER BY order_index DESC LIMIT 1`；返回 `playback_rule: 'rss'`, `items: [一条]`, `hasZipCode`, `locationFormatted`。
  - [x] 🟩 有 config 且 Long Text（source_type file / processing_type once）：`play_news_contents` 按 `config_id`，`ORDER BY order_index ASC` 全量；返回 `playback_rule: 'long_text_sequential'`, `items: [...]`, `config_id`, `hasZipCode`, `locationFormatted`。
  - [x] 🟩 统一 items 元素形状：`{ id, title, audio_url }`（title 用 headline），与现有 content 形状兼容。

- [x] 🟩 **Step 3: 前端 — API 与 playContentService**
  - [x] 🟩 `backendClient.js`：新增 `apiGetPlayContentList(opts)`，请求 `GET /api/play-content/list?sn=...|magnetId=...`，返回 `{ playback_rule, items, config_id?, hasZipCode?, locationFormatted? }`。
  - [x] 🟩 `playContentService.js`：新增 `getPlayContentList(opts)` 调用 `apiGetPlayContentList`，错误时返回 null；返回结构与接口一致，供 MorningBriefing 使用。

- [x] 🟩 **Step 4: MorningBriefing — 切新接口并处理三种规则**
  - [x] 🟩 加载时调用 `getPlayContentList(sn ? { sn } : { magnetId: cId })` 替代 `getTodayPlayContent`；无数据时保持现有 error 与 loading 行为。
  - [x] 🟩 `playback_rule === 'rss'` 或 `'latest'`：取 `items[0]` 作为当前播放条，赋给 `playContent`（形状兼容现有 `{ id, title, audio_url, hasZipCode?, locationFormatted? }`），创建单 Audio；通知 `onPlayContentLoaded(response)` 缓存完整 list 响应。
  - [x] 🟩 `playback_rule === 'long_text_sequential'`：用 localStorage key `play_content_index_${cId}_${config_id}` 读取 currentIndex（缺省 0）；当前条为 `items[currentIndex]`，赋给 `playContent`；创建 Audio；在 `audio.ended` 时将 `(currentIndex + 1) % items.length` 写回同一 key；不在此页切下一首。
  - [x] 🟩 缓存：`onPlayContentLoaded` 传完整 list 响应；再次进入时 cachedPlayContent 为 list 形态，effect 根据 `playback_rule` 从 items 取当前条（long_text 从 localStorage 读索引），与 App `playContentCacheRef` 兼容。

- [x] 🟩 **Step 5: App.jsx 缓存与兼容**
  - [x] 🟩 `playContentCacheRef` 存新响应形状（完整 list）；MorningBriefing 收到 cached 时按 list 形态处理（rss/latest 用 `items[0]`，long_text 用 `items[localStorage 索引]`）。
  - [x] 🟩 播放日志：仍用 `playContent.id` 调用 `createPlayContentLog`，无需改动 loggingService。

- [x] 🟩 **Step 6: 自测与收尾**
  - [x] 🟩 实现完成：无 config → latest 一条；有 RSS config → rss 一条；有 Long Text config → 全列表；Long Text 播完 ended 写索引，下次打开播下一条；localStorage key 为 `play_content_index_${cId}_${config_id}`。
  - [x] 🟩 TpPage 未改动；旧接口 `/api/play-contents/today` 已保留。
