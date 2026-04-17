# Latest + industry_id 顺序播放（前端实现）

**状态**: ✅ 已完成  
**关联**: 后端 `/api/play-content/list` 在 latest 且有 industry_id 时返回列表、按 order_index 升序

---

## 实现摘要

- **目标**: latest 模式且接口返回多条时，前端按列表顺序播，与 long_text_sequential 同一套流程。
- **方案**: 用 key 后缀 `'latest'` 做 localStorage 索引（`play_content_index_${sn||cId}_latest`），不新增流程、不改后端。

---

## 进度

| 步骤 | 说明 | 状态 |
|------|------|------|
| 1 | 统一 latest 多条与顺序播流程（key `'latest'） | ✅ |
| 2 | 缓存恢复：latest + items.length>1 走顺序分支 | ✅ |
| 3 | loadPlayContent：latest + items.length>1 走顺序分支 | ✅ |
| 4 | 文档与注释 | ✅ |

**整体进度: 100%**

---

## 修改文件

- `src/components/briefing/MorningBriefing.jsx`
  - `playIndexStorageKey`: 注释标明 configId 可为 number 或 `'latest'`。
  - 缓存 effect：`rss` 或 `latest` 单条 → 单条；顺序列表 = long_text_sequential（有 config_id）或 latest 多条（key `'latest'`），共用同一套索引与 onEnded 逻辑。
  - `loadPlayContent`：同上分支，latest 多条时 `longTextKey = playIndexStorageKey(sn||cId, 'latest')`，其余与 long_text 一致。
