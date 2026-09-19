// One color per main thing, used on every page (Content, Activities, Admin, Gesture practice, Student mode).
// Change a color here and it changes everywhere. Categories are not in here: teachers pick those.
//
//   PECS        soft periwinkle (indigo)
//   Gestures    sky blue
//   Lessons     blue
//   Activities  teal
//
// Tailwind needs whole class names in the source, so every shade is written out.

export type EntityKind = "pecs" | "gesture" | "lesson" | "activity";

export type EntityColor = {
  /** Thin stripe or dot. */
  accent: string;
  /** Small pill: background and text. */
  badge: string;
  /** Very light fill behind a picture. */
  soft: string;
  border: string;
  /** Hover border for a row or card in this color. */
  hoverBorder: string;
  /** Soft icon tile: background and icon color. */
  icon: string;
  /** Solid icon tile with a white icon. */
  solid: string;
  /** Text or number in this color. */
  text: string;
  /** Faint row background. */
  wash: string;
  /** Hover text color for an arrow or icon (with the group-hover prefix). */
  groupHoverText: string;
};

export const entityColors: Record<EntityKind, EntityColor> = {
  pecs: {
    accent: "bg-indigo-300",
    badge: "bg-indigo-100 text-indigo-800",
    soft: "bg-indigo-50",
    border: "border-indigo-200",
    hoverBorder: "hover:border-indigo-300",
    icon: "bg-indigo-100 text-indigo-700",
    solid: "bg-indigo-400",
    text: "text-indigo-700",
    wash: "bg-indigo-50/40",
    groupHoverText: "group-hover:text-indigo-600"
  },
  gesture: {
    accent: "bg-sky-400",
    badge: "bg-sky-100 text-sky-800",
    soft: "bg-sky-50",
    border: "border-sky-200",
    hoverBorder: "hover:border-sky-300",
    icon: "bg-sky-100 text-sky-700",
    solid: "bg-sky-500",
    text: "text-sky-700",
    wash: "bg-sky-50/40",
    groupHoverText: "group-hover:text-sky-600"
  },
  lesson: {
    accent: "bg-blue-600",
    badge: "bg-blue-100 text-blue-800",
    soft: "bg-blue-50",
    border: "border-blue-200",
    hoverBorder: "hover:border-blue-300",
    icon: "bg-blue-100 text-blue-700",
    solid: "bg-blue-600",
    text: "text-blue-700",
    wash: "bg-blue-50/40",
    groupHoverText: "group-hover:text-blue-600"
  },
  activity: {
    accent: "bg-teal-400",
    badge: "bg-teal-100 text-teal-800",
    soft: "bg-teal-50",
    border: "border-teal-200",
    hoverBorder: "hover:border-teal-300",
    icon: "bg-teal-100 text-teal-700",
    solid: "bg-teal-500",
    text: "text-teal-700",
    wash: "bg-teal-50/40",
    groupHoverText: "group-hover:text-teal-600"
  }
};

/** Color for a learning item by its content type. */
export function materialColor(contentType: "pecs" | "gesture") {
  return entityColors[contentType];
}
