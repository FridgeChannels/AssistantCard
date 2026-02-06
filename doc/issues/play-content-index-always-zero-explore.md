# 探索：Long Text 播放索引一直为 0、不累加

## 结论摘要

**最可能原因**：索引只在 **`audio.ended`（当前这条音频自然播完）** 时才会 +1 并写入 localStorage。若用户**在播完前就离开页面**（切页、刷新、关标签），`ended` 不会触发，索引从未被写成 1，再次进入时读到的就一直是 0。

其他可能（key 不一致、config_id 等）在现有实现下已尽量排除，见下。

---

## 1. 索引何时被写入

- **写入 0**：在 fetch 路径里，算出当前 `idx`（首次为空则 0）后立刻 `localStorage.setItem(longTextKey, String(idx))`。
- **写入 1、2、…**：只在 **当前这条音频的 `ended` 事件** 里执行：
  - 读 `idx = parseInt(localStorage.getItem(longTextKey), 10)`
  - `next = (idx + 1) % N`
  - `localStorage.setItem(longTextKey, String(next))`

因此：**只要 `ended` 没触发，就不会有 1、2、3…，再次进入读到的就还是 0。**

---

## 2. 为何 `ended` 可能从未触发

- 用户点播放后，在**播完前**就：
  - 切到其他 tab / 其他页面（如 musicChat、history），或  
  - 刷新、关闭标签  
→ 组件卸载时会 `audio.pause()`，**不会触发 `ended`**。
- 若用户从未「让当前这条完整播完」，则 `ended` 一次都没跑过，索引永远停在 0。

---

## 3. Key 一致性（为何一般不是 key 写错/读错）

- Key 生成：`playIndexStorageKey(sn || cId, configId)` → `play_content_index_${id}_${configId}`。
- **首次进入（fetch 路径）**：用当时的 `sn || cId` 和接口返回的 `configId` 生成 key，写 0，播完后在 `ended` 里写 1。
- **再次进入**有两种：
  - **有缓存**（应用内切回 briefing）：走 cache 路径，用 `sn || cId` 和 `cachedPlayContent.config_id` 生成 key，应与首次一致（同一路由、同一 App，sn/cId 不变）。
  - **无缓存**（例如整页刷新）：走 fetch 路径，用 `sn || cId` 和接口返回的 `config_id` 生成 key；刷新后 App 在 loading 结束后才渲染，此时 `sn`（来自 useParams）和 `cId`（来自 magnet 解析）都已就绪，`(sn || cId)` 仍以 sn 为主，key 与首次一致。
- 因此，在「同一链接、同一环境」下，读写用的是同一 key；若 `ended` 从未执行，读到的就一直是当初写的 0。

---

## 4. 其他已排除点

- **config_id 类型**：key 用字符串拼接，number/string 都会变成同一串，不影响。
- **ref 不触发重渲染**：`onPlayContentLoaded` 只写 `playContentCacheRef.current`，不 setState，首次访问期间 `cachedPlayContent` 一直为 null，只走 fetch 路径，逻辑正确。
- **cId 重置**：仅在 `userRole` 或 `cId` 变化时清空 `playContentCacheRef`；同一会话内再次进入同一 briefing 不会清空，cache 路径能拿到同一份 list 和 config_id。

---

## 5. 需要你确认的一点

你测试「再次访问」时，是哪种情况？

- **A**：让**当前这条音频完整播完**后再离开、再进入 → 若仍一直是 0，再一起查 key/环境。
- **B**：**没播完**就切走或刷新 → 按当前逻辑本来就不会 +1，属于产品策略问题，需要决定「何时推进索引」。

若希望「只要用户来过并点过播放，下次就播下一条」，就需要改策略，例如：

- **方案 1**：在用户**点击播放**时就把「当前索引 +1」写入（即：本条算已消费，下次播下一条）；或  
- **方案 2**：在**离开页面/卸载时**若「已开始播放过本条」则推进索引并写入。

需要你确认：是否只在 `ended` 时推进，还是改为「播放时/离开时」也推进；确认后再改实现。

---

## 6. 若确认为「ended 从未触发」的改法建议

- 若采用**播放时推进**：在 `handlePlay` 里，当 `playback_rule === 'long_text_sequential'` 且用户从「未播」变为「播」时，将当前 `idx` 加一后写入 localStorage（并注意不要重复 +1，例如用 ref 标记本条是否已计过）。
- 若采用**离开时推进**：在卸载/`onSavePlaybackState` 或 `beforeunload` 中，若当前是 long_text 且「本条已开始播放过」，则执行一次 `(idx+1)%N` 写入。

以上为「索引一直为 0」的探索结论与可选改法。
