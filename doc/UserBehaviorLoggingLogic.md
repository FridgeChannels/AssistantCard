# 用户行为日志生成逻辑文档

## 1. 核心设计原则

- **用户识别 (User Identity)**: 
  - 由于没有强制登录体系，系统使用 **Session ID** (基于 localStorage 的 UUID) 来唯一标识同一个设备/浏览器的用户。
  - 业务维度使用 **cId** (Magnet ID) 来关联特定的客户业务场景。
  - 系统会自动关联 Session ID 和 cId，在后台维护 `user` 表记录。

- **无感记录 (Non-intrusive)**: 所有日志请求均为异步执行，不阻塞 UI 渲染和用户交互。

- **完整性 (Completeness)**: 覆盖从页面进入、交互、内容消费到离开的全流程。

---

## 2. 核心服务架构

系统通过以下三个核心服务支撑日志功能：

### 2.1 Session Manager (`src/lib/sessionManager.js`)
- **功能**: 生成和维护 `fc_session_id`。
- **逻辑**: 
  - 检查 localStorage 是否存在有效的 Session ID（有效期 30 天）。
  - 如果不存在或过期，生成新的 UUID 并存储。
  - 获取设备指纹信息（User Agent, 屏幕尺寸等）。

### 2.2 Logging Service (`src/lib/loggingService.js`)
- **功能**: 统一的日志上报接口，封装 Supabase 调用。
- **自动处理**:
  - 自动获取/创建 `user` 表记录。
  - 自动附加 Session ID、设备信息、IP 地址（尝试获取）。
- **主要方法**:
  - `logUserAction`: 通用行为日志 (点击、页面访问等)。
  - `logChatMessage`: 聊天对话日志 (包含问答内容、响应时间)。
  - `createPlayContentLog` / `updatePlayContentLog`: 音频播放生命周期管理。

### 2.3 Page Time Tracker (`src/lib/pageTimeTracker.js`)
- **功能**: 精确追踪用户在每个“页面/状态”的停留时长。
- **触发机制**:
  - 路由/状态切换时，结束上一页面追踪，开始新页面追踪。
  - 页面卸载 (unload) 或隐藏 (visibilitychange) 时，自动结算时长。

---

## 3. 日志生成规则详解

### 3.1 页面访问与停留 (`user_action_log`)

| 行为类型 (action_type) | 触发时机 | 记录数据 |
|-------------------|----------|----------|
| `page_enter` | 用户首次加载 App 且获取到 cId 时 | 进入时间, Referrer, URL |
| `view_[page_name]` | 切换到新页面 (briefing, chat, history) | 进入时间, 页面名称 |
| `leave_[page_name]` | 离开当前页面 (切换或关闭) | 离开时间, **停留时长(秒)** |
| `page_leave` | 关闭浏览器标签页或刷新 | 离开时间 |

### 3.2 音频播放 (`play_content_log`)

采用 **生命周期记录** 方式，确保数据准确性：

1. **开始播放**:
   - 触发: 用户点击 Play 按钮。
   - 操作: 创建一条新日志记录。
   - 数据: `start_time`, `play_content_id`。

   - **暂停/结束更新**:
   - 触发: 用户点击 Pause 或 音频自然播放结束 (`ended` 事件)，或**离开页面切换到其他视图**。
   - 机制: 当组件卸载时，系统会自动保存当前的播放进度 (`savedCurrentTime`) 到内存中。当用户返回该页面时，自动恢复之前的播放进度。
   - 操作: 更新上述日志记录。
   - 数据: 
     - `duration`: 实际播放时长（当前时间 - 开始时间）。
     - `total_duration`: 音频总长度。
     - `completion_rate`: 完成率 (duration / total_duration)。

### 3.3 聊天对话 (`user_chat_log` & `user_action_log`)

| 数据表 | 触发时机 | 记录数据 | 说明 |
|-------|----------|----------|------|
| `user_chat_log` | AI 回答完成时 | 问题, 回答, `conversation_id`, `response_time_ms`, `answer_method` | 核心对话数据 |
| `user_action_log` | AI 回答完成时 | `action_type: 'chat'`, `question_text`, 上下文数据 | 行为流中的节点 |
| `user_action_log` | 点击推荐问题 | `action_type: 'click_question'`, `source: 'starter_questions'` | 追踪问题来源 |

### 3.4 联系代理 (`user_action_log`)

记录用户在 "Text Me" 面板的所有操作：

| 行为类型 | 触发时机 | 上下文数据 (context) |
|---------|----------|-------------------|
| `open_contact` | 打开面板 | 当前上下文, Guide 内容摘要 |
| `close_contact` | 关闭面板 | **停留时长(秒)** |
| `click_sms` | 点击发送短信 | 目标电话, 消息预览 |
| `click_call` | 点击 Call Now | 目标电话, 来源 (contact_sheet) |
| ~~`click_email`~~ | ~~点击发送邮件~~ | (已移除该功能) |

---

## 4. 数据库存储映射

- **用户身份**: `user` 表 (关联 `magnet_id` 和 `session_id`)
- **通用行为**: `user_action_log` (所有点击、页面流转操作)
- **对话内容**: `user_chat_log` (详细的问答对)
- **播放数据**: `play_content_log` (专注的音频消费数据)
