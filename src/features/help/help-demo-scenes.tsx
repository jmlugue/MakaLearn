"use client";

import { BookOpen, Check, ChevronDown, Hand, Image as ImageIcon, Layers, Music, Play, Shapes, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CardPic,
  MockButton,
  MockDialog,
  MockField,
  MockLabel,
  MockPage,
  MockToast,
  Pointer,
  Pop,
  pressedAt,
  typed,
  type DemoScene
} from "@/features/help/help-demo";

/**
 * The Show me scenes for Help's main guides. Each is a simplified copy of the real screen (same names, colors, and
 * order of actions), drawn on the 640 x 360 stage. Pointer points are the centers of the boxes they click.
 * Guides without scenes here still open the step cards.
 */

export const DIALOG = { x: 90, y: 22, w: 460, h: 316 };
/** Stage point of a spot inside the dialog. */
export const inDialog = (x: number, y: number): [number, number] => [DIALOG.x + x, DIALOG.y + y];

/* ---------- Content page ---------- */

export const ACTION = { x: 500, y: 18, w: 120, h: 34 };
export const ACTION_CENTER: [number, number] = [560, 35];
const tabs = [
  { label: "Materials", x: 72, w: 92 },
  { label: "Collections", x: 170, w: 100 },
  { label: "Categories", x: 276, w: 96 },
  { label: "Media", x: 378, w: 70 }
];
const LESSONS_TAB: [number, number] = [220, 79];

/** `action` is the header button; admins (view only) get none. */
export function ContentPage({ tab, action, actionPressed, children }: { tab: string; action?: string; actionPressed?: boolean; children?: React.ReactNode }) {
  return (
    <MockPage title="Content" icon={Layers}>
      {action ? (
        <MockButton box={ACTION} pressed={actionPressed}>
          + {action}
        </MockButton>
      ) : null}
      {tabs.map((item) => (
        <div
          key={item.label}
          className={cn(
            "absolute top-[64px] flex h-[30px] items-center justify-center rounded-full text-[12px] font-bold",
            item.label === tab ? "bg-blue-600 text-white" : "bg-white/80 text-slate-600"
          )}
          style={{ left: item.x, width: item.w }}
        >
          {item.label}
        </div>
      ))}
      {children}
    </MockPage>
  );
}

export function CardGrid({ words }: { words: string[] }) {
  return (
    <>
      {words.map((word, index) => (
        <Pop key={word} show className="absolute" style={{ left: 72 + index * 82, top: 112, width: 70, height: 93 }}>
          <CardPic word={word} box={{ x: 0, y: 0, w: 70, h: 93 }} className="shadow-sm" />
        </Pop>
      ))}
    </>
  );
}

/* ---------- Add a material ---------- */

