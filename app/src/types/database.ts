export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      plans: {
        Row: {
          anchor: Json | null;
          created_at: string;
          days_per_week: number;
          experience: string | null;
          id: string;
          long_run_day: number;
          paces: Json | null;
          race_date: string;
          race_id: string | null;
          start_date: string;
          status: string;
          user_id: string;
          volume_band: string | null;
          weeks: number;
        };
        ComputedFields: never;
        Insert: {
          anchor?: Json | null;
          created_at?: string;
          days_per_week: number;
          experience?: string | null;
          id?: string;
          long_run_day: number;
          paces?: Json | null;
          race_date: string;
          race_id?: string | null;
          start_date: string;
          status?: string;
          user_id: string;
          volume_band?: string | null;
          weeks: number;
        };
        Update: {
          anchor?: Json | null;
          created_at?: string;
          days_per_week?: number;
          experience?: string | null;
          id?: string;
          long_run_day?: number;
          paces?: Json | null;
          race_date?: string;
          race_id?: string | null;
          start_date?: string;
          status?: string;
          user_id?: string;
          volume_band?: string | null;
          weeks?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_race_id_fkey';
            columns: ['race_id'];
            isOneToOne: false;
            referencedRelation: 'races';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          birth_year: number | null;
          city: string | null;
          created_at: string;
          display_name: string | null;
          experience: string | null;
          height_cm: number | null;
          id: string;
          lat: number | null;
          lon: number | null;
          onboarding_completed: boolean;
          public_profile: boolean;
          run_window: string;
          sex: string | null;
          units: string;
          updated_at: string;
          volume_band: string | null;
          weather_refresh_minutes: number | null;
          weight_kg: number | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          birth_year?: number | null;
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          experience?: string | null;
          height_cm?: number | null;
          id: string;
          lat?: number | null;
          lon?: number | null;
          onboarding_completed?: boolean;
          public_profile?: boolean;
          run_window?: string;
          sex?: string | null;
          units?: string;
          updated_at?: string;
          volume_band?: string | null;
          weather_refresh_minutes?: number | null;
          weight_kg?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          birth_year?: number | null;
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          experience?: string | null;
          height_cm?: number | null;
          id?: string;
          lat?: number | null;
          lon?: number | null;
          onboarding_completed?: boolean;
          public_profile?: boolean;
          run_window?: string;
          sex?: string | null;
          units?: string;
          updated_at?: string;
          volume_band?: string | null;
          weather_refresh_minutes?: number | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      push_config: {
        Row: {
          created_at: string;
          cron_secret: string | null;
          id: number;
          vapid_private: string | null;
          vapid_public: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          cron_secret?: string | null;
          id: number;
          vapid_private?: string | null;
          vapid_public?: string | null;
        };
        Update: {
          created_at?: string;
          cron_secret?: string | null;
          id?: number;
          vapid_private?: string | null;
          vapid_public?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          language: string;
          p256dh: string;
          remind_hour: number;
          remind_missed: boolean;
          remind_race_week: boolean;
          remind_recap: boolean;
          remind_today: boolean;
          remind_training: boolean;
          remind_weather: boolean;
          timezone: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          language?: string;
          p256dh: string;
          remind_hour?: number;
          remind_missed?: boolean;
          remind_race_week?: boolean;
          remind_recap?: boolean;
          remind_today?: boolean;
          remind_training?: boolean;
          remind_weather?: boolean;
          timezone?: string;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          language?: string;
          p256dh?: string;
          remind_hour?: number;
          remind_missed?: boolean;
          remind_race_week?: boolean;
          remind_recap?: boolean;
          remind_today?: boolean;
          remind_training?: boolean;
          remind_weather?: boolean;
          timezone?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      races: {
        Row: {
          created_at: string;
          distance_km: number;
          goal_time_sec: number | null;
          id: string;
          name: string | null;
          race_date: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          distance_km?: number;
          goal_time_sec?: number | null;
          id?: string;
          name?: string | null;
          race_date: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          distance_km?: number;
          goal_time_sec?: number | null;
          id?: string;
          name?: string | null;
          race_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      run_logs: {
        Row: {
          avg_pace_sec_per_km: number | null;
          created_at: string;
          distance_km: number | null;
          duration_sec: number | null;
          id: string;
          log_date: string;
          notes: string | null;
          rpe: number | null;
          user_id: string;
          workout_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          avg_pace_sec_per_km?: number | null;
          created_at?: string;
          distance_km?: number | null;
          duration_sec?: number | null;
          id?: string;
          log_date: string;
          notes?: string | null;
          rpe?: number | null;
          user_id: string;
          workout_id?: string | null;
        };
        Update: {
          avg_pace_sec_per_km?: number | null;
          created_at?: string;
          distance_km?: number | null;
          duration_sec?: number | null;
          id?: string;
          log_date?: string;
          notes?: string | null;
          rpe?: number | null;
          user_id?: string;
          workout_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'run_logs_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
        ];
      };
      workouts: {
        Row: {
          created_at: string;
          distance_km: number;
          duration_sec: number | null;
          id: string;
          pace_zone: string | null;
          phase: string;
          plan_id: string;
          status: string;
          steps: NonNullable<Json>;
          swapped_with: string | null;
          title: string;
          type: string;
          user_id: string;
          workout_date: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          distance_km?: number;
          duration_sec?: number | null;
          id?: string;
          pace_zone?: string | null;
          phase: string;
          plan_id: string;
          status?: string;
          steps?: NonNullable<Json>;
          swapped_with?: string | null;
          title: string;
          type: string;
          user_id: string;
          workout_date: string;
        };
        Update: {
          created_at?: string;
          distance_km?: number;
          duration_sec?: number | null;
          id?: string;
          pace_zone?: string | null;
          phase?: string;
          plan_id?: string;
          status?: string;
          steps?: NonNullable<Json>;
          swapped_with?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
          workout_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workouts_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workouts_swapped_with_fkey';
            columns: ['swapped_with'];
            isOneToOne: false;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_week_plan: { Args: { p_assignments: Json }; Returns: number };
      create_plan_with_workouts: {
        Args: {
          p_anchor: Json;
          p_days_per_week: number;
          p_experience: string;
          p_long_run_day: number;
          p_paces: Json;
          p_race: Json;
          p_race_date: string;
          p_start_date: string;
          p_volume_band: string;
          p_weeks: number;
          p_workouts: Json;
        };
        Returns: string;
      };
      get_push_public_key: { Args: Record<PropertyKey, never>; Returns: string };
      log_workout: {
        Args: { p_distance_km: number; p_duration_sec: number; p_notes: string; p_rpe: number; p_workout_id: string };
        Returns: undefined;
      };
      recalibrate_plan: { Args: { p_anchor: Json; p_pace_map: Json; p_paces: Json }; Returns: undefined };
      scale_week_volume: { Args: { p_factor: number; p_week_start: string }; Returns: undefined };
      swap_workouts: { Args: { p_first: string; p_second: string }; Returns: undefined };
      weekly_leaderboard: {
        Args: { p_week_start: string };
        Returns: {
          avatar_url: string;
          display_name: string;
          distance_km: number;
          is_public: boolean;
          rank: number;
          sessions: number;
          user_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
