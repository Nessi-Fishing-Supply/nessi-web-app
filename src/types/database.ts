export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      members: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          first_name: string | null
          home_state: string | null
          id: string
          is_seller: boolean
          is_stripe_connected: boolean
          last_name: string | null
          last_seen_at: string | null
          notification_preferences: Json
          onboarding_completed_at: string | null
          primary_species: string[]
          primary_technique: string[]
          response_time_hours: number | null
          review_count: number
          slug: string
          stripe_account_id: string | null
          stripe_onboarding_status: string
          total_transactions: number
          updated_at: string
          years_fishing: number | null
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          first_name?: string | null
          home_state?: string | null
          id: string
          is_seller?: boolean
          is_stripe_connected?: boolean
          last_name?: string | null
          last_seen_at?: string | null
          notification_preferences?: Json
          onboarding_completed_at?: string | null
          primary_species?: string[]
          primary_technique?: string[]
          response_time_hours?: number | null
          review_count?: number
          slug: string
          stripe_account_id?: string | null
          stripe_onboarding_status?: string
          total_transactions?: number
          updated_at?: string
          years_fishing?: number | null
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          first_name?: string | null
          home_state?: string | null
          id?: string
          is_seller?: boolean
          is_stripe_connected?: boolean
          last_name?: string | null
          last_seen_at?: string | null
          notification_preferences?: Json
          onboarding_completed_at?: string | null
          primary_species?: string[]
          primary_technique?: string[]
          response_time_hours?: number | null
          review_count?: number
          slug?: string
          stripe_account_id?: string | null
          stripe_onboarding_status?: string
          total_transactions?: number
          updated_at?: string
          years_fishing?: number | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          price: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          price: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          price?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          role: string
          shop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          role: string
          shop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          role?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          brand_colors: Json | null
          created_at: string
          deleted_at: string | null
          description: string | null
          hero_banner_url: string | null
          id: string
          is_stripe_connected: boolean
          is_verified: boolean
          owner_id: string
          review_count: number
          shop_name: string
          slug: string
          stripe_account_id: string | null
          stripe_onboarding_status: string
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_tier: string
          total_transactions: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          brand_colors?: Json | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          hero_banner_url?: string | null
          id?: string
          is_stripe_connected?: boolean
          is_verified?: boolean
          owner_id: string
          review_count?: number
          shop_name: string
          slug: string
          stripe_account_id?: string | null
          stripe_onboarding_status?: string
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          total_transactions?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          brand_colors?: Json | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          hero_banner_url?: string | null
          id?: string
          is_stripe_connected?: boolean
          is_verified?: boolean
          owner_id?: string
          review_count?: number
          shop_name?: string
          slug?: string
          stripe_account_id?: string | null
          stripe_onboarding_status?: string
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          total_transactions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      slugs: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          slug: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          slug: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_slug_available: { Args: { p_slug: string }; Returns: boolean }
      release_slug: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: undefined
      }
      reserve_slug: {
        Args: { p_entity_id: string; p_entity_type: string; p_slug: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
