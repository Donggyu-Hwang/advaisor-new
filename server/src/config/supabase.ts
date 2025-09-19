import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables:");
  console.error("SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✓" : "✗");
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          project_name: string;
          company_name: string;
          status: string;
          file_url: string | null;
          report_url: string | null;
          progress_percentage: number;
          total_pages: number | null;
          processed_pages: number;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_name: string;
          company_name?: string;
          status?: string;
          file_url?: string | null;
          report_url?: string | null;
          progress_percentage?: number;
          total_pages?: number | null;
          processed_pages?: number;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_name?: string;
          company_name?: string;
          status?: string;
          file_url?: string | null;
          report_url?: string | null;
          progress_percentage?: number;
          total_pages?: number | null;
          processed_pages?: number;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      project_pages: {
        Row: {
          id: string;
          project_id: string;
          page_number: number;
          image_storage_path: string | null;
          llm_analysis_step_1_json: Json | null;
          llm_analysis_step_2_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          page_number: number;
          image_storage_path?: string | null;
          llm_analysis_step_1_json?: Json | null;
          llm_analysis_step_2_json?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          page_number?: number;
          image_storage_path?: string | null;
          llm_analysis_step_1_json?: Json | null;
          llm_analysis_step_2_json?: Json | null;
          created_at?: string;
        };
      };
      final_reports: {
        Row: {
          id: string;
          project_id: string;
          md_storage_path: string | null;
          pdf_storage_path: string | null;
          final_llm_analysis_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          md_storage_path?: string | null;
          pdf_storage_path?: string | null;
          final_llm_analysis_json?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          md_storage_path?: string | null;
          pdf_storage_path?: string | null;
          final_llm_analysis_json?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}
