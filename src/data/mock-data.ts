import type {
  Activity,
  ActivityResult,
  AppUser,
  Category,
  Learner,
  LearningItem,
  Lesson,
  MediaAsset,
  PracticeAttempt
} from "@/types";

// Future Supabase: replace these local records with typed queries from profiles,
// learners, learning_items, lessons, activities, and result tables.
export const demoUsers: AppUser[] = [
  {
    id: "user-admin",
    name: "Amina Reyes",
    email: "admin@makalearn.local",
    role: "admin",
    status: "active"
  },
  {
    id: "user-teacher",
    name: "Jordan Lee",
    email: "teacher@makalearn.local",
    role: "teacher",
    status: "active"
  },
  {
    id: "user-teacher-2",
    name: "Priya Shah",
    email: "priya@makalearn.local",
    role: "teacher",
    status: "invited"
  }
];

export const categories: Category[] = [
  {
    id: "cat-greetings",
    name: "Greetings",
    description: "Demo words for social classroom routines.",
    color: "#dbeafe",
    createdBy: "user-teacher"
  },
  {
    id: "cat-needs",
    name: "Needs",
    description: "Demo words for everyday requests and support.",
    color: "#dcfce7",
    createdBy: "user-teacher"
  },
  {
    id: "cat-feelings",
    name: "Feelings",
    description: "Demo words for emotional check-ins.",
    color: "#fee2e2",
    createdBy: "user-admin"
  },
  {
    id: "cat-choices",
    name: "Choices",
    description: "Demo words for quick answers.",
    color: "#fef3c7",
    createdBy: "user-admin"
  }
];

export const learners: Learner[] = [
  {
    id: "learner-ella",
    name: "Ella M.",
    age: 7,
    gradeLevel: "Primary 2",
    communicationNeeds: "Benefits from visual prompts and repeated modeling.",
    preferredLearningMode: "Visual",
    assignedTeacherId: "user-teacher",
    profilePhotoUrl: "/placeholder-learner-1",
    status: "active"
  },
  {
    id: "learner-noah",
    name: "Noah K.",
    age: 9,
    gradeLevel: "Primary 4",
    communicationNeeds: "Responds well to short audio cues and gesture practice.",
    preferredLearningMode: "Mixed",
    assignedTeacherId: "user-teacher",
    profilePhotoUrl: "/placeholder-learner-2",
    status: "active"
  },
  {
    id: "learner-maya",
    name: "Maya T.",
    age: 8,
    gradeLevel: "Primary 3",
    communicationNeeds: "Needs patient wait time and teacher-guided activities.",
    preferredLearningMode: "Teacher-guided",
    assignedTeacherId: "user-teacher-2",
    profilePhotoUrl: "/placeholder-learner-3",
    status: "inactive"
  }
];

// These labels are demo-only educational placeholders. Official or approved
// Makaton content should be added later by the school or content owner.
export const learningItems: LearningItem[] = [
  {
    id: "item-hello",
    label: "Hello",
    categoryId: "cat-greetings",
    description: "A friendly greeting used when entering class.",
    instruction: "Model the greeting and invite the learner to respond.",
    symbolImageUrl: "HEL",
    gestureMediaUrl: "Gesture demo",
    audioUrl: "hello-demo.mp3",
    tags: ["social", "arrival", "demo"],
    createdBy: "user-teacher",
    updatedAt: "2026-05-10T09:00:00.000Z"
  },
  {
    id: "item-eat",
    label: "Eat",
    categoryId: "cat-needs",
    description: "A classroom request used around snack or lunch.",
    instruction: "Pair the spoken word with a picture prompt and gesture practice.",
    symbolImageUrl: "EAT",
    gestureMediaUrl: "Gesture demo",
    audioUrl: "eat-demo.mp3",
    tags: ["needs", "food", "demo"],
    createdBy: "user-teacher",
    updatedAt: "2026-05-12T10:30:00.000Z"
  },
  {
    id: "item-drink",
    label: "Drink",
    categoryId: "cat-needs",
    description: "A request for water or another drink.",
    instruction: "Use a real cup or photo card as a prompt.",
    symbolImageUrl: "DRK",
    gestureMediaUrl: "Gesture demo",
    audioUrl: "drink-demo.mp3",
    tags: ["needs", "drink", "demo"],
    createdBy: "user-admin",
    updatedAt: "2026-05-15T08:15:00.000Z"
  },
  {
    id: "item-more",
    label: "More",
    categoryId: "cat-needs",
    description: "A common request to continue an activity.",
    instruction: "Pause before repeating the activity so the learner can request more.",
    symbolImageUrl: "MOR",
    gestureMediaUrl: "Gesture demo",
    audioUrl: "more-demo.mp3",
    tags: ["request", "routine", "demo"],
    createdBy: "user-teacher",
    updatedAt: "2026-05-18T11:20:00.000Z"
  },
  {
    id: "item-help",
    label: "Help",
    categoryId: "cat-needs",
    description: "A support request for classroom tasks.",
    instruction: "Prompt the learner to ask before intervening.",
    symbolImageUrl: "HLP",
    gestureMediaUrl: "Gesture demo",
    audioUrl: "help-demo.mp3",
    tags: ["support", "independence", "demo"],
    createdBy: "user-teacher",
    updatedAt: "2026-05-19T12:10:00.000Z"
  },
  {
    id: "item-stop",
    label: "Stop",
    categoryId: "cat-choices",
    description: "A choice word for ending or pausing an activity.",
    instruction: "Practice respectfully using stop during turn-taking.",
    symbolImageUrl: "STP",
    gestureMediaUrl: "Gesture demo",
    audioUrl: "stop-demo.mp3",
    tags: ["choice", "safety", "demo"],
    createdBy: "user-admin",
    updatedAt: "2026-05-21T12:10:00.000Z"
  },
  {
    id: "item-happy",
    label: "Happy",
    categoryId: "cat-feelings",
    description: "A feeling word for check-ins.",
    instruction: "Use during morning circle or reflection.",
    symbolImageUrl: "HAP",
    gestureMediaUrl: "Gesture demo",
    audioUrl: "happy-demo.mp3",
    tags: ["feelings", "check-in", "demo"],
    createdBy: "user-teacher",
    updatedAt: "2026-05-24T14:00:00.000Z"
  },
  {
    id: "item-no",
    label: "No",
    categoryId: "cat-choices",
    description: "A clear response for choices.",
    instruction: "Offer two choices and respect the learner's response.",
    symbolImageUrl: "NO",
    gestureMediaUrl: "Gesture demo",
    audioUrl: "no-demo.mp3",
    tags: ["choice", "answer", "demo"],
    createdBy: "user-admin",
    updatedAt: "2026-05-25T14:00:00.000Z"
  }
];

