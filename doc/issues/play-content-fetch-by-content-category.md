# 播放内容查询：由 industry_solution_id 改为 content_category_code（经 rel_magnetconfig_contentcategory）

**类型**: feature / improvement  
**优先级**: normal  
**投入**: medium  

---

## TL;DR

数据库与播放链路调整后：**不再用 `industry_id` / `industry_solution_id` 限定 `play_news_contents`**。改为：`magnet` → `magnet_config_id` → **`rel_magnetconfig_contentcategory`** 取 **`play_content_category_code`**（可多行）→ 用 **`play_news_contents.content_category_code`** 拉取播放列表。后端 `/api/play-contents/today`、`/api/play-content/list` 及所有按 `industry_solution_id` 过滤 `play_news_contents` 的分支需对齐新流程；`doc/数据库字典.md` 与 `doc/issues/player-audio-source-and-magnet-flow.md` 需同步更新。

---

## 当前行为 vs 期望

| 维度 | 当前 | 期望 |
|------|------|------|
| 限定字段 | `magnet_config.industry_solution_id` → `play_news_contents.industry_solution_id` | `rel_magnetconfig_contentcategory.play_content_category_code` → `play_news_contents.content_category_code` |
| 中间表 | 无（直接 industry 关联） | `rel_magnetconfig_contentcategory`（`magnet_config_id` FK） |
| 内容表 | 仍为 `play_news_contents`（含 `audio_url` 等） | 不变，筛选维度改为类目 code |

**注意**：表述「不再使用 play_news_contents」若指「不再用 industry 字段从该表取数」则与上表一致；**内容行仍来自 `play_news_contents`**，只是过滤条件改为 `content_category_code`。

---

## 实现要点（待代码对齐）

1. **`GET /api/play-contents/today`**（`apiRoutes.js`）：在取得 `magnet.magnet_config_id` 后，查 `rel_magnetconfig_contentcategory` 得到若干 `play_content_category_code`；查询 1（zip + 行业）改为 zip + **`content_category_code` IN (...)**（或等价逻辑）；查询 2（仅行业）改为按类目 code 集合取最新。
2. **`GET /api/play-content/list`**：rss / long_text 分支里凡用 `industry_solution_id` 过滤 `play_news_contents` 的 fallback/latest 路径，改为按上述类目 code 集合过滤；若 `magnet_config_id` 在关联表无记录，需定义行为（空列表 vs 兼容旧数据）。
3. **`GET /api/magnets/by-sn/:sn`**：若仅播放接口改链路，**权限/solution 仍依赖 `magnet_config.industry_solution_id`** 则可暂不动；若库表已删该字段，需单独需求说明。
4. 前端 **`playContentService.js`** / **`backendClient.js`**：若响应形状不变，可能仅注释与文档更新。

---

## 相关文件（最多 3 个）

- **`server/apiRoutes.js`** — `play-contents/today`、`play-content/list` 及所有 `play_news_contents` + `industry_solution_id` 查询。
- **`doc/issues/player-audio-source-and-magnet-flow.md`** — 当前链路说明，需改为类目 code 流程。
- **`doc/数据库字典.md`** — 表 `rel_magnetconfig_contentcategory`、`play_content_category`、`play_news_contents.content_category_code` 说明。

---

## 风险 / 备注

- **`rel_magnetconfig_contentcategory` 一对多**：同一 `magnet_config_id` 可能对应**多个** `play_content_category_code`，需产品/后端约定是 **IN（并集）**、优先级排序，还是仅取一条。
- **rss / long_text**：是否仍用 `config_id` + `order_index`，仅把「无 config 时的 industry 过滤」改为类目；若有歧义需在评审时拍板。
- **数据迁移**：历史 `play_news_contents` 是否已填 `content_category_code`、关联表是否已全量配置，影响上线与回滚策略。

---

## 开放问题（实现前建议确认）

1. 一个 `magnet_config_id` 对应多行 `rel_magnetconfig_contentcategory` 时，`play_news_contents` 的筛选是 **`content_category_code IN (全部 code)`** 吗？是否需要排序或主类目？
2. 无关联行（或 magnet 无 `magnet_config_id`）时，接口返回 **空** 还是保留一段时期的 **`industry_solution_id` 回退**？
3. `magnet_config.industry_solution_id` 在 **`by-sn` 权限/solution 组装** 中是否保留？若库表已移除，需另开任务改权限链路。
