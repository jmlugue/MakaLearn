import {
  BookOpen,
  Gamepad2,
  Eye,
  FolderOpen,
  GraduationCap,
  Hand,
  Image as ImageIcon,
  Layers,
  ListChecks,
  LogOut,
  MessageSquare,
  ScrollText,
  Shapes,
  Users,
  Volume2,
  type LucideIcon
} from "lucide-react";
import type { GuideStep } from "@/features/guide/guide-content";
import type { AppUser } from "@/types";

/**
 * Every word on the Help page. Each how-to opens as short animated steps (the Guide mode scenes) and has a
 * Go there button. Admins are view only for teaching content, so they get their own topics.
 */

export type HelpTopic = {
  id: string;
  title: string;
  /** One line on the card. */
  summary: string;
  icon: LucideIcon;
  /** Where Go there leads. */
  href: string;
  /**
   * Playground, Gesture practice, and Student mode activities only open inside Student mode, so Go there turns it on
   * and opens that page. "menu" turns it on with the menu open.
   */
  studentStart?: "menu" | "/playground" | "/gesture-practice" | "/activities";
  steps: GuideStep[];
};

export type HelpFaq = { question: string; answer: string };

const addMaterial: HelpTopic = {
  id: "material",
  title: "Add a material",
  summary: "A PECS card or gesture with a picture and sound.",
  icon: Layers,
  href: "/content?open=add",
  steps: [
    { title: "Add material", text: "In Content, choose Add material. Pick PECS or Gesture and type the word.", icon: Layers, scene: "cards" },
    { title: "Picture and sound", text: "Add a picture and a sound. Files are saved as word_category, like eat_food.", icon: ImageIcon, scene: "media" },
    { title: "Pick a category", text: "Or leave it blank: it goes to No category, and you can sort it later.", icon: FolderOpen, scene: "category" }
  ]
};

const makeLesson: HelpTopic = {
  id: "lesson",
  title: "Make a lesson",
  summary: "Cards in the order you teach them.",
  icon: BookOpen,
  href: "/content?open=lesson",
  steps: [
    { title: "New lesson", text: "In Content, open Lessons and choose New lesson. Give it a title.", icon: BookOpen, scene: "lesson" },
    { title: "Cards in order", text: "Tap cards to fill the lesson order, first to last.", icon: Layers, scene: "cards" },
    { title: "Shared or private", text: "Choose when you save. Other teachers can Make a copy of a shared lesson.", icon: Users, scene: "lesson" }
  ]
};

const createActivity: HelpTopic = {
  id: "activity",
  title: "Create an activity",
  summary: "Practise cards as a game.",
  icon: Shapes,
  href: "/activities?create=1",
  steps: [
    { title: "Pick a format", text: "Match, Fill in the blank, or Drag and drop. Tick From a lesson to use its cards.", icon: Shapes, scene: "activity" },
    { title: "Choose cards", text: "Pick up to 5 cards. Each one gets a ready question.", icon: Layers, scene: "cards" },
    { title: "Save and play", text: "Check the questions, save, then press Play.", icon: ListChecks, scene: "activity" }
  ]
};

const browseContent: HelpTopic = {
  id: "browse",
  title: "See teaching content",
  summary: "View teachers' content and activities. View only.",
  icon: Eye,
  href: "/admin#content",
  steps: [
    { title: "Content", text: "In Admin, open Content to view every teacher's materials, lessons, and media. You can look, not change.", icon: Layers, scene: "lesson" },
    { title: "Activities", text: "Open an activity to view its cards and a short demo.", icon: Shapes, scene: "activity" }
  ]
};

const studentMode: HelpTopic = {
  id: "student",
  title: "Student mode",
  summary: "The learner's simple full-screen view.",
  icon: GraduationCap,
  href: "/playground",
  studentStart: "menu",
  steps: [
    { title: "Hand over", text: "Turn on Student mode from the menu. It gives the learner a simple, child-friendly screen.", icon: GraduationCap, scene: "student" },
    { title: "Three places", text: "Playground, Gesture practice, and Activities.", icon: Shapes, scene: "activity" },
    { title: "When done", text: "Open the menu and choose Exit student mode.", icon: LogOut, scene: "student" }
  ]
};

const playground: HelpTopic = {
  id: "playground",
  title: "Playground",
  summary: "Build a sentence from cards.",
  icon: MessageSquare,
  href: "/playground",
  studentStart: "/playground",
  steps: [
    { title: "Build a phrase or sentence", text: "Drag up to 5 cards onto the board.", icon: Layers, scene: "cards" },
    { title: "Check and Listen", text: "Press Check to see if the sentence is correct. Press Listen to hear it read aloud.", icon: Volume2, scene: "student" }
  ]
};

const gesturePractice: HelpTopic = {
  id: "gesture",
  title: "Gesture practice",
  summary: "Sign to the camera and get feedback.",
  icon: Hand,
  href: "/gesture-practice",
  studentStart: "/gesture-practice",
  steps: [
    { title: "Free practice", text: "Turn on the camera and show a gesture. MakaLearn says what it sees.", icon: Hand, scene: "gesture" },
    { title: "Feedback", text: "In free practice, the AI gives corrective feedback for the learner and the teacher.", icon: Eye, scene: "gesture" },
    { title: "Guided practice", text: "Another option: the learner copies seven signs in a row, with a countdown before each.", icon: ListChecks, scene: "gesture" }
  ]
};

