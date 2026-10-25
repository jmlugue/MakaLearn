import assert from "node:assert/strict";
import test from "node:test";
import { fitPecsTemplateImage, pecsTemplate } from "../src/utils/pecs-card-template.ts";

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
