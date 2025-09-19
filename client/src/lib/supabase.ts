import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
          status: string;
          created_at: string;
          updated_at: string;
          pdf_storage_path: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_name: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          pdf_storage_path?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_name?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          pdf_storage_path?: string | null;
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
