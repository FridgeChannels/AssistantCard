# Play Content 方案 B — 探索结论（澄清后）

## 已确认的决策

| 点 | 结论 |
|----|------|
| 接口策略 | **用新接口**（新增接口，如 `/api/play-content/list` 等；MorningBriefing 等切到新接口，旧 `/api/play-contents/today` 可保留或后续废弃）。 |
| 内容类型 | **3 种**：① Long Text 列表顺序播放；② RSS 播放最新一条；③ **没有任何配置时**直接播放最新（即当前「无 config 回退」逻辑）。 |
| Long Text 行为 | **每次只播一条**。用户**今天打开页面并播放**后，下次再打开页面时播「下一条」；**不在当前页面上直接切到下一首**（不自动连播、不提供「下一首」按钮）。即：本页只展示/播当前这条，索引推进后**下次进入页面**才看到下一条。 |
| 进度 key | **`magnet_id + config_id`** 作为 localStorage 存 Long Text 当前索引的 key。 |
| TpPage | **不动**。仍用 content_play + `/api/content-play/:id`，不参与本次播放规则改造。 |
| hasZipCode / locationFormatted | **保留**在新接口响应中供 UI/onboarding 使用；**有 zip_code 也不影响取数逻辑**（新接口按 config/无 config 分支取内容，不再按 zip_code 过滤 play_news_contents）。 |

---

## 三种内容类型对应的后端逻辑（新接口）

1. **有 config 且为 Long Text**（`source_type === 'file'` / `processing_type === 'once'`）  
   - 查 `play_news_contents` 该 `config_id` 下 `ORDER BY order_index ASC` **全量**。  
   - 返回：`playback_rule: 'long_text_sequential'`，`items: [...]`，以及 `config_id`（前端用 magnet_id+config_id 做 key）、`hasZipCode`、`locationFormatted`（可选，从 magnet 带出，不参与筛选）。

2. **有 config 且为 RSS**（`source_type === 'rss'` / `processing_type === 'periodic'`）  
   - 查该 `config_id` 下 `order_index DESC`（或 `created_at DESC`）**1 条**。  
   - 返回：`playback_rule: 'rss'`，`items: [一条]`，以及 `hasZipCode`、`locationFormatted`。

3. **没有任何 config**（该 magnet_config 下没有 `magnet_play_content_configs` 或查不到有效 config）  
   - **直接播放最新**：与当前「无 zip 时按 industry_solution_id 取最新」或「全局最新」一致（具体以现有业务为准）。  
   - 返回：`playback_rule: 'latest'`（或等价标识），`items: [一条]`，以及 `hasZipCode`、`locationFormatted`。

---

## Long Text 前端行为（精确化）

- **本次打开页面**：新接口返回 `playback_rule: 'long_text_sequential'` + `items`。  
- 用 localStorage 的 key = `magnet_id + config_id` 读取当前索引（无则 0）。  
- **本页只播一条**：当前展示并播放 `items[currentIndex]`，不自动播下一首，不提供「下一首」按钮。  
- **何时推进索引**：在当前这条**播放结束**（`audio.ended`）时，将 `currentIndex` 设为 `(currentIndex + 1) % N` 并写回 localStorage（key 仍为 magnet_id+config_id）。  
- **下次打开页面**：再次请求新接口，用同一 key 读出的已是「下一项」索引，因此用户听到的是下一条；循环到列表末尾后从 0 开始。

（若产品希望改为「离开页面时再推进」而非「播放结束时推进」，可再单独约定。）

---

## 与现有代码的衔接

- **调用方**：仅 MorningBriefing（及依赖同一播放数据源的入口）改为调新接口；TpPage 不动。  
- **旧接口**：`/api/play-contents/today` 可保留用于兼容或后续下线，新逻辑全部走新接口。  
- **播放日志**：仍为「每次播放一条」对应一条 `play_news_contents_id`；Long Text 本页只播一条，故一次进入仍是一条 log，无需「连续多条」的额外约定。

---

## 仍可选的实现细节（无歧义则按此实现）

- **无 config 时的「最新」**：与现有 `/api/play-contents/today` 在无 zip 时的逻辑一致（如按 `magnet_config.industry_solution_id` 过滤后 `created_at DESC limit 1`，或无 industry_solution_id 时全局最新）。  
- **新接口响应形状**：统一为 `{ playback_rule, items, config_id?, hasZipCode?, locationFormatted? }`，前端根据 `playback_rule` 分支；Long Text 时 `items` 为全量，RSS/latest 时 `items.length === 1`。

以上为澄清后的探索结论，可作为实现方案 B 的约束与验收依据。
