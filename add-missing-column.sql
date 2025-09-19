-- Add the missing pdf_storage_path column to projects table
-- Run this in Supabase SQL Editor

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;
