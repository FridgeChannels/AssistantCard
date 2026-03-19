# 播放器音频源与 Magnet 解析链路说明

**类型**: documentation / improvement  
**优先级**: normal  
**投入**: small  

---

## TL;DR

播放器使用的音频 URL 来自表 **`play_news_contents`**（字段 `audio_url`）。  
通过 **sn** 或 **magnetId** 定位到 magnet 后，由后端按 **magnet → industry/zip/config** 再查 `play_news_contents` 得到条目；**/tp/:id** 场景下会先经 **`content_play`** 表解析出 magnetId，独立页的音频也可直接来自 **`content_play.audio_url`**。

---

## 当前行为（从 Magnet 到音频）

### 1. 入口与 Magnet 解析

- **路由 /p/:sn**  
  - 前端：`main.jsx` 用 `getMagnetBySn(sn)` → `GET /api/magnets/by-sn/:sn`。  
  - 后端：查表 **`magnet`**（`sn` 唯一），得到 `id, zip_code, formatted, magnet_config_id`；再通过 `magnet_config`、`magnet_config_cta`、`industry_solution` 等拼出 solution/cta。  
  - 前端拿到 `magnetId`（即 `magnet.id`）和 `magnetContext`，传给 App。

- **路由 /tp/:id**  
  - `:id` 为 **`content_play` 表主键 id**。  
  - 前端：`main.jsx` 调 `apiGetContentPlayById(id)` → `GET /api/content-play/:id`。  
  - 后端：查 **`content_play`** 得 `customer_id` 等；再用 **`magnet`** 表 `customer_id` 查一条得到 **magnetId**（`magnet.id`）并返回。  
  - 独立页播放器可直接使用 **`content_play.audio_url`**（见 `TpPage.jsx`）。

### 2. 播放内容（今日一条 / 列表）用的表

- **今日一条**：`GET /api/play-contents/today?sn=xxx` 或 `?magnetId=xxx`  
  - 用 **sn** 或 **magnetId** 查 **`magnet`** → 取 `zip_code`、`magnet_config_id` → 通过 **`magnet_config`** 取 **`industry_solution_id`**（不再查 `industry_solution` 表）。  
  - 查表 **`play_news_contents`**：  
    - 若有 `zip_code`：先按 `zip_code` + **`industry_solution_id`** 取一条（按 `created_at` 降序）；  
    - 否则或未命中：按 **`industry_solution_id`** 取最新一条。  
  - 返回 `content: { id, title, headline, audio_url }`，**audio_url 来自 `play_news_contents`**。

- **列表（MorningBriefing 等）**：`GET /api/play-content/list?sn=xxx` 或 `?magnetId=xxx`  
  - 先用 **sn/magnetId** 查 **`magnet`** → **`magnet_config`** 得到 **`industry_solution_id`**（不查 `industry_solution` 表）。  
  - 再查 **`magnet_play_content_configs`**（按 `magnet_config_id`）得 `source_type`、`processing_type`、`config_id`。  
  - 根据配置从 **`play_news_contents`** 取数：  
    - **rss**：`config_id` + `order_index` 降序取 1 条；  
    - **long_text**：`config_id` + `order_index` 升序取全部；  
    - 无 config 或 fallback：按 **`industry_solution_id`** 过滤，按 `order_index` 升序返回列表（有则多条顺序播），否则按 `created_at` 取 1 条。  
  - 返回 `items: [{ id, title, audio_url }]`，**audio_url 均来自 `play_news_contents`**。

### 3. 涉及的表小结

| 用途           | 表名                         | 说明 |
|----------------|------------------------------|------|
| 从 sn 找 magnet | `magnet`                     | `sn` 唯一，得到 id、zip_code、magnet_config_id |
| 从 content_play 找 magnet | `content_play` → `magnet` | content_play.customer_id → magnet.customer_id → magnet.id |
| 行业标识       | `magnet_config`             | 得到 industry_solution_id（播放内容接口不查 industry_solution 表） |
| 播放配置       | `magnet_play_content_configs` | 按 magnet_config_id，决定 rss/long_text/latest |
| **音频源**     | **`play_news_contents`**    | **id, headline, audio_url**；按 zip_code / **industry_solution_id** / config_id 筛选 |

**/tp/:id 独立页** 除上述列表接口外，还可直接使用 **`content_play.audio_url`**（单条生成的播放页）。

---

## 相关文件（最多 3 个）

- **`server/apiRoutes.js`** — `/api/play-contents/today`、`/api/play-content/list`、`/api/magnets/by-sn/:sn`、`/api/content-play/:id` 的实现；magnet → magnet_config.industry_solution_id → play_news_contents.industry_solution_id。
- **`src/lib/playContentService.js`** — 前端封装 `getTodayPlayContent`、`getPlayContentList`，内部调 `apiGetTodayPlayContent`、`apiGetPlayContentList`（传 sn 或 magnetId）。
- **`src/lib/magnetIdService.js`** — `getMagnetBySn`、缓存 sn → magnet 信息；与 **`src/main.jsx`** 一起完成路由 sn → magnetId/magnetContext 的解析。

---

## 风险 / 备注

- 两套入口（sn vs content_play id）和两种音频来源（play_news_contents vs content_play.audio_url）并存，新人容易混淆；可在代码或文档中显式标注「播放器音频来自哪张表、哪条接口」。
- 若后续表结构或接口变更（例如 play_news_contents 拆表、增加来源字段），需同步更新本文档与相关注释。
