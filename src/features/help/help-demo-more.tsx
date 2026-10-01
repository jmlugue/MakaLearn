"use client";

import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Focus,
  GraduationCap,
  Hand,
  KeyRound,
  LayoutDashboard,
  Layers,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Power,
  Shapes,
  ShieldCheck,
  Smile,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  Volume2,
  Wand2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Maki } from "@/features/student-mode/maki";
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
  type DemoScene,
  type PointerKey
} from "@/features/help/help-demo";
import { ACTION, ACTION_CENTER, ActivitiesPage, CardGrid, ContentPage, DIALOG, inDialog, libraryCards, startWords } from "@/features/help/help-demo-scenes";

/**
 * Show me scenes for Student mode, Playground, Gesture practice, and the admin guides. Same rules as
 * `help-demo-scenes.tsx`: simplified copies of the real screens on the 640 x 360 stage, pointer points at box centers.
 */

const tween = { type: "tween" as const, ease: [0.4, 0, 0.2, 1] as [number, number, number, number], duration: 0.6 };

/** A card that follows the pointer while it is dragged. Mount it at the press so it starts on the card. */
function Ghost({ t, path, show, word, plain = false }: { t: number; path: PointerKey[]; show: boolean; word: string; plain?: boolean }) {
  if (!show) return null;
  let current = path[0];
  for (const key of path) if (t >= key[0]) current = key;
  return (
    <motion.div className="pointer-events-none absolute left-0 top-0 z-40 h-[75px] w-[56px] rotate-3" initial={false} animate={{ x: current[1] - 28, y: current[2] - 37 }} transition={tween}>
      <CardPic word={word} plain={plain} box={{ x: 0, y: 0, w: 56, h: 75 }} className="border-2 border-blue-400 shadow-lg" />
    </motion.div>
  );
}

/* ---------- Student mode ---------- */

const sidebarItems = [
  { label: "Content", icon: Layers },
  { label: "Activities", icon: Shapes },
  { label: "Playground", icon: MessageSquare },
  { label: "Gestures", icon: Hand },
  { label: "Student mode", icon: GraduationCap }
];
const STUDENT_BUTTON: [number, number] = [85, 236];

/** The teacher sidebar, opened by hovering (as in the app). */
function OpenSidebar({ show, pressed }: { show: boolean; pressed?: boolean }) {
  return (
    <Pop show={show} className="absolute left-0 top-0 z-10 h-full w-[170px] rounded-r-2xl border-r border-blue-100 bg-white shadow-xl">
      <div className="ml-3 mt-3 h-7 w-7 rounded-lg bg-blue-600" />
      {sidebarItems.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "absolute left-2.5 flex h-8 w-[150px] items-center gap-2 rounded-xl px-2.5 text-[13px] font-bold text-slate-600 transition-transform",
            index === 4 && "bg-blue-50 text-blue-700",
            index === 4 && pressed && "scale-95"
          )}
          style={{ top: 60 + index * 40 }}
        >
          <item.icon className="h-4 w-4" /> {item.label}
        </div>
      ))}
    </Pop>
  );
}

/** The full-screen card shown while switching in or out of Student mode. */
function SwitchCard({ show, entering }: { show: boolean; entering: boolean }) {
  return (
    <Pop show={show} className={cn("absolute inset-0 z-40 grid place-items-center", entering ? "bg-blue-600" : "bg-blue-700")}>
      <div className="grid place-items-center rounded-3xl bg-white px-10 py-6 shadow-2xl">
        {entering ? <Maki mood="wave" size={110} label="" /> : <GraduationCap className="h-12 w-12 text-blue-600" />}
        <p className="mt-2 text-lg font-black text-ink">{entering ? "Student mode" : "Teacher view"}</p>
        {entering ? (
          <div className="mt-3 flex gap-2">
            {["bg-red-400", "bg-yellow-400", "bg-green-400", "bg-sky-400"].map((color) => (
              <span key={color} className={cn("h-3 w-8 rounded-full", color)} />
            ))}
          </div>
        ) : null}
      </div>
    </Pop>
  );
}

const MENU_BUTTON: [number, number] = [42, 42];
const navItems = [
  { label: "Playground", icon: MessageSquare, tone: "bg-amber-100 text-amber-700" },
  { label: "Gesture practice", icon: Hand, tone: "bg-sky-100 text-sky-700" },
  { label: "Activities", icon: Shapes, tone: "bg-violet-100 text-violet-700" }
];
const navCenter = (index: number): [number, number] => [120, 103 + index * 56];
const EXIT_BUTTON: [number, number] = [120, 318];

function StudentScreen({ children, menuPressed }: { children?: React.ReactNode; menuPressed?: boolean }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-[#f4fbff]">
      <div className={cn("absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-2xl bg-white text-blue-700 shadow-md transition-transform", menuPressed && "scale-90")}>
        <Menu className="h-6 w-6" />
      </div>
      {children}
    </div>
  );
}

/** The Student mode menu: the three places and Exit student mode. */
function StudentNav({ show, hover, exitPressed }: { show: boolean; hover: number; exitPressed?: boolean }) {
  return (
    <Pop show={show} className="absolute inset-0 z-30">
      <div className="absolute inset-0 bg-slate-900/20" />
      <div className="absolute left-0 top-0 h-full w-[240px] rounded-r-3xl bg-white shadow-2xl">
        <div className="ml-5 mt-5 h-9 w-9 rounded-xl bg-blue-600" />
        {navItems.map((item, index) => (
          <div
            key={item.label}
            className={cn("absolute left-4 flex h-[46px] w-[208px] items-center gap-3 rounded-2xl px-3 text-[15px] font-black text-ink transition-colors", hover === index && "bg-blue-50 ring-2 ring-blue-200")}
            style={{ top: 80 + index * 56 }}
          >
            <span className={cn("grid h-8 w-8 place-items-center rounded-xl", item.tone)}>
              <item.icon className="h-4 w-4" />
            </span>
            {item.label}
          </div>
        ))}
        <div className={cn("absolute left-4 top-[296px] flex h-11 w-[208px] items-center gap-2 rounded-2xl border border-blue-200 bg-white px-3 text-[14px] font-bold text-blue-800 transition-transform", exitPressed && "scale-95")}>
          <LogOut className="h-4 w-4" /> Exit student mode
        </div>
      </div>
    </Pop>
  );
}

/** A small playground board, used as the Student mode home. */
function MiniPlayground() {
  return (
    <>
      <div className="absolute rounded-3xl border-4 border-dashed border-amber-200 bg-amber-50/80" style={{ left: 90, top: 80, width: 460, height: 110 }}>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className="absolute grid place-items-center rounded-xl border-2 border-dashed border-amber-200 bg-white/70 text-[13px] font-black text-amber-300" style={{ left: 16 + index * 88, top: 10, width: 70, height: 82 }}>
            {index + 1}
          </span>
        ))}
      </div>
      {["i", "want", "eat", "drink", "happy", "hello"].map((word, index) => (
        <CardPic key={word} word={word} box={{ x: 120 + index * 70, y: 214, w: 56, h: 75 }} className="shadow-sm" />
      ))}
    </>
  );
}

function StudentActivityMenu() {
  const tiles = [
    { title: "Greetings", tone: "bg-violet-200", words: ["hello", "goodbye"] },
    { title: "Food", tone: "bg-yellow-200", words: ["eat", "drink"] },
    { title: "Actions", tone: "bg-pink-200", words: ["sit", "stand"] }
  ];
  return (
    <>
      {tiles.map((tile, index) => (
        <Pop key={tile.title} show className="absolute overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg" style={{ left: 80 + index * 165, top: 80, width: 150, height: 200 }}>
          <div className={cn("absolute inset-x-0 top-0 h-[130px]", tile.tone)} />
          {tile.words.map((word, cardIndex) => (
            <CardPic key={word} word={word} plain box={{ x: 14 + cardIndex * 62, y: 22, w: 56, h: 75 }} />
          ))}
          <p className="absolute inset-x-0 bottom-5 text-center text-[16px] font-black text-ink">{tile.title}</p>
        </Pop>
      ))}
    </>
  );
}