export const lessons: Lesson[] = [
  {
    id: "lesson-needs",
    title: "Snack Time Requests",
    objective: "Practice requesting food, drink, and more during a guided routine.",
    learningItemIds: ["item-eat", "item-drink", "item-more"],
    instructions: "Model each item, ask the learner to choose, then run a short quiz.",
    activityType: "choose-correct-symbol",
    estimatedDuration: 15,
    notes: "Use classroom objects where possible.",
    source: "manual",
    visibility: "shared",
    createdBy: "user-teacher"
  },
  {
    id: "lesson-feelings",
    title: "Morning Feelings Check",
    objective: "Support the learner to identify and communicate a simple feeling.",
    learningItemIds: ["item-happy"],
    instructions: "Use a visual choice board and give wait time.",
    activityType: "simple-quiz",
    estimatedDuration: 10,
    notes: "Keep the interaction brief and positive.",
    source: "auto-generated",
    visibility: "shared",
    createdBy: "user-admin"
  }
];

export const activities: Activity[] = [
  {
    id: "activity-match",
    title: "Match Words to Demo Symbols",
    type: "match-word-symbol",
    prompt: "Pick the matching demo symbol for each word.",
    learningItemIds: ["item-hello", "item-eat", "item-drink"],
    visibility: "shared",
    createdBy: "user-teacher",
    questions: [
      {
        id: "q-match-hello",
        prompt: "Hello",
        answer: "HEL",
        options: ["HEL", "EAT", "DRK"],
        learningItemId: "item-hello"
      },
      {
        id: "q-match-eat",
        prompt: "Eat",
        answer: "EAT",
        options: ["HEL", "EAT", "DRK"],
        learningItemId: "item-eat"
      }
    ]
  },
  {
    id: "activity-choice",
    title: "Choose the Correct Symbol",
    type: "choose-correct-symbol",
    prompt: "Listen to the teacher prompt and choose the correct demo symbol.",
    learningItemIds: ["item-more", "item-help", "item-stop"],
    visibility: "shared",
    createdBy: "user-admin",
    questions: [
      {
        id: "q-choice-more",
        prompt: "Choose More",
        answer: "MOR",
        options: ["MOR", "HLP", "STP"],
        learningItemId: "item-more"
      },
      {
        id: "q-choice-help",
        prompt: "Choose Help",
        answer: "HLP",
        options: ["MOR", "HLP", "STP"],
        learningItemId: "item-help"
      }
    ]
  },
  {
    id: "activity-blank",
    title: "Fill in the Blank",
    type: "fill-blank",
    prompt: "Complete each sentence with a demo learning word.",
    learningItemIds: ["item-eat", "item-drink"],
    visibility: "private",
    createdBy: "user-teacher",
    questions: [
      {
        id: "q-blank-eat",
        prompt: "I want to ____.",
        answer: "Eat",
        options: ["Eat", "No", "Happy"],
        learningItemId: "item-eat"
      },
      {
        id: "q-blank-drink",
        prompt: "I need a ____.",
        answer: "Drink",
        options: ["Stop", "Drink", "Hello"],
        learningItemId: "item-drink"
      }
    ]
  },
  {
    id: "activity-drag",
    title: "Drag Symbol Cards",
    type: "drag-drop-symbol",
    prompt: "Drag each demo symbol card to its word.",
    learningItemIds: ["item-hello", "item-help"],
    visibility: "shared",
    createdBy: "user-teacher",
    questions: [
      {
        id: "q-drag-hello",
        prompt: "Hello",
        answer: "HEL",
        options: ["HEL", "HLP"],
        learningItemId: "item-hello"
      },
      {
        id: "q-drag-help",
        prompt: "Help",
        answer: "HLP",
        options: ["HEL", "HLP"],
        learningItemId: "item-help"
      }
    ]
  },
  {
    id: "activity-gesture",
    title: "Gesture Practice Round",
    type: "gesture-practice",
    prompt: "Practice the selected classroom gesture with teacher feedback.",
    learningItemIds: ["item-hello", "item-more"],
    visibility: "shared",
    createdBy: "user-teacher",
    questions: [
      {
        id: "q-gesture-more",
        prompt: "Practice More",
        answer: "Correct",
        options: ["Correct", "Good attempt", "Needs practice"],
        learningItemId: "item-more"
      }
    ]
  },
  {
    id: "activity-quiz",
    title: "Simple Classroom Quiz",
    type: "simple-quiz",
    prompt: "Answer the teacher-guided quiz questions.",
    learningItemIds: ["item-happy", "item-no"],
    visibility: "shared",
    createdBy: "user-admin",
    questions: [
      {
        id: "q-quiz-happy",
        prompt: "Which word means feeling good?",
        answer: "Happy",
        options: ["Happy", "Stop", "Drink"],
        learningItemId: "item-happy"
      },
      {
        id: "q-quiz-no",
        prompt: "Which word can answer a choice?",
        answer: "No",
        options: ["Help", "No", "Eat"],
        learningItemId: "item-no"
      }
    ]
  }
];

