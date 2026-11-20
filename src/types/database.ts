export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MachineStatus = 'available' | 'in_use' | 'broken' | 'maintenance';
export type UserRole = 'student' | 'caretaker';
export type WashSessionStatus = 'running' | 'done' | 'collected' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      hostel_blocks: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          role: UserRole;
          hostel_block_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role?: UserRole;
          hostel_block_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: UserRole;
          hostel_block_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_hostel_block_id_fkey';
            columns: ['hostel_block_id'];
            isOneToOne: false;
            referencedRelation: 'hostel_blocks';
            referencedColumns: ['id'];
          },
        ];
      };
      machines: {
        Row: {
          id: string;
          block_id: string;
          label: string;
          capacity_kg: number;
          status: MachineStatus;
          status_updated_by: string | null;
          status_updated_at: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          block_id: string;
          label: string;
          capacity_kg: number;
          status?: MachineStatus;
          status_updated_by?: string | null;
          status_updated_at?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          block_id?: string;
          label?: string;
          capacity_kg?: number;
          status?: MachineStatus;
          status_updated_by?: string | null;
          status_updated_at?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'machines_block_id_fkey';
            columns: ['block_id'];
            isOneToOne: false;
            referencedRelation: 'hostel_blocks';
            referencedColumns: ['id'];
          },
        ];
      };
      wash_programs: {
        Row: {
          id: string;
          name: string;
          base_minutes: number;
          per_kg_minutes: number;
          active: boolean;
        };
        Insert: {
          id: string;
          name: string;
          base_minutes: number;
          per_kg_minutes: number;
          active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          base_minutes?: number;
          per_kg_minutes?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      temp_adjustments: {
        Row: {
          temp: string;
          minutes: number;
        };
        Insert: {
          temp: string;
          minutes: number;
        };
        Update: {
          temp?: string;
          minutes?: number;
        };
        Relationships: [];
      };
      spin_adjustments: {
        Row: {
          spin: string;
          minutes: number;
        };
        Insert: {
          spin: string;
          minutes: number;
        };
        Update: {
          spin?: string;
          minutes?: number;
        };
        Relationships: [];
      };
      wash_sessions: {
        Row: {
          id: string;
          machine_id: string;
          user_id: string;
          program_id: string;
          temp: string;
          spin: string;
          weight_kg: number;
          started_at: string;
          ends_at: string;
          collected_at: string | null;
          status: WashSessionStatus;
        };
        Insert: {
          id?: string;
          machine_id: string;
          user_id: string;
          program_id: string;
          temp: string;
          spin: string;
          weight_kg: number;
          started_at?: string;
          ends_at: string;
          collected_at?: string | null;
          status?: WashSessionStatus;
        };
        Update: {
          id?: string;
          machine_id?: string;
          user_id?: string;
          program_id?: string;
          temp?: string;
          spin?: string;
          weight_kg?: number;
          started_at?: string;
          ends_at?: string;
          collected_at?: string | null;
          status?: WashSessionStatus;
        };
        Relationships: [
          {
            foreignKeyName: 'wash_sessions_machine_id_fkey';
            columns: ['machine_id'];
            isOneToOne: false;
            referencedRelation: 'machines';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wash_sessions_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'wash_programs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wash_sessions_temp_fkey';
            columns: ['temp'];
            isOneToOne: false;
            referencedRelation: 'temp_adjustments';
            referencedColumns: ['temp'];
          },
          {
            foreignKeyName: 'wash_sessions_spin_fkey';
            columns: ['spin'];
            isOneToOne: false;
            referencedRelation: 'spin_adjustments';
            referencedColumns: ['spin'];
          },
        ];
      };
      issue_reports: {
        Row: {
          id: string;
          machine_id: string;
          reported_by: string;
          description: string;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          machine_id: string;
          reported_by: string;
          description: string;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          machine_id?: string;
          reported_by?: string;
          description?: string;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'issue_reports_machine_id_fkey';
            columns: ['machine_id'];
            isOneToOne: false;
            referencedRelation: 'machines';
            referencedColumns: ['id'];
          },
        ];
      };
      status_log: {
        Row: {
          id: string;
          machine_id: string;
          old_status: MachineStatus;
          new_status: MachineStatus;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          machine_id: string;
          old_status: MachineStatus;
          new_status: MachineStatus;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: string;
          machine_id?: string;
          old_status?: MachineStatus;
          new_status?: MachineStatus;
          changed_by?: string | null;
          changed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'status_log_machine_id_fkey';
            columns: ['machine_id'];
            isOneToOne: false;
            referencedRelation: 'machines';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      start_wash: {
        Args: {
          p_machine_id: string;
          p_program_id: string;
          p_temp: string;
          p_spin: string;
          p_weight_kg: number;
        };
        Returns: {
          session_id: string;
          machine_id: string;
          machine_label: string;
          program_name: string;
          duration_minutes: number;
          started_at: string;
          ends_at: string;
          status: string;
        };
      };
      expire_wash_sessions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      collect_wash: {
        Args: {
          p_session_id: string;
        };
        Returns: {
          success: boolean;
          session_id: string;
          machine_id: string;
          collected_at: string;
        };
      };
      verify_machine_status: {
        Args: {
          p_machine_id: string;
          p_status: MachineStatus;
          p_note?: string | null;
        };
        Returns: {
          success: boolean;
          machine_id: string;
          status: MachineStatus;
          note?: string | null;
          verified_at: string;
        };
      };
      force_clear_machine: {
        Args: {
          p_machine_id: string;
          p_reason?: string;
        };
        Returns: {
          success: boolean;
          machine_id: string;
          status: string;
          cleared_at: string;
        };
      };
      resolve_issue_report: {
        Args: {
          p_issue_id: string;
          p_machine_status?: MachineStatus | null;
          p_status_note?: string | null;
        };
        Returns: {
          success: boolean;
          issue_id: string;
          resolved_at: string;
          machine_id: string;
          machine_status?: MachineStatus | null;
        };
      };
    };
    Enums: {
      machine_status: MachineStatus;
      user_role: UserRole;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