const studentScenes: DemoScene[] = [
  {
    label: "Hand over",
    caption: "Choose Student mode in the menu. It gives the learner a simple, child-friendly screen.",
    duration: 5400,
    render: (t) => (
      <>
        <ContentPage tab="Materials" action="Add material">
          <CardGrid words={startWords} />
        </ContentPage>
        <OpenSidebar show={t >= 900 && t < 2300} pressed={pressedAt(t, 1900)} />
        <SwitchCard show={t >= 2200 && t < 3700} entering />
        {t >= 3600 ? (
          <StudentScreen>
            <MiniPlayground />
          </StudentScreen>
        ) : null}
        <Pointer t={t} path={[[0, 330, 250], [500, 26, 200], [1200, ...STUDENT_BUTTON], [1900, ...STUDENT_BUTTON, true], [3800, 330, 200]]} />
      </>
    )
  },
  {
    label: "Three places",
    caption: "The menu has Playground, Gesture practice, and Activities.",
    duration: 5800,
    render: (t) => {
      const open = t >= 1000 && t < 4400;
      const hover = t >= 3400 ? 2 : t >= 2600 ? 1 : t >= 1800 ? 0 : -1;
      return (
        <>
          <StudentScreen menuPressed={pressedAt(t, 800)}>{t >= 4400 ? <StudentActivityMenu /> : <MiniPlayground />}</StudentScreen>
          <StudentNav show={open} hover={hover} />
          <Pointer
            t={t}
            path={[[0, 330, 200], [300, ...MENU_BUTTON], [800, ...MENU_BUTTON, true], [1300, ...navCenter(0)], [2100, ...navCenter(1)], [2900, ...navCenter(2)], [4000, ...navCenter(2), true], [4700, 400, 300]]}
          />
        </>
      );
    }
  },
  {
    label: "When done",
    caption: "When done, open the menu and choose Exit student mode.",
    duration: 5000,
    render: (t) => (
      <>
        {t < 3400 ? (
          <StudentScreen menuPressed={pressedAt(t, 700)}>
            <MiniPlayground />
          </StudentScreen>
        ) : (
          <ContentPage tab="Materials" action="Add material">
            <CardGrid words={startWords} />
          </ContentPage>
        )}
        <StudentNav show={t >= 900 && t < 2500} hover={-1} exitPressed={pressedAt(t, 2100)} />
        <SwitchCard show={t >= 2400 && t < 3500} entering={false} />
        <Pointer t={t} path={[[0, 330, 200], [200, ...MENU_BUTTON], [700, ...MENU_BUTTON, true], [1500, ...EXIT_BUTTON], [2100, ...EXIT_BUTTON, true], [3700, 330, 250]]} />
      </>
    )
  }
];

/* ---------- Playground ---------- */

const libraryWords = ["i", "am", "you", "happy", "sad", "eat", "water", "hello"];
const libraryBox = (index: number) => ({ x: 150 + (index % 5) * 64, y: index < 5 ? 150 : 234, w: 56, h: 75 });
const libraryCenter = (index: number): [number, number] => {
  const box = libraryBox(index);
  return [box.x + 28, box.y + 37];
};
const slotCenter = (index: number): [number, number] => [170 + index * 88 + 35, 28 + 46];
const CHECK: [number, number] = [545, 183];
const LISTEN: [number, number] = [545, 245];
const playCategories = [
  { label: "All cards", tone: "border-blue-600 bg-blue-600 text-white", icon: Layers },
  { label: "Greetings", tone: "border-amber-200 bg-amber-50 text-amber-800", icon: Hand },
  { label: "Emotions", tone: "border-pink-200 bg-pink-50 text-pink-800", icon: Smile },
  { label: "People", tone: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: Users },
  { label: "Actions", tone: "border-violet-200 bg-violet-50 text-violet-800", icon: Shapes }
];
/** The three drags: library index, time the pointer reaches the card. */
const drags = [
  { card: 0, at: 300 },
  { card: 1, at: 1900 },
  { card: 3, at: 3500 }
];

function PlaygroundScreen({ placed, hidden, highlight = -1, checkPressed, listenPressed }: { placed: string[]; hidden: number[]; highlight?: number; checkPressed?: boolean; listenPressed?: boolean }) {
  return (
    <div className="absolute inset-0 bg-[#fcfdff]">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-sky-100 to-transparent" />
      {playCategories.map((category, index) => (
        <div key={category.label} className={cn("absolute flex h-[30px] w-[120px] items-center gap-1.5 rounded-xl border px-2.5 text-[12px] font-bold", category.tone)} style={{ left: 16, top: 18 + index * 38 }}>
          <category.icon className="h-3.5 w-3.5" /> {category.label}
        </div>
      ))}
      <div className="absolute rounded-3xl border-4 border-dashed border-amber-200 bg-amber-50/80" style={{ left: 150, top: 18, width: 474, height: 112 }}>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className="absolute grid place-items-center rounded-xl border-2 border-dashed border-amber-200 bg-white/70 text-[13px] font-black text-amber-300" style={{ left: 16 + index * 88, top: 6, width: 70, height: 92 }}>
            {placed[index] ? (
              <Pop show className="absolute inset-0">
                <CardPic word={placed[index]} box={{ x: -2, y: -2, w: 70, h: 92 }} className={cn("transition-all", highlight === index && "-translate-y-1.5 border-blue-500 ring-4 ring-blue-200")} />
              </Pop>
            ) : (
              index + 1
            )}
          </span>
        ))}
      </div>
      {libraryWords.map((word, index) =>
        hidden.includes(index) ? null : <CardPic key={word} word={word} box={libraryBox(index)} className="shadow-sm" />
      )}
      <GameButton y={156} tone="bg-emerald-500 shadow-[0_5px_0_#047857]" pressed={checkPressed} icon={Check} label="Check" />
      <GameButton y={218} tone="bg-blue-600 shadow-[0_5px_0_#1e40af]" pressed={listenPressed} icon={Volume2} label="Listen" />
      <GameButton y={280} tone="bg-red-500 shadow-[0_5px_0_#b91c1c]" icon={Trash2} label="Clear" />
    </div>
  );
}

function GameButton({ y, tone, pressed, icon: Icon, label }: { y: number; tone: string; pressed?: boolean; icon: typeof Check; label: string }) {
  return (
    <div className={cn("absolute flex items-center justify-center gap-2 rounded-2xl text-[16px] font-black text-white transition-transform", tone, pressed && "translate-y-1 shadow-none")} style={{ left: 470, top: y, width: 150, height: 50 }}>
      <Icon className="h-5 w-5" /> {label}
    </div>
  );
}

const playgroundScenes: DemoScene[] = [
  {
    label: "Build a sentence",
    caption: "Click or drag up to 5 cards onto the board.",
    duration: 5800,
    render: (t) => {
      const placed = drags.filter((drag) => t >= drag.at + 1400).map((drag) => libraryWords[drag.card]);
      const hidden = drags.filter((drag) => t >= drag.at + 600).map((drag) => drag.card);
      const path: PointerKey[] = [[0, 330, 320]];
      drags.forEach((drag, index) => {
        path.push([drag.at - 300, ...libraryCenter(drag.card)], [drag.at + 600, ...libraryCenter(drag.card), true], [drag.at + 700, ...slotCenter(index)]);
      });
      return (
        <>
          <PlaygroundScreen placed={placed} hidden={hidden} />
          {drags.map((drag) => (
            <Ghost key={drag.card} t={t} path={path} show={t >= drag.at + 600 && t < drag.at + 1400} word={libraryWords[drag.card]} />
          ))}
          <Pointer t={t} path={path} />
        </>
      );
    }
  },
  {
    label: "Check and Listen",
    caption: "Press Check to see if the sentence is correct. Press Listen to hear it read aloud.",
    duration: 7000,
    render: (t) => {
      const words = ["i", "am", "happy"];
      const popup = t >= 1200 && t < 2900;
      const highlight = t >= 4000 && t < 5800 ? Math.floor((t - 4000) / 600) : -1;
      return (
        <>
          <PlaygroundScreen placed={words} hidden={[0, 1, 3]} highlight={highlight} checkPressed={pressedAt(t, 900)} listenPressed={pressedAt(t, 3700)} />
          <Pop show={popup} className="absolute inset-0 z-30">
            <div className="absolute inset-0 bg-emerald-950/20" />
            <div className="absolute rounded-3xl border-4 border-emerald-200 bg-gradient-to-b from-emerald-50 to-white text-center shadow-2xl" style={{ left: 150, top: 22, width: 340, height: 316 }}>
              <div className="mt-3 flex justify-center">
                <Maki mood="cheer" size={100} label="" />
              </div>
              <p className="mt-1 text-[26px] font-black tracking-wide text-emerald-600">GOOD JOB</p>
              <p className="text-[13px] font-semibold text-slate-700">You made a sentence.</p>
              <div className="relative mx-auto mt-3 h-[70px] w-[170px]">
                {words.map((word, index) => (
                  <CardPic key={word} word={word} box={{ x: index * 60, y: 0, w: 50, h: 67 }} />
                ))}
              </div>
              <div className={cn("absolute bottom-5 left-1/2 flex h-9 w-36 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-500 text-[15px] font-black text-white shadow-[0_4px_0_#047857] transition-transform", pressedAt(t, 2600) && "translate-y-1")}>
                Play again
              </div>
            </div>
          </Pop>
          <Pop show={t >= 4000 && t < 6200} className="absolute z-20 rounded-2xl bg-blue-600 px-3 py-1.5 text-[14px] font-black text-white shadow-md" style={{ left: 478, top: 58 }}>
            &ldquo;I am happy.&rdquo;
          </Pop>
          <Pointer t={t} path={[[0, 330, 300], [300, ...CHECK], [900, ...CHECK, true], [2000, 320, 300], [2600, 320, 300, true], [3100, ...LISTEN], [3700, ...LISTEN, true], [4400, 420, 330]]} />
        </>
      );
    }
  }
];

