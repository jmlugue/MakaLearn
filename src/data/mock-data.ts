import type {
  Activity,
  AppUser,
  Category,
  Learner,
  LearningItem,
  Lesson,
  MediaAsset
} from "@/types";

// Future Supabase: replace these local records with typed queries from profiles,
// learning_items, lessons, activities, media_assets, and admin audit tables.
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
    status: "deactivated"
  }
];

export const categories: Category[] = [
  {
    id: "cat-pecs-needs",
    name: "PECS needs",
    description: "Picture exchange cards for everyday classroom requests.",
    color: "#dbeafe",
    createdBy: "user-teacher"
  },
  {
    id: "cat-pecs-choices",
    name: "PECS choices",
    description: "Picture exchange cards for quick answer choices.",
    color: "#fef3c7",
    createdBy: "user-admin"
  },
  {
    id: "cat-gestures",
    name: "Fixed gestures",
    description: "Gesture references available in guided gesture practice.",
    color: "#dcfce7",
    createdBy: "user-admin"
  }
];

// Learners remain in the type system for classroom profile management.
// The current MVP does not store learner session records.
export const learners: Learner[] = [];

// These labels are starter educational records for classroom setup.
export const learningItems: LearningItem[] = [
  {
    id: "pecs-hello",
    contentType: "pecs",
    label: "Hello",
    categoryId: "cat-pecs-choices",
    description: "Use when greeting a teacher, classmate, or visitor at the start of an interaction.",
    instruction: "Show the picture card during arrival or greeting routines.",
    symbolImageUrl: "HEL",
    audioUrl: "/audio/pecs/hello.wav",
    tags: ["pecs", "greeting", "classroom"],
    createdBy: "user-teacher",
    updatedAt: "2026-05-11T09:00:00.000Z"
  },
  {
    id: "pecs-eat",
    contentType: "pecs",
    label: "Eat",
    categoryId: "cat-pecs-needs",
    description: "Use when the learner wants food, snack time, or a meal break.",
    instruction: "Show the picture card, say the word, and wait for the learner response.",
    symbolImageUrl: "EAT",
    audioUrl: "/audio/pecs/eat.wav",
    tags: ["pecs", "food", "classroom"],
    createdBy: "user-teacher",
    updatedAt: "2026-05-12T10:30:00.000Z"
  },
  {
    id: "pecs-drink",
    contentType: "pecs",
    label: "Drink",
    categoryId: "cat-pecs-needs",
    description: "Use when the learner wants water, milk, or another drink.",
    instruction: "Offer the picture card near a real cup or bottle when available.",
    symbolImageUrl: "DRK",
    audioUrl: "/audio/pecs/drink.wav",
    tags: ["pecs", "drink", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-05-15T08:15:00.000Z"
  },
  {
    id: "pecs-more",
    contentType: "pecs",
    label: "More",
    categoryId: "cat-pecs-needs",
    description: "Use when the learner wants an activity, turn, or item to continue.",
    instruction: "Pause before repeating the activity so the learner can request more.",
    symbolImageUrl: "MOR",
    audioUrl: "/audio/pecs/more.wav",
    tags: ["pecs", "request", "classroom"],
    createdBy: "user-teacher",
    updatedAt: "2026-05-18T11:20:00.000Z"
  },
  {
    id: "pecs-help",
    contentType: "pecs",
    label: "Help",
    categoryId: "cat-pecs-needs",
    description: "Use when the learner needs support, assistance, or a task broken into smaller steps.",
    instruction: "Prompt the learner to request help before the teacher intervenes.",
    symbolImageUrl: "HLP",
    audioUrl: "/audio/pecs/help.wav",
    tags: ["pecs", "support", "classroom"],
    createdBy: "user-teacher",
    updatedAt: "2026-05-19T12:10:00.000Z"
  },
  {
    id: "pecs-yes",
    contentType: "pecs",
    label: "Yes",
    categoryId: "cat-pecs-choices",
    description: "Use to answer yes, accept a choice, or confirm that something is correct.",
    instruction: "Use during simple two-choice questions.",
    symbolImageUrl: "YES",
    audioUrl: "/audio/pecs/yes.wav",
    tags: ["pecs", "choice", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-05-21T12:10:00.000Z"
  },
  {
    id: "pecs-no",
    contentType: "pecs",
    label: "No",
    categoryId: "cat-pecs-choices",
    description: "Use to answer no, reject a choice, or show that something is not wanted.",
    instruction: "Offer two choices and respect the learner response.",
    symbolImageUrl: "NO",
    audioUrl: "/audio/pecs/no.wav",
    tags: ["pecs", "choice", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-05-25T14:00:00.000Z"
  },
  // User-provided reference drawings for the gesture practice UI. These are
  // demo placeholders only; approved official content can replace them later.
  {
    id: "gesture-toilet",
    contentType: "gesture",
    label: "I want to go to toilet",
    categoryId: "cat-gestures",
    description: "Use when the learner needs to ask to use the toilet.",
    instruction: "Show the reference, start the camera, and check that both hands remain visible.",
    symbolImageUrl: "/gesture-references/toilet.png",
    gestureMediaUrl: "/gesture-references/toilet.png",
    audioUrl: "/audio/gesture-toilet.wav",
    tags: ["gesture", "fixed", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-06-10T09:00:00.000Z"
  },
  {
    id: "gesture-eat-food",
    contentType: "gesture",
    label: "I want to eat food",
    categoryId: "cat-gestures",
    description: "Use when the learner wants food or needs to communicate hunger.",
    instruction: "Keep the learner centered and check that the live hand outline follows the movement.",
    symbolImageUrl: "/gesture-references/eat-food.png",
    gestureMediaUrl: "/gesture-references/eat-food.png",
    audioUrl: "/audio/gesture-eat-food.wav",
    tags: ["gesture", "fixed", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-06-10T09:05:00.000Z"
  },
  {
    id: "gesture-drink-water",
    contentType: "gesture",
    label: "I want to drink water",
    categoryId: "cat-gestures",
    description: "Use when the learner wants water or needs a drink break.",
    instruction: "Use the hand visibility indicator before giving corrective feedback.",
    symbolImageUrl: "/gesture-references/drink-water.png",
    gestureMediaUrl: "/gesture-references/drink-water.png",
    audioUrl: "/audio/gesture-drink-water.wav",
    tags: ["gesture", "fixed", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-06-10T09:10:00.000Z"
  },
  {
    id: "gesture-help",
    contentType: "gesture",
    label: "Help",
    categoryId: "cat-gestures",
    description: "Use when the learner needs support with a task or classroom routine.",
    instruction: "Ask the learner to repeat slowly if the hand detector loses visibility.",
    symbolImageUrl: "/gesture-references/help.png",
    gestureMediaUrl: "/gesture-references/help.png",
    audioUrl: "/audio/gesture-help.wav",
    tags: ["gesture", "fixed", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-06-10T09:15:00.000Z"
  },
  {
    id: "gesture-yes",
    contentType: "gesture",
    label: "Yes",
    categoryId: "cat-gestures",
    description: "Use when the learner wants to answer yes or confirm a choice.",
    instruction: "Start only when the camera shows one person in frame.",
    symbolImageUrl: "/gesture-references/yes.png",
    gestureMediaUrl: "/gesture-references/yes.png",
    audioUrl: "/audio/gesture-yes.wav",
    tags: ["gesture", "fixed", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-06-10T09:20:00.000Z"
  },
  {
    id: "gesture-no",
    contentType: "gesture",
    label: "No",
    categoryId: "cat-gestures",
    description: "Use when the learner wants to answer no or decline a choice.",
    instruction: "Use the visibility indicator to keep feedback focused and calm.",
    symbolImageUrl: "/gesture-references/no.png",
    gestureMediaUrl: "/gesture-references/no.png",
    audioUrl: "/audio/gesture-no.wav",
    tags: ["gesture", "fixed", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-06-10T09:25:00.000Z"
  },
  {
    id: "gesture-sit-down",
    contentType: "gesture",
    label: "Sit down",
    categoryId: "cat-gestures",
    description: "Use when practising the classroom direction to sit down.",
    instruction: "Give one short cue, wait, then repeat if the learner needs another model.",
    symbolImageUrl: "/gesture-references/sit-down.png",
    gestureMediaUrl: "/gesture-references/sit-down.png",
    audioUrl: "/audio/gesture-sit-down.wav",
    tags: ["gesture", "fixed", "classroom"],
    createdBy: "user-admin",
    updatedAt: "2026-06-10T09:30:00.000Z"
  }
];

export const lessons: Lesson[] = [
  {
    id: "lesson-pecs-needs",
    title: "Snack Time PECS Requests",
    objective: "Practice choosing picture cards for food, drink, and more.",
    learningItemIds: ["pecs-eat", "pecs-drink", "pecs-more"],
    instructions: "Model each PECS card, ask the learner to choose, then run a short symbol activity.",
    activityType: "choose-correct-symbol",
    estimatedDuration: 15,
    notes: "Use classroom objects where possible.",
    source: "manual",
    visibility: "shared",
    createdBy: "user-teacher"
  }
];

export const activities: Activity[] = [
  {
    id: "activity-match-pecs",
    title: "Match PECS Words to Cards",
    type: "match-word-symbol",
    prompt: "Match each written word to the correct PECS card.",
    learningItemIds: ["pecs-eat", "pecs-drink", "pecs-more"],
    visibility: "shared",
    createdBy: "user-teacher",
    questions: [
      {
        id: "q-match-eat",
        prompt: "Word: Eat",
        answer: "EAT",
        options: ["EAT", "DRK", "MOR"],
        learningItemId: "pecs-eat"
      },
      {
        id: "q-match-drink",
        prompt: "Word: Drink",
        answer: "DRK",
        options: ["EAT", "DRK", "MOR"],
        learningItemId: "pecs-drink"
      }
    ]
  },
  {
    id: "activity-choice-pecs",
    title: "Choose the Correct PECS Card",
    type: "choose-correct-symbol",
    prompt: "Read the classroom situation, then choose the PECS card that fits.",
    learningItemIds: ["pecs-help", "pecs-yes", "pecs-no"],
    visibility: "shared",
    createdBy: "user-admin",
    questions: [
      {
        id: "q-choice-help",
        prompt: "The learner is stuck and needs support. Which card fits?",
        answer: "HLP",
        options: ["HLP", "YES", "NO"],
        learningItemId: "pecs-help"
      },
      {
        id: "q-choice-yes",
        prompt: "The learner wants to answer yes to a choice. Which card fits?",
        answer: "YES",
        options: ["HLP", "YES", "NO"],
        learningItemId: "pecs-yes"
      }
    ]
  },
  {
    id: "activity-blank-pecs",
    title: "PECS Sentence Builder",
    type: "fill-blank",
    prompt: "Complete each sentence with a PECS word.",
    learningItemIds: ["pecs-eat", "pecs-drink"],
    visibility: "private",
    createdBy: "user-teacher",
    questions: [
      {
        id: "q-blank-eat",
        prompt: "I want to ____.",
        answer: "Eat",
        options: ["Eat", "No", "Help"],
        learningItemId: "pecs-eat"
      },
      {
        id: "q-blank-drink",
        prompt: "I need a ____.",
        answer: "Drink",
        options: ["More", "Drink", "Yes"],
        learningItemId: "pecs-drink"
      }
    ]
  },
  {
    id: "activity-drag-pecs",
    title: "Drag PECS Cards",
    type: "drag-drop-symbol",
    prompt: "Drag each PECS card to its word.",
    learningItemIds: ["pecs-more", "pecs-help"],
    visibility: "shared",
    createdBy: "user-teacher",
    questions: [
      {
        id: "q-drag-more",
        prompt: "More",
        answer: "MOR",
        options: ["MOR", "HLP"],
        learningItemId: "pecs-more"
      },
      {
        id: "q-drag-help",
        prompt: "Help",
        answer: "HLP",
        options: ["MOR", "HLP"],
        learningItemId: "pecs-help"
      }
    ]
  },
  {
    id: "activity-quiz-pecs",
    title: "Simple PECS Quiz",
    type: "simple-quiz",
    prompt: "Answer the teacher-guided PECS questions.",
    learningItemIds: ["pecs-yes", "pecs-no"],
    visibility: "shared",
    createdBy: "user-admin",
    questions: [
      {
        id: "q-quiz-yes",
        prompt: "Which word answers yes to a choice?",
        answer: "Yes",
        options: ["Yes", "Help", "Drink"],
        learningItemId: "pecs-yes"
      },
      {
        id: "q-quiz-no",
        prompt: "Which word can answer no?",
        answer: "No",
        options: ["More", "No", "Eat"],
        learningItemId: "pecs-no"
      }
    ]
  }
];

export const mediaAssets: MediaAsset[] = [
  {
    id: "media-pecs-eat",
    title: "Eat PECS image placeholder",
    type: "symbol-image",
    fileName: "eat-pecs-placeholder.png",
    bucket: "symbol-images",
    uploadedBy: "user-teacher",
    uploadedAt: "2026-05-12T10:30:00.000Z",
    relatedItemId: "pecs-eat"
  },
  {
    id: "media-gesture-help",
    title: "Help gesture video placeholder",
    type: "gesture-media",
    fileName: "help-gesture-placeholder.mp4",
    bucket: "gesture-media",
    uploadedBy: "user-admin",
    uploadedAt: "2026-06-10T09:15:00.000Z",
    relatedItemId: "gesture-help"
  },
  {
    id: "media-pecs-drink-audio",
    title: "Drink PECS audio placeholder",
    type: "audio-file",
    fileName: "drink-placeholder.mp3",
    bucket: "audio-files",
    uploadedBy: "user-admin",
    uploadedAt: "2026-05-15T08:15:00.000Z",
    relatedItemId: "pecs-drink"
  }
];
