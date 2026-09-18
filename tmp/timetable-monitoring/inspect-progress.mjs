import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "D:/Downloads/MakaLearn Proposed Timetable Monitoring (1).xlsx";
const previewPath = "D:/MakaLearn/tmp/timetable-monitoring/previews/progress-table.png";

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
for (let index = 0; index < 18; index += 1) {
  const sheet = workbook.worksheets.getItemAt(index);
  console.log(`SHEET\t${index}\t${sheet.name}\t${sheet.getUsedRange()?.address ?? "A1"}`);
}

const sheet = workbook.worksheets.getItem("Progress Table");
const detail = await workbook.inspect({
  kind: "region,formula,computedStyle",
  sheetId: sheet.name,
  range: "A1:H153",
  maxChars: 50000,
  tableMaxRows: 160,
  tableMaxCols: 8,
  tableMaxCellChars: 240,
  options: { maxResults: 300 },
});
console.log(detail.ndjson);

const preview = await workbook.render({
  sheetName: sheet.name,
  range: "A1:H153",
  scale: 1.25,
  format: "png",
});
await fs.mkdir("D:/MakaLearn/tmp/timetable-monitoring/previews", { recursive: true });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
console.log(`PREVIEW\t${previewPath}`);
