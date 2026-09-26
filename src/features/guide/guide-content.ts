import { BookOpen, FolderOpen, GraduationCap, Hand, Image as ImageIcon, Layers, ScrollText, Shapes, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import type { AppUser } from "@/types";

/**
 * Every word Guide mode says, in one place. The components read from here so the copy can be edited
 * without touching layout.
 */

/** The little scene a step animates. Each one is drawn by `GuideScene`. */
export type GuideScene = "cards" | "lesson" | "activity" | "student" | "media" | "category" | "gesture" | "admin";

export type GuideStep = {
  title: string;
  text: string;
  icon: LucideIcon;
  scene: GuideScene;
};

/**
 * The welcome tour, shown once on a teacher's first sign-in. It follows the real path through the app:
 * build materials and lessons in Content, run them as an activity, then hand over in Student mode.
 */
const teacherWelcomeSteps: GuideStep[] = [
  {
    title: "Build materials and lessons",
    text: "Make PECS cards and gestures in Content, then put them in order as a lesson.",
    icon: Layers,
    scene: "lesson"
  },
  {
    title: "Run an activity",
    text: "Practise a lesson as an activity, or build your own from the cards you have made.",
    icon: Shapes,
    scene: "activity"
  },
  {
    title: "Hand over in Student mode",
    text: "A simpler full-screen view for the learner, with the playground and gesture practice.",
    icon: GraduationCap,
    scene: "student"
  }
];

/** Admins view teaching content but do not change or play it, so their tour opens with these instead. */
const adminViewSteps: GuideStep[] = [
  {
    title: "See what teachers made",
    text: "Open any material, lesson, or activity in Content and Activities. They are view only for admins.",
    icon: Layers,
    scene: "lesson"
  },
  {
    title: "Try Student mode",
    text: "The learner's full-screen view, with the playground, gesture practice, and activities.",
    icon: GraduationCap,
    scene: "student"
  }
];

/** Only admins see these. */
const adminWelcomeSteps: GuideStep[] = [
  {
    title: "Look after the accounts",
    text: "Approve, deactivate, and change the role of every teacher and admin account.",
    icon: Users,
    scene: "admin"
  },
  {
    title: "See the whole picture",
    text: "Usage at a glance, everything teachers have added, and a log of who changed what.",
    icon: ScrollText,
    scene: "admin"
  }
];

/** Admins get a view-only tour plus their own steps. Teachers never see the admin ones. */
export function welcomeStepsFor(role: AppUser["role"]): GuideStep[] {
  return role === "admin" ? [...adminViewSteps, ...adminWelcomeSteps] : teacherWelcomeSteps;
}

export type PageGuide = {
  /** Short label above the steps in the pop-up. */
  title: string;
  /** The one line shown in the banner. */
  line: string;
  steps: GuideStep[];
};

/** Keyed by the `pageKey` a `GuideBanner` is given. */
export const pageGuides: Record<string, PageGuide> = {
  content: {
    title: "Around the Content page",
    line: "Everything you teach with: materials, lessons, categories, and files.",
    steps: [
      {
        title: "Materials",
        text: "PECS cards and gestures. Open one to edit it, swap its media, or build a lesson from it.",
        icon: Layers,
        scene: "cards"
      },
      {
        title: "Lessons",
        text: "A title and its cards in order. Shared or private, and it can hold many activities.",
        icon: BookOpen,
        scene: "lesson"
      },
      {
        title: "Categories",
        text: "Colour-coded groups like Snack time. Open one to see everything inside it.",
        icon: FolderOpen,
        scene: "category"
      },
      {
        title: "Media",
        text: "Every uploaded file. Delete files here, and find ones no material uses any more.",
        icon: ImageIcon,
        scene: "media"
      }
    ]
  },
  activities: {
    title: "Around Activities",
    line: "Your practice library. Play a lesson's activity, or build your own from your cards.",
    steps: [
      {
        title: "Your library",
        text: "Every activity, with its own pictures. Each format has its own color, and you can filter by it.",
        icon: Layers,
        scene: "cards"
      },
      {
        title: "Create in three steps",
        text: "Start from your own cards or a lesson, pick a format and up to five cards, then check the questions.",
        icon: Shapes,
        scene: "activity"
      },
      {
        title: "Play full screen",
        text: "Play opens a simple full-screen view with a score at the end. The top bar exits, restarts, or edits.",
        icon: GraduationCap,
        scene: "student"
      }
    ]
  },
  "gesture-practice": {
    title: "Gesture practice",
    line: "The learner signs to the camera and gets feedback on their hand shape.",
    steps: [
      {
        title: "Show the gesture",
        text: "Play the reference video, then hold the same sign in front of the camera.",
        icon: Hand,
        scene: "gesture"
      }
    ]
  },
  admin: {
    title: "Around the Admin panel",
    line: "Accounts, usage, every teacher's content, and the activity log.",
    steps: [
      {
        title: "Home",
        text: "Usage at a glance, with tiles that jump straight to what needs attention.",
        icon: LayoutDashboard,
        scene: "admin"
      },
      {
        title: "Accounts",
        text: "Approve a new teacher, change a role, or deactivate an account.",
        icon: Users,
        scene: "admin"
      },
      {
        title: "Content and the log",
        text: "Everything teachers have added, and a record of who changed what.",
        icon: ScrollText,
        scene: "media"
      }
    ]
  }
};

/**
 * Hover explanations, keyed by id. `GuideTip` looks its text up here, so a tip that loses its entry
 * simply stops rendering instead of breaking the page.
 */
export const guideTips: Record<string, string> = {
  // Shell
  "nav.content": "Your materials, lessons, categories, and uploaded files.",
  "nav.activities": "Run a lesson as an activity, or build your own.",
  "nav.playground": "A free space to try cards without being scored.",
  "nav.gestures": "Practise signing in front of the camera.",
  "nav.help": "Guides and answers to common questions.",
  "nav.admin": "Accounts, usage, and everything teachers have added.",
  "nav.student": "Switch to the simpler full-screen view a learner uses.",

  // Content
  "content.sections": "Switch between materials, lessons, categories, and files. The number is how many you have.",
  "content.types": "PECS cards are pictures a learner points at. Gestures are signs they copy.",
  "content.categories": "Show only one category. Extra categories sit in the +N more menu.",
  "content.addMaterial": "Create a new card or gesture, with its picture and audio. Name files word_category, like eat_food.png.",
  "content.addLesson": "Plan a lesson: a title and its cards in order. Add its activities in Activities.",
  "content.addCategory": "Make a new colour-coded group for your materials.",
  "content.mediaTypes": "Filter the files by kind. All shows everything that has been uploaded.",

  // Activities and gesture practice
  "activities.types": "Each format asks the learner to do something different with the same cards.",
  "activities.create": "Build an activity from your own cards or from a lesson. A lesson can hold many.",
  "activities.filter": "From lessons shows each lesson's activity. Private shows the ones only you can see.",
  "activities.typeFilter": "Show one format. Each format has its own color and icon on the cards.",
  "activities.teacherBar": "Exit to the library, start again from the first question, or edit the activity.",
  "gesture.camera": "Your camera stays on this device. It reads your hand shape and tells you if the sign matches.",

  // Admin
  "admin.sections": "Usage on Home, people in Accounts, every teacher's materials in Content, and changes in the log."
};

/** View-only wording for admins on pages where teachers build and play. */
const adminPageGuides: Record<string, PageGuide> = {
  content: {
    title: "Around the Content page",
    line: "Everything teachers teach with: materials, lessons, categories, and files. View only.",
    steps: [
      { title: "Materials", text: "PECS cards and gestures. Open one to see its picture and hear its word.", icon: Layers, scene: "cards" },
      { title: "Lessons", text: "A title and its cards in order.", icon: BookOpen, scene: "lesson" },
      { title: "Categories", text: "Colour-coded groups. Open one to see everything inside it.", icon: FolderOpen, scene: "category" },
      { title: "Media", text: "Every uploaded file, and which material uses it.", icon: ImageIcon, scene: "media" }
    ]
  },
  activities: {
    title: "Around Activities",
    line: "Every teacher's activity. Open one to see its cards and a short demo. View only.",
    steps: [
      { title: "The library", text: "Every activity, with its own pictures. Filter by format or search.", icon: Layers, scene: "cards" },
      { title: "Preview", text: "Open an activity to watch a short demo and see its cards.", icon: Shapes, scene: "activity" }
    ]
  }
};

/** The page guide for this role: admins get view-only wording where it differs. */
export function pageGuideFor(pageKey: string, role: AppUser["role"]): PageGuide | undefined {
  return (role === "admin" ? adminPageGuides[pageKey] : undefined) ?? pageGuides[pageKey];
}
