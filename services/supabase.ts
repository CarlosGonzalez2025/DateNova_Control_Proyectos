
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eatduqlyepftkjgpjjgw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdGR1cWx5ZXBmdGtqZ3Bqamd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODcwNDEsImV4cCI6MjA3OTg2MzA0MX0.L3DocnlVp81Jy9DeDp8BhdWBgXvY4S3qEReQFfLLW4g';

// Provide fallback to prevent crash on init if variables are somehow empty strings in a specific environment
const validUrl = supabaseUrl || 'https://placeholder.supabase.co';
const validKey = supabaseKey || 'placeholder';

export const supabase = createClient(validUrl, validKey);

export const checkSupabaseConfig = () => {
  return !!supabaseUrl && !!supabaseKey;
};

// Helper to update credentials dynamically (kept for compatibility)
export const updateSupabaseClient = (url: string, key: string) => {
  if (!url || !key) return;
  const newClient = createClient(url, key);
  
  // @ts-ignore
  supabase.auth = newClient.auth;
  // @ts-ignore
  Object.assign(supabase, newClient);
};