const materialFields = (t: number, state: { label: string; labelFocus?: boolean; category: string; picture: boolean; audio: boolean; listOpen?: boolean; savePressed?: boolean }) => (
  <>
    <div className="absolute left-5 top-12 flex gap-1.5">
      <span className="flex h-7 w-[84px] items-center justify-center gap-1 rounded-full bg-blue-600 text-[12px] font-bold text-white">
        <ImageIcon className="h-3.5 w-3.5" /> PECS
      </span>
      <span className="flex h-7 w-[84px] items-center justify-center gap-1 rounded-full bg-slate-100 text-[12px] font-bold text-slate-500">
        <Hand className="h-3.5 w-3.5" /> Gesture
      </span>
    </div>
    <MockLabel x={20} y={88}>Label</MockLabel>
    <MockField box={{ x: 20, y: 104, w: 250, h: 32 }} value={state.label} placeholder="Eat" focused={state.labelFocus} />
    <MockLabel x={20} y={146}>Category</MockLabel>
    <div className="absolute flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold" style={{ left: 20, top: 162, width: 250, height: 32 }}>
      <span className={state.category ? "text-ink" : "text-slate-400"}>{state.category || "Pick a category"}</span>
      <ChevronDown className="h-4 w-4 text-slate-400" />
    </div>
    <UploadBox x={20} label="Card image" file={state.picture ? "eat_food.png" : ""} icon={ImageIcon} />
    <UploadBox x={150} label="Audio" file={state.audio ? "eat_food.mp3" : ""} icon={Music} />
    {state.listOpen ? (
      <div className="absolute z-10 overflow-hidden rounded-xl border border-slate-200 bg-white text-[13px] font-semibold shadow-lg" style={{ left: 20, top: 196, width: 250 }}>
        {["Food", "Feelings", "Actions"].map((item) => (
          <p key={item} className={cn("px-3 py-1.5", item === "Food" && t >= 3500 ? "bg-blue-50 text-blue-700" : "text-ink")}>
            {item}
          </p>
        ))}
      </div>
    ) : null}
    <MockLabel x={310} y={48}>Live preview</MockLabel>
    <div className="absolute flex flex-col items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/60" style={{ left: 310, top: 68, width: 130, height: 172 }}>
      {state.picture ? (
        <CardPic word="eat" box={{ x: 12, y: 10, w: 106, h: 140 }} />
      ) : (
        <>
          <ImageIcon className="h-8 w-8 text-indigo-200" />
          <span className="mt-2 text-[13px] font-black text-indigo-900">{state.label}</span>
        </>
      )}
      {state.category ? (
        <span className="absolute bottom-2 rounded-full bg-amber-100 px-2 text-[10px] font-bold text-amber-800">{state.category}</span>
      ) : null}
    </div>
    <MockButton box={{ x: 270, y: 270, w: 80, h: 32 }} variant="outline">
      Cancel
    </MockButton>
    <MockButton box={{ x: 360, y: 270, w: 80, h: 32 }} pressed={state.savePressed}>
      Save
    </MockButton>
  </>
);

function UploadBox({ x, label, file, icon: Icon }: { x: number; label: string; file: string; icon: typeof ImageIcon }) {
  return (
    <div
      className={cn(
        "absolute flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-[11px] font-bold",
        file ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50/50 text-blue-700"
      )}
      style={{ left: x, top: 214, width: 120, height: 48 }}
    >
      {file ? (
        <>
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> {label}
          </span>
          <span className="font-semibold text-slate-600">{file}</span>
        </>
      ) : (
        <>
          <Icon className="h-4 w-4" />
          <span className="flex items-center gap-1">
            <Upload className="h-3 w-3" /> {label}
          </span>
        </>
      )}
    </div>
  );
}

const LABEL_FIELD = inDialog(145, 120);
const CATEGORY_FIELD = inDialog(145, 178);
const FOOD_ITEM = inDialog(145, 210);
const PICTURE_UPLOAD = inDialog(80, 238);
const AUDIO_UPLOAD = inDialog(210, 238);
const SAVE = inDialog(400, 286);
export const startWords = ["drink", "happy", "hello", "help", "milk", "sad"];

