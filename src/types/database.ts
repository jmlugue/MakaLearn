import type {
  ActivityType,
  AppUser,
  Learner,
  MediaAsset,
  PracticeStatus,
  PreferredLearningMode,
  UserRole
} from "@/types";

type Visibility = "shared" | "private";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          status: AppUser["status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          status?: AppUser["status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: UserRole;
          status?: AppUser["status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string;
          color: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          color?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          color?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      learners: {
        Row: {
          id: string;
          name: string;
          age: number;
          grade_level: string;
          communication_needs: string;
          preferred_learning_mode: PreferredLearningMode;
          assigned_teacher_id: string;
          profile_photo_url: string | null;
          status: Learner["status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          age: number;
          grade_level: string;
          communication_needs?: string;
          preferred_learning_mode?: PreferredLearningMode;
          assigned_teacher_id: string;
          profile_photo_url?: string | null;
          status?: Learner["status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          age?: number;
          grade_level?: string;
          communication_needs?: string;
          preferred_learning_mode?: PreferredLearningMode;
          assigned_teacher_id?: string;
          profile_photo_url?: string | null;
          status?: Learner["status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      learning_items: {
        Row: {
          id: string;
          label: string;
          category_id: string;
          description: string;
          instruction: string;
          symbol_image_url: string | null;
          gesture_media_url: string | null;
          audio_url: string | null;
          tags: string[];
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          category_id: string;
          description: string;
          instruction: string;
          symbol_image_url?: string | null;
          gesture_media_url?: string | null;
          audio_url?: string | null;
          tags?: string[];
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          category_id?: string;
          description?: string;
          instruction?: string;
          symbol_image_url?: string | null;
          gesture_media_url?: string | null;
          audio_url?: string | null;
          tags?: string[];
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_assets: {
        Row: {
          id: string;
          title: string;
          type: MediaAsset["type"];
          file_name: string;
          bucket: MediaAsset["bucket"];
          storage_path: string;
          public_url: string | null;
          uploaded_by: string;
          uploaded_at: string;
          related_item_id: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          type: MediaAsset["type"];
          file_name: string;
          bucket: MediaAsset["bucket"];
          storage_path: string;
          public_url?: string | null;
          uploaded_by: string;
          uploaded_at?: string;
          related_item_id?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          type?: MediaAsset["type"];
          file_name?: string;
          bucket?: MediaAsset["bucket"];
          storage_path?: string;
          public_url?: string | null;
          uploaded_by?: string;
          uploaded_at?: string;
          related_item_id?: string | null;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          title: string;
          objective: string;
          instructions: string;
          activity_type: ActivityType;
          estimated_duration: number;
          notes: string;
          source: "manual" | "auto-generated";
          visibility: Visibility;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          objective: string;
          instructions: string;
          activity_type: ActivityType;
          estimated_duration: number;
          notes?: string;
          source?: "manual" | "auto-generated";
          visibility?: Visibility;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          objective?: string;
          instructions?: string;
          activity_type?: ActivityType;
          estimated_duration?: number;
          notes?: string;
          source?: "manual" | "auto-generated";
          visibility?: Visibility;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lesson_items: {
        Row: {
          lesson_id: string;
          learning_item_id: string;
          position: number;
        };
        Insert: {
          lesson_id: string;
          learning_item_id: string;
          position?: number;
        };
        Update: {
          lesson_id?: string;
          learning_item_id?: string;
          position?: number;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          title: string;
          type: ActivityType;
          prompt: string;
          learning_item_ids: string[];
          visibility: Visibility;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: ActivityType;
          prompt: string;
          learning_item_ids?: string[];
          visibility?: Visibility;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: ActivityType;
          prompt?: string;
          learning_item_ids?: string[];
          visibility?: Visibility;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_items: {
        Row: {
          id: string;
          activity_id: string;
          prompt: string;
          answer: string;
          options: string[];
          learning_item_id: string;
          position: number;
        };
        Insert: {
          id?: string;
          activity_id: string;
          prompt: string;
          answer: string;
          options?: string[];
          learning_item_id: string;
          position?: number;
        };
        Update: {
          id?: string;
          activity_id?: string;
          prompt?: string;
          answer?: string;
          options?: string[];
          learning_item_id?: string;
          position?: number;
        };
        Relationships: [];
      };
      practice_attempts: {
        Row: {
          id: string;
          learner_id: string | null;
          learning_item_id: string;
          status: PracticeStatus;
          feedback: string;
          attempted_at: string;
          saved_by: string;
        };
        Insert: {
          id?: string;
          learner_id?: string | null;
          learning_item_id: string;
          status: PracticeStatus;
          feedback: string;
          attempted_at?: string;
          saved_by: string;
        };
        Update: {
          id?: string;
          learner_id?: string | null;
          learning_item_id?: string;
          status?: PracticeStatus;
          feedback?: string;
          attempted_at?: string;
          saved_by?: string;
        };
        Relationships: [];
      };
      activity_results: {
        Row: {
          id: string;
          learner_id: string | null;
          activity_id: string;
          activity_type: ActivityType;
          score_percentage: number;
          correct_count: number;
          incorrect_count: number;
          time_spent_seconds: number;
          completed_at: string;
          related_learning_item_ids: string[];
          saved_by: string;
        };
        Insert: {
          id?: string;
          learner_id?: string | null;
          activity_id: string;
          activity_type: ActivityType;
          score_percentage: number;
          correct_count: number;
          incorrect_count: number;
          time_spent_seconds: number;
          completed_at?: string;
          related_learning_item_ids: string[];
          saved_by: string;
        };
        Update: {
          id?: string;
          learner_id?: string | null;
          activity_id?: string;
          activity_type?: ActivityType;
          score_percentage?: number;
          correct_count?: number;
          incorrect_count?: number;
          time_spent_seconds?: number;
          completed_at?: string;
          related_learning_item_ids?: string[];
          saved_by?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