/* ---------- Gesture practice ---------- */

const toolbar = [
  { label: "Free practice", x: 160, w: 110, icon: Hand, on: "bg-blue-600 text-white" },
  { label: "Guided 7", x: 274, w: 90, icon: ListChecks, on: "bg-sky-500 text-white" },
  { label: "Focus", x: 368, w: 80, icon: Focus, on: "" },
  { label: "Landmarks", x: 452, w: 104, icon: Eye, on: "bg-emerald-500 text-white" }
];
const GUIDED_PILL: [number, number] = [319, 29];
const CAMERA_CENTER: [number, number] = [211, 163];
const READY_BUTTON: [number, number] = [320, 305];

/** Hand landmarks: dots and lines over the learner's raised hand. */
function Landmarks() {
  const palm = { x: 250, y: 150 };
  const fingers = [
    [-26, -14],
    [-14, -46],
    [0, -52],
    [13, -48],
    [26, -36]
  ];
  return (
    <motion.svg className="absolute inset-0" viewBox="0 0 390 214" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {fingers.map(([dx, dy]) => (
        <g key={`${dx}-${dy}`}>
          <line x1={palm.x} y1={palm.y} x2={palm.x + dx} y2={palm.y + dy} stroke="#4ade80" strokeWidth={3} strokeLinecap="round" />
          <circle cx={palm.x + dx * 0.55} cy={palm.y + dy * 0.55} r={3.5} fill="#f472b6" />
          <circle cx={palm.x + dx} cy={palm.y + dy} r={3.5} fill="#f472b6" />
        </g>
      ))}
      <circle cx={palm.x} cy={palm.y} r={4.5} fill="#f472b6" />
    </motion.svg>
  );
}

