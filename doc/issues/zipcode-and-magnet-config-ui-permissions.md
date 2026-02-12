# Zipcode 权限 + Assistant Prompt 按钮文案配置

**Type**: feature / improvement  
**Priority**: normal  
**Effort**: medium

---

## 已确认范围（来自探索）

1. **Zipcode 权限**：**一个 Key** 同时控制「展示」与「使用」zipcode（有则展示引导/入口且 zip 参与逻辑，无则都不展示不使用）。  
2. **Zipcode 引导弹窗**：标题、背景、按钮等**不做配置**，保持现有写死文案与样式。  
3. **需从配置取的文案**：仅 **Bruce Lee（Assistant Prompt）** 按钮的展示名称从 `magnet_config` 读取，空则用默认 "Bruce Lee"。

---

## TL;DR

1. 权限接口增加**一个** zipcode 相关权限 Key（展示+使用合一），前端据此决定是否展示 Zip 引导/入口及是否在内容逻辑中使用 zip。  
2. Zipcode 引导弹窗不改动，无需 magnet_config 新字段。  
3. magnet_config 新增**一个**字段：Assistant Prompt 按钮名称（如 `assistant_prompt_label`），仅用于「Bruce Lee」按钮及同名字样在 Header 等处的展示；空则用默认 "Bruce Lee"。

---

## 当前状态 vs 期望

| 项 | 当前 | 期望 |
|----|------|------|
| Zipcode 权限 | 无独立权限；zip 引导弹窗逻辑已注释（不再弹出）；hasZipCode 仅表示 magnet 是否已填 zip | 权限接口返回 **METHOD_METHOD_PLAY_CONTENT_ZIPCODE**（由 solution_method.code = `play_content_zipcode` 生成）：有则可展示 zip 引导/入口且 zip 参与内容逻辑，无则都不展示不使用 |
| Zipcode 引导弹窗文案/样式 | 写死，且当前不弹出 | **不配置**，保持写死；仅弹窗是否展示由上述 zip 权限控制 |
| Bruce Lee（Assistant Prompt） | 多处写死 "Bruce Lee"（MorningBriefing 底部按钮、Header、AssistantPromptChat、TpPage） | 仅此名称从 **magnet_config** 新字段读取，空则默认 "Bruce Lee" |

---

## 1. Zipcode 权限：单 Key `METHOD_METHOD_PLAY_CONTENT_ZIPCODE`

权限来源与现有一致：`GET /api/magnets/by-sn/:sn` → `solution.permissions`，由 `industry_solution_config` 关联 `solution_method` 生成。后端对 `solution_method.code` 做 `METHOD_` + toKey(code)，接口返回 `METHOD_PLAY_CONTENT_ZIPCODE`；前端 `normalizePermissionSet` 会补双前缀，得到 `METHOD_METHOD_PLAY_CONTENT_ZIPCODE`，判断时用该 Key 即可。

- **单 Key**（展示+使用合一）：**METHOD_METHOD_PLAY_CONTENT_ZIPCODE**（对应字典表 `solution_method.code = 'play_content_zipcode'`）。  
- 有该权限：可展示 ZipCode 引导弹窗、**播放器下方的 zipcode 选择/展示**（LocationSelector 区域），且 magnet 的 zip 可参与播放内容筛选等。  
- 无该权限：不展示 zip 引导弹窗、不展示播放器下方 zipcode 选择入口，且不在内容逻辑中使用 zip。

### 1.1 对应 SQL（新增方法并挂到方案配置）

以下 SQL：① 在 `solution_method` 中新增方法 `play_content_zipcode`（挂在现有 `play_content` 模块下、如 `play_content_fc` 功能下）；② 为所有 `industry_solution` 在 `industry_solution_config` 中增加一行，使 by-sn 返回的 permissions 包含 `METHOD_PLAY_CONTENT_ZIPCODE`（前端表现为 `METHOD_METHOD_PLAY_CONTENT_ZIPCODE`）。

