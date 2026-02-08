# 首次推荐问题接口切换 - 探索阶段总结

本文档是对需求、页面逻辑与代码的梳理，以及待澄清问题列表。**不涉及实现**。

---

## 一、需求理解（来自 issue）

- **接口切换**：从当前「流式 Dify + 本地代理 `/api/related-questions`」改为 `POST kno.fridgechannels.com/v1/workflows/run`（blocking），请求体 `inputs: { magnet_id, stage: "" }`，`response_mode: "blocking"`，`user: "abc-123"`，Bearer 鉴权。
- **响应分支**：
  - `data.outputs.answer_type === "recom"`：用当前 3 张卡片展示 `data.outputs.rec_question`（`[{ question: "..." }, ...]`）。
  - `data.outputs.answer_type === "no_answer"`：不展示推荐问题卡片，以「对话形式」先展示 `data.outputs.no_answer_txt` 作为首条助手消息。

---

## 二、当前代码结构

### 2.1 数据流

| 环节 | 位置 | 行为 |
|------|------|------|
| **API 层** | `src/lib/relatedQuestionsService.js` | `getRelatedQuestions(cId, conversationId)` → POST `/api/related-questions`（流式），带 `magnet_id`、`stage`（来自 cache 或 `apiGetMagnetStage`）。解析流式 JSON，兼容 `recom.recom` / `questions` 等格式，返回 `string[]`。 |
| **预加载** | `MorningBriefing.jsx` | 进入 briefing 后懒加载：`getRelatedQuestions(cId, '')` → `onQuestionsPreloaded(questions)` → App 的 `setStarterQuestions(questions)`。 |
| **预加载（无效）** | `IdentitySelector.jsx` | 选择身份时仅调用 `getRelatedQuestions(cId, '')`，**未把结果写回 App**，相当于只「预热」请求。 |
| **首屏展示** | `StarterQuestions.jsx` | 若 `skipFetch` 则不请求；否则若无 `preloadedQuestions` 则调 `getRelatedQuestions(cId, conversationId)`；有预加载则直接用。渲染 3 个卡片，点击 `onSelect(q)`。刷新按钮再次调用 `getRelatedQuestions`。 |
| **空状态条件** | `App.jsx` / `TpPage.jsx` | `chatHistory.length === 0` 时展示「Welcome + StarterQuestions」区域；有历史则只展示 `chatHistory`。 |
| **每条消息后推荐** | `App.jsx` `handleSearch` | 用户发消息后，除调用 chat API 外，还会 `getRelatedQuestions(cId, conversationId)` 并把结果写入**当前这条** answer 的 `relatedQuestions`，用于 AnswerCard 下方的推荐问题。 |

### 2.2 chatHistory 与 AnswerCard

- **chatHistory**：`Array<{ question: string, answer: { text, type?, relatedQuestions?, answerMethod? } }>`。
- **AnswerCard**：始终渲染「用户气泡」(question) + 「助手气泡」(answer)。用户气泡内容为 `{question}`，**没有对空 question 做特殊处理**（空字符串会显示为空气泡）。

因此，若用「插入一条只有助手内容的消息」实现 no_answer：
- 需要一条 `{ question: '', answer: { text: no_answer_txt, type: 'result' } }`。
- 当前 AnswerCard 会渲染空用户气泡 + 助手气泡；若希望 no_answer 时**只显示助手一段话、不显示用户气泡**，需在 AnswerCard 或上层对「无 question」做分支（例如不渲染用户气泡）。

### 2.3 StarterQuestions 使用点

| 使用处 | 是否请求接口 | 说明 |
|--------|--------------|------|
| **App.jsx**（主流程 chat） | 是（无预加载时） | 传 `preloadedQuestions={starterQuestions}`，来自 MorningBriefing 预加载。 |
| **TpPage.jsx** | **否**（`skipFetch={true}`） | 仅用预加载，不在此页再调推荐问题接口。 |
| **AssistantPromptChat.jsx** | 仅当 `hasInitialRecommendations === true` 且 `chatHistory.length === 0` 时展示 | 当前传 `hasInitialRecommendations={false}`，故主流程中此处不显示推荐问题区域。 |

### 2.4 环境与鉴权

- `.env` 中已有 `VITE_RELATED_QUESTIONS_API_URL` / `VITE_RELATED_QUESTIONS_API_TOKEN`，但当前实现走的是**本地代理** `/api/related-questions`，未直接读这些变量。
- 新接口示例使用 URL `http://kno.fridgechannels.com/v1/workflows/run` 和 Bearer `app-lHBkLka0SmVCSxOEruqW5xYE`，与现有 `VITE_RELATED_QUESTIONS_*` 不同，需确认：新 workflow 是否单独配置（如 `VITE_WORKFLOW_RUN_URL` / `VITE_WORKFLOW_RUN_TOKEN`），或由后端代理并隐藏 token。

---

## 三、已确认的澄清结论（实现约束）

以下 7 点已由需求方确认，实现时必须遵守：

