// lib/supabase.ts - Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database types
export interface EmailRecord {
  id: string
  email_subject: string
  email_body: string
  email_sender: string
  email_received_at: string
  status: 'received' | 'parsing' | 'parsed' | 'creating_trello_cards' | 'completed' | 'failed'
  processing_started_at?: string
  processing_completed_at?: string
  meeting_summary?: string
  action_items?: ActionItem[]
  meeting_participants?: string[]
  meeting_date?: string
  trello_summary_card_id?: string
  trello_action_item_card_ids?: string[]
  error_message?: string
  retry_count: number
  last_retry_at?: string
  created_at: string
  updated_at: string
}

export interface ActionItem {
  id: string
  task: string
  assignee: string
  due_date?: string
  priority: 'low' | 'medium' | 'high'
  completed: boolean
}

export interface ParsedMeetingData {
  summary: string
  action_items: ActionItem[]
  participants: string[]
  meeting_date?: string
}