# 🚨 Database Setup Required

## Issue

The database tables haven't been created yet, which is causing the "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" error.

## Solution

### Step 1: Get Your Supabase Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon public key)

### Step 2: Update Environment Variables

Update your `.env` file with the correct service role key:

```env
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### Step 3: Create Database Tables

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `database-setup.sql`
4. Click **Run**

### Step 4: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Create a new bucket named `ir-files`
3. Set it as **Private** (not public)

### Step 5: Restart the Application

```bash
# Kill current processes
pkill -f "npm run dev"

# Start fresh
npm run dev
```

## Alternative: Manual Table Creation

If you prefer to create tables manually, run this SQL in your Supabase SQL Editor:

```sql
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

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
```

## Testing

After completing these steps, the application should work properly:

1. ✅ Server: http://localhost:3001/api/health
2. ✅ Client: http://localhost:5174/
3. ✅ Database: Tables created with proper RLS policies
4. ✅ Storage: Bucket ready for file uploads
