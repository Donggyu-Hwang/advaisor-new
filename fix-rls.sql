-- Fix RLS policies for service role and authenticated users
-- Run this in Supabase SQL Editor

-- First, drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Create more permissive policies that work with service role
CREATE POLICY "Enable insert for authenticated users only" ON public.projects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable select for users based on user_id" ON public.projects
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Enable update for users based on user_id" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Enable delete for users based on user_id" ON public.projects
    FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Same for analysis_results table
DROP POLICY IF EXISTS "Users can view own analysis_results" ON public.analysis_results;
DROP POLICY IF EXISTS "Users can insert own analysis_results" ON public.analysis_results;
DROP POLICY IF EXISTS "Users can update own analysis_results" ON public.analysis_results;
DROP POLICY IF EXISTS "Users can delete own analysis_results" ON public.analysis_results;

CREATE POLICY "Enable insert for authenticated users" ON public.analysis_results
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable select for users" ON public.analysis_results
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable update for users" ON public.analysis_results
    FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable delete for users" ON public.analysis_results
    FOR DELETE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
