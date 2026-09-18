import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbook = await SpreadsheetFile.importXlsx(
  await FileBlob.load("D:/MakaLearn/outputs/timetable-commit-review-20260918/MakaLearn Proposed Timetable Monitoring - Commit Completion.xlsx"),
);
const outputDir = "D:/MakaLearn/tmp/timetable-monitoring/final-previews";
await fs.mkdir(outputDir, { recursive: true });

for (const [name, range] of [
  ["top", "D1:H12"],
  ["model-evidence", "D54:H60"],
  ["content-bottom", "D121:H136"],
]) {
  const image = await workbook.render({ sheetName: "Progress Table", range, scale: 1.5, format: "png" });
  await fs.writeFile(`${outputDir}/${name}.png`, new Uint8Array(await image.arrayBuffer()));
  console.log(`${name}\t${range}`);
}
