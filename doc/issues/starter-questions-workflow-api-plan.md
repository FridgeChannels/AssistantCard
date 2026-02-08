# Feature Implementation Plan：首次推荐问题 workflow 接口切换

**Overall Progress:** `100%`

## TLDR

将主流程 chat 的「首次推荐问题」从流式 related-questions 改为 blocking workflow 接口；按 `answer_type` 分支：`recom` 展示最多 3 张卡片，`no_answer` 不展示卡片、进 chat 时自动插入首条助手消息（仅助手气泡）。预加载改为新接口；移除「每条消息后的推荐问题」功能。TpPage、AssistantPromptChat 不改。

## Critical Decisions

- **只改 App 主流程 chat**：TpPage 保持 `skipFetch`，AssistantPromptChat 保持现状，不接新 workflow。
- **必须走后端代理**：前端只调 `POST /api/workflows/run`，由 server 转发并带 Bearer。
- **magnet_id 为 number**：请求体用 magnet 表 id（前端 `Number(cId)`）；stage 固定 `""`。
- **no_answer 仅助手气泡**：`question === ''` 时 AnswerCard 不渲染用户气泡。
- **预加载支持 no_answer**：MorningBriefing 预加载改为新 workflow；no_answer 时通过回调存文案，进 chat 时自动插入首条消息。
- **每条消息后推荐取消**：删除 handleSearch 内对 getRelatedQuestions 的调用；AnswerCard 的 relatedQuestions 不再被填充，展示逻辑保留（无数据则不展示）。

## Tasks

- [x] 🟩 **Step 1: 后端代理 workflow run**
  - [x] 🟩 在 `server/apiRoutes.js` 新增 `POST /api/workflows/run`，请求体透传 `inputs: { magnet_id, stage: "" }`、`response_mode: "blocking"`、`user`，转发到 `kno.fridgechannels.com/v1/workflows/run` 并带 Bearer，返回 JSON。
  - [x] 🟩 在 server 中增加 workflow 用到的 env（如 `WORKFLOW_RUN_URL`、`WORKFLOW_RUN_TOKEN`），并在代理中使用。

- [x] 🟩 **Step 2: 前端调用 workflow 的 API**
  - [x] 🟩 在 `src/lib/relatedQuestionsService.js` 中新增 `runStarterWorkflow(magnetId)`：请求 `POST /api/workflows/run`，body 中 `magnet_id: Number(magnetId)`、`stage: ""`、`response_mode: "blocking"`、`user: "abc-123"`。
  - [x] 🟩 解析响应 `data.outputs`，返回 `{ answerType: 'recom'|'no_answer', recQuestion?: Array<{ question }>, noAnswerTxt?: string }`；`rec_question` 最多取前 3 条。

- [x] 🟩 **Step 3: AnswerCard 仅助手消息不显示用户气泡**
  - [x] 🟩 在 `src/components/cards/AnswerCard.jsx` 中，当 `question === ''`（或无 question）时，不渲染用户气泡，只渲染助手气泡。

- [x] 🟩 **Step 4: App.jsx 状态与 no_answer 逻辑**
  - [x] 🟩 新增状态 `starterNoAnswerTxt`（如 `string | null`），用于接收预加载或首屏返回的 no_answer 文案。
  - [x] 🟩 进入 chat 且 `chatHistory.length === 0` 且 `starterNoAnswerTxt != null` 时，用 effect 执行：`setChatHistory([{ question: '', answer: { text: starterNoAnswerTxt, type: 'result' } }])`，并清空 `starterNoAnswerTxt`。
  - [x] 🟩 为 StarterQuestions 提供 `onNoAnswer(noAnswerTxt)`：写入首条助手消息 `setChatHistory([{ question: '', answer: { text: noAnswerTxt, type: 'result' } }])`。
  - [x] 🟩 删除 `handleSearch` 内对 `getRelatedQuestions` 的调用及对当前 answer 的 `relatedQuestions` 更新逻辑。

- [x] 🟩 **Step 5: MorningBriefing 预加载改为新 workflow**
  - [x] 🟩 将预加载从 `getRelatedQuestions(cId, '')` 改为 `runStarterWorkflow(cId)`。
  - [x] 🟩 收到 `answerType === 'recom'` 时：`onQuestionsPreloaded(recQuestion.map(r => r.question).slice(0, 3))`。
  - [x] 🟩 收到 `answerType === 'no_answer'` 时：调用新回调（如 `onStarterNoAnswerTxt(noAnswerTxt)`），App 中该回调执行 `setStarterNoAnswerTxt(noAnswerTxt)`；需在 App 与 MorningBriefing 间新增并传入该 prop。

- [x] 🟩 **Step 6: StarterQuestions 首屏与刷新走新 workflow**
  - [x] 🟩 仅在「会请求接口」的分支生效（即非 skipFetch、且无预加载问题时）：将请求从 `getRelatedQuestions(cId, conversationId)` 改为 `runStarterWorkflow(cId)`。
  - [x] 🟩 请求结果：`answerType === 'recom'` 时 `setQuestions(recQuestion.map(r => r.question).slice(0, 3))` 并 `onQuestionsLoaded`；`answerType === 'no_answer'` 时调用 `onNoAnswer(noAnswerTxt)` 并 `setQuestions([])`。
  - [x] 🟩 刷新按钮：同样改为调用 `runStarterWorkflow(cId)`，按相同 answer_type 分支处理。
  - [x] 🟩 为 StarterQuestions 增加可选 prop `onNoAnswer`（App 传入，TpPage/AssistantPromptChat 不传）。
