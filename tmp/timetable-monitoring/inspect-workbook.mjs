import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "D:/Downloads/MakaLearn Proposed Timetable Monitoring (1).xlsx";
const previewDir = "D:/MakaLearn/tmp/timetable-monitoring/previews";

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table,definedName,drawing",
  maxChars: 20000,
  tableMaxRows: 12,
  tableMaxCols: 12,
  tableMaxCellChars: 160,
});
console.log("OVERVIEW");
console.log(overview.ndjson);

await fs.mkdir(previewDir, { recursive: true });
for (let index = 0; index < workbook.worksheets.items.length; index += 1) {
  const sheet = workbook.worksheets.getItemAt(index);
  const used = sheet.getUsedRange();
  const address = used?.address ?? "A1";
  const detail = await workbook.inspect({
    kind: "region,formula,computedStyle",
    sheetId: sheet.name,
    range: address,
    maxChars: 30000,
    tableMaxRows: 120,
    tableMaxCols: 30,
    tableMaxCellChars: 220,
    options: { maxResults: 200 },
  });
  console.log(`SHEET\t${index}\t${sheet.name}\t${address}`);
  console.log(detail.ndjson);

  const preview = await workbook.render({
    sheetName: sheet.name,
    autoCrop: "all",
    scale: 1.5,
    format: "png",
  });
  const safeName = sheet.name.replace(/[\\/:*?"<>|]/g, "_");
  await fs.writeFile(
    `${previewDir}/${String(index + 1).padStart(2, "0")}-${safeName}.png`,
    new Uint8Array(await preview.arrayBuffer()),
  );
}