const studentActivities: HelpTopic = {
  id: "student-activities",
  title: "Student mode activities",
  summary: "How learners play an activity.",
  icon: Gamepad2,
  href: "/activities",
  studentStart: "/activities",
  steps: [
    { title: "Pick an activity", text: "In Student mode, open Activities and tap a picture tile.", icon: Shapes, scene: "student" },
    { title: "Tap the answer", text: "Tap the right picture. A right answer says Correct!; a wrong one shakes and shows the right card.", icon: Layers, scene: "activity" },
    { title: "Drag and drop", text: "Drag each picture onto its word. A wrong one shakes and goes back.", icon: Hand, scene: "activity" },
    { title: "See the score", text: "Maki shows the score at the end. Play again or pick another activity.", icon: ListChecks, scene: "activity" }
  ]
};

const accounts: HelpTopic = {
  id: "accounts",
  title: "Accounts",
  summary: "Add, activate, and look after accounts.",
  icon: Users,
  href: "/admin#accounts",
  steps: [
    { title: "Add an account", text: "In Admin, open Accounts and choose Add account.", icon: Users, scene: "admin" },
    { title: "Forgotten password", text: "Set a temporary password, copy it, and give it to the teacher.", icon: Users, scene: "admin" },
    { title: "Turn off or on", text: "Deactivate stops someone from signing in. Activate lets them back in.", icon: Users, scene: "admin" }
  ]
};

const activityLog: HelpTopic = {
  id: "log",
  title: "Activity log",
  summary: "Who signed in and what changed.",
  icon: ScrollText,
  href: "/admin#activity",
  steps: [
    { title: "Activity log", text: "In Admin, open Activity log. Filter by type and date.", icon: ScrollText, scene: "admin" }
  ]
};

export function helpTopicsFor(role: AppUser["role"]): HelpTopic[] {
  return role === "admin"
    ? [accounts, browseContent, activityLog, studentMode, playground, gesturePractice, studentActivities]
    : [addMaterial, makeLesson, createActivity, studentMode, playground, gesturePractice, studentActivities];
}

// The questions from the old Help page are kept (updated to today's app), plus newer ones.
const sharedFaqs: HelpFaq[] = [
  {
    question: "What is the difference between a lesson and an activity?",
    answer: "A lesson is the plan: a title, a short description, and the cards in order. Activities are how the learner practises them. A lesson can hold many activities, made in Activities with From a lesson ticked, and an activity can also stand on its own."
  },
  {
    question: "Where do I find an activity after creating it?",
    answer: "Open Activities. Every activity is in the library. From lessons shows each lesson's activities, Private shows the ones only you can see, and the type filter shows one format."
  },
  {
    question: "Why did my gesture lesson open Gesture practice instead of Activities?",
    answer: "Gestures are practised with the camera in Gesture practice, so they do not make activities. Activities use PECS cards."
  },
  {
    question: "What is Student mode for?",
    answer: "It hides teacher tools and keeps the learner in Playground, Gesture practice, and Activities, with big buttons and a simple full screen."
  },
  {
    question: "Can learners sign in by themselves?",
    answer: "No. A teacher signs in and turns on Student mode for the learner."
  },
  {
    question: "Are scores or Guided 7 results saved?",
    answer: "No. Activity scores show at the end of a round, and Guided 7 shows a short summary at the end of the session. Neither is saved."
  },
  {
    question: "Why is some media shown as placeholder content?",
    answer: "MakaLearn does not include official Makaton symbols or audio yet. Replace placeholders with approved classroom materials."
  },
  {
    question: "Why was my file renamed?",
    answer: "Files are saved as word_category, like eat_food, so everyone can find them."
  },
  {
    question: "What is No category?",
    answer: "A place for materials that are not sorted yet. Edit a material any time to pick a category."
  },
  {
    question: "How do I change the voice?",
    answer: "Open Settings and pick a voice and speed for this device. Card audio stays the same."
  },
  {
    question: "I forgot my password.",
    answer: "Ask your administrator for a temporary password."
  },
  {
    question: "Why does MakaLearn use Supabase?",
    answer: "Supabase keeps sign-ins, files, and records safe in one place. Demo records are sample data for setup and testing."
  }
];

const adminFaqs: HelpFaq[] = [
  {
    question: "Why can't I edit or play content as an admin?",
    answer: "Admins are view only for teaching content. Teachers make and run it. Student mode works for everyone."
  }
];

export function helpFaqsFor(role: AppUser["role"]): HelpFaq[] {
  return role === "admin" ? [...adminFaqs, ...sharedFaqs] : sharedFaqs;
}

/** Search matches a topic's title, summary, and step text, or a question and its answer. */
export function matchesHelp(query: string, ...texts: string[]) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = texts.join(" ").toLowerCase();
  return words.every((word) => haystack.includes(word));
}