function GestureScreen({
  mode,
  cameraOn,
  landmarks,
  maki,
  feedback,
  countdown,
  cameraPressed,
  guidedPressed
}: {
  mode: "free" | "guided";
  cameraOn: boolean;
  landmarks: boolean;
  maki?: "happy" | "cheer" | "encourage";
  feedback?: React.ReactNode;
  countdown?: number;
  cameraPressed?: boolean;
  guidedPressed?: boolean;
}) {
  return (
    <div className="absolute inset-0 bg-[#f4fbff]">
      <div className="absolute rounded-full border border-white bg-white/85 shadow-sm" style={{ left: 154, top: 8, width: 408, height: 42 }} />
      {toolbar.map((item) => {
        const on = (item.label === "Free practice" && mode === "free") || (item.label === "Guided 7" && mode === "guided") || (item.label === "Landmarks" && landmarks);
        return (
          <div
            key={item.label}
            className={cn(
              "absolute flex h-[34px] items-center justify-center gap-1.5 rounded-full text-[12px] font-black transition-transform",
              item.label === "Focus" ? "bg-gradient-to-b from-[#fff6a8] to-[#ffe175] text-ink" : on ? item.on : "text-slate-600",
              item.label === "Guided 7" && guidedPressed && "scale-95"
            )}
            style={{ left: item.x, top: 12, width: item.w }}
          >
            {item.label === "Landmarks" && !landmarks ? <EyeOff className="h-3.5 w-3.5" /> : <item.icon className="h-3.5 w-3.5" />}
            {item.label}
          </div>
        );
      })}
      <div className={cn("absolute overflow-hidden rounded-3xl border border-slate-700 bg-[#10234f] p-1 ring-2 ring-white/60 transition-transform", cameraPressed && "scale-[0.98]")} style={{ left: 16, top: 56, width: 390, height: 214 }}>
        {cameraOn ? (
          <div className="absolute inset-1 overflow-hidden rounded-[1.3rem] bg-gradient-to-b from-slate-600 to-slate-800">
            {/* The learner: head, shoulders, and a raised hand. */}
            <div className="absolute left-[150px] top-[40px] h-[66px] w-[58px] rounded-full bg-amber-200/80" />
            <div className="absolute left-[102px] top-[112px] h-[110px] w-[156px] rounded-t-[4rem] bg-blue-400/70" />
            <div className="absolute left-[230px] top-[100px] h-[60px] w-[40px] rounded-3xl bg-amber-200/80" />
            {landmarks ? <Landmarks /> : null}
            <span className="absolute right-3 top-3 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-black text-white">{landmarks ? "1 hand visible" : "0 hands visible"}</span>
            {countdown ? (
              <div className="absolute inset-0 grid place-items-center bg-[#10234f]/55">
                <motion.span key={countdown} className="grid h-24 w-24 place-items-center rounded-full border-4 border-white/80 text-[52px] font-black text-white" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                  {countdown}
                </motion.span>
              </div>
            ) : null}
            {maki && !countdown ? (
              <div className="absolute bottom-1 left-2">
                <Maki mood={maki} size={78} label="" />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center text-white">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/5">
                <PlayCircle className="h-7 w-7" />
              </span>
              <p className="mt-2 text-[15px] font-black">Camera on</p>
            </div>
          </div>
        )}
      </div>
      <div className="absolute overflow-hidden rounded-2xl border border-blue-100 bg-white/85" style={{ left: 16, top: 278, width: 390, height: 70 }}>
        {feedback ?? (
          <div className="px-4 py-3">
            <p className="text-[18px] font-black text-ink">{mode === "guided" ? "Gesture 1 of 7" : "Ready"}</p>
            <p className="text-[13px] font-bold text-slate-600">{mode === "guided" ? "Show: I want to eat" : "Keep your hands inside the box."}</p>
          </div>
        )}
      </div>
      <div className="absolute rounded-3xl border border-white bg-white p-3 shadow-sm" style={{ left: 420, top: 56, width: 204, height: 292 }}>
        <div className="relative h-[196px] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gesture-references/eat-food.png" alt="" className="absolute inset-0 h-full w-full object-contain p-2" draggable={false} />
        </div>
        <p className="mt-3 text-[18px] font-black leading-tight text-ink">I want to eat</p>
        <span className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-blue-600 px-3 text-[12px] font-bold text-white">
          <PlayCircle className="h-4 w-4" /> Play
        </span>
      </div>
    </div>
  );
}

const greatFeedback = (
  <div className="flex h-full items-center gap-3 bg-green-50 px-4">
    <Check className="h-7 w-7 rounded-full bg-emerald-500 p-1 text-white" strokeWidth={3} />
    <div>
      <p className="text-[18px] font-black text-green-700">Great job!</p>
      <p className="text-[13px] font-bold text-slate-600">You did it.</p>
    </div>
  </div>
);

const aiFeedback = (
  <div className="grid h-full grid-cols-2 divide-x divide-slate-200 text-left">
    <div className="border-l-4 border-red-500 bg-red-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-red-700">For learner</p>
      <p className="text-[13px] font-black leading-tight text-red-950">Bring your fingers up to your mouth.</p>
    </div>
    <div className="px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Teacher guide</p>
      <p className="text-[11px] font-semibold leading-tight text-slate-700">The model saw Drink. Show the hand moving up to the mouth, slowly.</p>
    </div>
  </div>
);

const gestureScenes: DemoScene[] = [
  {
    label: "Free practice",
    caption: "Turn on the camera and show a gesture. MakaLearn says what it sees.",
    duration: 5600,
    render: (t) => (
      <>
        <GestureScreen mode="free" cameraOn={t >= 1100} landmarks={t >= 2000} maki={t >= 3300 ? "cheer" : "happy"} feedback={t >= 3300 ? greatFeedback : undefined} cameraPressed={pressedAt(t, 900)} />
        <Pointer t={t} path={[[0, 520, 320], [300, ...CAMERA_CENTER], [900, ...CAMERA_CENTER, true], [1600, 560, 330]]} />
      </>
    )
  },
  {
    label: "Feedback",
    caption: "In free practice, the AI gives corrective feedback for the learner and the teacher.",
    duration: 5200,
    render: (t) => (
      <>
        <GestureScreen mode="free" cameraOn landmarks={t >= 400} maki={t >= 1600 ? "encourage" : "happy"} feedback={t >= 1600 ? aiFeedback : undefined} />
        <Pop show={t >= 1600} className="absolute z-20 rounded-xl bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white shadow" style={{ left: 312, top: 240 }}>
          Written by AI
        </Pop>
      </>
    )
  },
  {
    label: "Guided practice",
    caption: "Guided practice is another option: the learner copies seven signs in a row, with a countdown before each.",
    duration: 7200,
    render: (t) => {
      const countdown = t >= 2600 && t < 4400 ? 3 - Math.floor((t - 2600) / 600) : undefined;
      return (
        <>
          <GestureScreen mode={t >= 900 ? "guided" : "free"} cameraOn landmarks={t >= 4400} maki="happy" countdown={countdown} guidedPressed={pressedAt(t, 700)} />
          <Pop show={t >= 1000 && t < 2400} className="absolute inset-0 z-30">
            <div className="absolute inset-0 bg-slate-900/30" />
            <div className="absolute rounded-3xl border-4 border-white bg-gradient-to-b from-sky-100 to-white text-center shadow-2xl" style={{ left: 190, top: 16, width: 260, height: 328 }}>
              <div className="mt-2 flex justify-center">
                <Maki mood="cheer" size={96} label="" />
              </div>
              <p className="mt-1 text-[20px] font-black text-ink">Thumbs up to start!</p>
              <div className="mx-3 mt-3 grid grid-cols-3 gap-1.5">
                {[
                  { label: "Hands in view", tone: "bg-sky-100 text-sky-700", content: <Hand className="h-4 w-4" /> },
                  { label: "Countdown", tone: "bg-amber-100 text-amber-700", content: <span className="text-[14px] font-black">3</span> },
                  { label: "Copy the sign", tone: "bg-emerald-100 text-emerald-700", content: <Shapes className="h-4 w-4" /> }
                ].map((step, index) => (
                  <div key={step.label} className="relative flex flex-col items-center gap-1 rounded-xl bg-white px-1 pb-1.5 pt-2.5 ring-1 ring-blue-100">
                    <span className="absolute -top-2 grid h-4 w-4 place-items-center rounded-full bg-blue-600 text-[9px] font-black text-white">{index + 1}</span>
                    <span className={cn("grid h-7 w-7 place-items-center rounded-full", step.tone)}>{step.content}</span>
                    <span className="text-[9px] font-black leading-tight text-ink">{step.label}</span>
                  </div>
                ))}
              </div>
              <div className={cn("absolute bottom-4 left-4 right-4 flex h-[38px] items-center justify-center rounded-full bg-emerald-500 text-[15px] font-black text-white shadow-[0_4px_0_#047857] transition-transform", pressedAt(t, 2200) && "translate-y-1")}>
                I&rsquo;m ready!
              </div>
            </div>
          </Pop>
          <Pop show={t >= 5600} className="absolute inset-0 z-30">
            <div className="absolute inset-0 bg-slate-900/25" />
            <div className="absolute rounded-3xl border-4 border-emerald-200 bg-white text-center shadow-2xl" style={{ left: 210, top: 60, width: 220, height: 230 }}>
              <div className="mt-4 flex justify-center">
                <Maki mood="cheer" size={110} label="" />
              </div>
              <p className="mt-2 text-[24px] font-black text-emerald-600">Great job!</p>
              <p className="text-[13px] font-bold text-slate-600">That is I want to eat.</p>
            </div>
          </Pop>
          <Pointer t={t} path={[[0, 330, 300], [200, ...GUIDED_PILL], [700, ...GUIDED_PILL, true], [1600, ...READY_BUTTON], [2200, ...READY_BUTTON, true], [2900, 600, 330]]} />
        </>
      );
    }
  }
];

/* ---------- Admin: see teaching content (view only) ---------- */

const HAPPY_CARD: [number, number] = [72 + 82 + 35, 140 + 46];
const CONTENT_PILL: [number, number] = [309, 79];

/** Admin's Content tab: Materials / Media underline tabs over every teacher's cards. */
function AdminContent() {
  return (
    <>
      <div className="absolute border-b border-slate-200" style={{ left: 72, top: 104, width: 260, height: 26 }}>
        <span className="absolute left-0 top-0.5 text-[13px] font-bold text-blue-700">Materials</span>
        <span className="absolute left-[90px] top-0.5 text-[13px] font-bold text-slate-500">Media</span>
        <span className="absolute -bottom-px left-0 h-0.5 w-[66px] rounded-full bg-blue-600" />
      </div>
      {startWords.map((word, index) => (
        <CardPic key={word} word={word} box={{ x: 72 + index * 82, y: 140, w: 70, h: 93 }} className="shadow-sm" />
      ))}
    </>
  );
}
const FIRST_ACTIVITY: [number, number] = [157, 130];
const HOW_IT_PLAYS: [number, number] = inDialog(105, 267);

const browseScenes: DemoScene[] = [
  {
    label: "Content",
    caption: "In Admin, open Content to view every teacher's materials, collections, and media. View only.",
    duration: 5800,
    render: (t) => (
      <>
        <AdminPage tab={t >= 1000 ? "Content" : "Home"}>{t >= 1000 ? <AdminContent /> : <AdminHome />}</AdminPage>
        <MockDialog show={t >= 2600} box={DIALOG} title="Happy">
          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            <Eye className="h-3.5 w-3.5" /> View only
          </span>
          <div className="absolute rounded-2xl border border-blue-100 bg-white" style={{ left: 20, top: 56, width: 170, height: 200 }}>
            <CardPic word="happy" box={{ x: 20, y: 12, w: 130, h: 174 }} className="border-0" />
          </div>
          <div className="absolute divide-y divide-slate-100 rounded-2xl border border-blue-100 bg-white text-[12px]" style={{ left: 206, top: 56, width: 234, height: 144 }}>
            {[
              ["Type", "PECS card"],
              ["Category", "Emotions"],
              ["Made by", "Ms. Cruz"],
              ["Updated", "Sep 20"]
            ].map(([label, value]) => (
              <p key={label} className="flex justify-between px-3 py-2">
                <span className="font-semibold text-slate-500">{label}</span>
                <span className="font-bold text-ink">{value}</span>
              </p>
            ))}
          </div>
          <div className="absolute rounded-2xl border border-blue-100 bg-blue-50/60 px-3 py-2" style={{ left: 206, top: 210, width: 234, height: 58 }}>
            <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Description</p>
            <p className="text-[12px] font-semibold text-slate-700">For when I feel good.</p>
          </div>
        </MockDialog>
        <Pointer t={t} path={[[0, 400, 300], [400, ...CONTENT_PILL], [900, ...CONTENT_PILL, true], [1700, ...HAPPY_CARD], [2300, ...HAPPY_CARD, true], [3300, 460, 330]]} />
      </>
    )
  },
  {
    label: "Activities",
    caption: "Open an activity to view its cards and a short demo.",
    duration: 6400,
    render: (t) => {
      const demo = t >= 3000;
      const right = t >= 4600;
      return (
        <>
          <ActivitiesPage cards={libraryCards} viewOnly />
          <MockDialog show={t >= 1400} box={DIALOG} title="Greetings match">
            <span className="absolute left-5 top-12 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold text-violet-800">Match</span>
            {demo ? (
              <Pop show className="absolute rounded-2xl bg-blue-50/70" style={{ left: 20, top: 80, width: 420, height: 170 }}>
                <p className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-xl bg-blue-600 px-3 py-1 text-[12px] font-black text-white">Find the picture for &ldquo;Hello&rdquo;</p>
                {["goodbye", "hello", "sorry"].map((word, index) => (
                  <div key={word} className={cn("absolute rounded-xl border-4 bg-white transition-all duration-300", word === "hello" && right ? "scale-110 border-emerald-500" : "border-white")} style={{ left: 110 + index * 76, top: 42, width: 64, height: 86 }}>
                    <CardPic word={word} plain box={{ x: 0, y: 0, w: 56, h: 78 }} className="border-0" />
                  </div>
                ))}
                <Pop show={right} className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[12px] font-black text-white">
                  Correct!
                </Pop>
              </Pop>
            ) : (
              <>
                <MockLabel x={20} y={84}>Cards</MockLabel>
                {["hello", "goodbye", "good_morning", "sorry"].map((word, index) => (
                  <CardPic key={word} word={word} box={{ x: 20 + index * 70, y: 104, w: 60, h: 80 }} />
                ))}
              </>
            )}
            <MockButton box={{ x: 20, y: 250, w: 170, h: 34 }} variant="soft" pressed={pressedAt(t, 2700)}>
              <PlayCircle className="h-4 w-4" /> Learn how it plays
            </MockButton>
          </MockDialog>
          <Pointer t={t} path={[[0, 400, 300], [500, ...FIRST_ACTIVITY], [1100, ...FIRST_ACTIVITY, true], [2100, ...HOW_IT_PLAYS], [2700, ...HOW_IT_PLAYS, true], [3400, 520, 330]]} />
        </>
      );
    }
  }
];

/* ---------- Admin: accounts and the activity log ---------- */

const adminTabs = [
  { label: "Home", x: 72, w: 80, icon: LayoutDashboard },
  { label: "Accounts", x: 158, w: 100, icon: Users },
  { label: "Content", x: 264, w: 90, icon: Layers },
  { label: "Activity log", x: 360, w: 112, icon: ScrollIcon }
];
const ACCOUNTS_TAB: [number, number] = [208, 79];
const LOG_TAB: [number, number] = [416, 79];

function ScrollIcon(props: React.SVGProps<SVGSVGElement>) {
  return <ListChecks {...props} />;
}

function AdminPage({ tab, action, actionPressed, children }: { tab: string; action?: string; actionPressed?: boolean; children?: React.ReactNode }) {
  return (
    <MockPage title="Admin" icon={ShieldCheck}>
      {action ? (
        <MockButton box={ACTION} pressed={actionPressed}>
          <UserPlus className="h-4 w-4" /> {action}
        </MockButton>
      ) : null}
      {adminTabs.map((item) => (
        <div
          key={item.label}
          className={cn("absolute top-[64px] flex h-[30px] items-center justify-center gap-1.5 rounded-full text-[12px] font-bold", item.label === tab ? "bg-blue-600 text-white" : "bg-white/80 text-slate-600")}
          style={{ left: item.x, width: item.w }}
        >
          <item.icon className="h-3.5 w-3.5" /> {item.label}
        </div>
      ))}
      {children}
    </MockPage>
  );
}

function AdminHome() {
  return (
    <>
      {[
        ["Teachers", "6"],
        ["Materials", "58"],
        ["Collections", "12"],
        ["Activities", "21"]
      ].map(([label, value], index) => (
        <div key={label} className="absolute rounded-2xl border border-white bg-white/85 px-4 py-3 shadow-sm" style={{ left: 72 + index * 138, top: 112, width: 128, height: 76 }}>
          <p className="text-[11px] font-bold text-slate-500">{label}</p>
          <p className="text-[24px] font-black text-ink">{value}</p>
        </div>
      ))}
    </>
  );
}

type Account = { name: string; role: string; off?: boolean };
const accounts: Account[] = [
  { name: "Maria Cruz", role: "Teacher" },
  { name: "Jose Santos", role: "Teacher" },
  { name: "Lee Ramos", role: "Admin" }
];
const rowMenu = (index: number): [number, number] => [596, 165 + index * 42];

function AccountsTable({ rows, menuPressed = -1 }: { rows: Account[]; menuPressed?: number }) {
  return (
    <div className="absolute overflow-hidden rounded-2xl border border-white bg-white/90 shadow-sm" style={{ left: 72, top: 108, width: 548, height: 44 + rows.length * 42 }}>
      <div className="flex h-9 items-center bg-slate-50 px-4 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <span className="w-52">Name</span>
        <span className="w-32">Role</span>
        <span>Status</span>
      </div>
      {rows.map((row, index) => (
        <Pop key={row.name} show className="absolute flex h-[42px] w-full items-center border-t border-slate-100 px-4 text-[13px]" style={{ top: 36 + index * 42 }}>
          <span className="flex w-52 items-center gap-2 font-bold text-ink">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-[10px] font-black text-blue-700">{row.name[0]}</span>
            {row.name}
          </span>
          <span className="w-32">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", row.role === "Admin" ? "bg-indigo-100 text-indigo-700" : "bg-sky-100 text-sky-700")}>{row.role}</span>
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", row.off ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700")}>
            {row.off ? "Deactivated" : "Active"}
          </span>
          <span className={cn("absolute right-3 grid h-7 w-7 place-items-center rounded-lg text-slate-500", menuPressed === index && "bg-blue-100 text-blue-700")}>
            <MoreHorizontal className="h-4 w-4" />
          </span>
        </Pop>
      ))}
    </div>
  );
}