const materialScenes: DemoScene[] = [
  {
    label: "Add material",
    caption: "In Content, choose Add material.",
    duration: 4000,
    render: (t) => (
      <>
        <ContentPage tab="Materials" action="Add material" actionPressed={pressedAt(t, 1400)}>
          <CardGrid words={startWords} />
        </ContentPage>
        <MockDialog show={t >= 1700} box={DIALOG} title="Add material">
          {materialFields(t, { label: "", category: "", picture: false, audio: false })}
        </MockDialog>
        <Pointer t={t} path={[[0, 330, 260], [600, ...ACTION_CENTER], [1400, ...ACTION_CENTER, true]]} />
      </>
    )
  },
  {
    label: "Word and category",
    caption: "Pick PECS, type the word, and pick a category.",
    duration: 5400,
    render: (t) => (
      <>
        <ContentPage tab="Materials" action="Add material">
          <CardGrid words={startWords} />
        </ContentPage>
        <MockDialog show box={DIALOG} title="Add material">
          {materialFields(t, {
            label: typed("Eat", t, 1300, 180),
            labelFocus: t >= 1000 && t < 2300,
            category: t >= 4200 ? "Food" : "",
            picture: false,
            audio: false,
            listOpen: t >= 2900 && t < 4200
          })}
        </MockDialog>
        <Pointer
          t={t}
          path={[
            [0, 420, 320],
            [400, ...LABEL_FIELD],
            [1000, ...LABEL_FIELD, true],
            [2300, ...CATEGORY_FIELD],
            [2800, ...CATEGORY_FIELD, true],
            [3400, ...FOOD_ITEM],
            [4100, ...FOOD_ITEM, true]
          ]}
        />
      </>
    )
  },
  {
    label: "Picture, sound, Save",
    caption: "Add a picture and a sound, then Save. Files are saved as word_category.",
    duration: 6400,
    render: (t) => (
      <>
        <ContentPage tab="Materials" action="Add material">
          <CardGrid words={t >= 4300 ? ["eat", ...startWords.slice(0, 5)] : startWords} />
          <MockToast show={t >= 4500} text="Material added" />
        </ContentPage>
        <MockDialog show={t < 4200} box={DIALOG} title="Add material">
          {materialFields(t, {
            label: "Eat",
            category: "Food",
            picture: t >= 1300,
            audio: t >= 2700,
            savePressed: pressedAt(t, 3900)
          })}
        </MockDialog>
        <Pointer
          t={t}
          path={[
            [0, 300, 150],
            [400, ...PICTURE_UPLOAD],
            [1000, ...PICTURE_UPLOAD, true],
            [1800, ...AUDIO_UPLOAD],
            [2400, ...AUDIO_UPLOAD, true],
            [3300, ...SAVE],
            [3900, ...SAVE, true],
            [4700, 107, 170]
          ]}
        />
      </>
    )
  }
];

/* ---------- Make a lesson ---------- */

const lessonRows = [
  { title: "Greetings", words: ["hello", "goodbye", "good_morning"] },
  { title: "Food words", words: ["eat", "drink", "milk"] }
];

function LessonList({ rows }: { rows: typeof lessonRows }) {
  return (
    <>
      {rows.map((row, index) => (
        <Pop key={row.title} show className="absolute flex items-center gap-3 rounded-2xl border border-white bg-white/85 px-4 shadow-sm" style={{ left: 72, top: 112 + index * 72, width: 548, height: 62 }}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700">
            <BookOpen className="h-4 w-4" />
          </span>
          <span className="w-40 text-[14px] font-black text-ink">{row.title}</span>
          <span className="relative h-[52px] flex-1">
            {row.words.map((word, cardIndex) => (
              <span key={word} className="absolute top-0" style={{ left: cardIndex * 44, width: 39, height: 52 }}>
                <span className="absolute -left-1 -top-1 z-10 grid h-4 w-4 place-items-center rounded-full bg-blue-600 text-[9px] font-black text-white">{cardIndex + 1}</span>
                <CardPic word={word} box={{ x: 0, y: 0, w: 39, h: 52 }} />
              </span>
            ))}
          </span>
        </Pop>
      ))}
    </>
  );
}

const lessonSteps = ["Details", "Cards", "Review"];
const feelings = ["happy", "sad", "angry", "tired", "scared"];
const TITLE_FIELD = inDialog(230, 93);
const NEXT = inDialog(400, 286);
const pickCenter = (index: number): [number, number] => inDialog(20 + index * 62 + 27, 214);

