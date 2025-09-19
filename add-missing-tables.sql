-- Add missing tables for IR Analysis System
-- Execute this in your Supabase SQL editor

-- Create project_pages table (if it doesn't exist)
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

-- Create final_reports table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.final_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    overall_analysis JSONB,
    markdown_report TEXT,
    report_storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) for new tables
ALTER TABLE public.project_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own project pages" ON public.project_pages;
DROP POLICY IF EXISTS "Users can insert own project pages" ON public.project_pages;
DROP POLICY IF EXISTS "Users can update own project pages" ON public.project_pages;
DROP POLICY IF EXISTS "Users can delete own project pages" ON public.project_pages;

DROP POLICY IF EXISTS "Users can view own final reports" ON public.final_reports;
DROP POLICY IF EXISTS "Users can insert own final reports" ON public.final_reports;
DROP POLICY IF EXISTS "Users can update own final reports" ON public.final_reports;
DROP POLICY IF EXISTS "Users can delete own final reports" ON public.final_reports;

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
CREATE INDEX IF NOT EXISTS idx_project_pages_project_id ON public.project_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_pages_page_number ON public.project_pages(page_number);
CREATE INDEX IF NOT EXISTS idx_final_reports_project_id ON public.final_reports(project_id);

-- Verify tables were created
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('project_pages', 'final_reports', 'projects', 'analysis_results')
ORDER BY tablename;
