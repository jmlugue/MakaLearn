import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "D:/Downloads/MakaLearn Proposed Timetable Monitoring (1).xlsx";
const outputDir = "D:/MakaLearn/outputs/timetable-commit-review-20260918";
const outputPath = `${outputDir}/MakaLearn Proposed Timetable Monitoring - Commit Completion.xlsx`;

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Progress Table");
const originalLeftSide = JSON.stringify(sheet.getRange("A1:E153").values);
const originalSheetNames = Array.from({ length: 18 }, (_, index) => workbook.worksheets.getItemAt(index).name);

const rows = new Map();
const dateValue = (isoDate) => new Date(`${isoDate}T12:00:00Z`);
const finished = (row, isoDate, evidence) => rows.set(row, [dateValue(isoDate), "Finished", evidence]);
const partial = (row, evidence) => rows.set(row, [null, "Partially finished", evidence]);
const notEvidenced = (row, evidence) => rows.set(row, [null, "Not yet evidenced", evidence]);

const evidence = {
  initial: "21e9a80 — Initial MVP implementation.",
  supabase: "d4f31d7 — Supabase Auth, database, Storage, and route middleware.",
  landmarker: "8593052 — MediaPipe hand tracking, camera controls, and landmark display.",
  realtimeGesture: "7390d84 — Real-time gesture prediction and label mapping.",
  playground: "6c2af87 — Symbol playground, audio playback, and MSAV validation.",
  studentMode: "bbe0912 — Student mode plus gesture references and audio.",
  gestureLayout: "8a98fec — Gesture reference media and learner practice layout.",
  activityPlayer: "d14cf96 — Match/drag-and-drop layouts and scoring.",
  fillBlank: "ba8cd1b — Fill-in-the-blank questions and result feedback.",
  cameraStop: "9f0bcdd — Camera lifecycle handling and practice UI.",
  aiDraft: "edc3446 — Working AI activity drafting from learning items.",
  categoryEdit: "b92cffe — Category editor and database functions.",
  databaseOnly: "aa7d392 — Database-only records and shared-activity permissions.",
  model: "9fba95c — Trained gesture model artifact and browser runtime weights.",
  feedback: "b9f9cd1 — Corrective-feedback API, safeguards, and local fallback.",
  profile: "ec0365c — Separate profile page and profile menu.",
  admin: "341f379 — Admin account/role controls and Settings redesign.",
  content: "203b73c — Content details, categories, lessons, and media tabs.",
  lessonLink: "d21d819 — Media removal controls and lesson activity/practice link.",
  guided: "fa11da1 — Guided gesture-recognition session and retry flow.",
  lessonFix: "554dbd1 — Lesson editor freeze fixed.",
  searchFix: "9ff624e — Content search corrected to label-only.",
};

partial(2, "Most runtime features are committed, but model sample preparation and evaluation are not evidenced in Git.");
finished(3, "2026-09-15", evidence.admin);
finished(4, "2026-09-15", evidence.admin);
finished(5, "2026-09-16", evidence.lessonLink);
finished(6, "2026-09-17", evidence.lessonFix);
finished(7, "2026-09-03", evidence.databaseOnly);
finished(8, "2026-06-26", evidence.playground);
finished(9, "2026-06-26", evidence.playground);
partial(10, "9fba95c adds the integrated model, but sample collection, dataset preparation, and evaluation commits were not found.");
finished(11, "2026-09-17", evidence.guided);
finished(12, "2026-09-14", evidence.feedback);

finished(13, "2026-09-03", `Latest required child evidence: ${evidence.databaseOnly}`);
finished(14, "2026-09-03", `Latest required child evidence: ${evidence.databaseOnly}`);
finished(15, "2026-06-18", evidence.supabase);
finished(16, "2026-08-17", evidence.aiDraft);
finished(17, "2026-09-03", evidence.databaseOnly);
finished(18, "2026-06-18", evidence.supabase);
finished(19, "2026-07-01", evidence.activityPlayer);
finished(20, "2026-06-18", evidence.supabase);
finished(21, "2026-07-01", evidence.activityPlayer);
finished(22, "2026-07-01", evidence.activityPlayer);
finished(23, "2026-07-01", evidence.activityPlayer);
for (const row of [24, 25, 26, 27, 28, 29, 30, 31, 32]) finished(row, "2026-06-26", evidence.playground);
for (const row of [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]) finished(row, "2026-07-01", evidence.activityPlayer);
for (const row of [44, 45, 46, 47, 48, 49]) finished(row, "2026-07-01", evidence.fillBlank);
finished(50, "2026-06-26", evidence.playground);
finished(51, "2026-06-26", evidence.playground);
finished(52, "2026-06-26", evidence.studentMode);
finished(53, "2026-06-26", evidence.playground);

