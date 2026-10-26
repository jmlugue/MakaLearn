/** Match the bundled 900 x 1200 cards, including their artwork and bottom caption regions. */
export const pecsTemplate = {
  width: 900, height: 1200, inset: 40, stroke: 10, radius: 30,
  artwork: { x: 80, y: 100, width: 740, height: 740 },
  caption: { x: 80, y: 910, width: 740, height: 180 }
};

type Bounds = { x: number; y: number; width: number; height: number };
export type PecsCardSettings = { style: "outline" | "original"; addLabel: boolean; label: string };
export type PecsCardImages = { symbol: File; activity?: File };

/** Contain every pixel without changing proportions or cropping. */
export function fitPecsTemplateImage(width: number, height: number, bounds?: Bounds) {
  const edge = pecsTemplate.inset + pecsTemplate.stroke / 2;
  const area = bounds ?? { x: edge, y: edge, width: pecsTemplate.width - 2 * edge, height: pecsTemplate.height - 2 * edge };
  if (width <= 0 || height <= 0 || !Number.isFinite(width + height)) throw new Error("This picture has invalid dimensions.");
  const scale = Math.min(area.width / width, area.height / height);
  return {
    x: area.x + (area.width - width * scale) / 2,
    y: area.y + (area.height - height * scale) / 2,
    width: width * scale,
    height: height * scale
  };
}

/** Shrink a single line first, then try two balanced lines. Never squash or clip the caption. */
export function fitPecsCaption(label: string, measure: (text: string, size: number) => number, bounds = pecsTemplate.caption, scale = 1) {
  const text = label.trim().replace(/\s+/g, " ").toUpperCase();
  if (!text) throw new Error("Add a label to preview the caption.");
  const words = text.split(" ");
  const candidates = [[text]];
  for (let split = 1; split < words.length; split++) candidates.push([words.slice(0, split).join(" "), words.slice(split).join(" ")]);
  for (const lineCount of [1, 2]) {
    for (let size = 108; size >= 64; size -= 2) {
      const fontSize = size * scale;
      const lineHeight = fontSize * 1.15;
      if (fontSize < 32 || lineHeight * lineCount > bounds.height) continue;
      const fits = candidates.filter((lines) => lines.length === lineCount && lines.every((line) => measure(line, fontSize) <= bounds.width));
      if (fits.length) {
        fits.sort((a, b) => Math.max(...a.map((line) => measure(line, fontSize))) - Math.max(...b.map((line) => measure(line, fontSize))));
        return { lines: fits[0], fontSize, lineHeight };
      }
    }
  }
  throw new Error("This label cannot fit legibly on the picture. Shorten the label or use plain artwork with the card outline.");
}

async function pngFile(canvas: HTMLCanvasElement, source: File, suffix = "") {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("The card picture could not be prepared. Try again.")), "image/png");
  });
  return new File([blob], `${source.name.replace(/\.[^.]+$/, "")}${suffix}.png`, { type: "image/png" });
}

/**
 * Generate from the original upload every time. Only a teacher-declared word-free source (addLabel)
 * can produce an Activity image; a source with existing words is never reused for answer choices.
 */
export async function createPecsCardImages(source: File, settings: PecsCardSettings): Promise<PecsCardImages> {
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error("This picture could not be opened. Choose another PNG, JPG, or WebP image."); }
    const canvas = document.createElement("canvas");
    canvas.width = pecsTemplate.width;
    canvas.height = pecsTemplate.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The card picture could not be prepared. Try again.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = "high";

    const outlined = settings.style === "outline";
    const area = outlined
      ? settings.addLabel ? pecsTemplate.artwork : undefined
      : { x: 0, y: 0, width: canvas.width, height: canvas.height };
    const fit = fitPecsTemplateImage(image.naturalWidth, image.naturalHeight, area);
    context.drawImage(image, fit.x, fit.y, fit.width, fit.height);
    if (outlined) {
      const { inset, stroke, radius, width, height } = pecsTemplate;
      context.beginPath();
      context.roundRect(inset, inset, width - 2 * inset, height - 2 * inset, radius);
      context.strokeStyle = "#000";
      context.lineWidth = stroke;
      context.stroke();
    }
    if (!settings.addLabel) {
      // Still decode the original, so corrupt uploads cannot bypass preview validation.
      return { symbol: outlined ? await pngFile(canvas, source) : source };
    }

    // Snapshot before adding text, so both versions keep exactly the same artwork placement.
    const activity = await pngFile(canvas, source, "-activity");
    const scaleX = fit.width / pecsTemplate.width;
    const scaleY = fit.height / pecsTemplate.height;
    const scale = outlined ? 1 : Math.min(scaleX, scaleY);
    const caption = outlined ? pecsTemplate.caption : {
      x: fit.x + pecsTemplate.caption.x * scaleX,
      y: fit.y + pecsTemplate.caption.y * scaleY,
      width: pecsTemplate.caption.width * scaleX,
      height: pecsTemplate.caption.height * scaleY
    };
    const layout = fitPecsCaption(settings.label, (text, size) => {
      context.font = `700 ${size}px Arial, sans-serif`;
      const metrics = context.measureText(text);
      return Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
    }, caption, scale);
    context.font = `700 ${layout.fontSize}px Arial, sans-serif`;
    context.fillStyle = "#000";
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    layout.lines.forEach((line, index) => {
      const metrics = context.measureText(line);
      const centerY = caption.y + caption.height / 2 + (index - (layout.lines.length - 1) / 2) * layout.lineHeight;
      context.fillText(line, caption.x + caption.width / 2, centerY + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
    });
    return { symbol: await pngFile(canvas, source), activity };
  } finally {
    URL.revokeObjectURL(url);
  }
}
