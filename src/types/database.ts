import type {
  ActivityType,
  AuditLogAction,
  AuditLogCategory,
  ActivityPromptTemplate,
  AppUser,
  LearningItem,
  MediaAsset,
  UserRole
} from "@/types";

type Visibility = "shared" | "private";
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type PlaygroundDecisionRow = {
  policy_version: string; input_hash: string; normalized_text: string;
  is_valid: boolean | null; construction_type: "word" | "phrase" | "sentence" | null;
  model: string; lease_token: string | null; lease_until: string | null;
  decided_at: string | null; created_at: string;
};

export type Database = {
  public: {
    Tables: {
      playground_check_decisions: {
        Row: PlaygroundDecisionRow;
        Insert: Pick<PlaygroundDecisionRow, "policy_version" | "input_hash" | "normalized_text"> & Partial<PlaygroundDecisionRow>;
        Update: Partial<PlaygroundDecisionRow>;
        Relationships: [];
      };
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
      learning_items: {
        Row: {
          id: string;
          content_type: LearningItem["contentType"];
          label: string;
          category_id: string;
          description: string;
          instruction: string;
          symbol_image_url: string | null;
          activity_image_url: string | null;
          gesture_media_url: string | null;
          audio_url: string | null;
          tags: string[];
          sentence_role: LearningItem["sentenceRole"] | null;
          grammar_kind: LearningItem["grammarKind"] | null;
          playground_preparation_status: LearningItem["playgroundPreparationStatus"] | null;
          msav_profile: LearningItem["msavProfile"] | null;
          playground_prepared_at: string | null;
          playground_classifier_model: string | null;
          playground_last_attempt_at: string | null;
          playground_preparation_error: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content_type?: LearningItem["contentType"];
          label: string;
          category_id: string;
          description: string;
          instruction: string;
          symbol_image_url?: string | null;
          activity_image_url?: string | null;
          gesture_media_url?: string | null;
          audio_url?: string | null;
          tags?: string[];
          sentence_role?: LearningItem["sentenceRole"] | null;
          grammar_kind?: LearningItem["grammarKind"] | null;
          playground_preparation_status?: LearningItem["playgroundPreparationStatus"] | null;
          msav_profile?: LearningItem["msavProfile"] | null;
          playground_prepared_at?: string | null;
          playground_classifier_model?: string | null;
          playground_last_attempt_at?: string | null;
          playground_preparation_error?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content_type?: LearningItem["contentType"];
          label?: string;
          category_id?: string;
          description?: string;
          instruction?: string;
          symbol_image_url?: string | null;
          activity_image_url?: string | null;
          gesture_media_url?: string | null;
          audio_url?: string | null;
          tags?: string[];
          sentence_role?: LearningItem["sentenceRole"] | null;
          grammar_kind?: LearningItem["grammarKind"] | null;
          playground_preparation_status?: LearningItem["playgroundPreparationStatus"] | null;
          msav_profile?: LearningItem["msavProfile"] | null;
          playground_prepared_at?: string | null;
          playground_classifier_model?: string | null;
          playground_last_attempt_at?: string | null;
          playground_preparation_error?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_assets: {
        Row: {
          deletion_pending: boolean;
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
          deletion_pending?: boolean;
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
          deletion_pending?: boolean;
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
          related_activity_id: string | null;
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
          related_activity_id?: string | null;
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
          related_activity_id?: string | null;
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
      audit_logs: {
        Row: {
          id: string;
          category: AuditLogCategory;
          action: AuditLogAction;
          actor_id: string;
          actor_name: string;
          target_type: string;
          target_id: string | null;
          target_title: string;
          detail: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: AuditLogCategory;
          action: AuditLogAction;
          actor_id: string;
          actor_name: string;
          target_type: string;
          target_id?: string | null;
          target_title: string;
          detail?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: AuditLogCategory;
          action?: AuditLogAction;
          actor_id?: string;
          actor_name?: string;
          target_type?: string;
          target_id?: string | null;
          target_title?: string;
          detail?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_results: {
        Row: {
          id: string;
          activity_id: string;
          teacher_id: string | null;
          score: number | null;
          correct_count: number;
          incorrect_count: number;
          answers: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          teacher_id: string;
          score: number;
          correct_count: number;
          incorrect_count: number;
          answers?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          teacher_id?: string;
          score?: number;
          correct_count?: number;
          incorrect_count?: number;
          answers?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_prompt_templates: {
        Row: {
          id: string;
          activity_type: ActivityPromptTemplate["activityType"];
          learning_item_id: string;
          prompt: string;
          source: ActivityPromptTemplate["source"];
          created_by: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          activity_type: ActivityPromptTemplate["activityType"];
          learning_item_id: string;
          prompt: string;
          source?: ActivityPromptTemplate["source"];
          created_by: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          activity_type?: ActivityPromptTemplate["activityType"];
          learning_item_id?: string;
          prompt?: string;
          source?: ActivityPromptTemplate["source"];
          created_by?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_prompt_generations: {
        Row: {
          id: string;
          activity_type: ActivityPromptTemplate["activityType"];
          material_hash: string;
          prompt_template_version: string;
          learning_item_ids: string[];
          prompts: Json;
          source: "hugging-face" | "gemini";
          model: string;
          version: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_type: ActivityPromptTemplate["activityType"];
          material_hash: string;
          prompt_template_version: string;
          learning_item_ids: string[];
          prompts: Json;
          source?: "hugging-face" | "gemini";
          model: string;
          version: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_type?: ActivityPromptTemplate["activityType"];
          material_hash?: string;
          prompt_template_version?: string;
          learning_item_ids?: string[];
          prompts?: Json;
          source?: "hugging-face" | "gemini";
          model?: string;
          version?: number;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_usage_events: {
        Row: {
          id: string;
          user_id: string;
          feature: string;
          activity_type: ActivityPromptTemplate["activityType"] | null;
          material_hash: string | null;
          event_type: "cache-hit" | "model-request" | "model-success" | "model-failure" | "rate-limited" | "fallback-used";
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          feature: string;
          activity_type?: ActivityPromptTemplate["activityType"] | null;
          material_hash?: string | null;
          event_type: "cache-hit" | "model-request" | "model-success" | "model-failure" | "rate-limited" | "fallback-used";
          model?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          feature?: string;
          activity_type?: ActivityPromptTemplate["activityType"] | null;
          material_hash?: string | null;
          event_type?: "cache-hit" | "model-request" | "model-success" | "model-failure" | "rate-limited" | "fallback-used";
          model?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          large_text: boolean;
          high_contrast: boolean;
          reduce_motion: boolean;
          audio_guidance: boolean;
          theme: "soft-blue" | "high-contrast";
          guide_mode: boolean;
          guide_seen: string[];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          large_text?: boolean;
          high_contrast?: boolean;
          reduce_motion?: boolean;
          audio_guidance?: boolean;
          theme?: "soft-blue" | "high-contrast";
          guide_mode?: boolean;
          guide_seen?: string[];
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          large_text?: boolean;
          high_contrast?: boolean;
          reduce_motion?: boolean;
          audio_guidance?: boolean;
          theme?: "soft-blue" | "high-contrast";
          guide_mode?: boolean;
          guide_seen?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      // Updatable security-invoker views preserve the RLS of the legacy backing tables.
      collections: Database["public"]["Tables"]["lessons"];
      collection_items: {
        Row: { collection_id: string; learning_item_id: string; position: number };
        Insert: { collection_id: string; learning_item_id: string; position?: number };
        Update: { collection_id?: string; learning_item_id?: string; position?: number };
        Relationships: [];
      };
    };
    Functions: {
      patch_user_preferences: {
        Args: { p_patch: Json };
        Returns: Json;
      };
      reserve_optional_ai_request: {
        Args: { p_user: string; p_feature: string };
        Returns: boolean;
      };
      claim_material_preparation: {
        Args: { p_user: string; p_item: string; p_version: string };
        Returns: Json;
      };
      claim_playground_check: {
        Args: { p_policy: string; p_hash: string; p_text: string; p_user: string };
        Returns: Json;
      };
      correct_playground_check: {
        Args: { p_policy: string; p_hash: string; p_text: string; p_user: string; p_valid: boolean; p_type: string | null };
        Returns: undefined;
      };
      upsert_collection_items: {
        Args: { items: Json };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
