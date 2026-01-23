-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.base_qa (
  id bigint NOT NULL DEFAULT nextval('qa_id_seq'::regclass),
  question text NOT NULL,
  answer text NOT NULL,
  source character varying,
  created_by bigint,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  audio character varying,
  role character varying,
  stage character varying,
  CONSTRAINT base_qa_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customer (
  id bigint NOT NULL DEFAULT nextval('user_id_seq'::regclass),
  nickname character varying,
  avatar_url text,
  email character varying,
  phone character varying,
  status smallint DEFAULT 1,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  expired date,
  integral numeric,
  CONSTRAINT customer_pkey PRIMARY KEY (id)
);
CREATE TABLE public.magnet (
  id bigint NOT NULL,
  magnet_config_cta_id bigint NOT NULL,
  customer_id bigint,
  magnet_config_id bigint,
  url character varying,
  role character varying,
  stage character varying,
  CONSTRAINT magnet_pkey PRIMARY KEY (id),
  CONSTRAINT fk_magnet_tag_magnet FOREIGN KEY (id) REFERENCES public.magnet_config(id)
);
CREATE TABLE public.magnet_conf_cta (
  id bigint NOT NULL DEFAULT nextval('cta_id_seq'::regclass),
  magnet_config_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  phone character varying,
  email character varying,
  name character varying,
  CONSTRAINT magnet_conf_cta_pkey PRIMARY KEY (id),
  CONSTRAINT fk_cta_magnet FOREIGN KEY (magnet_config_id) REFERENCES public.magnet_config(id)
);
CREATE TABLE public.magnet_config (
  id bigint NOT NULL DEFAULT nextval('magnet_id_seq'::regclass),
  customer_id bigint NOT NULL,
  status smallint DEFAULT 1,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  team_name character varying,
  logo_url character varying,
  front_image_url character varying,
  back_image_url character varying,
  team_image_url character varying,
  CONSTRAINT magnet_config_pkey PRIMARY KEY (id),
  CONSTRAINT fk_magnet_user FOREIGN KEY (customer_id) REFERENCES public.customer(id)
);
CREATE TABLE public.magnet_config_qa (
  id bigint NOT NULL,
  question character varying NOT NULL,
  answer text,
  source character varying,
  audio text,
  customer_id bigint,
  role character varying,
  stage character varying,
  CONSTRAINT magnet_config_qa_pkey PRIMARY KEY (id),
  CONSTRAINT magnet_config_qa_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customer(id)
);
CREATE TABLE public.no_answer_qa (
  id bigint NOT NULL DEFAULT nextval('no_answer_qa_id_seq'::regclass),
  megnet_id bigint NOT NULL,
  question text NOT NULL,
  action character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT no_answer_qa_pkey PRIMARY KEY (id),
  CONSTRAINT no_answer_qa_megnet_id_fkey FOREIGN KEY (megnet_id) REFERENCES public.magnet(id)
);
CREATE TABLE public.order (
  id bigint NOT NULL DEFAULT nextval('order_id_seq'::regclass),
  order_no character varying NOT NULL UNIQUE,
  customer_id bigint NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  amount numeric NOT NULL DEFAULT 0,
  shipping_fee numeric DEFAULT 0,
  tax_fee numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status smallint DEFAULT 0,
  payment_method character varying,
  payment_time timestamp with time zone,
  shipping_address text,
  receiver_name character varying,
  receiver_phone character varying,
  remark text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT order_pkey PRIMARY KEY (id),
  CONSTRAINT fk_order_user FOREIGN KEY (customer_id) REFERENCES public.customer(id)
);
CREATE TABLE public.order_item (
  id bigint NOT NULL DEFAULT nextval('order_item_id_seq'::regclass),
  order_id bigint NOT NULL,
  magnet_id bigint,
  item_name character varying NOT NULL,
  item_type character varying,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT order_item_pkey PRIMARY KEY (id),
  CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES public.order(id),
  CONSTRAINT fk_order_item_magnet FOREIGN KEY (magnet_id) REFERENCES public.magnet_config(id)
);
CREATE TABLE public.payment (
  id bigint NOT NULL DEFAULT nextval('payment_id_seq'::regclass),
  order_id bigint NOT NULL,
  payment_no character varying NOT NULL UNIQUE,
  transaction_no character varying,
  payment_method character varying NOT NULL,
  amount numeric NOT NULL,
  currency character varying DEFAULT 'CNY'::character varying,
  status smallint DEFAULT 0,
  channel character varying,
  payment_time timestamp with time zone,
  refund_time timestamp with time zone,
  refund_amount numeric DEFAULT 0,
  failure_reason text,
  callback_data jsonb,
  expire_time timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payment_pkey PRIMARY KEY (id),
  CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES public.order(id)
);
CREATE TABLE public.play_content_log (
  id bigint NOT NULL DEFAULT nextval('play_content_log_id_seq'::regclass),
  user_id bigint NOT NULL,
  megnet_id bigint NOT NULL,
  play_time timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration integer NOT NULL DEFAULT 0,
  megnet_config_qa_id bigint,
  start_time timestamp without time zone,
  end_time timestamp without time zone,
  CONSTRAINT play_content_log_pkey PRIMARY KEY (id),
  CONSTRAINT play_content_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id),
  CONSTRAINT play_content_log_qa_id_fkey FOREIGN KEY (megnet_id) REFERENCES public.base_qa(id),
  CONSTRAINT play_content_log_megnet_config_qa_id_fkey FOREIGN KEY (megnet_config_qa_id) REFERENCES public.magnet_config_qa(id)
);
CREATE TABLE public.play_contents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text,
  customer_id uuid,
  scheduled_date date,
  source text,
  content_text text NOT NULL,
  play_text text,
  audio_url text,
  is_playing boolean NOT NULL DEFAULT false,
  has_played boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT play_contents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.usage_request_log (
  id bigint NOT NULL DEFAULT nextval('usage_request_log_id_seq'::regclass),
  megnet_id bigint NOT NULL,
  workflow_run_id character varying,
  model_name character varying NOT NULL,
  pricing_version character varying,
  currency character NOT NULL DEFAULT 'USD'::bpchar,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  prompt_price_unit numeric,
  completion_price_unit numeric,
  prompt_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completion_price numeric,
  completion_unit_price numeric,
  prompt_unit_price numeric,
  llm_name character varying,
  dify_app_id character varying,
  CONSTRAINT usage_request_log_pkey PRIMARY KEY (id),
  CONSTRAINT usage_request_log_megnet_id_fkey FOREIGN KEY (megnet_id) REFERENCES public.magnet(id)
);
CREATE TABLE public.user (
  id bigint NOT NULL DEFAULT nextval('user_id_seq1'::regclass),
  session_id character varying UNIQUE,
  magnet_config_id bigint,
  device_info character varying,
  ip_address character varying,
  user_agent text,
  first_access_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  last_access_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  access_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_pkey PRIMARY KEY (id),
  CONSTRAINT fk_user_magnet_config FOREIGN KEY (magnet_config_id) REFERENCES public.magnet_config(id)
);
CREATE TABLE public.user_action_log (
  id bigint NOT NULL DEFAULT nextval('user_action_log_id_seq'::regclass),
  user_id bigint,
  magnet_id bigint,
  action_type character varying NOT NULL,
  magnet_config_qa_id bigint,
  ip_address character varying,
  device_info character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  dify_app_id character varying,
  CONSTRAINT user_action_log_pkey PRIMARY KEY (id),
  CONSTRAINT fk_user_action_log_user FOREIGN KEY (user_id) REFERENCES public.user(id),
  CONSTRAINT user_action_log_magnet_id_fkey FOREIGN KEY (magnet_id) REFERENCES public.magnet(id)
);
CREATE TABLE public.user_chat_log (
  id bigint NOT NULL DEFAULT nextval('user_chat_log_id_seq'::regclass),
  user_id bigint NOT NULL,
  megnet_id bigint NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_chat_log_pkey PRIMARY KEY (id),
  CONSTRAINT user_chat_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id),
  CONSTRAINT user_chat_log_megnet_id_fkey FOREIGN KEY (megnet_id) REFERENCES public.base_qa(id)
);
CREATE TABLE public.yes_answer_qa (
  id bigint NOT NULL DEFAULT nextval('no_answer_qa_id_seq'::regclass),
  megnet_id bigint NOT NULL,
  question text NOT NULL,
  question_time timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT yes_answer_qa_pkey PRIMARY KEY (id),
  CONSTRAINT yes_answer_qa_megnet_id_fkey FOREIGN KEY (megnet_id) REFERENCES public.magnet(id)
);