import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          deadline: string;
          routine_time: string;
          constraints: Record<string, unknown>;
          tech_tree: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          deadline: string;
          routine_time: string;
          constraints: Record<string, unknown>;
          tech_tree: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          deadline?: string;
          routine_time?: string;
          constraints?: Record<string, unknown>;
          tech_tree?: Record<string, unknown>;
          created_at?: string;
        };
      };
      quests: {
        Row: {
          id: string;
          goal_id: string;
          title: string;
          description: string;
          status: string;
          scheduled_date: string;
          completed_at: string | null;
          failure_reason: string | null;
          alternative_quest_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          title: string;
          description: string;
          status?: string;
          scheduled_date: string;
          completed_at?: string | null;
          failure_reason?: string | null;
          alternative_quest_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          title?: string;
          description?: string;
          status?: string;
          scheduled_date?: string;
          completed_at?: string | null;
          failure_reason?: string | null;
          alternative_quest_id?: string | null;
          created_at?: string;
        };
      };
      context_logs: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          content: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          content: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          content?: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
  };
};
