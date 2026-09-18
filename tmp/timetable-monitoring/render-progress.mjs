import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("D:/Downloads/MakaLearn Proposed Timetable Monitoring (1).xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const outputDir = "D:/MakaLearn/tmp/timetable-monitoring/previews";
await fs.mkdir(outputDir, { recursive: true });

for (const [name, range] of [
  ["progress-01", "A1:H40"],
  ["progress-02", "A41:H90"],
  ["progress-03", "A91:H136"],
]) {
  const preview = await workbook.render({
    sheetName: "Progress Table",
    range,
    scale: 1,
    format: "png",
  });
  const path = `${outputDir}/${name}.png`;
  await fs.writeFile(path, new Uint8Array(await preview.arrayBuffer()));
  console.log(path);
}
