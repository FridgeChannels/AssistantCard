# CTA 按钮放在 header 右侧 - 探索

**仅探索，不实现。**

---

## 一、当前结构

### 1.1 涉及页面与 header

| 页面 | 文件 | 当前 header 结构 |
|------|------|------------------|
| **主流程 Chat** | `App.jsx` 约 556–577 行 | 左侧 [返回] + [L + “Bruce Lee”]，**右侧无内容**（无 justify-between） |
| **Assistant Prompt** | `AssistantPromptChat.jsx` 约 39–61 行 | 左侧 [返回] + [L + “Assistant Prompt”]，**右侧无内容**（已有 justify-between，但右侧无节点） |
| **Tp 页 Chat** | `TpPage.jsx` | 本次**不改**。 |

### 1.2 CTA 数据与权限

- **数据**：`magnetContext` = `{ solution, cta }`（main.jsx）。`cta`：`name`、`phone`、`email`、`chat_url`、`skip_url` 等。
- **权限**：`magnetContext.solution?.permissions`，MorningBriefing 内已有：
  - `CHAT_URL_PERMISSIONS`、`SKIP_URL_PERMISSIONS`、`CTA_CONTACT_PERMISSIONS`；
  - `normalizePermissionSet(permissions)`、`hasAllPermissions(permissionSet, required)`；
  - 冲突逻辑：`hasCtaRoute && (hasAssistantCustomMade || hasAssistantChatUrl)` 时隐藏 CTA 路由相关按钮。
- **联系**：App 用 `magnetContext.cta` 填 `agentInfo`，`TextMeSheet` 由 `setIsSheetOpen(true)` 打开，AnswerCard 内「Contact James」即走该逻辑。

### 1.3 AssistantPromptChat 与 App 的衔接

- **AssistantPromptChat** 当前 props：chatHistory、handleSearch、handleBackToBriefing、agentInfo、cId、conversationId 等；**未**接收 `magnetContext`、`solution.permissions` 或「打开联系面板」回调。
- **TextMeSheet** 在 App 中渲染，通过 `isSheetOpen`、`onClose`、`agentName`、`phone`、`email`、`cId` 等控制。若 Assistant Prompt 页 header 的 CTA 为「联系」，需由 App 传入回调（如 `onOpenContact`）供 AssistantPromptChat 调用，以打开同一 TextMeSheet。

---

## 二、已确认结论（来自需求方）

1. **范围**：**App.jsx** 主流程 Chat header **+** **AssistantPromptChat** 页 header（两处都加 CTA）。
2. **按钮数量与优先级**：只放**一个**按钮；优先级 **chat_url > skip_url > 联系**（联系 = 打开现有 TextMeSheet）。
3. **权限**：需要**权限校验**，与 MorningBriefing 一致（使用 `solution.permissions` 及 CHAT_URL / SKIP_URL / CTA_CONTACT 权限与冲突逻辑）。
4. **联系**：使用**现有功能**（点击后打开 TextMeSheet，即 `setIsSheetOpen(true)`）。
5. **无数据**：无 CTA 数据或权限不通过则不展示按钮。
6. **样式**：与现有 header 风格一致。

---

## 三、实现要点（收敛后）

### 3.1 优先级与展示文案

- **一个按钮**，按优先级取第一种可展示且有权限的：
  - 有 `chat_url` 且通过 `CHAT_URL_PERMISSIONS` → 外链，文案用 `cta.name` 或 “Chat”；
  - 否则有 `skip_url` 且通过 `SKIP_URL_PERMISSIONS` → 外链，文案用 `cta.name` 或 “Link”；
  - 否则有 phone/email 且通过 `CTA_CONTACT_PERMISSIONS` → 打开 TextMeSheet，文案用 `cta.name` 或 “Contact”。
- 冲突逻辑与 MorningBriefing 一致：若 `FUNC_FUNC_CTA_ROUTE` 与 ASSISTANT 相关权限同时存在，则 CTA 路由类不展示（即 skip_url、contact 不展示）；chat_url 属 ASSISTANT，是否受同一冲突规则需与 MorningBriefing 对齐（当前 MorningBriefing 中 `showChatUrlButton` 不参与 hasConflict，仅 `showSkipUrlButton` / `showCtaContactButton` 被冲突隐藏）。

### 3.2 权限与复用

- 权限常量与 `normalizePermissionSet`、`hasAllPermissions`、冲突判断目前仅在 **MorningBriefing.jsx** 内。  
- **实现选择**：在 **App.jsx** 与 **AssistantPromptChat.jsx** 中复用同一逻辑，可选方式：  
  - **A**：抽到公共模块（如 `src/lib/ctaPermissions.js`），两页 + MorningBriefing 都从该模块引用；  
  - **B**：两页内各自拷贝一份常量与工具函数（实现快，后续若改权限需改多处）。  
- 建议在实现时明确采用 A 或 B。

### 3.3 涉及文件与数据流

| 文件 | 改动概要 |
|------|----------|
| **App.jsx** | 主流程 Chat 的 `<header>`：改为左右布局，右侧根据 cta + 权限渲染一个 CTA 按钮（chat_url / skip_url / 联系）；联系时 `setIsSheetOpen(true)`。需使用权限逻辑（见 3.2）。 |
| **AssistantPromptChat.jsx** | `<header>`：右侧根据 cta + 权限渲染一个 CTA 按钮；联系时调用 App 传入的回调（如 `onOpenContact`）。需新增 props：`magnetContext`（或 `cta`+`permissions`）+ `onOpenContact`。 |
| **App.jsx**（AssistantPromptChat 调用处） | 传入 `magnetContext`、`onOpenContact={() => setIsSheetOpen(true)}`（或已有 `onTextJames` 语义复用）。 |
| **可选** | 新增 `src/lib/ctaPermissions.js`（或等价）抽出权限常量与工具，供 App、AssistantPromptChat、MorningBriefing 使用。 |

### 3.4 无数据 / 无权限

- 无 `magnetContext`、无 `magnetContext.cta`，或 cta 无任何可用字段，或权限不通过：右侧不渲染 CTA，仅保留左侧 [返回] + 标题。

---

## 四、小结

- **范围**：App.jsx 主流程 Chat header + AssistantPromptChat 页 header。  
- **行为**：一个 CTA 按钮；优先级 chat_url > skip_url > 联系；联系用现有 TextMeSheet；需权限校验；无数据/无权限不展示。  
- **实现前**：确认权限/冲突逻辑是否与 MorningBriefing 完全一致（尤其 chat_url 在冲突场景下是否展示），以及是否抽公共权限模块（3.2）。