function SlotsAndLibrary({ picked, slots, label, t, tapTimes }: { picked: number; slots: number; label: string; t: number; tapTimes: number[] }) {
  return (
    <>
      <MockLabel x={20} y={56}>{label}</MockLabel>
      {Array.from({ length: slots }, (_, index) => (
        <div key={index} className="absolute rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50" style={{ left: 20 + index * 62, top: 74, width: 54, height: 72 }}>
          <span className="absolute left-1 top-1 text-[10px] font-black text-blue-300">{index + 1}</span>
          {index < picked ? (
            <Pop show className="absolute inset-0">
              <CardPic word={feelings[index]} box={{ x: -2, y: -2, w: 54, h: 72 }} className="border-blue-400" />
            </Pop>
          ) : null}
        </div>
      ))}
      <MockLabel x={20} y={160}>Choose cards</MockLabel>
      {feelings.map((word, index) => (
        <CardPic
          key={word}
          word={word}
          box={{ x: 20 + index * 62, y: 178, w: 54, h: 72 }}
          className={cn(index < picked && "opacity-40", pressedAt(t, tapTimes[index] ?? -1) && "scale-95")}
        />
      ))}
    </>
  );
}

const lessonScenes: DemoScene[] = [
  {
    label: "New collection",
    caption: "In Content, open Collections and choose New collection.",
    duration: 4600,
    render: (t) => (
      <>
        <ContentPage tab={t >= 1300 ? "Collections" : "Materials"} action={t >= 1300 ? "New collection" : "Add material"} actionPressed={pressedAt(t, 2600)}>
          {t >= 1300 ? <LessonList rows={lessonRows} /> : <CardGrid words={startWords} />}
        </ContentPage>
        <MockDialog show={t >= 2900} box={DIALOG} title="New collection" steps={lessonSteps} step={0}>
          <MockLabel x={20} y={60}>Title</MockLabel>
          <MockField box={{ x: 20, y: 76, w: 420, h: 34 }} value="" placeholder="Collection title" />
        </MockDialog>
        <Pointer t={t} path={[[0, 330, 260], [500, ...LESSONS_TAB], [1200, ...LESSONS_TAB, true], [1900, ...ACTION_CENTER], [2600, ...ACTION_CENTER, true]]} />
      </>
    )
  },
  {
    label: "Title and cards",
    caption: "Give it a title. Then tap cards in the order you teach them.",
    duration: 6800,
    render: (t) => {
      const onCards = t >= 3100;
      const taps = [3900, 4700, 5500];
      const picked = taps.filter((time) => t >= time + 100).length;
      return (
        <>
          <ContentPage tab="Collections" action="New collection">
            <LessonList rows={lessonRows} />
          </ContentPage>
          <MockDialog show box={DIALOG} title="New collection" steps={lessonSteps} step={onCards ? 1 : 0}>
            {onCards ? (
              <SlotsAndLibrary picked={picked} slots={4} label="Collection order" t={t} tapTimes={taps} />
            ) : (
              <>
                <MockLabel x={20} y={60}>Title</MockLabel>
                <MockField box={{ x: 20, y: 76, w: 420, h: 34 }} value={typed("Feelings", t, 1100, 120)} placeholder="Collection title" focused={t >= 900} />
                <MockLabel x={20} y={124}>Description (optional)</MockLabel>
                <MockField box={{ x: 20, y: 140, w: 420, h: 60 }} value="" />
              </>
            )}
            <MockButton box={{ x: 360, y: 270, w: 80, h: 32 }} pressed={pressedAt(t, 2900)}>
              Next
            </MockButton>
          </MockDialog>
          <Pointer
            t={t}
            path={[
              [0, 300, 250],
              [300, ...TITLE_FIELD],
              [900, ...TITLE_FIELD, true],
              [2300, ...NEXT],
              [2900, ...NEXT, true],
              [3400, ...pickCenter(0)],
              [3900, ...pickCenter(0), true],
              [4200, ...pickCenter(1)],
              [4700, ...pickCenter(1), true],
              [5000, ...pickCenter(2)],
              [5500, ...pickCenter(2), true]
            ]}
          />
        </>
      );
    }
  },
  {
    label: "Save",
    caption: "Choose Shared or Private, then Save collection.",
    duration: 5600,
    render: (t) => {
      const shared = t >= 1100;
      return (
        <>
          <ContentPage tab="Collections" action="New collection">
            <LessonList rows={t >= 2900 ? [{ title: "Feelings", words: ["happy", "sad", "angry"] }, ...lessonRows] : lessonRows} />
            <MockToast show={t >= 3000} text="Collection saved" />
          </ContentPage>
          <MockDialog show={t < 2700} box={DIALOG} title="New collection" steps={lessonSteps} step={2}>
            <p className="absolute left-5 top-14 text-[15px] font-black text-ink">Feelings</p>
            {["happy", "sad", "angry"].map((word, index) => (
              <span key={word} className="absolute" style={{ left: 20 + index * 70, top: 82, width: 60, height: 80 }}>
                <span className="absolute -left-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[10px] font-black text-white">{index + 1}</span>
                <CardPic word={word} box={{ x: 0, y: 0, w: 60, h: 80 }} />
              </span>
            ))}
            <MockLabel x={20} y={178}>Who can see it</MockLabel>
            <div className="absolute flex gap-1.5" style={{ left: 20, top: 196 }}>
              <span className={cn("flex h-8 w-[100px] items-center justify-center rounded-full text-[12px] font-bold", shared ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}>Shared</span>
              <span className={cn("flex h-8 w-[100px] items-center justify-center rounded-full text-[12px] font-bold", shared ? "bg-slate-100 text-slate-500" : "bg-blue-600 text-white")}>Private</span>
            </div>
            <MockButton box={{ x: 340, y: 270, w: 100, h: 32 }} pressed={pressedAt(t, 2400)}>
              Save collection
            </MockButton>
          </MockDialog>
          <Pointer t={t} path={[[0, 330, 260], [500, ...inDialog(70, 212)], [1000, ...inDialog(70, 212), true], [1800, ...inDialog(390, 286)], [2400, ...inDialog(390, 286), true], [3300, 300, 150]]} />
        </>
      );
    }
  }
];

/* ---------- Create an activity ---------- */

const formats = [
  { label: "Match", tone: "bg-violet-100 text-violet-800 border-violet-200", stripe: "bg-violet-300" },
  { label: "Fill in the blank", tone: "bg-yellow-100 text-yellow-800 border-yellow-200", stripe: "bg-yellow-300" },
  { label: "Drag and drop", tone: "bg-pink-100 text-pink-800 border-pink-200", stripe: "bg-pink-300" }
];
const activitySteps = ["Format", "Cards", "Review"];
export const libraryCards = [
  { title: "Greetings match", stripe: "bg-violet-300", words: ["hello", "goodbye"] },
  { title: "Food fill in the blank", stripe: "bg-yellow-300", words: ["eat", "drink"] },
  { title: "Actions drag and drop", stripe: "bg-pink-300", words: ["sit", "stand"] }
];

/** `viewOnly` (admins) hides Create activity and Play. */
export function ActivitiesPage({
  cards,
  actionPressed,
  playPressed,
  viewOnly = false,
  children
}: {
  cards: typeof libraryCards;
  actionPressed?: boolean;
  playPressed?: boolean;
  viewOnly?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <MockPage title="Activities" icon={Shapes}>
      {viewOnly ? null : (
        <MockButton box={ACTION} pressed={actionPressed}>
          + Create activity
        </MockButton>
      )}
      {cards.map((card, index) => (
        <Pop key={card.title} show className="absolute overflow-hidden rounded-2xl border border-white bg-white/90 shadow-sm" style={{ left: 72 + index * 184, top: 70, width: 170, height: 140 }}>
          <span className={cn("absolute inset-x-0 top-0 h-1.5", card.stripe)} />
          {card.words.map((word, cardIndex) => (
            <CardPic key={word} word={word} plain box={{ x: 12 + cardIndex * 48, y: 14, w: 42, h: 56 }} />
          ))}
          <p className="absolute left-3 right-3 top-[76px] truncate text-[12px] font-black text-ink">{card.title}</p>
          {viewOnly ? null : index === 0 ? (
            <span className={cn("absolute bottom-3 left-3 flex h-7 w-16 items-center justify-center gap-1 rounded-lg bg-blue-600 text-[12px] font-bold text-white transition-transform", playPressed && "scale-95")}>
              <Play className="h-3 w-3 fill-current" /> Play
            </span>
          ) : (
            <span className="absolute bottom-3 left-3 flex h-7 w-16 items-center justify-center gap-1 rounded-lg bg-blue-50 text-[12px] font-bold text-blue-700">
              <Play className="h-3 w-3" /> Play
            </span>
          )}
        </Pop>
      ))}
      {children}
    </MockPage>
  );
}

const formatCenter = (index: number): [number, number] => inDialog(20 + index * 142 + 65, 116);
const FROM_LESSON = inDialog(45, 203);
const activityPickCenter = (index: number): [number, number] => inDialog(20 + index * 62 + 27, 214);

const activityScenes: DemoScene[] = [
  {
    label: "Format",
    caption: "Choose Create activity, then a format. Tick From a collection to use its cards.",
    duration: 6000,
    render: (t) => {
      const chosen = t >= 2700;
      const ticked = t >= 4000;
      return (
        <>
          <ActivitiesPage cards={libraryCards} actionPressed={pressedAt(t, 1200)} />
          <MockDialog show={t >= 1500} box={DIALOG} title="Create activity" steps={activitySteps} step={0}>
            <MockLabel x={20} y={56}>Activity format</MockLabel>
            {formats.map((format, index) => (
              <div
                key={format.label}
                className={cn(
                  "absolute flex flex-col items-center justify-center gap-1 rounded-xl border-2 text-[12px] font-black",
                  format.tone,
                  chosen && index === 0 ? "ring-2 ring-blue-500 ring-offset-2" : "",
                  pressedAt(t, 2600) && index === 0 && "scale-95"
                )}
                style={{ left: 20 + index * 142, top: 74, width: 130, height: 84 }}
              >
                <Shapes className="h-5 w-5" />
                {format.label}
              </div>
            ))}
            <div className="absolute rounded-xl border border-slate-200 bg-slate-50/70" style={{ left: 20, top: 176, width: 420, height: 82 }}>
              <span className={cn("absolute left-4 top-[18px] grid h-[18px] w-[18px] place-items-center rounded border-2", ticked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>
                {ticked ? <Check className="h-3 w-3" strokeWidth={4} /> : null}
              </span>
              <span className="absolute left-10 top-[17px] text-[13px] font-bold text-ink">From a collection</span>
              <Pop show={ticked} className="absolute left-4 top-[44px] flex h-7 w-[260px] items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-ink">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-blue-600" /> Feelings
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </Pop>
            </div>
            <MockButton box={{ x: 360, y: 270, w: 80, h: 32 }} pressed={pressedAt(t, 5400)}>
              Next
            </MockButton>
          </MockDialog>
          <Pointer
            t={t}
            path={[
              [0, 330, 260],
              [600, ...ACTION_CENTER],
              [1200, ...ACTION_CENTER, true],
              [2000, ...formatCenter(0)],
              [2600, ...formatCenter(0), true],
              [3300, ...FROM_LESSON],
              [3900, ...FROM_LESSON, true],
              [4800, ...NEXT],
              [5400, ...NEXT, true]
            ]}
          />
        </>
      );
    }
  },
  {
    label: "Cards",
    caption: "Tap up to 5 cards. Each one gets a ready question.",
    duration: 5600,
    render: (t) => {
      const taps = [800, 1700, 2600, 3500];
      const picked = taps.filter((time) => t >= time + 100).length;
      return (
        <>
          <ActivitiesPage cards={libraryCards} />
          <MockDialog show box={DIALOG} title="Create activity" steps={activitySteps} step={1}>
            <SlotsAndLibrary picked={picked} slots={5} label="Cards" t={t} tapTimes={taps} />
            <MockButton box={{ x: 360, y: 270, w: 80, h: 32 }} pressed={pressedAt(t, 4800)}>
              Next
            </MockButton>
          </MockDialog>
          <Pointer
            t={t}
            path={[
              [0, 330, 300],
              ...taps.flatMap((time, index): [number, number, number, boolean?][] => [
                [time - 450, ...activityPickCenter(index)],
                [time, ...activityPickCenter(index), true]
              ]),
              [4300, ...NEXT],
              [4800, ...NEXT, true]
            ]}
          />
        </>
      );
    }
  },
  {
    label: "Save and play",
    caption: "Check the questions, choose Create activity, then press Play.",
    duration: 7600,
    render: (t) => {
      const saved = t >= 1400;
      const newCard = { title: "Matching activity: Feelings", stripe: "bg-violet-300", words: ["happy", "sad"] };
      const playing = t >= 3300;
      const right = t >= 5000;
      return (
        <>
          <ActivitiesPage cards={saved ? [newCard, ...libraryCards.slice(0, 2)] : libraryCards} playPressed={pressedAt(t, 2900)}>
            <MockToast show={saved && !playing} text="Activity created" />
          </ActivitiesPage>
          <MockDialog show={!saved} box={DIALOG} title="Create activity" steps={activitySteps} step={2}>
            <MockLabel x={20} y={56}>Name</MockLabel>
            <MockField box={{ x: 20, y: 72, w: 420, h: 32 }} value="Matching activity: Feelings" />
            {["happy", "sad", "angry", "tired"].map((word, index) => (
              <div key={word} className="absolute" style={{ left: 20, top: 114 + index * 38, width: 420, height: 34 }}>
                <CardPic word={word} box={{ x: 0, y: 0, w: 26, h: 34 }} />
                <span className="absolute left-9 top-2 text-[12px] font-semibold text-slate-700">Tap the picture for &ldquo;{word[0].toUpperCase() + word.slice(1)}&rdquo;.</span>
              </div>
            ))}
            <MockButton box={{ x: 330, y: 270, w: 110, h: 32 }} pressed={pressedAt(t, 1100)}>
              Create activity
            </MockButton>
          </MockDialog>
          {/* The activity opens: the learner taps the right picture. */}
          <Pop show={playing} className="absolute inset-0 z-30 bg-gradient-to-b from-sky-100 to-[#f4fbff]">
            <div className="absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-[15px] font-black text-white">
              <Hand className="h-4 w-4" /> Find the picture for &ldquo;Happy&rdquo;
            </div>
            {["sad", "happy", "tired"].map((word, index) => (
              <div
                key={word}
                className={cn(
                  "absolute rounded-2xl border-4 bg-white p-1 transition-all duration-300",
                  word === "happy" && right ? "scale-110 border-emerald-500 ring-4 ring-emerald-100" : "border-white"
                )}
                style={{ left: 170 + index * 110, top: 100, width: 96, height: 128 }}
              >
                <CardPic word={word} plain box={{ x: 0, y: 0, w: 80, h: 112 }} className="border-0" />
              </div>
            ))}
            <Pop show={right} className="absolute left-1/2 top-[258px] -translate-x-1/2 rounded-full bg-emerald-500 px-5 py-1.5 text-[16px] font-black text-white">
              Correct!
            </Pop>
          </Pop>
          <Pointer
            t={t}
            path={[
              [0, 300, 200],
              [500, ...inDialog(385, 286)],
              [1100, ...inDialog(385, 286), true],
              [2300, 116, 184],
              [2900, 116, 184, true],
              [4000, 330, 170],
              [4900, 330, 170, true]
            ]}
          />
        </>
      );
    }
  }
];

/** Show me scenes for the Content and Activities guides. The rest are in `help-demo-more.tsx`. */
export const contentHelpDemos: Record<string, DemoScene[]> = {
  material: materialScenes,
  lesson: lessonScenes,
  activity: activityScenes
};
