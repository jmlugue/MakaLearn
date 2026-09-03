export type UserRole = "admin" | "teacher";

export type AuditLogCategory = "auth" | "content" | "activity" | "gesture" | "settings" | "admin";

export type AuditLogAction = "login" | "logout" | "upload" | "create" | "edit" | "delete";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "deactivated";
};

export type PreferredLearningMode =
  | "Visual"
  | "Audio"
  | "Gesture"
  | "Mixed"
  | "Teacher-guided";

export type Learner = {
  id: string;
  name: string;
  age: number;
  gradeLevel: string;
  communicationNeeds: string;
  preferredLearningMode: PreferredLearningMode;
  assignedTeacherId: string;
  profilePhotoUrl: string;
  status: "active" | "inactive";
};

export type Category = {
  id: string;
  name: string;
  description: string;
  color: string;
  createdBy: string;
};

export type SentenceRole =
  | "subject"
  | "verb"
  | "object"
  | "emotion"
  | "command"
  | "greeting"
  | "response"
  | "polite_word"
  | "be_verb"
  | "safety_word";

export type MediaAsset = {
  id: string;
  title: string;
  type: "symbol-image" | "gesture-media" | "audio-file" | "learner-photo";
  fileName: string;
  bucket: "symbol-images" | "gesture-media" | "audio-files" | "learner-photos";
  storagePath?: string;
  publicUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
  relatedItemId?: string;
};

export type LearningItem = {
  id: string;
  contentType: "pecs" | "gesture";
  label: string;
  categoryId: string;
  description: string;
  instruction: string;
  symbolImageUrl?: string;
  gestureMediaUrl?: string;
  audioUrl?: string;
  // Supabase stores sentence_role on learning_items; the manifest can still
  // help classify imported PECS/AAC seed material.
  sentenceRole?: SentenceRole;
  tags: string[];
  createdBy: string;
  updatedAt: string;
};

export type Lesson = {
  id: string;
  title: string;
  objective: string;
  learningItemIds: string[];
  instructions: string;
  activityType: ActivityType;
  estimatedDuration: number;
  notes: string;
  relatedActivityId?: string;
  source: "manual" | "auto-generated";
  visibility: "shared" | "private";
  createdBy: string;
};

export type ActivityType =
  | "match-word-symbol"
  | "choose-correct-symbol"
  | "fill-blank"
  | "drag-drop-symbol"
  | "gesture-practice"
  | "simple-quiz";

export type Activity = {
  id: string;
  title: string;
  type: ActivityType;
  prompt: string;
  learningItemIds: string[];
  questions: ActivityQuestion[];
  visibility: "shared" | "private";
  createdBy: string;
};

export type ActivityQuestion = {
  id: string;
  prompt: string;
  answer: string;
  options: string[];
  learningItemId: string;
};

export type AuditLog = {
  id: string;
  category: AuditLogCategory;
  action: AuditLogAction;
  actorId: string;
  actorName: string;
  targetType: string;
  targetId?: string;
  targetTitle: string;
  detail: string;
  createdAt: string;
};

export type PracticeAttemptStatus = "correct" | "good-attempt" | "needs-practice" | "no-hand-detected";

export type PracticeAttempt = {
  id: string;
  learnerId?: string;
  learningItemId: string;
  teacherId: string;
  status: PracticeAttemptStatus;
  feedback: string;
  createdAt: string;
};

export type ActivityResult = {
  id: string;
  activityId: string;
  learnerId?: string;
  teacherId: string;
  score: number;
  correctCount: number;
  incorrectCount: number;
  answers: Record<string, string>;
  createdAt: string;
};

export type ActivityPromptTemplate = {
  id: string;
  activityType: Extract<ActivityType, "choose-correct-symbol" | "fill-blank">;
  learningItemId: string;
  prompt: string;
  source: "hugging-face" | "local-fallback" | "manual";
  createdBy: string;
  updatedAt: string;
};

export type UserSettings = {
  userId: string;
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  audioGuidance: boolean;
  theme: "soft-blue" | "high-contrast";
  updatedAt: string;
};
