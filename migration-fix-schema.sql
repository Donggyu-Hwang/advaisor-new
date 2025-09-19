-- Migration to add missing tables and fix schema inconsistencies
-- Run this in your Supabase SQL editor AFTER the initial database-setup.sql

-- Add project_pages table if it doesn't exist
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

-- Add final_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.final_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    overall_analysis JSONB,
    markdown_report TEXT,
    report_storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for new tables
ALTER TABLE public.project_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_reports ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for project_pages
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

-- Add RLS policies for final_reports
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_pages_project_id ON public.project_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_pages_page_number ON public.project_pages(page_number);
CREATE INDEX IF NOT EXISTS idx_final_reports_project_id ON public.final_reports(project_id);

-- Update projects table to add any missing columns if needed
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS processed_pages INTEGER DEFAULT 0;

-- Verify table structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'project_pages', 'analysis_results', 'final_reports')
ORDER BY table_name, ordinal_position;
