import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "D:/Downloads/MakaLearn Proposed Timetable Monitoring (1).xlsx";
const outputPath = "D:/MakaLearn/outputs/timetable-commit-review-20260918/MakaLearn Proposed Timetable Monitoring - Commit Completion.xlsx";

const source = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const output = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));

const sourceSheetNames = Array.from({ length: 18 }, (_, index) => source.worksheets.getItemAt(index).name);
const outputSheetNames = Array.from({ length: 18 }, (_, index) => output.worksheets.getItemAt(index).name);
if (JSON.stringify(sourceSheetNames) !== JSON.stringify(outputSheetNames)) {
  throw new Error("Sheet names or order changed.");
}

const sourceSheet = source.worksheets.getItem("Progress Table");
const outputSheet = output.worksheets.getItem("Progress Table");
if (JSON.stringify(sourceSheet.getRange("A1:E153").values) !== JSON.stringify(outputSheet.getRange("A1:E153").values)) {
  throw new Error("Timetable columns A:E changed.");
}

const statuses = outputSheet.getRange("G2:G136").values.flat();
const dates = outputSheet.getRange("F2:F136").values.flat();
const comments = outputSheet.getRange("H2:H136").values.flat();
const counts = statuses.reduce((summary, status) => {
  summary[status] = (summary[status] ?? 0) + 1;
  return summary;
}, {});

if (statuses.some((status) => !status)) throw new Error("A completion status is missing.");
if (comments.some((comment) => !comment)) throw new Error("A commit-evidence comment is missing.");
if (dates.filter(Boolean).length !== counts.Finished) throw new Error("Finished/date counts do not agree.");

const overview = await output.inspect({
  kind: "workbook,sheet,table,drawing",
  maxChars: 10000,
  tableMaxRows: 4,
  tableMaxCols: 4,
});
console.log("OUTPUT_OVERVIEW");
console.log(overview.ndjson);

for (const range of ["D1:H12", "D54:H60", "D88:H100", "D121:H136"]) {
  const check = await output.inspect({
    kind: "table",
    sheetId: "Progress Table",
    range,
    maxChars: 12000,
    tableMaxRows: 20,
    tableMaxCols: 5,
    tableMaxCellChars: 180,
  });
  console.log(`RANGE\t${range}`);
  console.log(check.ndjson);
}

const errors = await output.inspect({
  kind: "match",
  sheetId: "Progress Table",
  range: "A1:H153",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "saved Progress Table formula error scan",
});
console.log("ERROR_SCAN");
console.log(errors.ndjson);
console.log(`COUNTS\t${JSON.stringify(counts)}`);
console.log(`DATED_ROWS\t${dates.filter(Boolean).length}`);
console.log(`VERIFIED\t${outputPath}`);
