# Feature Implementation Plan：Zipcode 权限 + Assistant Prompt 文案配置

**Overall Progress:** `89%`（Step 7 可选未做；Step 8–9 背景图已实现）

## TLDR

为 zipcode 增加单一权限 Key（`METHOD_METHOD_PLAY_CONTENT_ZIPCODE`），控制「展示 zip 引导/入口」与「使用 zip」；将「Bruce Lee」按钮/Header 名称改为从 `magnet_config.assistant_prompt_label` 读取，空则默认 "Bruce Lee"；将整页背景图改为从 `magnet_config.background_image_url` 读取，空则默认 `/bg2.png`。Zip 引导弹窗文案不配置；TpPage 不改（文案与背景图均不配置）。

## Critical Decisions

- **Zipcode 单 Key**：展示与使用合并为 `METHOD_METHOD_PLAY_CONTENT_ZIPCODE`（对应 `solution_method.code = 'play_content_zipcode'`），由 industry_solution_config 配置，by-sn 已会返回，前端仅需判断该 Key。
- **不配置 zip 引导文案**：ZipCodeOnboarding 标题/背景/按钮保持写死，仅显隐由 zip 权限控制。
- **Bruce Lee 可配置**：magnet_config 新增 `assistant_prompt_label`，用于播放器底部 Assistant Prompt 按钮与 App/AssistantPromptChat Header 左侧名称；TpPage 不接该配置。
- **背景图可配置**：magnet_config 新增 `background_image_url`，仅主流程 App（/p/:sn）使用，传给 MobileContainer；空则默认 `/bg2.png`。**TpPage 不配置背景图**，继续写死 `/bg2.png`。

## Tasks

- [x] 🟩 **Step 1: 数据库 — Zip 权限字典与方案配置**
  - [x] 🟩 已提供 SQL：`doc/sql/zipcode-permission-and-assistant-label.sql`（插入 `solution_method` + `industry_solution_config`），需在目标库执行。
  - [ ] 🟥 确认 by-sn 响应中 `solution.permissions` 包含 `METHOD_PLAY_CONTENT_ZIPCODE`（执行 SQL 后本地或测试环境调接口验证）。

- [x] 🟩 **Step 2: 数据库 — magnet_config 新增 assistant_prompt_label**
  - [x] 🟩 已提供 `ALTER TABLE magnet_config ADD COLUMN assistant_prompt_label`（见同上 SQL 文件），需在目标库执行。
  - [x] 🟩 已在 `doc/数据库字典.md` 的 magnet_config 小节中记录该字段。

- [x] 🟩 **Step 3: 后端 — by-sn 返回 assistant_prompt_label**
  - [x] 🟩 在 `server/apiRoutes.js` 的 `GET /api/magnets/by-sn/:sn` 中，查 `magnet_config` 时 select 已加入 `assistant_prompt_label`。
  - [x] 🟩 已将 `configRow?.assistant_prompt_label ?? null` 写入 `payload.assistant_prompt_label`。

- [x] 🟩 **Step 4: 前端 — magnetContext 携带 assistant_prompt_label**
  - [x] 🟩 在 `src/main.jsx` 中，`setMagnetContext` 已包含 `assistant_prompt_label`（与 solution、cta、industry_id 同级）。

- [x] 🟩 **Step 5: 前端 — Zip 权限常量与 Zip 引导显隐**
  - [x] 🟩 在 `src/lib/ctaPermissions.js` 中已新增并导出 `ZIPCODE_PERMISSIONS`。
  - [x] 🟩 在 `MorningBriefing.jsx` 中已恢复 zip 引导显隐：在拿到 play content 响应后，在「有 zip 权限 + 未填 zip + 未 skip」时 `setShowOnboarding(true)`。

- [x] 🟩 **Step 6: 前端 — Bruce Lee 文案来自 magnet_config**
  - [x] 🟩 `MorningBriefing.jsx`：Header 与底部两处 Assistant Prompt 按钮文案已改为 `magnetContext?.assistant_prompt_label || 'Bruce Lee'`。
  - [x] 🟩 `src/App.jsx`：Header 左侧名称已改为 `magnetContext?.assistant_prompt_label || 'Bruce Lee'`。
  - [x] 🟩 `src/components/briefing/AssistantPromptChat.jsx`：Header 左侧名称已改为 `magnetContext?.assistant_prompt_label || 'Bruce Lee'`。

- [ ] 🟥 **Step 7:（可选）播放内容接口按 zip 权限限制使用 zip**
  - [ ] 🟥 若需后端在按 zip 筛选内容时校验「有 zip 权限才用 zip」：在 play-content 相关接口中根据 magnet 解析出 solution 权限，仅当包含 `METHOD_PLAY_CONTENT_ZIPCODE` 时才用 zip 参与筛选；否则不传/不用 zip。本期可不做。

- [x] 🟩 **Step 8: 数据库 + 后端 — 背景图 background_image_url**
  - [x] 🟩 已在 `doc/sql/zipcode-permission-and-assistant-label.sql` 中增加 `ALTER TABLE magnet_config ADD COLUMN background_image_url`；已在 `doc/数据库字典.md` 的 magnet_config 小节中记录该字段。
  - [x] 🟩 在 `server/apiRoutes.js` 的 by-sn 中，查 magnet_config 时 select 已加入 `background_image_url`，并将 `configRow?.background_image_url ?? null` 写入 `payload.background_image_url`。

- [x] 🟩 **Step 9: 前端 — 主流程背景图来自 magnet_config**
  - [x] 🟩 在 `src/main.jsx` 中，`setMagnetContext` 已包含 `background_image_url`。
  - [x] 🟩 在 `src/App.jsx` 中，已改为 `backdropImage={magnetContext?.background_image_url || '/bg2.png'}`。TpPage 未修改，继续使用 `/bg2.png`。
