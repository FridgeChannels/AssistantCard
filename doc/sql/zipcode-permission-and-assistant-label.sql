-- Zipcode 权限 + Assistant Prompt 文案配置
-- 执行顺序：先 1、2，再 3（或由 DBA 在 magnet_config 加列后跳过 3 若已存在）

-- 1) 新增 solution_method：code = 'play_content_zipcode'，挂在 play_content 模块下已有的 play_content_fc 功能上
--    使 by-sn 返回 METHOD_PLAY_CONTENT_ZIPCODE（前端表现为 METHOD_METHOD_PLAY_CONTENT_ZIPCODE）
INSERT INTO solution_method (function_id, code, name, sort_order)
SELECT sf.id, 'METHOD_PLAY_CONTENT_ZIPCODE', 'Play Content Zipcode', 0
FROM solution_function sf
JOIN solution_module sm ON sm.id = sf.module_id AND sm.code = 'MOD_PLAY_CONTENT'
WHERE sf.code = 'FUNC_PLAY_CONTENT_FC'
LIMIT 1
RETURNING id, function_id;


-- 3) magnet_config 表新增 assistant_prompt_label：Assistant Prompt 按钮及 Header 展示名称，空则前端默认 "Bruce Lee"
ALTER TABLE magnet_config
  ADD COLUMN IF NOT EXISTS assistant_prompt_label character varying;

-- 4) magnet_config 表新增 background_image_url：整页背景图 URL，空则前端默认 "/bg2.png"（仅主流程 /p/:sn 使用，TpPage 不配置）
ALTER TABLE magnet_config
  ADD COLUMN IF NOT EXISTS background_image_url character varying;
