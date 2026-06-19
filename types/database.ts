/**
 * Hand-written database types mirroring `supabase/schema.sql`.
 *
 * Kept in sync manually (single-user app, small schema). If the schema grows,
 * regenerate with `supabase gen types typescript` and replace this file.
 */

export type TaskStatus = "backlog" | "todo" | "in_progress" | "complete"

export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly"

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          status: TaskStatus
          order_index: number
          due_date: string | null
          document_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          status?: TaskStatus
          order_index?: number
          due_date?: string | null
          document_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          category: string
          folder_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          category?: string
          folder_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["notes"]["Insert"]>
        Relationships: []
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["folders"]["Insert"]>
        Relationships: []
      }
      events: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          location: string | null
          all_day: boolean
          starts_at: string
          ends_at: string | null
          recurrence: Recurrence
          recurrence_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          location?: string | null
          all_day?: boolean
          starts_at: string
          ends_at?: string | null
          recurrence?: Recurrence
          recurrence_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>
        Relationships: []
      }
      timesheets: {
        Row: {
          id: string
          user_id: string
          project: string
          hours: number
          summary: string
          worked_on: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project: string
          hours: number
          summary: string
          worked_on?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["timesheets"]["Insert"]>
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          user_id: string
          filename: string
          storage_path: string
          mime_type: string
          size_bytes: number
          category: string
          summary: string | null
          task_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          storage_path: string
          mime_type: string
          size_bytes: number
          category?: string
          summary?: string | null
          task_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row aliases used throughout the app.
export type Task = Database["public"]["Tables"]["tasks"]["Row"]
export type Note = Database["public"]["Tables"]["notes"]["Row"]
export type Folder = Database["public"]["Tables"]["folders"]["Row"]
export type CalendarEvent = Database["public"]["Tables"]["events"]["Row"]
export type Timesheet = Database["public"]["Tables"]["timesheets"]["Row"]
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"]
