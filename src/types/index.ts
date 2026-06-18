export type UserRole = "admin" | "teacher";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited";
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
  label: string;
  categoryId: string;
  description: string;
  instruction: string;
  symbolImageUrl?: string;
  gestureMediaUrl?: string;
  audioUrl?: string;
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

export type PracticeStatus =
  | "Correct"
  | "Good attempt"
  | "Needs practice"
  | "No hand detected";

export type PracticeAttempt = {
  id: string;
  learnerId?: string;
  learningItemId: string;
  status: PracticeStatus;
  feedback: string;
  attemptedAt: string;
  savedBy: string;
};

export type ActivityResult = {
  id: string;
  learnerId?: string;
  activityId: string;
  activityType: ActivityType;
  scorePercentage: number;
  correctCount: number;
  incorrectCount: number;
  timeSpentSeconds: number;
  completedAt: string;
  relatedLearningItemIds: string[];
  savedBy: string;
};
