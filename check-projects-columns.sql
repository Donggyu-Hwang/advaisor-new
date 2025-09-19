-- Check the actual structure of the projects table
-- Run this in Supabase SQL Editor

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;
