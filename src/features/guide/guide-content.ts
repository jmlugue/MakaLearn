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
 * build materials and lessons in Content, turn them into an activity, then hand over in Student mode.
 * Every text is two or three short sentences (owner's rule).
 */
const teacherWelcomeSteps: GuideStep[] = [
  {
    title: "Build materials and lessons",
    text: "In Content, make PECS cards and gestures, each with a picture and a sound. Then put cards in order as a lesson.",
    icon: Layers,
    scene: "lesson"
  },
  {
    title: "Make an activity",
    text: "In Activities, turn your cards or a lesson into a practice game. Choose Match, Fill in the blank, or Drag and drop.",
    icon: Shapes,
    scene: "activity"
  },
  {
    title: "Hand over in Student mode",
    text: "Student mode gives the learner a simple, child-friendly screen with the playground, gesture practice, and activities. Turn it on from the menu.",
    icon: GraduationCap,
    scene: "student"
  }
];

/** Admins view teaching content but do not change or play it, so their tour opens with these instead. */
const adminViewSteps: GuideStep[] = [
  {
    title: "See what teachers made",
    text: "Open any material, lesson, or activity to view it. Admins can look, but not change or play them.",
    icon: Layers,
    scene: "lesson"
  },
  {
    title: "Try Student mode",
    text: "Student mode is the learner's simple, child-friendly screen. It has the playground, gesture practice, and activities.",
    icon: GraduationCap,
    scene: "student"
  }
];

/** Only admins see these. */
const adminWelcomeSteps: GuideStep[] = [
  {
    title: "Look after the accounts",
    text: "In Admin, open Accounts to add a teacher or admin. You can also set a temporary password, or deactivate and activate an account.",
    icon: Users,
    scene: "admin"
  },
  {
    title: "See the whole picture",
    text: "Home shows usage at a glance. The Activity log shows who signed in and what changed.",
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
    line: "Where you build what you teach: materials, lessons, categories, and files.",
    steps: [
      {
        title: "Materials",
        text: "PECS cards and gestures, each with a picture and a sound. Open one to see it, edit it, or change its files.",
        icon: Layers,
        scene: "cards"
      },
      {
        title: "Lessons",
        text: "A title and cards in the order you teach them. Choose Shared or Private when you save.",
        icon: BookOpen,
        scene: "lesson"
      },
      {
        title: "Categories",
        text: "Colour groups like Food or Feelings. Open one to see the cards inside it.",
        icon: FolderOpen,
        scene: "category"
      },
      {
        title: "Media",
        text: "Every uploaded file. The Linked filter finds files no material uses, so you can delete them.",
        icon: ImageIcon,
        scene: "media"
      }
    ]
  },
  activities: {
    title: "Around Activities",
    line: "Your practice games. Make one from your cards or a lesson, then play it.",
    steps: [
      {
        title: "Your library",
        text: "Every activity you can see, each with its own pictures. Filter by format or search by name.",
        icon: Layers,
        scene: "cards"
      },
      {
        title: "Create in three steps",
        text: "Pick a format, choose up to five cards, then check the questions. Each card comes with a ready question.",
        icon: Shapes,
        scene: "activity"
      },
      {
        title: "Play full screen",
        text: "Play opens the game full screen with a score at the end. The top bar can exit, restart, or edit.",
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
        text: "Play the reference, then hold the same sign in front of the camera. MakaLearn says what it sees.",
        icon: Hand,
        scene: "gesture"
      }
    ]
  },
  admin: {
    title: "Around the Admin panel",
    line: "Look after accounts and see what teachers are doing.",
    steps: [
      {
        title: "Home",
        text: "Usage at a glance: accounts, materials, lessons, and activities.",
        icon: LayoutDashboard,
        scene: "admin"
      },
      {
        title: "Accounts",
        text: "Add an account or set a temporary password. You can also deactivate an account, and activate it again.",
        icon: Users,
        scene: "admin"
      },
      {
        title: "Content and the log",
        text: "View every teacher's content (view only). The Activity log shows who signed in and what changed.",
        icon: ScrollText,
        scene: "media"
      }
    ]
  }
};

/**
 * Hover explanations, keyed by id. Only the important actions have one, so moving the mouse around the page
 * does not keep opening bubbles (owner's request). `GuideTip` looks its text up here: a `GuideTip` whose id has
 * no entry (the sidebar links, filters, and tabs) renders its child untouched.
 */
export const guideTips: Record<string, string> = {
  "nav.student":
    "Hands the screen to the learner. Student mode shows only the playground, gesture practice, and activities, with nothing to edit. Exit it from its menu.",
  "content.addMaterial":
    "Make a new PECS card or gesture. Add a picture and a sound, then pick a category. Files are saved as word_category, like eat_food.",
  "content.addLesson":
    "Plan a lesson: give it a title and put cards in the order you teach them. Make activities from it later in Activities.",
  "activities.create":
    "Build a practice game in three steps: pick a format, choose up to five cards, then check the questions. Tick From a lesson to use a lesson's cards.",
  "activities.types":
    "Match: tap the picture for a word. Fill in the blank: pick the picture that finishes a sentence. Drag and drop: drag each picture onto its word.",
  "activities.teacherBar": "Exit goes back to the library. Restart plays from the first question, and Edit opens the activity.",
  "gesture.camera": "The camera stays on this device. It reads the hand shape and says if the sign matches.",
  "admin.sections":
    "Home shows usage at a glance. Accounts is for managing people, Content shows every teacher's work (view only), and the Activity log shows who changed what."
};

/** View-only wording for admins on pages where teachers build and play. */
const adminPageGuides: Record<string, PageGuide> = {
  content: {
    title: "Around the Content page",
    line: "Everything teachers teach with: materials, lessons, categories, and files. View only.",
    steps: [
      { title: "Materials", text: "PECS cards and gestures. Open one to see its picture and hear its word.", icon: Layers, scene: "cards" },
      { title: "Lessons", text: "A title and its cards in the order the teacher teaches them.", icon: BookOpen, scene: "lesson" },
      { title: "Categories", text: "Colour groups like Food or Feelings. Open one to see the cards inside it.", icon: FolderOpen, scene: "category" },
      { title: "Media", text: "Every uploaded file, and which material uses it.", icon: ImageIcon, scene: "media" }
    ]
  },
  activities: {
    title: "Around Activities",
    line: "Every teacher's activity. Open one to see its cards and a short demo. View only.",
    steps: [
      { title: "The library", text: "Every activity, with its own pictures. Filter by format or search by name.", icon: Layers, scene: "cards" },
      { title: "Preview", text: "Open an activity to see its cards. Learn how it plays shows a short demo.", icon: Shapes, scene: "activity" }
    ]
  }
};

/** The page guide for this role: admins get view-only wording where it differs. */
export function pageGuideFor(pageKey: string, role: AppUser["role"]): PageGuide | undefined {
  return (role === "admin" ? adminPageGuides[pageKey] : undefined) ?? pageGuides[pageKey];
}
