import { Activity, BookOpen, FolderOpen, GraduationCap, Hand, Image as ImageIcon, Layers, ScrollText, Shield, Users, type LucideIcon } from "lucide-react";
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
    text: "Make PECS cards and gestures in Content, then group them into a lesson with a goal.",
    icon: Layers,
    scene: "lesson"
  },
  {
    title: "Run an activity",
    text: "Practise a lesson as an activity, or build your own from the cards you have made.",
    icon: Activity,
    scene: "activity"
  },
  {
    title: "Hand over in Student mode",
    text: "A simpler full-screen view for the learner, with the playground and gesture practice.",
    icon: GraduationCap,
    scene: "student"
  }
];

/** Only admins see these, and they come after the teacher steps because an admin does both jobs. */
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

/** Admins get the teacher tour plus their own steps. Teachers never see the admin ones. */
export function welcomeStepsFor(role: AppUser["role"]): GuideStep[] {
  return role === "admin" ? [...teacherWelcomeSteps, ...adminWelcomeSteps] : teacherWelcomeSteps;
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
        text: "A goal, a set of materials, and the activity the learner will practise.",
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
        text: "Choose a format, pick up to five cards, then check the questions. A lesson's activity is made in Content.",
        icon: Activity,
        scene: "activity"
      },
      {
        title: "Play full screen",
        text: "Play opens a simple full-screen view. The top bar exits, restarts, or edits.",
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
        icon: Shield,
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
  "content.types": "PECS cards are pictures a learner points at. Gestures are signs they copy from a video.",
  "content.categories": "Show only one category. Extra categories sit in the +N more menu.",
  "content.addMaterial": "Create a new card or gesture, with its picture, video, and audio.",
  "content.addLesson": "Build a lesson: a goal, a set of materials, and an activity to practise them.",
  "content.addCategory": "Make a new colour-coded group for your materials.",
  "content.mediaTypes": "Filter the files by kind. All shows everything that has been uploaded.",

  // Activities and gesture practice
  "activities.types": "Each format asks the learner to do something different with the same cards.",
  "activities.create": "Build an activity from your own cards. A lesson's activity is made from the lesson in Content.",
  "activities.filter": "From lessons shows each lesson's activity. Private shows the ones only you can see.",
  "activities.typeFilter": "Show one format. Each format has its own color on the cards.",
  "activities.teacherBar": "Exit to the library, start again from the first question, or edit the activity.",
  "gesture.camera": "Your camera stays on this device. It reads your hand shape and tells you if the sign matches.",

  // Admin
  "admin.sections": "Usage on Home, people in Accounts, every teacher's materials in Content, and changes in the log."
};