export const practiceAttempts: PracticeAttempt[] = [
  {
    id: "attempt-1",
    learnerId: "learner-ella",
    learningItemId: "item-hello",
    status: "Correct",
    feedback: "Clear start and finish. Keep the pace steady.",
    attemptedAt: "2026-06-02T10:00:00.000Z",
    savedBy: "user-teacher"
  },
  {
    id: "attempt-2",
    learnerId: "learner-noah",
    learningItemId: "item-more",
    status: "Good attempt",
    feedback: "Good effort. Try holding the final position a little longer.",
    attemptedAt: "2026-06-03T11:15:00.000Z",
    savedBy: "user-teacher"
  },
  {
    id: "attempt-3",
    learnerId: "learner-ella",
    learningItemId: "item-help",
    status: "Needs practice",
    feedback: "Practice the starting hand position before repeating.",
    attemptedAt: "2026-06-05T13:15:00.000Z",
    savedBy: "user-teacher"
  }
];

export const activityResults: ActivityResult[] = [
  {
    id: "result-1",
    learnerId: "learner-ella",
    activityId: "activity-match",
    activityType: "match-word-symbol",
    scorePercentage: 100,
    correctCount: 2,
    incorrectCount: 0,
    timeSpentSeconds: 110,
    completedAt: "2026-06-04T09:10:00.000Z",
    relatedLearningItemIds: ["item-hello", "item-eat"],
    savedBy: "user-teacher"
  },
  {
    id: "result-2",
    learnerId: "learner-noah",
    activityId: "activity-choice",
    activityType: "choose-correct-symbol",
    scorePercentage: 50,
    correctCount: 1,
    incorrectCount: 1,
    timeSpentSeconds: 150,
    completedAt: "2026-06-06T09:35:00.000Z",
    relatedLearningItemIds: ["item-more", "item-help"],
    savedBy: "user-teacher"
  }
];

export const mediaAssets: MediaAsset[] = [
  {
    id: "media-1",
    title: "Hello demo symbol placeholder",
    type: "symbol-image",
    fileName: "hello-placeholder.png",
    bucket: "symbol-images",
    uploadedBy: "user-teacher",
    uploadedAt: "2026-05-10T09:00:00.000Z",
    relatedItemId: "item-hello"
  },
  {
    id: "media-2",
    title: "More gesture demo placeholder",
    type: "gesture-media",
    fileName: "more-placeholder.mp4",
    bucket: "gesture-media",
    uploadedBy: "user-teacher",
    uploadedAt: "2026-05-18T11:20:00.000Z",
    relatedItemId: "item-more"
  },
  {
    id: "media-3",
    title: "Drink audio demo placeholder",
    type: "audio-file",
    fileName: "drink-placeholder.mp3",
    bucket: "audio-files",
    uploadedBy: "user-admin",
    uploadedAt: "2026-05-15T08:15:00.000Z",
    relatedItemId: "item-drink"
  }
];
