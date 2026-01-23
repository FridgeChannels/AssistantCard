/**
 * Environment configuration module
 * Prioritizes runtime configuration (Docker) over build-time configuration (local development)
 */

export const env = {
    // Supabase configuration
    SUPABASE_URL: window.ENV?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: window.ENV?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',

    // Chat API configuration
    CHAT_API_URL: window.ENV?.VITE_CHAT_API_URL || import.meta.env.VITE_CHAT_API_URL || '',
    CHAT_API_TOKEN: window.ENV?.VITE_CHAT_API_TOKEN || import.meta.env.VITE_CHAT_API_TOKEN || '',

    // Related Questions API configuration
    RELATED_QUESTIONS_API_URL: window.ENV?.VITE_RELATED_QUESTIONS_API_URL || import.meta.env.VITE_RELATED_QUESTIONS_API_URL || '',
    RELATED_QUESTIONS_API_TOKEN: window.ENV?.VITE_RELATED_QUESTIONS_API_TOKEN || import.meta.env.VITE_RELATED_QUESTIONS_API_TOKEN || '',

    // Document Summary API configuration
    DOCUMENT_SUMMARY_API_URL: window.ENV?.VITE_DOCUMENT_SUMMARY_API_URL || import.meta.env.VITE_DOCUMENT_SUMMARY_API_URL || '',
    DOCUMENT_SUMMARY_API_TOKEN: window.ENV?.VITE_DOCUMENT_SUMMARY_API_TOKEN || import.meta.env.VITE_DOCUMENT_SUMMARY_API_TOKEN || '',
};
