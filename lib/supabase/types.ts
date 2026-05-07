export type UserRole = 'mom' | 'dad' | 'guardian' | 'expert' | 'admin'
export type VoteType = 'helpful' | 'popular'
export type TargetType = 'post' | 'comment'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string
          role: UserRole
          is_verified_expert: boolean
          cred_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          role?: UserRole | undefined
          is_verified_expert?: boolean | undefined
          cred_score?: number | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          email?: string | undefined
          display_name?: string | undefined
          role?: UserRole | undefined
          is_verified_expert?: boolean | undefined
          cred_score?: number | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: []
      }
      sub_villages: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string | undefined
          name: string
          description?: string | null | undefined
          created_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          name?: string | undefined
          description?: string | null | undefined
          created_at?: string | undefined
        }
        Relationships: []
      }
      ghost_aliases: {
        Row: {
          id: string
          user_id: string
          alias_name: string
          created_at: string
        }
        Insert: {
          id?: string | undefined
          user_id: string
          alias_name: string
          created_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          user_id?: string | undefined
          alias_name?: string | undefined
          created_at?: string | undefined
        }
        Relationships: [
          {
            foreignKeyName: 'ghost_aliases_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      posts: {
        Row: {
          id: string
          author_id: string
          sub_village_id: string
          title: string
          body: string
          is_ghost_post: boolean
          ghost_alias_id: string | null
          helpful_count: number
          popular_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | undefined
          author_id: string
          sub_village_id: string
          title: string
          body: string
          is_ghost_post?: boolean | undefined
          ghost_alias_id?: string | null | undefined
          helpful_count?: number | undefined
          popular_count?: number | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          author_id?: string | undefined
          sub_village_id?: string | undefined
          title?: string | undefined
          body?: string | undefined
          is_ghost_post?: boolean | undefined
          ghost_alias_id?: string | null | undefined
          helpful_count?: number | undefined
          popular_count?: number | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          parent_id: string | null
          body: string
          depth: number
          is_ghost_post: boolean
          ghost_alias_id: string | null
          helpful_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | undefined
          post_id: string
          author_id: string
          parent_id?: string | null | undefined
          body: string
          depth?: number | undefined
          is_ghost_post?: boolean | undefined
          ghost_alias_id?: string | null | undefined
          helpful_count?: number | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          post_id?: string | undefined
          author_id?: string | undefined
          parent_id?: string | null | undefined
          body?: string | undefined
          depth?: number | undefined
          is_ghost_post?: boolean | undefined
          ghost_alias_id?: string | null | undefined
          helpful_count?: number | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: [
          {
            foreignKeyName: 'comments_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          }
        ]
      }
      reputation_votes: {
        Row: {
          id: string
          voter_id: string
          target_id: string
          target_type: TargetType
          vote_type: VoteType
          created_at: string
        }
        Insert: {
          id?: string | undefined
          voter_id: string
          target_id: string
          target_type: TargetType
          vote_type: VoteType
          created_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          voter_id?: string | undefined
          target_id?: string | undefined
          target_type?: TargetType | undefined
          vote_type?: VoteType | undefined
          created_at?: string | undefined
        }
        Relationships: []
      }
      expert_applications: {
        Row: {
          id: string
          user_id: string
          specialty: string
          document_path: string
          document_signed_url: string | null
          status: ApplicationStatus
          reviewer_id: string | null
          reviewer_notes: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | undefined
          user_id: string
          specialty: string
          document_path: string
          document_signed_url?: string | null | undefined
          status?: ApplicationStatus | undefined
          reviewer_id?: string | null | undefined
          reviewer_notes?: string | null | undefined
          reviewed_at?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Update: {
          id?: string | undefined
          user_id?: string | undefined
          specialty?: string | undefined
          document_path?: string | undefined
          document_signed_url?: string | null | undefined
          status?: ApplicationStatus | undefined
          reviewer_id?: string | null | undefined
          reviewer_notes?: string | null | undefined
          reviewed_at?: string | null | undefined
          created_at?: string | undefined
          updated_at?: string | undefined
        }
        Relationships: [
          {
            foreignKeyName: 'expert_applications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      public_posts: {
        Row: {
          id: string
          author_id: string | null
          sub_village_id: string
          title: string
          body: string
          is_ghost_post: boolean
          ghost_alias_id: string | null
          alias_name: string | null
          helpful_count: number
          popular_count: number
          created_at: string
          updated_at: string
          display_name: string | null
          role: UserRole | null
          is_verified_expert: boolean | null
          sub_village_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_helpful_count: {
        Args: {
          p_target_id: string
          p_target_type: TargetType
          p_delta: number
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role: UserRole
      vote_type: VoteType
      target_type: TargetType
      application_status: ApplicationStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type PublicPost = Database['public']['Views']['public_posts']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type SubVillage = Database['public']['Tables']['sub_villages']['Row']
export type ExpertApplication = Database['public']['Tables']['expert_applications']['Row']
