# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
1) 将 AnswerCard 助手头像改为与 Header 一致的首字母徽章（取 `assistant_prompt_label` 首字母，默认 `L`）。2) 有自定义背景图时：loading 不展示 bg2；自定义图预加载后再展示，失败回退 `/bg2.png`，并预加载 bg2 以备回退，避免闪烁。

## Critical Decisions
- **AnswerCard 徽章**：新增可选 prop `assistantLabel`，样式与 App.jsx Header 一致（`w-7 h-7`），缺省字母为 `L`；TpPage 不传则用 `L`。
- **背景图**：自定义 URL 在 MobileContainer 内预加载，加载成功再展示；预加载 bg2 但不展示，仅用于失败回退；main.jsx loading 不传 backdropImage，与无图一致。
- **TpPage / main error**：不调整，继续使用 `/bg2.png`。

## Tasks

- [x] 🟩 **Step 1: AnswerCard 首字母徽章**
  - [x] 🟩 在 `AnswerCard.jsx` 增加可选 prop `assistantLabel`（字符串）。
  - [x] 🟩 将 41–47 行圆形图片替换为首字母徽章：样式 `w-7 h-7 bg-sothebys-navy text-white flex items-center justify-center font-serif text-xs rounded-lg shadow-lg`，字母取 `(assistantLabel?.[0] || 'L').toUpperCase()`。
  - [x] 🟩 在 `App.jsx` 中调用 `AnswerCard` 时传入 `assistantLabel={magnetContext?.assistant_prompt_label}`。
  - [x] 🟩 在 `AssistantPromptChat.jsx` 中调用 `AnswerCard` 时传入 `assistantLabel={magnetContext?.assistant_prompt_label}`。
  - [x] 🟩 TpPage 不传 `assistantLabel`，AnswerCard 内部默认显示 `L`（已由默认逻辑覆盖，无需改 TpPage）。

- [x] 🟩 **Step 2: main.jsx loading 不展示 bg2**
  - [x] 🟩 将 main.jsx 中 loading 分支的 `<MobileContainer backdropImage="/bg2.png">` 改为不传背景图（如 `backdropImage={null}` 或不传），使与 MobileContainer 无图时一致。

- [x] 🟩 **Step 3: MobileContainer 自定义背景预加载与回退**
  - [x] 🟩 约定默认图：`backdropImage === '/bg2.png'` 或 `backdropImage?.endsWith('bg2.png')` 视为默认，其余视为自定义 URL。
  - [x] 🟩 当为自定义 URL 时：使用 `useState` 保存「当前要展示的 URL」（初始为 `null`）；用 `useEffect` + `new Image()` 预加载 `backdropImage`，同时预加载 `/bg2.png`（不渲染）；自定义图 `onLoad` 后 setState 为 `backdropImage` 并展示；自定义图 `onError` 后 setState 为 `'/bg2.png'` 并展示。
  - [x] 🟩 当为默认图时：保持现有逻辑，直接 `backgroundImage: url(${backdropImage})`，无需预加载。
  - [x] 🟩 背景层仅在「当前要展示的 URL」非空时设置 `backgroundImage`，否则为 `none`（与无图一致）。
