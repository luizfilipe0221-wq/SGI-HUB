import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ubpixyvvpbwgdmyulwoz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicGl4eXZ2cGJ3Z2RteXVsd296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDcxMDEsImV4cCI6MjA4NzcyMzEwMX0.OTj9QRphK0xU41fl0Lr5KyFJK7cXnudM8ZLzu6ugvRk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
