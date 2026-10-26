import assert from "node:assert/strict";
import test from "node:test";
import { fitPecsCaption, fitPecsTemplateImage, pecsTemplate } from "../src/utils/pecs-card-template.ts";

test("landscape, portrait and square pictures stay inside the border without distortion", () => {
  for (const [width, height] of [[1200, 600], [600, 1600], [1000, 1000], [900, 1200]]) {
    const fit = fitPecsTemplateImage(width, height);
    assert.ok(Math.abs(fit.width / fit.height - width / height) < 0.00001);
    assert.ok(fit.x >= 45 && fit.y >= 45);
    assert.ok(fit.x + fit.width <= 855 && fit.y + fit.height <= 1155);
    assert.ok(Math.abs(fit.width - 810) < 0.00001 || Math.abs(fit.height - 1110) < 0.00001, "fills at least one interior dimension, without extra padding");
    assert.equal(fit.x + fit.width / 2, pecsTemplate.width / 2);
    assert.equal(fit.y + fit.height / 2, pecsTemplate.height / 2);
  }
});

test("captioned artwork fits wholly above the fixed caption area", () => {
  for (const [width, height] of [[1200, 600], [600, 1600], [1000, 1000], [900, 1200]]) {
    const fit = fitPecsTemplateImage(width, height, pecsTemplate.artwork);
    assert.ok(Math.abs(fit.width / fit.height - width / height) < 0.00001);
    assert.ok(fit.x >= pecsTemplate.artwork.x && fit.y >= pecsTemplate.artwork.y);
    assert.ok(fit.x + fit.width <= pecsTemplate.artwork.x + pecsTemplate.artwork.width);
    assert.ok(fit.y + fit.height <= pecsTemplate.artwork.y + pecsTemplate.artwork.height);
    assert.ok(fit.y + fit.height < pecsTemplate.caption.y);
  }
});

const measure = (text, size) => text.length * size * 0.6;

test("short captions use uppercase and longer captions shrink before wrapping", () => {
  assert.deepEqual(fitPecsCaption("  Eat  ", measure).lines, ["EAT"]);
  assert.equal(fitPecsCaption("Eat", measure).fontSize, 108);
  for (const label of ["Good Morning", "Thank You", "Wash Hands"]) {
    const layout = fitPecsCaption(label, measure);
    assert.equal(layout.lines.length, 1);
    assert.ok(layout.lines.every((line) => measure(line, layout.fontSize) <= pecsTemplate.caption.width));
  }
  const twoLines = fitPecsCaption("Please wash your hands", measure);
  assert.equal(twoLines.lines.length, 2);
  assert.equal(twoLines.lines.join(" "), "PLEASE WASH YOUR HANDS");
  assert.ok(twoLines.lineHeight * 2 <= pecsTemplate.caption.height);
});

test("unreadable captions produce an error instead of clipping or splitting a word", () => {
  for (const label of ["", "a".repeat(60), "This is far too much text to put onto a single classroom picture card"]) {
    assert.throws(() => fitPecsCaption(label, measure), /label/i);
  }
  assert.throws(() => fitPecsCaption("Eat", measure, { x: 0, y: 0, width: 74, height: 18 }, 0.1), /legibly/);
});

test("image-as-uploaded fits preserve the complete frame and aspect ratio", () => {
  for (const [width, height] of [[900, 1200], [1200, 900], [1200, 1200]]) {
    const fit = fitPecsTemplateImage(width, height, { x: 0, y: 0, width: 900, height: 1200 });
    assert.ok(Math.abs(fit.width / fit.height - width / height) < 0.00001);
    assert.ok(fit.x >= 0 && fit.y >= 0 && fit.x + fit.width <= 900 && fit.y + fit.height <= 1200);
  }
  assert.throws(() => fitPecsTemplateImage(0, 100), /dimensions/);
});