| # | 结论 | 实现含义 |
|---|------|----------|
| 1 | **只换「首屏 + 刷新」**；「每条消息后的推荐问题」功能**不再需要** | 首屏与刷新改为新 workflow；**删除** `handleSearch` 内对 `getRelatedQuestions` 的调用，且 AnswerCard 下方「推荐问题」逻辑可一并移除或不再请求。 |
| 2 | **no_answer 时只显示助手一段话、不显示用户气泡** | 首条为仅助手消息时，AnswerCard（或上层）需对「无 question」做分支：**不渲染用户气泡**，只渲染助手气泡。 |
| 3 | **magnet_id 用 number**（magnet 表 id 字段）；**stage 暂时只传 `""`** | 请求体里 `magnet_id` 需将 cId 转为数字（如 `Number(cId)` 或后端约定）；不查 stage 缓存，固定 `stage: ""`。 |
| 4 | **需要预加载**；拿到 **no_answer** 时，**进 chat 时自动插入首条助手消息** | 预加载改为调用新 workflow（如从 MorningBriefing）；若返回 no_answer，在 App 存下 `noAnswerTxt`（及类型），进入 chat 且 `chatHistory.length === 0` 时若存在则执行 `setChatHistory([{ question: '', answer: { text: noAnswerTxt, type: 'result' } }])` 并隐藏推荐区；recom 时预加载写 `starterQuestions`。 |
| 5 | **必须走后端代理** | 前端不直接调 workflow URL/Token，只调本地代理（如 `POST /api/workflows/run`），由后端转发到 `kno.fridgechannels.com/v1/workflows/run` 并带 Bearer。 |
| 6 | **TpPage 和 AssistantPromptChat 逻辑不变，不用新 workflow** | 仅 **App.jsx 主流程 chat** 使用新 workflow（首屏 + 刷新 + 预加载）；TpPage 保持 `skipFetch={true}` 等现有行为；AssistantPromptChat 保持现有逻辑。 |
| 7 | **rec_question 最多 3 条** | 展示时最多取前 3 条（`rec_question.slice(0, 3)`），UI 仍为 3 张卡片。 |

---

## 四、实现范围与边界（探索收束）

### 4.1 需要做的

- **后端**：新增或复用代理，例如 `POST /api/workflows/run`，请求体透传 `inputs: { magnet_id: number, stage: "" }`、`response_mode: "blocking"`、`user`，转发到 `kno.fridgechannels.com/v1/workflows/run` 并带 Bearer，返回 JSON（含 `data.outputs.answer_type` / `rec_question` / `no_answer_txt`）。
- **前端 API 层**：新增调用上述代理的接口（如 `runStarterWorkflow(magnetId)`），返回 `{ answerType: 'recom' | 'no_answer', recQuestion?: Array<{ question }>, noAnswerTxt?: string }`；或改造/替换 `relatedQuestionsService` 中「仅首屏/刷新用」的那部分，**不影响** TpPage / AssistantPromptChat。
- **预加载**：MorningBriefing（及如需则 IdentitySelector）改为调新 workflow；recom 时 `onQuestionsPreloaded(rec_question.map(r => r.question))`（最多 3 条）；no_answer 时通过回调把 `noAnswerTxt` 存到 App（如 `setStarterNoAnswerTxt(noAnswerTxt)`），进入 chat 时若存在则插入首条助手消息。
- **StarterQuestions（仅 App 主流程）**：首屏无预加载时、以及刷新时，调新 workflow；按 `answer_type` 分支：recom 展示最多 3 张卡片，no_answer 调用 `onNoAnswer(noAnswerTxt)`；卡片数据格式从 `rec_question` 来（`item.question`）。
- **App.jsx**：  
  - 增加状态（如 `starterNoAnswerTxt`）接收预加载的 no_answer 文案；进入 chat 且 `chatHistory.length === 0` 且存在 `starterNoAnswerTxt` 时，自动 `setChatHistory([{ question: '', answer: { text: starterNoAnswerTxt, type: 'result' } }])` 并清空该状态，不展示推荐区。  
  - 为 StarterQuestions 提供 `onNoAnswer(noAnswerTxt)`，同样写入首条助手消息。  
  - **删除** `handleSearch` 里对 `getRelatedQuestions` 的调用；若 AnswerCard 的 `relatedQuestions` 仅由此填充，则不再请求并可考虑不再展示「每条消息后推荐」区域。
- **AnswerCard（或展示层）**：当 `question === ''`（或约定标识「仅助手消息」）时，**不渲染用户气泡**，只渲染助手气泡。

### 4.2 不需要做 / 保持不变

- TpPage：不接入新 workflow，保持现有 `skipFetch` 与预加载逻辑（若 TpPage 有预加载则保持原接口）。
- AssistantPromptChat：不接入新 workflow，逻辑不变。
- 每条消息后的推荐问题：功能取消，不再请求、不再展示（在本次实现范围内移除）。

### 4.3 边界与依赖

- **cId 类型**：URL 上的 cId 可能是字符串；传给后端的 `magnet_id` 需为 number，前端可在调用代理前 `Number(cId)` 或由后端代理做转换，需与后端约定。
- **预加载与首屏竞态**：若用户很快从 Briefing 进 Chat，预加载可能未完成；此时 StarterQuestions 仍会发一次请求（与当前「无预加载则请求」一致），拿到 recom/no_answer 再分支即可。
- **IdentitySelector**：当前未把预加载结果写回 App；若预加载统一改为新 workflow，可仅在 MorningBriefing 做预加载并写回 App（recom 写 `starterQuestions`，no_answer 写 `starterNoAnswerTxt`），IdentitySelector 可保持不写回或改为同样写回，以产品为准。

---

## 五、结论

- **探索已收束**：需求与 7 条澄清均已确认，实现范围与边界见第四节。
- **不实现**：TpPage / AssistantPromptChat 不改；「每条消息后的推荐问题」移除。
- **实现时**：按第四节「需要做的」逐项落地即可；若有后端代理约定（路径、请求体、错误码）再补到本文档或 issue。
