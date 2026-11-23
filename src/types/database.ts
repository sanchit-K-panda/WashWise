export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MachineStatus = 'available' | 'in_use' | 'maintenance' | 'broken';
export type UserRole = 'student' | 'caretaker';
export type WashSessionStatus = 'running' | 'collected' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      hostel_blocks: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          role: UserRole;
          hostel_block_id: string | null;
        };
        Insert: {
          id: string;
          name?: string;
          role?: UserRole;
          hostel_block_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          role?: UserRole;
          hostel_block_id?: string | null;
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
          verified_at: string | null;
          verified_by: string | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          block_id: string;
          label: string;
          capacity_kg: number;
          status?: MachineStatus;
          status_updated_by?: string | null;
          status_updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          note?: string | null;
        };
        Update: {
          id?: string;
          block_id?: string;
          label?: string;
          capacity_kg?: number;
          status?: MachineStatus;
          status_updated_by?: string | null;
          status_updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          note?: string | null;
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
          id?: string;
          name: string;
          base_minutes: number;
          per_kg_minutes?: number;
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
          old_status: MachineStatus | null;
          new_status: MachineStatus;
          changed_by: string | null;
          changed_at: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          machine_id: string;
          old_status?: MachineStatus | null;
          new_status: MachineStatus;
          changed_by?: string | null;
          changed_at?: string;
          note?: string | null;
        };
        Update: {
          id?: string;
          machine_id?: string;
          old_status?: MachineStatus | null;
          new_status?: MachineStatus;
          changed_by?: string | null;
          changed_at?: string;
          note?: string | null;
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
      machine_board: {
        Row: {
          id: string;
          block_id: string;
          label: string;
          capacity_kg: number;
          status: MachineStatus;
          note: string | null;
          verified_at: string | null;
          status_updated_at: string;
          started_at: string | null;
          ends_at: string | null;
          is_finished: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      start_wash: {
        Args: {
          p_machine: string;
          p_program: string;
          p_temp: string;
          p_spin: string;
          p_weight: number;
        };
        Returns: {
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
      };
      end_wash: {
        Args: {
          p_session: string;
          p_outcome: string;
        };
        Returns: {
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
      };
      set_machine_status: {
        Args: {
          p_machine: string;
          p_status: MachineStatus;
          p_note?: string | null;
        };
        Returns: {
          id: string;
          block_id: string;
          label: string;
          capacity_kg: number;
          status: MachineStatus;
          status_updated_by: string | null;
          status_updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
          note: string | null;
        };
      };
      verify_machine: {
        Args: {
          p_machine: string;
        };
        Returns: {
          id: string;
          block_id: string;
          label: string;
          capacity_kg: number;
          status: MachineStatus;
          status_updated_by: string | null;
          status_updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
          note: string | null;
        };
      };
      report_issue: {
        Args: {
          p_machine: string;
          p_description: string;
        };
        Returns: {
          id: string;
          machine_id: string;
          reported_by: string;
          description: string;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
      };
      resolve_issue: {
        Args: {
          p_report: string;
          p_new_status?: MachineStatus | null;
          p_note?: string | null;
        };
        Returns: {
          id: string;
          machine_id: string;
          reported_by: string;
          description: string;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
      };
      is_caretaker: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      my_block: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
    };
    Enums: {
      machine_status: MachineStatus;
      user_role: UserRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
