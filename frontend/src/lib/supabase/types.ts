export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          default_currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          default_currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          default_currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string | null
          color: string | null
          type: 'expense' | 'income' | 'transfer' | 'system'
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string | null
          color?: string | null
          type: 'expense' | 'income' | 'transfer' | 'system'
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string | null
          color?: string | null
          type?: 'expense' | 'income' | 'transfer' | 'system'
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      classification_rules: {
        Row: {
          id: string
          user_id: string
          pattern: string
          match_type: 'exact' | 'starts_with' | 'contains' | 'regex'
          category_id: string
          priority: number
          is_auto: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pattern: string
          match_type: 'exact' | 'starts_with' | 'contains' | 'regex'
          category_id: string
          priority?: number
          is_auto?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pattern?: string
          match_type?: 'exact' | 'starts_with' | 'contains' | 'regex'
          category_id?: string
          priority?: number
          is_auto?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'classification_rules_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'classification_rules_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      imports: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_path: string | null
          total_rows: number
          new_rows: number
          duplicate_rows: number
          auto_classified: number
          unclassified: number
          status: 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_path?: string | null
          total_rows?: number
          new_rows?: number
          duplicate_rows?: number
          auto_classified?: number
          unclassified?: number
          status?: 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_path?: string | null
          total_rows?: number
          new_rows?: number
          duplicate_rows?: number
          auto_classified?: number
          unclassified?: number
          status?: 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'imports_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          import_id: string | null
          date: string
          concept: string
          concept_normalized: string
          amount: number
          balance: number | null
          category_id: string | null
          classification_source: 'rule' | 'manual' | 'ai' | 'unclassified'
          notes: string | null
          is_excluded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          import_id?: string | null
          date: string
          concept: string
          concept_normalized: string
          amount: number
          balance?: number | null
          category_id?: string | null
          classification_source?: 'rule' | 'manual' | 'ai' | 'unclassified'
          notes?: string | null
          is_excluded?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          import_id?: string | null
          date?: string
          concept?: string
          concept_normalized?: string
          amount?: number
          balance?: number | null
          category_id?: string | null
          classification_source?: 'rule' | 'manual' | 'ai' | 'unclassified'
          notes?: string | null
          is_excluded?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_import_id_fkey'
            columns: ['import_id']
            isOneToOne: false
            referencedRelation: 'imports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      monthly_summaries: {
        Row: {
          id: string
          user_id: string
          month: string
          total_income: number
          total_expenses: number
          total_savings: number
          category_breakdown: Json
          transaction_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          month: string
          total_income?: number
          total_expenses?: number
          total_savings?: number
          category_breakdown?: Json
          transaction_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          total_income?: number
          total_expenses?: number
          total_savings?: number
          category_breakdown?: Json
          transaction_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'monthly_summaries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      concept_category_map: {
        Row: {
          id: string
          user_id: string
          concept_normalized: string
          category_id: string
          source: string
          confidence: number
          times_seen: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          concept_normalized: string
          category_id: string
          source?: string
          confidence?: number
          times_seen?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          concept_normalized?: string
          category_id?: string
          source?: string
          confidence?: number
          times_seen?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'concept_category_map_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'concept_category_map_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type ClassificationRule = Database['public']['Tables']['classification_rules']['Row']
export type ClassificationRuleInsert = Database['public']['Tables']['classification_rules']['Insert']
export type ClassificationRuleUpdate = Database['public']['Tables']['classification_rules']['Update']

export type Import = Database['public']['Tables']['imports']['Row']
export type ImportInsert = Database['public']['Tables']['imports']['Insert']
export type ImportUpdate = Database['public']['Tables']['imports']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type MonthlySummary = Database['public']['Tables']['monthly_summaries']['Row']
export type MonthlySummaryInsert = Database['public']['Tables']['monthly_summaries']['Insert']
export type MonthlySummaryUpdate = Database['public']['Tables']['monthly_summaries']['Update']

export type ConceptCategoryMap = Database['public']['Tables']['concept_category_map']['Row']
export type ConceptCategoryMapInsert = Database['public']['Tables']['concept_category_map']['Insert']
export type ConceptCategoryMapUpdate = Database['public']['Tables']['concept_category_map']['Update']
