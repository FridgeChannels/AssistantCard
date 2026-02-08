# Feature Implementation Plan：Header 右侧 CTA 按钮

**Overall Progress:** `100%`

## TLDR

在 App.jsx 主流程 Chat 与 AssistantPromptChat 页的 header 右侧各增加一个 CTA 按钮。按钮由 `magnetContext.cta` + `solution.permissions` 决定是否展示及行为；优先级 chat_url > skip_url > 联系；联系时打开现有 TextMeSheet。无数据或权限不通过则不展示。

## Critical Decisions

- **只一个按钮**：优先级 chat_url > skip_url > 联系；联系 = 打开 TextMeSheet（现有能力）。
- **权限与冲突**：与 MorningBriefing 一致，使用 `CHAT_URL_PERMISSIONS`、`SKIP_URL_PERMISSIONS`、`CTA_CONTACT_PERMISSIONS` 及冲突逻辑（CTA_ROUTE 与 ASSISTANT 冲突时隐藏 skip_url/contact）。
- **权限逻辑复用**：抽到 `src/lib/ctaPermissions.js`，供 App、AssistantPromptChat、MorningBriefing 共用，避免重复与漂移。

## Tasks

- [x] 🟩 **Step 1: 抽离 CTA 权限公共模块**
  - [x] 🟩 新增 `src/lib/ctaPermissions.js`：导出 `CHAT_URL_PERMISSIONS`、`SKIP_URL_PERMISSIONS`、`CTA_CONTACT_PERMISSIONS` 等，以及 `normalizePermissionSet`、`hasAllPermissions`、`hasAnyAssistantPermission`。
  - [x] 🟩 导出 `getHeaderCta(cta, permissions)`：按优先级与权限（含冲突）返回 `null` 或 `{ type, label, href? }`。

- [x] 🟩 **Step 2: MorningBriefing 改用公共模块**
  - [x] 🟩 在 `MorningBriefing.jsx` 中删除本地权限常量与工具函数，改为从 `ctaPermissions.js` 导入，行为不变。

- [x] 🟩 **Step 3: App.jsx Chat header 右侧 CTA**
  - [x] 🟩 Chat 页 `<header>` 保持 `justify-between`，右侧根据 `getHeaderCta` 渲染一个 CTA（外链 `<a>` / 联系 `<button>` 打开 TextMeSheet）；无结果不渲染。

- [x] 🟩 **Step 4: AssistantPromptChat header 右侧 CTA**
  - [x] 🟩 为 `AssistantPromptChat` 新增 props：`magnetContext`、`onOpenContact`；在 `<header>` 右侧渲染同一逻辑的 CTA，联系时调用 `onOpenContact()`。

- [x] 🟩 **Step 5: App 向 AssistantPromptChat 传入 CTA 所需 props**
  - [x] 🟩 在 `App.jsx` 渲染 `AssistantPromptChat` 处传入 `magnetContext={magnetContext}`、`onOpenContact={() => setIsSheetOpen(true)}`。
