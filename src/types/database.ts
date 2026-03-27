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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          line1: string
          line2: string | null
          state: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          line1: string
          line2?: string | null
          state: string
          updated_at?: string
          user_id: string
          zip: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          line1?: string
          line2?: string | null
          state?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_at: string
          added_from: string | null
          expires_at: string
          id: string
          listing_id: string
          price_at_add: number
          user_id: string
        }
        Insert: {
          added_at?: string
          added_from?: string | null
          expires_at?: string
          id?: string
          listing_id: string
          price_at_add: number
          user_id: string
        }
        Update: {
          added_at?: string
          added_from?: string | null
          expires_at?: string
          id?: string
          listing_id?: string
          price_at_add?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: Database["public"]["Enums"]["flag_reason"]
          reporter_id: string
          status: Database["public"]["Enums"]["flag_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["flag_target_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: Database["public"]["Enums"]["flag_reason"]
          reporter_id: string
          status?: Database["public"]["Enums"]["flag_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["flag_target_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["flag_reason"]
          reporter_id?: string
          status?: Database["public"]["Enums"]["flag_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["flag_target_type"]
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          created_at: string
          id: string
          image_url: string
          listing_id: string
          position: number
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          listing_id: string
          position?: number
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          listing_id?: string
          position?: number
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          brand: string | null
          category: Database["public"]["Enums"]["listing_category"]
          condition: Database["public"]["Enums"]["listing_condition"]
          cover_photo_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          favorite_count: number
          id: string
          inquiry_count: number
          is_visible: boolean
          location_city: string | null
          location_state: string | null
          member_id: string | null
          model: string | null
          price_cents: number
          published_at: string | null
          quantity: number
          search_vector: unknown
          seller_id: string
          shipping_paid_by:
            | Database["public"]["Enums"]["shipping_paid_by"]
            | null
          shipping_price_cents: number | null
          shop_id: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          view_count: number
          watcher_count: number
          weight_oz: number | null
        }
        Insert: {
          brand?: string | null
          category: Database["public"]["Enums"]["listing_category"]
          condition: Database["public"]["Enums"]["listing_condition"]
          cover_photo_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          favorite_count?: number
          id?: string
          inquiry_count?: number
          is_visible?: boolean
          location_city?: string | null
          location_state?: string | null
          member_id?: string | null
          model?: string | null
          price_cents: number
          published_at?: string | null
          quantity?: number
          search_vector?: unknown
          seller_id: string
          shipping_paid_by?:
            | Database["public"]["Enums"]["shipping_paid_by"]
            | null
          shipping_price_cents?: number | null
          shop_id?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          view_count?: number
          watcher_count?: number
          weight_oz?: number | null
        }
        Update: {
          brand?: string | null
          category?: Database["public"]["Enums"]["listing_category"]
          condition?: Database["public"]["Enums"]["listing_condition"]
          cover_photo_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          favorite_count?: number
          id?: string
          inquiry_count?: number
          is_visible?: boolean
          location_city?: string | null
          location_state?: string | null
          member_id?: string | null
          model?: string | null
          price_cents?: number
          published_at?: string | null
          quantity?: number
          search_vector?: unknown
          seller_id?: string
          shipping_paid_by?:
            | Database["public"]["Enums"]["shipping_paid_by"]
            | null
          shipping_price_cents?: number | null
          shop_id?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          view_count?: number
          watcher_count?: number
          weight_oz?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          first_name: string
          follower_count: number
          home_state: string | null
          id: string
          is_seller: boolean
          is_stripe_connected: boolean
          last_name: string
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
          first_name: string
          follower_count?: number
          home_state?: string | null
          id: string
          is_seller?: boolean
          is_stripe_connected?: boolean
          last_name: string
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
          first_name?: string
          follower_count?: number
          home_state?: string | null
          id?: string
          is_seller?: boolean
          is_stripe_connected?: boolean
          last_name?: string
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
      recently_viewed: {
        Row: {
          id: string
          listing_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recently_viewed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      search_suggestions: {
        Row: {
          category: Database["public"]["Enums"]["listing_category"] | null
          created_at: string
          id: string
          popularity: number
          term: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["listing_category"] | null
          created_at?: string
          id?: string
          popularity?: number
          term: string
        }
        Update: {
          category?: Database["public"]["Enums"]["listing_category"] | null
          created_at?: string
          id?: string
          popularity?: number
          term?: string
        }
        Relationships: []
      }
      shop_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role_id: string
          shop_id: string
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role_id: string
          shop_id: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role_id?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "shop_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_invites_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          role_id: string
          shop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          role_id: string
          shop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          role_id?: string
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
            foreignKeyName: "shop_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "shop_roles"
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
      shop_ownership_transfers: {
        Row: {
          created_at: string | null
          expires_at: string
          from_member_id: string
          id: string
          shop_id: string
          status: string
          to_member_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          from_member_id: string
          id?: string
          shop_id: string
          status?: string
          to_member_id: string
          token?: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          from_member_id?: string
          id?: string
          shop_id?: string
          status?: string
          to_member_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_ownership_transfers_from_member_id_fkey"
            columns: ["from_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_ownership_transfers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_ownership_transfers_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          permissions: Json
          shop_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id: string
          is_system?: boolean
          name: string
          permissions: Json
          shop_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          shop_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_roles_shop_id_fkey"
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
          follower_count: number
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
          follower_count?: number
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
          follower_count?: number
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
      accept_ownership_transfer: {
        Args: {
          p_from_member_id: string
          p_manager_role_id: string
          p_owner_role_id: string
          p_shop_id: string
          p_to_member_id: string
          p_transfer_id: string
        }
        Returns: undefined
      }
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
      flag_reason:
        | "spam"
        | "prohibited_item"
        | "counterfeit"
        | "inappropriate_content"
        | "off_platform_transaction"
        | "harassment"
        | "other"
      flag_status: "pending" | "reviewed" | "resolved" | "dismissed"
      flag_target_type: "listing" | "member" | "shop" | "message"
      invite_status: "pending" | "accepted" | "expired" | "revoked"
      listing_category:
        | "rods"
        | "reels"
        | "lures"
        | "flies"
        | "tackle"
        | "line"
        | "apparel"
        | "electronics"
        | "watercraft"
        | "other"
      listing_condition:
        | "new_with_tags"
        | "new_without_tags"
        | "like_new"
        | "good"
        | "fair"
        | "poor"
      listing_status:
        | "draft"
        | "active"
        | "reserved"
        | "sold"
        | "archived"
        | "deleted"
      shipping_paid_by: "seller" | "buyer" | "split"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      flag_reason: [
        "spam",
        "prohibited_item",
        "counterfeit",
        "inappropriate_content",
        "off_platform_transaction",
        "harassment",
        "other",
      ],
      flag_status: ["pending", "reviewed", "resolved", "dismissed"],
      flag_target_type: ["listing", "member", "shop", "message"],
      invite_status: ["pending", "accepted", "expired", "revoked"],
      listing_category: [
        "rods",
        "reels",
        "lures",
        "flies",
        "tackle",
        "line",
        "apparel",
        "electronics",
        "watercraft",
        "other",
      ],
      listing_condition: [
        "new_with_tags",
        "new_without_tags",
        "like_new",
        "good",
        "fair",
        "poor",
      ],
      listing_status: [
        "draft",
        "active",
        "reserved",
        "sold",
        "archived",
        "deleted",
      ],
      shipping_paid_by: ["seller", "buyer", "split"],
    },
  },
} as const