```sql
-- 1) 新增 solution_method：code = 'play_content_zipcode'，挂在 play_content 模块下已有的 play_content_fc 功能上
INSERT INTO solution_method (function_id, code, name, sort_order)
SELECT sf.id, 'play_content_zipcode', 'Play Content Zipcode', 0
FROM solution_function sf
JOIN solution_module sm ON sm.id = sf.module_id AND sm.code = 'play_content'
WHERE sf.code = 'play_content_fc'
LIMIT 1
RETURNING id, function_id;

-- 2) 为所有行业方案增加该方法的配置（by-sn 会据此返回 METHOD_PLAY_CONTENT_ZIPCODE）
INSERT INTO industry_solution_config (industry_solution_id, module_id, function_id, method_id, sort_order)
SELECT is.id, sf.module_id, sf.id, sm.id,
  (SELECT COALESCE(MAX(isc.sort_order), 0) + 1 FROM industry_solution_config isc WHERE isc.industry_solution_id = is.id)
FROM industry_solution is
CROSS JOIN solution_method sm
JOIN solution_function sf ON sf.id = sm.function_id
WHERE sm.code = 'play_content_zipcode';
```

**说明**：若当前库中不存在 `solution_function.code = 'play_content_fc'` 或 `solution_module.code = 'play_content'`，第 1 步会插入 0 行，需先确认字典表数据或改为挂到已有的 play_content 相关 function 上；第 2 步依赖第 1 步已插入的 `solution_method`。

---

## 2. magnet_config 表：Assistant Prompt 名称 + 背景图

| 字段名 | 类型 | 可空 | 说明 |
|--------|------|------|------|
| `assistant_prompt_label` | character varying | 是 | Assistant Prompt 按钮及同名字样（如 Header）的展示名称，空则前端用默认 "Bruce Lee" |
| `background_image_url` | character varying | 是 | 页面背景图 URL（供 MobileContainer 使用），空则前端用默认 `/bg2.png` |

**不新增** zip 引导相关字段（zip_onboarding_title / subtitle / skip_label 等）；此处「背景图」指**整页背景**（MobileContainer），非 zip 弹窗内背景。

后端：`GET /api/magnets/by-sn/:sn` 查 `magnet_config` 时 select 上述字段，放入 payload（`assistant_prompt_label`、`background_image_url`）。前端通过 magnetContext 使用（main.jsx 将 by-sn 返回的字段写入 magnetContext；App 用 `background_image_url` 传给 MobileContainer，空则默认 `/bg2.png`）。

---

## 3. 按权限展示的按钮（与配置的关系）

| 位置 | 按钮/入口 | 显隐（权限） | 文案来源 |
|------|-----------|--------------|----------|
| ZipCode 引导弹窗 | 整弹窗 | 新 zip 权限（单 Key） | **不配置**，保持写死 |
| 播放器底部 | Bruce Lee（Assistant Prompt） | `ASSISTANT_PROMPT_PERMISSIONS` | **magnet_config.assistant_prompt_label**，空默认 "Bruce Lee" |
| 播放器底部 | Chat with Leo / Chat URL / Contact / Link | 现有 CTA 权限 | 现有逻辑（cta.name 或写死） |
| Header（App / AssistantPromptChat） | 左侧标题名 | - | **magnet_config.assistant_prompt_label**，空默认 "Bruce Lee" |
| Header | 右侧 CTA 按钮 | 现有 getHeaderCta | cta.name / 默认 |

---

## 相关文件

- `src/components/briefing/MorningBriefing.jsx` — 是否展示 ZipCodeOnboarding（按 zip 权限）、底部「Bruce Lee」按钮文案（assistant_prompt_label）；恢复/接入 zip 引导显隐逻辑
- `src/components/briefing/ZipCodeOnboarding.jsx` — 引导弹窗，文案/样式不改，仅是否展示由权限控制
- `src/lib/ctaPermissions.js` — 新增 zip 权限常量（如 `ZIPCODE_PERMISSIONS`），MorningBriefing 中用于判断是否展示 zip 引导
- `src/main.jsx` — 将 by-sn 返回的 `assistant_prompt_label`、`background_image_url` 放入 magnetContext
- `src/App.jsx` — Header 左侧名称用 magnetContext.assistant_prompt_label；**背景图**用 magnetContext.background_image_url 传给 MobileContainer，空默认 `/bg2.png`
- `src/components/briefing/AssistantPromptChat.jsx` — Header 左侧名称同上
- `src/pages/TpPage.jsx` — **本期不处理**：保持写死 "Bruce Lee"，**背景图不配置**，继续用 `/bg2.png`
- `server/apiRoutes.js` — by-sn 查 magnet_config 时 select `assistant_prompt_label`、`background_image_url` 并下发给前端
- `doc/数据库字典.md` — 记录 magnet_config 新增字段 `assistant_prompt_label`、`background_image_url`

