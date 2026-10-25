import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

// Exercise the real Help component's clock and controls without a browser or backend.
// The browser fixtures separately check animation transforms and phone geometry.
const compiled = ts.transpileModule(fs.readFileSync("src/features/help/help-demo.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
}).outputText;

function playback({ reduced = false } = {}) {
  const states = [], effects = [], pending = [], timers = new Map();
  let stateIndex = 0, effectIndex = 0, dirty = false, tree, now = 0, timerId = 0;
  const jsx = (type, props) => ({ type, props });
  const timer = (fn, delay, repeat) => {
    const id = ++timerId;
    timers.set(id, { fn, at: now + delay, repeat });
    return id;
  };
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {
      useRef: () => ({ current: null }),
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [states[index], (value) => {
          const next = typeof value === "function" ? value(states[index]) : value;
          if (!Object.is(next, states[index])) { states[index] = next; dirty = true; }
        }];
      },
      useEffect(fn, deps) {
        const index = effectIndex++, previous = effects[index];
        if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
          pending.push(() => { previous?.cleanup?.(); effects[index] = { deps, cleanup: fn() }; });
        }
      }
    },
    "framer-motion": { useReducedMotionConfig: () => reduced, MotionConfig: "MotionConfig", motion: { div: "motion.div" } },
    "lucide-react": {},
    "@/components/ui/dialog": { Dialog: "Dialog" },
    "@/components/ui/button": { Button: "Button" },
    "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") }
  };
  const exports = {};
  const browser = {
    setInterval: (fn, delay) => timer(fn, delay, true), clearInterval: (id) => timers.delete(id),
    setTimeout: (fn, delay) => timer(fn, delay, false), clearTimeout: (id) => timers.delete(id)
  };
  new Function("exports", "require", "window", "performance", compiled)(exports, (name) => {
    assert(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, browser, { now: () => now });
  const scenes = ["First", "Second"].map((label) => ({ label, caption: label, duration: 4000, render: () => null }));
  function flush() {
    let passes = 0;
    do {
      assert(++passes < 20, "Component did not settle");
      dirty = false; stateIndex = 0; effectIndex = 0;
      tree = exports.HelpDemoDialog({ open: true, title: "Guide", scenes, onClose() {} });
      pending.splice(0).forEach((run) => run());
    } while (dirty);
  }
  function all(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap((child) => all(child));
    return [node, ...all(node.props?.children)];
  }
  const text = (node) => typeof node === "string" ? node : Array.isArray(node) ? node.map(text).join("") : node?.props ? text(node.props.children) : "";
  flush();
  return {
    step: () => all(tree).find((node) => node.props?.["aria-current"] === "step").props["aria-label"],
    progress: () => all(tree).find((node) => node.props?.["aria-current"] === "step").props.children[0].props.children.props.style.width,
    click(label) {
      const button = all(tree).find((node) => node.props?.onClick && (node.props["aria-label"] === label || text(node).trim() === label));
      assert(button, `Missing control: ${label}`);
      button.props.onClick(); flush();
    },
    advance(ms) {
      now += ms;
      for (const [id, item] of [...timers]) {
        if (item.at > now) continue;
        if (!item.repeat) timers.delete(id);
        item.fn();
      }
      flush();
    }
  };
}

test("reduced-motion Help holds each still step until Next", () => {
  const guide = playback({ reduced: true });
  guide.advance(10000);
  assert.equal(guide.step(), "Step 1: First");
  guide.click("Next"); guide.advance(10000);
  assert.equal(guide.step(), "Step 2: Second");
});

test("Play demo explicitly starts the reduced-motion guide clock", () => {
  const guide = playback({ reduced: true });
  guide.click("Play demo"); guide.advance(1000);
  assert.equal(guide.progress(), "25%");
  guide.advance(3000); guide.advance(900);
  assert.equal(guide.step(), "Step 2: Second");
});

test("Pause stops elapsed progress and Play resumes it", () => {
  const guide = playback();
  guide.advance(1000); guide.click("Pause guide"); guide.advance(2000);
  assert.equal(guide.progress(), "25%");
  guide.click("Play guide"); guide.advance(1000);
  assert.equal(guide.progress(), "50%");
});

test("Replay restarts a reduced-motion guide without auto-skipping", () => {
  const guide = playback({ reduced: true });
  guide.click("Next"); guide.click("Replay"); guide.advance(10000);
  assert.equal(guide.step(), "Step 1: First");
});
