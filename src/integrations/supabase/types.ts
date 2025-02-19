export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_profiles: {
        Row: {
          adaptability_score: number | null
          age: number
          backstory: string | null
          created_at: string | null
          current_challenges: string[] | null
          daily_schedule: Json | null
          emotional_state: string | null
          favorite_books: string[] | null
          favorite_movies: string[] | null
          humor_style: string | null
          id: string
          interests: string[] | null
          last_interaction: string | null
          life_goals: string[] | null
          location: string | null
          musical_taste: string[] | null
          name: string
          occupation: string | null
          personality_traits: string[] | null
          recent_experiences: Json | null
          relationship_stage: string | null
          relationships: Json | null
          trust_level: number | null
          updated_at: string | null
          user_id: string
          values: string[] | null
        }
        Insert: {
          adaptability_score?: number | null
          age: number
          backstory?: string | null
          created_at?: string | null
          current_challenges?: string[] | null
          daily_schedule?: Json | null
          emotional_state?: string | null
          favorite_books?: string[] | null
          favorite_movies?: string[] | null
          humor_style?: string | null
          id?: string
          interests?: string[] | null
          last_interaction?: string | null
          life_goals?: string[] | null
          location?: string | null
          musical_taste?: string[] | null
          name: string
          occupation?: string | null
          personality_traits?: string[] | null
          recent_experiences?: Json | null
          relationship_stage?: string | null
          relationships?: Json | null
          trust_level?: number | null
          updated_at?: string | null
          user_id: string
          values?: string[] | null
        }
        Update: {
          adaptability_score?: number | null
          age?: number
          backstory?: string | null
          created_at?: string | null
          current_challenges?: string[] | null
          daily_schedule?: Json | null
          emotional_state?: string | null
          favorite_books?: string[] | null
          favorite_movies?: string[] | null
          humor_style?: string | null
          id?: string
          interests?: string[] | null
          last_interaction?: string | null
          life_goals?: string[] | null
          location?: string | null
          musical_taste?: string[] | null
          name?: string
          occupation?: string | null
          personality_traits?: string[] | null
          recent_experiences?: Json | null
          relationship_stage?: string | null
          relationships?: Json | null
          trust_level?: number | null
          updated_at?: string | null
          user_id?: string
          values?: string[] | null
        }
        Relationships: []
      }
      image_library: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          embedding: string | null
          full_url: string
          id: string
          metadata: Json | null
          placeholder_text: string | null
          storage_path: string
          tags: string[] | null
          title: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          embedding?: string | null
          full_url: string
          id?: string
          metadata?: Json | null
          placeholder_text?: string | null
          storage_path: string
          tags?: string[] | null
          title?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          embedding?: string | null
          full_url?: string
          id?: string
          metadata?: Json | null
          placeholder_text?: string | null
          storage_path?: string
          tags?: string[] | null
          title?: string | null
        }
        Relationships: []
      }
      message_counts: {
        Row: {
          chunk_message_count: number
          created_at: string
          daily_count: number
          id: string
          last_reset_date: string
          message_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_message_count?: number
          created_at?: string
          daily_count?: number
          id?: string
          last_reset_date?: string
          message_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chunk_message_count?: number
          created_at?: string
          daily_count?: number
          id?: string
          last_reset_date?: string
          message_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_disabled: boolean
          age_range: string | null
          avatar_url: string | null
          created_at: string
          extreme_content: string | null
          id: string
          name: string | null
          pronouns: string | null
          suicide_concern: number
          username: string | null
          vector_long_term: string | null
          violence_concern: number
        }
        Insert: {
          account_disabled?: boolean
          age_range?: string | null
          avatar_url?: string | null
          created_at?: string
          extreme_content?: string | null
          id: string
          name?: string | null
          pronouns?: string | null
          suicide_concern?: number
          username?: string | null
          vector_long_term?: string | null
          violence_concern?: number
        }
        Update: {
          account_disabled?: boolean
          age_range?: string | null
          avatar_url?: string | null
          created_at?: string
          extreme_content?: string | null
          id?: string
          name?: string | null
          pronouns?: string | null
          suicide_concern?: number
          username?: string | null
          vector_long_term?: string | null
          violence_concern?: number
        }
        Relationships: []
      }
      safety_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          acknowledgment_text: string
          created_at: string | null
          id: string
          responded_yes: boolean
          type: Database["public"]["Enums"]["safety_acknowledgment_type"]
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledgment_text: string
          created_at?: string | null
          id?: string
          responded_yes: boolean
          type: Database["public"]["Enums"]["safety_acknowledgment_type"]
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledgment_text?: string
          created_at?: string | null
          id?: string
          responded_yes?: boolean
          type?: Database["public"]["Enums"]["safety_acknowledgment_type"]
          user_id?: string
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string
          id: string
          stripe_customer_id: string
        }
        Insert: {
          created_at?: string
          id: string
          stripe_customer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_customer_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          id: string
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          token_balance: number | null
          token_last_updated: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          token_balance?: number | null
          token_last_updated?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          token_balance?: number | null
          token_last_updated?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      delete_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      increment_safety_concern: {
        Args: {
          user_id_param: string
          concern_type: string
        }
        Returns: Json
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      reset_daily_count: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
    }
    Enums: {
      safety_acknowledgment_type: "suicide" | "violence"
      subscription_tier: "free" | "pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
