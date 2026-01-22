import { createClient } from '@supabase/supabase-js'

// 从环境变量中获取 Supabase 配置
// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 验证环境变量是否已设置
// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

// 创建 Supabase 客户端实例
// Create Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