const ROLE_TEACHER: [number, number] = inDialog(120, 78);
const NAME_FIELD = inDialog(230, 137);
const EMAIL_FIELD = inDialog(230, 191);
const GENERATE = inDialog(385, 245);
const ADD_TEACHER = inDialog(390, 290);
const newAccount = { name: "Ana Reyes", role: "Teacher" };

/** Password field with Generate (and Copy in the temporary password pop-up), as in Accounts. */
function PasswordRow({ y, width, value, generatePressed, copied }: { y: number; width: number; value: boolean; generatePressed?: boolean; copied?: boolean }) {
  const withCopy = copied !== undefined;
  const fieldW = width - 118 - (withCopy ? 46 : 0);
  return (
    <>
      <MockField box={{ x: 20, y, w: fieldW, h: 30 }} value={value ? "••••••••••" : ""} placeholder="At least 8 characters" />
      {withCopy ? (
        <span
          className={cn("absolute grid place-items-center rounded-xl border text-[11px] font-bold", copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-white text-blue-700")}
          style={{ left: 26 + fieldW, top: y, width: 40, height: 30 }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </span>
      ) : null}
      <MockButton box={{ x: 20 + width - 110, y, w: 110, h: 30 }} variant="outline" pressed={generatePressed}>
        <Wand2 className="h-3.5 w-3.5" /> Generate
      </MockButton>
    </>
  );
}

const accountScenes: DemoScene[] = [
  {
    label: "Add an account",
    caption: "In Admin, open Accounts and choose Add account. Fill it in and add them.",
    duration: 9000,
    render: (t) => {
      const onAccounts = t >= 1100;
      const saved = t >= 7700;
      return (
        <>
          <AdminPage tab={onAccounts ? "Accounts" : "Home"} action={onAccounts ? "Add account" : undefined} actionPressed={pressedAt(t, 2200)}>
            {onAccounts ? <AccountsTable rows={saved ? [newAccount, ...accounts] : accounts} /> : <AdminHome />}
            <MockToast show={t >= 7900} text="Account added" />
          </AdminPage>
          <MockDialog show={t >= 2500 && !saved} box={DIALOG} title="Add account">
            {[
              { label: "Teacher", line: "Content, activities", icon: UserRound },
              { label: "Admin", line: "Plus accounts, logs", icon: ShieldCheck }
            ].map((role, index) => (
              <div key={role.label} className={cn("absolute flex items-center gap-2 rounded-xl border-2 px-3", index === 0 ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white")} style={{ left: 20 + index * 214, top: 56, width: 206, height: 44 }}>
                <role.icon className={cn("h-5 w-5", index === 0 ? "text-blue-600" : "text-slate-400")} />
                <span>
                  <span className="block text-[13px] font-black text-ink">{role.label}</span>
                  <span className="block text-[10px] font-semibold text-slate-500">{role.line}</span>
                </span>
              </div>
            ))}
            <MockLabel x={20} y={106}>Name</MockLabel>
            <MockField box={{ x: 20, y: 122, w: 420, h: 30 }} value={typed("Ana Reyes", t, 3500, 110)} focused={t >= 3300 && t < 4700} />
            <MockLabel x={20} y={160}>School email</MockLabel>
            <MockField box={{ x: 20, y: 176, w: 420, h: 30 }} value={typed("ana@school.edu", t, 5000, 80)} focused={t >= 4800 && t < 6300} />
            <MockLabel x={20} y={214}>Temporary password</MockLabel>
            <PasswordRow y={230} width={420} value={t >= 6700} generatePressed={pressedAt(t, 6500)} />
            <MockButton box={{ x: 340, y: 274, w: 100, h: 32 }} pressed={pressedAt(t, 7400)}>
              Add teacher
            </MockButton>
          </MockDialog>
          <Pointer
            t={t}
            path={[
              [0, 400, 300],
              [500, ...ACCOUNTS_TAB],
              [1000, ...ACCOUNTS_TAB, true],
              [1600, ...ACTION_CENTER],
              [2200, ...ACTION_CENTER, true],
              [2800, ...ROLE_TEACHER],
              [3300, ...NAME_FIELD, true],
              [4800, ...EMAIL_FIELD, true],
              [6000, ...GENERATE],
              [6500, ...GENERATE, true],
              [6900, ...ADD_TEACHER],
              [7400, ...ADD_TEACHER, true],
              [8200, 400, 320]
            ]}
          />
        </>
      );
    }
  },
  {
    label: "Forgotten password",
    caption: "Set a temporary password, copy it, and give it to the teacher.",
    duration: 7000,
    render: (t) => {
      const rows = [newAccount, ...accounts];
      const menuOpen = t >= 1000 && t < 2100;
      const dialog = t >= 2300 && t < 5600;
      return (
        <>
          <AdminPage tab="Accounts" action="Add account">
            <AccountsTable rows={rows} menuPressed={menuOpen ? 0 : -1} />
            <MockToast show={t >= 5800} text="Password set" />
          </AdminPage>
          <Pop show={menuOpen} className="absolute z-10 w-[190px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-[12px] font-semibold shadow-lg" style={{ left: 420, top: 176 }}>
            {[
              { label: "Set temporary password", icon: KeyRound },
              { label: "Deactivate", icon: Power }
            ].map((item, index) => (
              <p key={item.label} className={cn("flex items-center gap-2 px-3 py-1.5", index === 0 && t >= 1500 ? "bg-blue-50 text-blue-700" : index === 1 ? "text-red-600" : "text-ink")}>
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </p>
            ))}
          </Pop>
          <MockDialog show={dialog} box={{ x: 110, y: 50, w: 420, h: 260 }} title="Temporary password">
            <p className="absolute left-5 top-11 text-[12px] font-semibold text-slate-500">Their old password stops working.</p>
            <div className="absolute flex items-center gap-2 rounded-xl bg-slate-50 px-3 text-[13px] font-bold text-ink" style={{ left: 20, top: 72, width: 380, height: 40 }}>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-[10px] font-black text-blue-700">A</span>
              Ana Reyes
            </div>
            <MockLabel x={20} y={124}>Temporary password</MockLabel>
            <PasswordRow y={140} width={380} value={t >= 3300} generatePressed={pressedAt(t, 3100)} copied={t >= 4200} />
            <MockButton box={{ x: 290, y: 210, w: 110, h: 32 }} className="bg-red-600" pressed={pressedAt(t, 5200)}>
              Set password
            </MockButton>
          </MockDialog>
          <Pointer
            t={t}
            path={[
              [0, 400, 300],
              [400, ...rowMenu(0)],
              [900, ...rowMenu(0), true],
              [1500, 500, 191],
              [2000, 500, 191, true],
              [2600, 455, 205],
              [3100, 455, 205, true],
              [3600, 372, 205],
              [4100, 372, 205, true],
              [4700, 455, 276],
              [5200, 455, 276, true],
              [6000, 400, 320]
            ]}
          />
        </>
      );
    }
  }
];


/** Row index 2 (Jose Santos): menu, confirm, then the status changes. Deactivate first, then Activate. */
const JOSE_MENU = rowMenu(2);
const MENU_ITEM_2: [number, number] = [500, 283];
const CONFIRM_BUTTON: [number, number] = [460, 236];

function ConfirmBox({ show, title, text, action, danger, pressed }: { show: boolean; title: string; text: string; action: string; danger: boolean; pressed: boolean }) {
  return (
    <Pop show={show} className="absolute inset-0 z-30">
      <div className="absolute inset-0 bg-slate-900/25" />
      <div className="absolute rounded-2xl border border-white bg-white p-5 shadow-2xl" style={{ left: 150, top: 110, width: 340, height: 150 }}>
        <p className="text-[16px] font-black text-ink">{title}</p>
        <p className="mt-1 text-[12px] font-semibold text-slate-600">{text}</p>
        <span className="absolute bottom-4 right-[124px] flex h-8 w-20 items-center justify-center rounded-xl text-[12px] font-bold text-slate-600">Cancel</span>
        <span className={cn("absolute bottom-4 right-5 flex h-8 w-[100px] items-center justify-center rounded-xl text-[12px] font-bold text-white transition-transform", danger ? "bg-red-600" : "bg-blue-600", pressed && "scale-95")}>
          {action}
        </span>
      </div>
    </Pop>
  );
}

const turnOffScene: DemoScene = {
  label: "Turn off or on",
  caption: "Deactivate stops someone from signing in. Activate lets them back in.",
  duration: 7600,
  render: (t) => {
    const off = t >= 3100 && t < 6600;
    const rows = [newAccount, accounts[0], { ...accounts[1], off }, accounts[2]];
    const firstMenu = t >= 1000 && t < 1900;
    const secondMenu = t >= 4300 && t < 5100;
    return (
      <>
        <AdminPage tab="Accounts" action="Add account">
          <AccountsTable rows={rows} menuPressed={firstMenu || secondMenu ? 2 : -1} />
          <MockToast show={t >= 3200 && t < 4200} text="Account deactivated" />
          <MockToast show={t >= 6700} text="Account activated" />
        </AdminPage>
        <Pop show={firstMenu || secondMenu} className="absolute z-10 w-[190px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-[12px] font-semibold shadow-lg" style={{ left: 420, top: 260 }}>
          <p className="flex items-center gap-2 px-3 py-1.5 text-ink">
            <KeyRound className="h-3.5 w-3.5" /> Set temporary password
          </p>
          <p className={cn("flex items-center gap-2 px-3 py-1.5", secondMenu ? "text-blue-700" : "text-red-600", (t >= 1500 && firstMenu) || (t >= 4800 && secondMenu) ? "bg-blue-50" : "")}>
            <Power className="h-3.5 w-3.5" /> {secondMenu ? "Activate" : "Deactivate"}
          </p>
        </Pop>
        <ConfirmBox
          show={t >= 2000 && t < 3100}
          title="Deactivate Jose Santos?"
          text="They cannot sign in until you activate them again."
          action="Deactivate"
          danger
          pressed={pressedAt(t, 2800)}
        />
        <ConfirmBox
          show={t >= 5300 && t < 6600}
          title="Activate Jose Santos?"
          text="They can sign in again."
          action="Activate"
          danger={false}
          pressed={pressedAt(t, 6200)}
        />
        <Pointer
          t={t}
          path={[
            [0, 400, 330],
            [400, ...JOSE_MENU],
            [900, ...JOSE_MENU, true],
            [1300, ...MENU_ITEM_2],
            [1800, ...MENU_ITEM_2, true],
            [2300, ...CONFIRM_BUTTON],
            [2800, ...CONFIRM_BUTTON, true],
            [3700, ...JOSE_MENU],
            [4200, ...JOSE_MENU, true],
            [4600, ...MENU_ITEM_2],
            [5100, ...MENU_ITEM_2, true],
            [5700, ...CONFIRM_BUTTON],
            [6200, ...CONFIRM_BUTTON, true],
            [7000, 400, 330]
          ]}
        />
      </>
    );
  }
};

const logRows = [
  { who: "Maria Cruz", text: "signed in", kind: "sign-ins", icon: LogIn, tone: "bg-blue-100 text-blue-700", time: "9:02 AM" },
  { who: "Maria Cruz", text: "added the material Eat", kind: "content", icon: Layers, tone: "bg-emerald-100 text-emerald-700", time: "9:10 AM" },
  { who: "Jose Santos", text: "edited the collection Feelings", kind: "content", icon: Pencil, tone: "bg-amber-100 text-amber-700", time: "10:24 AM" },
  { who: "Lee Ramos", text: "added the account Ana Reyes", kind: "accounts", icon: UserPlus, tone: "bg-indigo-100 text-indigo-700", time: "11:40 AM" }
];
const logTabs = [
  { label: "All", x: 72 },
  { label: "Sign-ins", x: 118 },
  { label: "Content", x: 196 },
  { label: "Accounts", x: 270 }
];
const CONTENT_TAB: [number, number] = [226, 124];
const DATE_SELECT: [number, number] = [555, 124];

function LogScreen({ filter, range, rangeOpen, rowPressed = -1 }: { filter: string; range: string; rangeOpen?: boolean; rowPressed?: number }) {
  const rows = filter === "All" ? logRows : logRows.filter((row) => row.kind === filter.toLowerCase());
  const active = logTabs.find((tab) => tab.label === filter) ?? logTabs[0];
  return (
    <>
      <div className="absolute border-b border-slate-200" style={{ left: 72, top: 110, width: 400, height: 30 }}>
        {logTabs.map((tab) => (
          <span key={tab.label} className={cn("absolute top-1 text-[13px] font-bold", tab.label === filter ? "text-blue-700" : "text-slate-500")} style={{ left: tab.x - 72 }}>
            {tab.label}
          </span>
        ))}
        <motion.span className="absolute -bottom-px h-0.5 rounded-full bg-blue-600" initial={false} animate={{ left: active.x - 72, width: active.label.length * 7.4 }} transition={tween} />
      </div>
      <div className="absolute flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-ink" style={{ left: 490, top: 110, width: 130, height: 30 }}>
        {range}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </div>
      {rangeOpen ? (
        <div className="absolute z-10 w-[130px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-[12px] font-semibold shadow-lg" style={{ left: 490, top: 144 }}>
          {["All time", "Today", "Last 7 days", "This month"].map((item) => (
            <p key={item} className={cn("px-3 py-1.5", item === "Today" ? "bg-blue-50 text-blue-700" : "text-ink")}>
              {item}
            </p>
          ))}
        </div>
      ) : null}
      {rows.map((row, index) => (
        <Pop key={row.text} show className={cn("absolute flex items-center gap-3 rounded-2xl border border-white bg-white/90 px-3 shadow-sm transition-transform", rowPressed === index && "scale-[0.98] ring-2 ring-blue-200")} style={{ left: 72, top: 152 + index * 48, width: 548, height: 40 }}>
          <span className={cn("grid h-7 w-7 place-items-center rounded-lg", row.tone)}>
            <row.icon className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 text-[13px] text-slate-700">
            <b className="text-ink">{row.who}</b> {row.text}
          </span>
          <span className="text-[11px] font-semibold text-slate-400">{row.time}</span>
        </Pop>
      ))}
    </>
  );
}

const logScenes: DemoScene[] = [
  {
    label: "Filter",
    caption: "In Admin, open Activity log. Filter by type and date.",
    duration: 6000,
    render: (t) => (
      <>
        <AdminPage tab={t >= 1000 ? "Activity log" : "Home"}>
          {t >= 1000 ? <LogScreen filter={t >= 2400 ? "Content" : "All"} range={t >= 4700 ? "Today" : "All time"} rangeOpen={t >= 3700 && t < 4700} /> : <AdminHome />}
        </AdminPage>
        <Pointer
          t={t}
          path={[[0, 400, 300], [400, ...LOG_TAB], [900, ...LOG_TAB, true], [1800, ...CONTENT_TAB], [2300, ...CONTENT_TAB, true], [3100, ...DATE_SELECT], [3600, ...DATE_SELECT, true], [4000, 540, 181], [4600, 540, 181, true], [5200, 400, 320]]}
        />
      </>
    )
  },
  {
    label: "Open an entry",
    caption: "Open an entry to see who did what, and when.",
    duration: 4800,
    render: (t) => (
      <>
        <AdminPage tab="Activity log">
          <LogScreen filter="Content" range="Today" rowPressed={pressedAt(t, 1200) ? 1 : -1} />
        </AdminPage>
        <MockDialog show={t >= 1500} box={{ x: 120, y: 40, w: 400, h: 280 }} title="Edited a collection">
          <div className="absolute divide-y divide-slate-100 rounded-2xl border border-blue-100 bg-white text-[12px]" style={{ left: 20, top: 60, width: 360, height: 150 }}>
            {[
              ["Who", "Jose Santos (Teacher)"],
              ["What", "Edited a collection"],
              ["Item", "Feelings"],
              ["When", "Today, 10:24 AM"]
            ].map(([label, value]) => (
              <p key={label} className="flex justify-between px-3 py-2.5">
                <span className="font-semibold text-slate-500">{label}</span>
                <span className="font-bold text-ink">{value}</span>
              </p>
            ))}
          </div>
          <span className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-500">
            <X className="h-4 w-4" />
          </span>
        </MockDialog>
        <Pointer t={t} path={[[0, 400, 320], [600, 300, 220], [1200, 300, 220, true], [2200, 470, 330]]} />
      </>
    )
  }
];

/* ---------- Student mode activities ---------- */

const FIRST_TILE: [number, number] = [155, 180];
const START_BUTTON: [number, number] = [405, 288];
const choiceCenter = (index: number): [number, number] => [170 + index * 110 + 48, 110 + 64];
const trayCenter = (index: number): [number, number] => [230 + index * 90, 290];
const boxCenter = (index: number): [number, number] => [200 + index * 120, 167];

/** One Match question: the instruction, three pictures, and right / wrong marks. */
function MatchQuestion({ word, options, picked, t, pickedAt }: { word: string; options: string[]; picked: string; t: number; pickedAt: number }) {
  const answered = picked !== "" && t >= pickedAt;
  const wrong = answered && picked !== word;
  return (
    <>
      <div className="absolute left-1/2 top-[52px] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-2xl bg-blue-600 px-5 py-2.5 text-[15px] font-black text-white">
        <Hand className="h-4 w-4" /> Tap the picture for &ldquo;{word[0].toUpperCase() + word.slice(1)}&rdquo;.
      </div>
      <motion.div className="absolute inset-0" animate={wrong ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }} transition={{ duration: 0.35 }}>
        {options.map((option, index) => (
          <div
            key={option}
            className={cn(
              "absolute rounded-2xl border-4 bg-white p-1 transition-all duration-300",
              answered && option === word ? "scale-110 border-emerald-500 ring-4 ring-emerald-100" : answered && option === picked ? "border-red-400" : "border-white"
            )}
            style={{ left: 170 + index * 110, top: 110, width: 96, height: 128 }}
          >
            <CardPic word={option} plain box={{ x: 0, y: 0, w: 80, h: 112 }} className="border-0" />
          </div>
        ))}
      </motion.div>
    </>
  );
}

function GameTopBar({ done, total }: { done: number; total: number }) {
  return (
    <>
      <span className="absolute left-5 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-700 shadow">
        <LayoutDashboard className="h-4 w-4" />
      </span>
      <div className="absolute right-5 top-5 h-3 w-40 overflow-hidden rounded-full bg-white shadow-inner">
        <span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>
    </>
  );
}

const studentActivityScenes: DemoScene[] = [
  {
    label: "Pick an activity",
    caption: "In Student mode, open Activities and tap a picture tile. Then press Start.",
    duration: 4600,
    render: (t) => (
      <>
        <StudentScreen>
          <StudentActivityMenu />
        </StudentScreen>
        <Pop show={t >= 1500} className="absolute inset-0 z-30">
          <div className="absolute inset-0 bg-slate-900/25" />
          {/* The real How to play card: type badge, the demo, the instruction in a blue box, Listen and Start. */}
          <div className="absolute overflow-hidden rounded-3xl border-4 border-white bg-white text-center shadow-2xl" style={{ left: 120, top: 26, width: 400, height: 308 }}>
            <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-violet-100 px-3 py-0.5 text-[12px] font-black text-violet-800">Match</span>
            <div className="absolute rounded-2xl border-2 border-sky-100 bg-sky-50/80" style={{ left: 20, top: 40, width: 352, height: 104 }}>
              {["goodbye", "hello", "sorry"].map((word, index) => (
                <CardPic key={word} word={word} plain box={{ x: 96 + index * 56, y: 12, w: 48, h: 64 }} className={index === 1 ? "border-2 border-emerald-500" : ""} />
              ))}
            </div>
            <div className="absolute rounded-2xl bg-blue-600 px-3 py-2 text-white shadow-[0_4px_0_rgba(30,64,175,0.3)]" style={{ left: 20, top: 156, width: 352, height: 72 }}>
              <p className="text-[10px] font-black uppercase tracking-wide text-blue-100">How to play</p>
              <p className="mt-0.5 text-[18px] font-black leading-tight">Tap the picture for &ldquo;Hello&rdquo;.</p>
            </div>
            <span className="absolute bottom-3 left-10 flex h-11 w-[140px] items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 text-[15px] font-black text-blue-800">
              <Volume2 className="h-5 w-5" /> Listen
            </span>
            <span
              className={cn(
                "absolute bottom-3 right-10 flex h-11 w-[150px] items-center justify-center gap-2 rounded-2xl border-4 border-white bg-blue-600 text-[15px] font-black text-white shadow-[0_5px_0_rgba(30,64,175,0.35)] transition-transform",
                pressedAt(t, 3600) && "translate-y-1"
              )}
            >
              <PlayCircle className="h-5 w-5" /> Start
            </span>
          </div>
        </Pop>
        <Pointer t={t} path={[[0, 400, 320], [500, ...FIRST_TILE], [1200, ...FIRST_TILE, true], [3000, ...START_BUTTON], [3600, ...START_BUTTON, true]]} />
      </>
    )
  },
  {
    label: "Tap the answer",
    caption: "Tap the right picture. Three tries: a wrong tap buzzes, fades out, and Maki cheers them on.",
    duration: 7200,
    render: (t) => {
      const second = t >= 3000;
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-sky-100 to-[#f4fbff]">
            <GameTopBar done={second ? 1 : 0} total={3} />
            {second ? (
              <MatchQuestion word="goodbye" options={["hello", "sorry", "goodbye"]} picked="sorry" t={t} pickedAt={4400} />
            ) : (
              <MatchQuestion word="hello" options={["goodbye", "hello", "sorry"]} picked="hello" t={t} pickedAt={1300} />
            )}
            <div className="absolute bottom-1 left-2">
              <Maki mood={second ? (t >= 4400 ? "encourage" : "happy") : t >= 1300 ? "cheer" : "happy"} size={96} label="" />
            </div>
          </div>
          <Pop show={t >= 1400 && t < 2800} className="absolute inset-0 z-30 grid place-items-center">
            <div className="grid place-items-center rounded-3xl border-4 border-emerald-200 bg-white px-10 py-5 shadow-2xl">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white">
                <Check className="h-10 w-10" strokeWidth={3.5} />
              </span>
              <p className="mt-2 text-[26px] font-black text-emerald-600">Correct!</p>
            </div>
          </Pop>
          <Pointer t={t} path={[[0, 400, 320], [600, ...choiceCenter(1)], [1200, ...choiceCenter(1), true], [2000, 560, 320], [3700, ...choiceCenter(1)], [4300, ...choiceCenter(1), true], [5200, 560, 320]]} />
        </>
      );
    }
  },
  {
    label: "Drag and drop",
    caption: "In Drag and drop, drag each picture onto its word. A wrong one goes back. Each card has three tries.",
    duration: 7400,
    render: (t) => {
      const words = ["eat", "drink", "sleep"];
      // eat goes to Eat; sleep goes to Drink (wrong, back to the tray); sleep goes to Sleep.
      const path: PointerKey[] = [
        [0, 330, 330],
        [300, ...trayCenter(0)],
        [900, ...trayCenter(0), true],
        [1000, ...boxCenter(0)],
        [2300, ...trayCenter(2)],
        [2900, ...trayCenter(2), true],
        [3000, ...boxCenter(1)],
        [3800, ...trayCenter(2)],
        [4700, ...trayCenter(2)],
        [5200, ...trayCenter(2), true],
        [5300, ...boxCenter(2)],
        [6600, 330, 330]
      ];
      const placed = [t >= 1700, false, t >= 6000];
      const wrong = t >= 3700 && t < 4200;
      const dragging = (t >= 900 && t < 1700) || (t >= 2900 && t < 4400) || (t >= 5200 && t < 6000);
      const draggedWord = t < 2000 ? "eat" : "sleep";
      return (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100 to-[#f4fbff]">
          <GameTopBar done={placed.filter(Boolean).length} total={3} />
          <div className="absolute left-1/2 top-[52px] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-2xl bg-blue-600 px-5 py-2.5 text-[15px] font-black text-white">
            <Hand className="h-4 w-4" /> Drag each picture onto its word.
          </div>
          {words.map((word, index) => (
            <motion.div
              key={word}
              className={cn("absolute rounded-2xl border-4 border-dashed bg-white/80 text-center", placed[index] ? "border-solid border-emerald-500" : index === 1 && wrong ? "border-red-400" : "border-blue-200")}
              style={{ left: 150 + index * 120, top: 104, width: 100, height: 126 }}
              animate={index === 1 && wrong ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
            >
              <span className="mt-1.5 inline-block rounded-lg bg-blue-600 px-2 py-0.5 text-[12px] font-black uppercase text-white">{word}</span>
              {placed[index] ? <CardPic word={word} plain box={{ x: 22, y: 32, w: 50, h: 67 }} className="border-emerald-400" /> : null}
            </motion.div>
          ))}
          {["eat", "drink", "sleep"].map((word, index) =>
            (index === 0 && t >= 900) || (index === 2 && (dragging && t >= 2900 || t >= 6000)) ? null : (
              <CardPic key={word} word={word} plain box={{ x: trayCenter(index)[0] - 28, y: trayCenter(index)[1] - 37, w: 56, h: 75 }} className="shadow-sm" />
            )
          )}
          <Ghost t={t} path={path} show={dragging} word={draggedWord} plain />
          <div className="absolute bottom-1 left-2">
            <Maki mood={wrong || (t >= 3700 && t < 5200) ? "encourage" : t >= 1700 ? "cheer" : "happy"} size={90} label="" />
          </div>
          <Pointer t={t} path={path} />
        </div>
      );
    }
  },
  {
    label: "See the score",
    caption: "Maki shows the score at the end. Play again, or go back to all activities.",
    duration: 4400,
    render: (t) => (
      <>
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100 to-[#f4fbff]" />
        <Pop show className="absolute inset-0 z-30">
          <div className="absolute inset-0 bg-sky-950/20" />
          <div className="absolute rounded-3xl border-4 border-blue-200 bg-white text-center shadow-2xl" style={{ left: 130, top: 12, width: 380, height: 336 }}>
            <div className="mt-5 flex justify-center">
              <Maki mood="encourage" message="Great try!" size={78} label="" />
            </div>
            <p className="text-[22px] font-black text-blue-700">Good try!</p>
            <div className="mt-1 flex justify-center gap-1 text-[22px] leading-none">
              <span className="text-yellow-400">&#9733;</span>
              <span className="text-yellow-400">&#9733;</span>
              <span className="text-yellow-200">&#9733;</span>
            </div>
            <p className="mt-1 text-[17px] font-black text-[#10285e]">Score 2 / 3</p>
            <div className="relative mx-auto mt-2 h-[64px] w-[170px]">
              {["hello", "goodbye", "sorry"].map((word, index) => (
                <span key={word} className="absolute" style={{ left: index * 60, top: 0, width: 48, height: 64 }}>
                  <CardPic word={word} plain box={{ x: 0, y: 0, w: 48, h: 64 }} className={index === 1 ? "border-2 border-rose-300" : "border-2 border-emerald-400"} />
                </span>
              ))}
            </div>
            <span className="absolute bottom-4 left-6 flex h-10 w-[150px] items-center justify-center gap-1.5 rounded-2xl border-2 border-blue-200 text-[13px] font-black text-blue-800">
              <LayoutDashboard className="h-4 w-4" /> All activities
            </span>
            <span
              className={cn(
                "absolute bottom-4 right-6 flex h-10 w-[150px] items-center justify-center gap-1.5 rounded-2xl border-4 border-white bg-blue-600 text-[13px] font-black text-white shadow-[0_5px_0_rgba(30,64,175,0.35)] transition-transform",
                pressedAt(t, 3200) && "translate-y-1"
              )}
            >
              <PlayCircle className="h-4 w-4" /> Play again
            </span>
          </div>
        </Pop>
        <Pointer t={t} path={[[0, 560, 330], [2600, 429, 312], [3200, 429, 312, true]]} />
      </>
    )
  }
];

/** Help topic id to its Show me scenes (Student mode, Playground, Gesture practice, admin guides). */
export const moreHelpDemos: Record<string, DemoScene[]> = {
  student: studentScenes,
  playground: playgroundScenes,
  gesture: gestureScenes,
  browse: browseScenes,
  accounts: [...accountScenes, turnOffScene],
  log: logScenes,
  "student-activities": studentActivityScenes
};
