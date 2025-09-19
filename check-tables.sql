-- Check what tables exist in the database
-- Run this in Supabase SQL Editor first

-- List all tables in the public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- If the above doesn't work, try this alternative:
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public';