partial(54, "Runtime recognition and corrective feedback are committed; the offline model-development workflow is only partly evidenced.");
partial(55, "9fba95c adds the integrated model, but the full data/training/evaluation sequence is not present in commits.");
notEvidenced(56, "No committed gesture-sample recording or validation artifact was found through HEAD 554dbd1.");
notEvidenced(57, "No committed hand-landmark dataset preparation artifact was found through HEAD 554dbd1.");
partial(58, "9fba95c adds a trained Keras model and converted weights, but not separate baseline and optimized training evidence.");
notEvidenced(59, "No committed model comparison or training-behavior evaluation report was found through HEAD 554dbd1.");
finished(60, "2026-09-04", "9fba95c — Adds best_makalearn_gesture_model.keras and deployed runtime weights.");
finished(61, "2026-07-01", evidence.cameraStop);
for (const row of [62, 63, 64]) finished(row, "2026-06-22", evidence.landmarker);
finished(65, "2026-07-01", evidence.cameraStop);
finished(66, "2026-06-30", evidence.gestureLayout);
finished(67, "2026-06-26", evidence.studentMode);
finished(68, "2026-06-30", evidence.gestureLayout);
finished(69, "2026-06-26", evidence.playground);
finished(70, "2026-06-26", evidence.studentMode);
for (const row of [71, 72, 73, 74]) finished(row, "2026-06-22", evidence.landmarker);
finished(75, "2026-09-04", evidence.model);
finished(76, "2026-06-23", evidence.realtimeGesture);
finished(77, "2026-09-04", evidence.model);
finished(78, "2026-09-04", evidence.model);
finished(79, "2026-09-17", evidence.guided);
finished(80, "2026-09-04", evidence.model);
finished(81, "2026-09-04", evidence.model);
finished(82, "2026-06-22", evidence.landmarker);
finished(83, "2026-09-17", evidence.guided);
for (const row of [84, 85, 86, 87]) finished(row, "2026-09-14", evidence.feedback);

finished(88, "2026-09-17", `Latest required child evidence: ${evidence.lessonFix}`);
for (const row of [89, 90, 91, 92, 93]) finished(row, "2026-06-18", evidence.supabase);
finished(94, "2026-09-14", evidence.profile);
for (const row of [95, 96, 97]) finished(row, "2026-09-14", evidence.profile);
finished(98, "2026-06-18", evidence.supabase);
finished(99, "2026-09-15", evidence.admin);
finished(100, "2026-06-18", evidence.supabase);
finished(101, "2026-09-15", evidence.admin);
for (const row of [102, 103]) finished(row, "2026-09-03", evidence.databaseOnly);
finished(104, "2026-09-15", evidence.admin);
finished(105, "2026-06-18", evidence.supabase);
for (const row of [106, 107, 108]) finished(row, "2026-09-15", evidence.admin);
for (const row of [109, 110, 111, 112, 113, 114, 115]) finished(row, "2026-06-18", evidence.supabase);
finished(116, "2026-09-17", evidence.searchFix);
finished(117, "2026-06-26", evidence.playground);
finished(118, "2026-09-17", evidence.searchFix);
finished(119, "2026-06-26", evidence.playground);
finished(120, "2026-09-15", evidence.content);
finished(121, "2026-09-16", evidence.lessonLink);
for (const row of [122, 123, 124]) finished(row, "2026-06-18", evidence.supabase);
finished(125, "2026-09-16", evidence.lessonLink);
finished(126, "2026-09-02", evidence.categoryEdit);
for (const row of [127, 128]) finished(row, "2026-06-18", evidence.supabase);
finished(129, "2026-09-02", evidence.categoryEdit);
finished(130, "2026-06-18", evidence.supabase);
finished(131, "2026-09-17", evidence.lessonFix);
for (const row of [132, 133, 134]) finished(row, "2026-06-18", evidence.supabase);
finished(135, "2026-09-17", evidence.lessonFix);
finished(136, "2026-09-16", evidence.lessonLink);

for (let row = 2; row <= 136; row += 1) {
  if (!rows.has(row)) throw new Error(`Missing completion assessment for row ${row}`);
}

const updateMatrix = Array.from({ length: 135 }, (_, index) => rows.get(index + 2));
sheet.getRange("F2:H136").values = updateMatrix;
sheet.getRange("F2:F136").setNumberFormat("mmmm d, yyyy");

workbook.recalculate();

if (JSON.stringify(sheet.getRange("A1:E153").values) !== originalLeftSide) {
  throw new Error("Unexpected changes were detected outside the completion columns.");
}

const check = await workbook.inspect({
  kind: "table",
  sheetId: "Progress Table",
  range: "D1:H136",
  maxChars: 50000,
  tableMaxRows: 140,
  tableMaxCols: 5,
  tableMaxCellChars: 180,
});
console.log("UPDATED_TABLE");
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  sheetId: "Progress Table",
  range: "A1:H153",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "Progress Table formula error scan",
});
console.log("ERROR_SCAN");
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const saved = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const savedSheetNames = Array.from({ length: 18 }, (_, index) => saved.worksheets.getItemAt(index).name);
if (JSON.stringify(savedSheetNames) !== JSON.stringify(originalSheetNames)) {
  throw new Error("Sheet names or order changed during export.");
}
const savedSheet = saved.worksheets.getItem("Progress Table");
if (JSON.stringify(savedSheet.getRange("A1:E153").values) !== originalLeftSide) {
  throw new Error("Saved workbook changed source timetable columns A:E.");
}

const savedCheck = await saved.inspect({
  kind: "table",
  sheetId: "Progress Table",
  range: "F2:H136",
  maxChars: 50000,
  tableMaxRows: 140,
  tableMaxCols: 3,
  tableMaxCellChars: 180,
});
console.log("SAVED_COMPLETION_COLUMNS");
console.log(savedCheck.ndjson);

const counts = { Finished: 0, "Partially finished": 0, "Not yet evidenced": 0 };
for (const [, status] of updateMatrix) counts[status] += 1;
console.log(`OUTPUT\t${outputPath}`);
console.log(`COUNTS\t${JSON.stringify(counts)}`);
