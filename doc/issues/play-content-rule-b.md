# Play Content 播放规则：方案 B（WebApp 端维护 Long Text 顺序）

**Type:** feature  
**Priority:** normal  
**Effort:** medium  

---

## TL;DR

按 `magnet_play_content_configs` 的 `source_type` / `processing_type` 区分 RSS 与 Long Text；新接口返回「列表 + 规则」。RSS 只返最新一条；Long Text 返全量列表 + `playback_rule: 'long_text_sequential'`，由 WebApp 用内存/localStorage 维护当前播到第几条并循环，**不新增 DB 字段**。

---

## Current state

- 取播放内容走 `GET /api/play-contents/today?sn=...|magnetId=...`，按 `magnet.zip_code`、`magnet_config.industry_solution_id` 查 `play_news_contents`，只返回**单条**（最新一条）。
- 未区分 RSS / Long Text，也未使用 `magnet_play_content_configs` 的 `source_type`、`processing_type`。
- 前端 `playContentService.getTodayPlayContent` → `MorningBriefing` 只处理「一条内容」的播放。

---

## Expected outcome（已澄清见 doc/issues/play-content-rule-b-explore.md）

- **接口**：**新增**接口（如 `/api/play-content/list`），MorningBriefing 等改用新接口；旧 `/api/play-contents/today` 可保留。TpPage 不动。
- **三种内容类型**：  
  1. **Long Text**：config 为 file/once → 返回全量列表 + `playback_rule: 'long_text_sequential'`；前端用 `magnet_id + config_id` 作 localStorage key 存当前索引；**每次打开只播一条**，播完后推进索引，**下次打开**播下一条（不在此页直接切下一首）。  
  2. **RSS**：config 为 rss/periodic → 该 config 下 `order_index DESC` 一条，返回 `playback_rule: 'rss'` + `items: [一条]`。  
  3. **无 config**：直接播放最新（与现有无 zip 时「最新一条」逻辑一致），返回 `playback_rule: 'latest'` + `items: [一条]`。
- **后端**：由 magnet_id 得到 magnet_config_id，查当前生效的 `magnet_play_content_configs`；有 config 则按 source_type/processing_type 分支查 `play_news_contents`（Long Text 全量 order_index ASC，RSS 一条 order_index DESC），无 config 则按现有逻辑取最新。**zip_code 不参与取数**；响应中保留 `hasZipCode`、`locationFormatted` 仅供 UI。
- **前端**：新接口返回 `playback_rule` + `items` + 可选 `config_id`；Long Text 时用 `magnet_id + config_id` 读写索引，`audio.ended` 时更新索引并持久化。

---

## Relevant files

- `server/apiRoutes.js` — 新增或重构 play content 接口，按 config 查 `magnet_play_content_configs` 与 `play_news_contents`（config_id + order_index），返回 list + playback_rule。
- `src/lib/playContentService.js` — 调用新接口，返回 `{ playback_rule, items }`；可选封装「取当前要播的一条」给上层。
- `src/components/briefing/MorningBriefing.jsx` — 根据 `playback_rule` 分支：RSS 用单条；Long Text 用列表 + 本地索引/循环逻辑，并写/读 localStorage（可选）。

---

## Risks / Notes

- **兼容**：新接口独立存在，MorningBriefing 切到新接口；旧 `/api/play-contents/today` 可保留或后续废弃。
- **数据**：无 config 时沿用现有「取最新一条」逻辑（如 industry_solution_id + created_at DESC）；有 config 时仅按 config_id + order_index，zip_code 不参与筛选；响应中 hasZipCode/locationFormatted 仅用于 UI。
- **Long Text 进度**：索引存 localStorage（magnet_id+config_id），换设备或清缓存会从第一条重新播。

---

## Implementation checklist（方案 B）

- [ ] 后端：新增接口（如 GET `/api/play-content/list?sn=...` 或 `?magnetId=...`）；根据 magnet 解析 magnet_config_id，再查 `magnet_play_content_configs`（ORDER BY created_at DESC LIMIT 1）。
- [ ] 后端：三种分支 — ① 有 config 且 Long Text：config_id + `order_index ASC` 全量，返回 `playback_rule: 'long_text_sequential'` + `items` + `config_id`；② 有 config 且 RSS：同 config `order_index DESC` 1 条，返回 `playback_rule: 'rss'` + `items: [一条]`；③ 无 config：按现有逻辑取最新一条，返回 `playback_rule: 'latest'` + `items: [一条]`。响应统一带 `hasZipCode`、`locationFormatted`（zip 不参与筛选）。
- [ ] 前端：`playContentService` 调新接口，返回 `{ playback_rule, items, config_id?, hasZipCode?, locationFormatted? }`。
- [ ] 前端：MorningBriefing 根据 `playback_rule` 分支；Long Text 时用 localStorage key=`magnet_id+config_id` 读写当前索引，本页只播 `items[currentIndex]`，在 `audio.ended` 时将索引设为 `(currentIndex+1)%N` 并写回，下次打开即播下一条。
- [ ] TpPage 不修改；旧接口是否保留/废弃单独决定。
