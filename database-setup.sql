-- IR Analysis System Database Schema
-- Execute this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    report_url TEXT,
    progress_percentage INTEGER DEFAULT 0,
    total_pages INTEGER,
    processed_pages INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    analysis_type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create project_pages table
CREATE TABLE IF NOT EXISTS public.project_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    image_storage_path TEXT,
    image_url TEXT,
    llm_analysis_step_1_json JSONB,
    llm_analysis_step_2_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(project_id, page_number)
);

-- Create final_reports table
CREATE TABLE IF NOT EXISTS public.final_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    overall_analysis JSONB,
    markdown_report TEXT,
    report_storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects table
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for analysis_results table
CREATE POLICY "Users can view own analysis results" ON public.analysis_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = analysis_results.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own analysis results" ON public.analysis_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = analysis_results.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Create RLS policies for project_pages table
CREATE POLICY "Users can view own project pages" ON public.project_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_pages.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own project pages" ON public.project_pages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_pages.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own project pages" ON public.project_pages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_pages.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own project pages" ON public.project_pages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_pages.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Create RLS policies for final_reports table
CREATE POLICY "Users can view own final reports" ON public.final_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = final_reports.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own final reports" ON public.final_reports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = final_reports.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own final reports" ON public.final_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = final_reports.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own final reports" ON public.final_reports
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = final_reports.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_project_id ON public.analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_page_number ON public.analysis_results(page_number);
CREATE INDEX IF NOT EXISTS idx_project_pages_project_id ON public.project_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_pages_page_number ON public.project_pages(page_number);
CREATE INDEX IF NOT EXISTS idx_final_reports_project_id ON public.final_reports(project_id);

-- Create storage bucket for IR files (run this in the Supabase dashboard Storage section)
-- 1. Go to Storage in Supabase dashboard
-- 2. Create a new bucket named 'ir-files'
-- 3. Set it as private (not public)
-- 4. Add the following policy:

/*
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'ir-files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'ir-files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'ir-files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'ir-files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );
*/
