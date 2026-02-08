# 首次推荐问题接口切换：workflows/run + answer_type 分支

**类型**: feature  
**优先级**: normal  
**工作量**: medium

---

## TL;DR

把「首次推荐问题」从当前「流式 Dify + 本地代理 /api/related-questions」改为调用 `kno.fridgechannels.com/v1/workflows/run`（blocking）。根据返回的 `data.outputs.answer_type` 分支：`recom` 时继续用当前三张卡片展示推荐问题；`no_answer` 时不展示卡片，改为以对话形式先展示 `data.outputs.no_answer_txt` 作为首条助手消息。

---

## 当前行为

- **数据来源**：`relatedQuestionsService.getRelatedQuestions(cId, conversationId)` → 请求本地 `/api/related-questions`（后端再代理 Dify），**流式**返回，解析 `recom.recom` 等格式得到 `string[]`。
- **展示**：`StarterQuestions.jsx` 在 `chatHistory.length === 0` 时展示 3 个推荐问题卡片；用户点击后 `onSelect(question)` 发起对话。
- **无分支**：没有「推荐问题」vs「不推荐、先发一段话」的区分。

---

## 期望行为

- **接口**：改为调用新 workflow（blocking）：
  - **URL**: `POST http://kno.fridgechannels.com/v1/workflows/run`
  - **Headers**: `Authorization: Bearer app-lHBkLka0SmVCSxOEruqW5xYE`，`Content-Type: application/json`
  - **Body**:
    ```json
    {
      "inputs": { "magnet_id": <cId>, "stage": "" },
      "response_mode": "blocking",
      "user": "abc-123"
    }
    ```
  - **响应**（示例）:
    - `data.outputs.answer_type`: `"recom"` | `"no_answer"`
    - `data.outputs.rec_question`: `[{ "question": "..." }, ...]`（仅 answer_type 为 recom 时使用）
    - `data.outputs.no_answer_txt`: 字符串（仅 answer_type 为 no_answer 时使用）

- **分支逻辑**：
  - **`answer_type === "recom"`**：用当前的 3 张卡片展示 `rec_question` 中的问题（保持现有交互与 `onSelect`）。
  - **`answer_type === "no_answer"`**：不展示推荐问题卡片；以对话形式展示，即把 `no_answer_txt` 作为首条助手消息插入聊天（用户看到的是先有一段助手话，再正常对话）。

---

## 涉及文件（最多 3 个）

1. **`src/lib/relatedQuestionsService.js`**  
   - 改为调用新 workflow（blocking），或拆出/新增 `runStarterWorkflow(cId)`，返回 `{ answerType, recQuestion?, noAnswerTxt? }`。  
   - 注意：若 token 不能放前端，需保留或新增后端代理，前端只调本地 API。

2. **`src/components/chat/StarterQuestions.jsx`**  
   - 使用新接口的返回结构；`answer_type === "recom"` 时用 `rec_question` 渲染卡片；`answer_type === "no_answer"` 时调用父组件回调（如 `onNoAnswer(noAnswerTxt)`），不渲染卡片。

3. **`src/App.jsx`（及同逻辑的 `TpPage.jsx`、`AssistantPromptChat.jsx` 等）**  
   - 为 StarterQuestions 提供 `onNoAnswer(noAnswerTxt)`：将 `no_answer_txt` 作为首条助手消息写入 `chatHistory`（例如 `setChatHistory([{ question: '', answer: { text: noAnswerTxt } }])`），这样空状态消失，直接进入对话形式展示。

---

## 风险与备注

- **鉴权**：Bearer token 若不能暴露在前端，需用现有或新的后端代理（如 `/api/workflows/run`）转发，前端只调本地 API。
- **magnet_id 类型**：当前示例为数字 `1`，若 cId 为字符串，需统一为接口要求的类型（数字或字符串）。
- **stage**：新接口示例中 `stage` 为空字符串；若后续要带 stage，可从现有 `apiGetMagnetStage`/缓存取 stage 再传入。
- **刷新**：StarterQuestions 的「刷新」按钮应改为调用同一 workflow，并按相同 `answer_type` 分支处理。

---

## 验收

- [ ] 新 workflow 接口被正确调用（blocking），请求体/鉴权符合要求。
- [ ] `answer_type === "recom"` 时，三张卡片展示 `rec_question`，点击仍触发 `onSelect` 并进入对话。
- [ ] `answer_type === "no_answer"` 时，不展示卡片，首条消息为助手说的 `no_answer_txt`，之后可正常对话。
- [ ] 刷新推荐问题时，仍走同一接口与分支逻辑。
