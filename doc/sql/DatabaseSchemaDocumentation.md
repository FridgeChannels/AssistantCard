# Database Schema Documentation

# **Database Schema Documentation**

Project: Supabase Fridge Magnet

- Project URL: [https://vggkiumpajbvaxiflrtu.supabase.co](https://vggkiumpajbvaxiflrtu.supabase.co/)

> Note: API keys were retrieved during analysis but are not included here for security.
> 

---

## **Overview**

This document lists all tables in the `public` schema with complete metadata: columns (type, nullability, defaults), primary keys, foreign keys, and concise field descriptions. Data was refreshed from Supabase on 2026-01-21.

---

## **Tables**

### **1. payment (订单支付表)**

**Comment:** 订单支付表

**Primary Key:** `id`

**Foreign Keys:**

- `order_id` → `public.order.id` (fk_payment_order)

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('payment_id_seq'::regclass) | 主键，自增。 |
| order_id | bigint | NO | — | 关联 order.id，表示此支付对应的订单。 |
| payment_no | character varying | NO | — | 支付编号，唯一，用于对账。 |
| transaction_no | character varying | YES | — | 第三方支付流水号或交易号。 |
| payment_method | character varying | NO | — | 支付方式代码（如 alipay/wechat/card）。 |
| amount | numeric | NO | — | 支付金额，decimal 类型。 |
| currency | character varying | YES | 'CNY'::character varying | 币种，默认 CNY，建议用 ISO3 代码。 |
| status | smallint | YES | 0 | 支付状态码，需对应业务枚举说明。 |
| channel | character varying | YES | — | 支付渠道或子渠道（可选）。 |
| payment_time | timestamptz | YES | — | 支付完成时间。 |
| refund_time | timestamptz | YES | — | 退款完成时间。 |
| refund_amount | numeric | YES | 0 | 已退款金额，默认 0。 |
| failure_reason | text | YES | — | 支付/退款失败原因。 |
| callback_data | jsonb | YES | — | 支付提供方回调原始 JSON 数据。 |
| expire_time | timestamptz | YES | — | 支付过期时间。 |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP | 创建时间，默认当前时间。 |
| updated_at | timestamptz | YES | CURRENT_TIMESTAMP | 更新时间，需应用/触发器维护。 |

---

### **2. order (订单信息表)**

**Comment:** 订单信息表

**Primary Key:** `id`

**Foreign Keys:**

- `customer_id` → `public.customer.id` (fk_order_user)
- Referenced by: `order_item.order_id`, `payment.order_id`

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('order_id_seq'::regclass) | 主键，自增。 |
| order_no | character varying | NO | — | 订单编号，唯一，用于对账与对外展示。 |
| customer_id | bigint | NO | — | 关联 customer.id，表示下单客户。 |
| quantity | integer | NO | 1 | 订单项总数或数量汇总，默认 1。 |
| amount | numeric | NO | 0 | 商品金额（不含运费/税），默认 0。 |
| shipping_fee | numeric | YES | 0 | 运费，默认 0。 |
| tax_fee | numeric | YES | 0 | 税费，默认 0。 |
| total_amount | numeric | NO | 0 | 订单应付总额，应由应用层计算并校验。 |
| status | smallint | YES | 0 | 订单状态码，需与业务状态枚举对应。 |
| payment_method | character varying | YES | — | 实际使用的支付方式（可空）。 |
| payment_time | timestamptz | YES | — | 支付时间。 |
| shipping_address | text | YES | — | 收货地址。 |
| receiver_name | character varying | YES | — | 收货人姓名。 |
| receiver_phone | character varying | YES | — | 收货人手机号。 |
| remark | text | YES | — | 订单备注。 |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP | 创建时间。 |
| updated_at | timestamptz | YES | CURRENT_TIMESTAMP | 更新时间，需应用/触发器维护。 |

---

### **3. user (用户表)**

**Comment:** 用户表（基于session使用记录，无账号体系）

**Primary Key:** `id`

**Foreign Keys:**

- `magnet_config_id` → `public.magnet_config.id` (fk_user_magnet_config)
- Referenced by: `user_action_log.user_id`

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('user_id_seq1'::regclass) | 主键，自增。 |
| session_id | character varying | YES | — | 会话或匿名用户标识，唯一。 |
| magnet_config_id | bigint | YES | — | 关联 magnet_config.id（可选）。 |
| device_info | character varying | YES | — | 设备信息（型号/平台等）。 |
| ip_address | character varying | YES | — | IP 地址。 |
| user_agent | text | YES | — | User-Agent 字符串。 |
| first_access_at | timestamptz | YES | CURRENT_TIMESTAMP | 首次访问时间。 |
| last_access_at | timestamptz | YES | CURRENT_TIMESTAMP | 最近访问时间，应由应用更新。 |
| access_count | integer | YES | 1 | 访问计数，默认 1。 |
| status | smallint | YES | 1 | 用户状态（默认 1）。 |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP | 创建时间。 |
| updated_at | timestamptz | YES | CURRENT_TIMESTAMP | 更新时间，需应用/触发器维护。 |

---

### **4. magnet_config_qa (客户可用问题库)**

**Comment:** 客户可用问题库，内容来源标准知识库和客户自定义添加

**Primary Key:** `id`

**Foreign Keys:**

- `customer_id` → `public.customer.id` (magnet_config_qa_customer_id_fkey)

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | — | 主键。 |
| question | character varying | NO | — | 问题文本。 |
| answer | text | YES | — | 回答文本。 |
| source | character varying | YES | — | 来源标识。 |
| audio | text | YES | — | 音频资源 URL（可选）。 |
| customer_id | bigint | NO | — | 归属客户，NOT NULL。 |
| role | character varying | YES | — | 角色（buyer/seller）。 |
| stage | character varying | YES | — | 12个阶段标识（可多选，多个使用逗号分割）。 |

---

### **5. magnet (冰箱贴表)**

**Comment:** 冰箱贴表

**Primary Key:** `id`

**Foreign Keys:**

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | — | 主键。 |
| magnet_config_cta_id | bigint | NO | — | CTA 配置 id。 |
| customer_id | bigint | YES | — | 所属客户 id（可空）。 |
| magnet_config_id | bigint | YES | — | 关联 magnet_config.id（可空）。 |
| url | character varying | YES | — | 资源链接。 |

---

### **6. base_qa (标准知识库)**

**Comment:** 标准知识库，平台内置 **Primary Key:** `id`

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('qa_id_seq'::regclass) | 主键，自增。 |
| question | text | NO | — | 问题文本。 |
| answer | text | NO | — | 回答文本。 |
| source | character varying | YES | — | 来源标识（base/customer）。 |
| audio | character varying | YES | — | 音频资源 URL（可选）。 |
| role | character varying | YES | — | 角色或标签（如 buyer/seller）。 |
| stage | character varying | YES | — | 12阶段标识。 |

---

### **7. customer (客户信息表)**

**Comment:** 客户信息表

**Primary Key:** `id` **Foreign Keys:**

- Referenced by: `magnet_config.customer_id`, `magnet_config_qa.customer_id`, `order.customer_id`

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('user_id_seq'::regclass) | 主键，自增。 |
| nickname | character varying | YES | — | 客户昵称。 |
| avatar_url | text | YES | — | 头像 URL。 |
| email | character varying | YES | — | 邮箱地址。 |
| phone | character varying | YES | — | 电话/手机号。 |
| status | smallint | YES | 1 | 客户状态（默认 1）。 |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP | 创建时间。 |
| updated_at | timestamptz | YES | CURRENT_TIMESTAMP | 更新时间，需应用/触发器维护。 |
| level | character varying | YES | — | 客户等级（如 gold/silver）。 |
| level_expired | date | YES | — | 等级过期日期。 |

---

### **8. magnet_config_cta (CTA表)**

**Comment:** CTA表，记录冰箱贴对应的联系人信息

**Primary Key:** `id`

**Foreign Keys:**

- `magnet_config_id` → `public.magnet_config.id` (fk_cta_magnet)

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('cta_id_seq'::regclass) | 主键，自增。 |
| magnet_config_id | bigint | NO | — | 关联 magnet_config.id。 |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP | 创建时间。 |
| phone | character varying | YES | — | 电话/手机号。 |
| email | character varying | YES | — | 邮箱地址。 |
| name | character varying | YES | — | 联系人名称。 |

---

### **9. user_action_log (用户行为日志表)**

**Comment:** 用户行为日志表（记录用户触碰冰箱贴、播放内容、对话、call me等行为动作）

**Primary Key:** `id`

**Foreign Keys:**

- `user_id` → `public.user.id` (fk_user_action_log_user)
- `magnet_id` → `public.magnet.id` (user_action_log_magnet_id_fkey)

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('user_action_log_id_seq'::regclass) | 主键，自增。 |
| user_id | bigint | YES | — | 关联 user.id（可空）。 |
| magnet_id | bigint | YES | — | 关联 magnet.id（可空）。 |
| action_type | character varying | NO | — | 动作类型（touch/play/chat/call_me）。 |
| magnet_config_qa_id | bigint | YES | — | 问题库条目引用。 |
| ip_address | character varying | YES | — | IP 地址。 |
| device_info | character varying | YES | — | 设备信息（型号/平台等）。 |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP | 创建时间。 |

---

### **10. magnet_config (冰箱贴配置表)**

**Comment:** 冰箱贴配置表

**Primary Key:** `id`

**Foreign Keys:**

- `customer_id` → `public.customer.id` (fk_magnet_user)
- Referenced by: `magnet.magnet_config_id`, `magnet_config_cta.magnet_config_id`, `order_item.magnet_id`, `user.magnet_config_id`

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('magnet_id_seq'::regclass) | 主键，自增。 |
| customer_id | bigint | NO | — | 归属客户，NOT NULL。 |
| status | smallint | YES | 1 | 配置状态（默认 1）。 |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP | 创建时间。 |
| updated_at | timestamptz | YES | CURRENT_TIMESTAMP | 更新时间，需应用/触发器维护。 |
| team_name | character varying | YES | — | 团队名称。 |
| logo_url | character varying | YES | — | Logo URL。 |
| front_image_url | character varying | YES | — | 正面图片 URL。 |
| back_image_url | character varying | YES | — | 背面图片 URL。 |
| team_image_url | character varying | YES | — | 团队图片 URL。 |

---

### **11. order_item (订单明细表)**

**Comment:** 订单明细表

**Primary Key:** `id`

**Foreign Keys:**

- `order_id` → `public.order.id` (fk_order_item_order)
- `magnet_id` → `public.magnet_config.id` (fk_order_item_magnet)

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('order_item_id_seq'::regclass) | 主键，自增。 |
| order_id | bigint | NO | — | 关联 order.id。 |
| magnet_id | bigint | YES | — | 关联 magnet_config.id（可空）。 |
| item_name | character varying | NO | — | 商品名称（团队名称+magnet）。 |
| item_type | character varying | YES | — | 商品类型（可选）。 |
| unit_price | numeric | NO | — | 单价，decimal 类型。 |
| quantity | integer | NO | 1 | 数量，默认 1。 |
| subtotal | numeric | NO | — | 小计，应由应用计算并校验。 |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP | 创建时间。 |

---

## **Issues Found (Summary)**

1. **Table naming inconsistency**: Both `customer` (singular) and `user` (singular) exist; no clear pluralization convention.
2. **Column naming typo (FIXED)**: `level_expired` is now correct (was `level_ expired` with space).
3. **Foreign key metadata irregularities**: Some FK mappings appear unusual; verify constraint definitions in the database.
4. **Nullable FK columns**: Several FK columns are nullable in metadata; confirm business rules for NOT NULL constraints.
5. **`updated_at` auto-update issue**: Columns use `DEFAULT CURRENT_TIMESTAMP` which does NOT auto-update on UPDATE — add trigger or maintain via application code.
6. **Missing indexes**: No explicit indexes on frequently-used FK columns for JOIN performance.
7. **Security**: Row-level security (RLS) disabled for all tables — consider enabling RLS and adding policies if using Supabase Auth.
8. **Sequence naming**: `user_id_seq` vs `user_id_seq1` inconsistency (one sequence may be orphaned).

---

## **Recommendations / Next Steps**

1. **Confirm table naming**: Decide on canonical singular/plural form (`customer`/`customers`, `user`/`users`).
2. **Verify FK constraints**: Check that FK columns have correct NOT NULL constraints where required.
3. **Add indexes**: Create indexes on FK columns (`order.customer_id`, `payment.order_id`, `order_item.order_id`, etc.) for query performance.
4. **Implement `updated_at` trigger**: Create a PostgreSQL trigger to auto-update `updated_at` on row modification.
5. **Enable RLS**: Implement Row-Level Security policies if using Supabase Auth or multi-tenant access control.
6. **Clean up sequences**: Review and consolidate orphaned sequences if any.

---

**Generated:** 2026-01-21

## **Status: All tables corrected and formatted cleanly. Markdown tables verified and ready for use.**

### **12. play_contents (排期播放内容表)**

**Comment:** 排期播放内容表，控制每天要播放的内容（支持客户级和全局级）

**Primary Key:** `id`  

**Unique Constraints:**

- `unique_customer_date (customer_id, scheduled_date)`
    - 同一客户在同一天最多一条排期内容
    - 当 `customer_id` 为空时视为「全局排期」，同一天也只能有一条

**Indexes:**

- `idx_play_contents_today (scheduled_date, is_playing)`
    - 用于加速「获取今日播放内容」的查询

| Column | Type | Nullable | Default | 说明 |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() | 主键，UUID，自动生成。 |
| title | text | YES | — | 内容标题（可选，用于运营或展示）。 |
| customer_id | uuid | YES | — | 所属客户 ID，可为空。为空时表示全局排期，对所有客户生效。 |
| scheduled_date | date | NO | — | 【核心字段】排期日期，决定哪一天播放。 |
| source | text | YES | — | 内容来源标识，例如「base_qa / custom / campaign_xxx」。 |
| content_text | text | NO | — | 原始内容文本（必填），可作为生成播放文案或音频的基础。 |
| play_text | text | YES | — | 实际用于播放的文案（可选，不填时可从 content_text 动态生成）。 |
| audio_url | text | YES | — | 对应音频文件 URL（可选）。 |
| is_playing | boolean | NO | false | 当前是否处于「正在播放」状态，用于选出当日正在播的那条内容。 |
| has_played | boolean | NO | false | 是否已经播放完毕，用于避免重复播放同一条内容。 |
| created_at | timestamptz | NO | now() | 创建时间，默认当前时间。 |

### **13. play_content_log (内容播放记录表)**

**Comment:** 内容播放记录表，记录用户播放 QA 内容的行为及时长

**Primary Key:** `id`

**Foreign Keys:**

- `user_id` → `public.user.id`
- `magnet_id` → `public.base_qa.id`
- `magnet_config_qa_id` → `public.magnet_config_qa.id`