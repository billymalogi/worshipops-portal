import { createClient } from '@supabase/supabase-js'

// REPLACE THE TEXT INSIDE THE QUOTES WITH YOUR REAL KEYS
const supabaseUrl = 'https://whlmswwvbyysolaxihez.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobG1zd3d2Ynl5c29sYXhpaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTMwNzcsImV4cCI6MjA4MTUyOTA3N30.cOl0v_qwTcDytpg5fjXX__njOz8hOZkaX0ICqnBXfcw'

export const supabase = createClient(supabaseUrl, supabaseKey)