---

## 探索结论（集成点与依赖）

- **Zip 引导显隐**：当前 `MorningBriefing` 中 `setShowOnboarding(true)` 已被注释（约 322–324 行），改为在「有 zip 权限 + 未填 zip + 未 skip」等条件下再设 true；zip 权限从 `magnetContext?.solution?.permissions` 读取，与现有 CTA 权限一致。
- **assistant_prompt_label 数据流**：by-sn 返回 → main.jsx 写入 magnetContext → App / MorningBriefing / AssistantPromptChat 从 magnetContext 取。**TpPage 本期不处理**，继续写死 "Bruce Lee"。
- **播放内容接口**：若后端在按 zip 筛选内容时也要遵守「有 zip 权限才用 zip」，需在 play-content 相关接口中拿到当前 magnet 的 solution 权限并判断；当前 play-content 已按 magnet 查 zip，未做权限校验，属实现时可选项。

---

## 探索：背景图可配置（已确认）

- **现状**：`MobileContainer` 已支持 `backdropImage` prop；`App.jsx` 主内容使用 `<MobileContainer backdropImage="/bg2.png">` 写死；`main.jsx` 的 loading/error 及 `TpPage.jsx` 也使用 `/bg2.png`。
- **需求**：整页背景图可由配置替换，空则用默认 `/bg2.png`。
- **已确认**：① 字段命名为 **`background_image_url`**（character varying 可空）；② **TpPage 不配置背景图**，继续写死 `/bg2.png`。
- **集成点**：
  - **magnet_config** 新增字段 `background_image_url`，存背景图 URL（相对或绝对均可；`MobileContainer` 用 `url(${backdropImage})`，两种都支持）。
  - **by-sn** 在查 magnet_config 时 select 该字段并写入 payload；**main.jsx** 将 `background_image_url` 放入 magnetContext。
  - **App.jsx** 使用 `backdropImage={magnetContext?.background_image_url || '/bg2.png'}` 传给 `MobileContainer`。
  - **main.jsx** 的 loading/error 状态无 magnetContext，继续使用 `/bg2.png`。**TpPage** 不接背景图配置，保持 `/bg2.png`。

---

## 待确认（ambiguities）

- 无。Zip 权限、assistant_prompt_label、背景图字段名（`background_image_url`）及 TpPage 不配置背景图均已确认。

---

## 风险与备注

- 新 zip 权限需在 industry_solution_config 中配置，否则 by-sn 不会返回该 Key。  
- magnet_config 新增字段可空，前端未取到用默认，兼容旧配置。  
- 播放内容接口是否按 zip 权限限制「使用 zip」为可选项，若做需后端能拿到当前 magnet 的 solution 权限。

---

## 实施顺序建议

1. 确定 zip 权限单 Key 命名，在 industry_solution_config 配置，保证 by-sn 返回。  
2. magnet_config 新增 `assistant_prompt_label`，by-sn 查询并下发给前端，magnetContext 携带该字段。  
3. ctaPermissions.js 新增 zip 权限常量；MorningBriefing 中按 zip 权限 + hasZipCode + skip 状态决定是否展示 ZipCodeOnboarding。  
4. MorningBriefing / App / AssistantPromptChat 中「Bruce Lee」改为读取 assistant_prompt_label，空则 "Bruce Lee"（TpPage 不改）。  
5. （可选）播放内容接口按 zip 权限限制使用 zip。
