/** Match the 900 × 1200 bundled cards: 40px outline inset, 10px stroke, 30px corners. */
export const pecsTemplate = { width: 900, height: 1200, inset: 40, stroke: 10, radius: 30 };

/** Contain the whole picture inside the outline, with no extra padding or cropping. */
export function fitPecsTemplateImage(width: number, height: number) {
  const edge = pecsTemplate.inset + pecsTemplate.stroke / 2;
  const availableWidth = pecsTemplate.width - 2 * edge;
  const availableHeight = pecsTemplate.height - 2 * edge;
  const scale = Math.min(availableWidth / width, availableHeight / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;
  return {
    x: (pecsTemplate.width - fittedWidth) / 2,
    y: (pecsTemplate.height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight
  };
}

/**
 * Save the template into the card picture itself, so Content and Playground show the same result.
 * This only processes the standard card picture; word-free Activity pictures are separate uploads.
 * The caller keeps the original File for switching back to "Use image as uploaded".
 */
export async function createPecsTemplateImage(file?: File): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = pecsTemplate.width;
  canvas.height = pecsTemplate.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The card outline could not be prepared. Try using the image as uploaded.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const { inset, stroke, radius, width, height } = pecsTemplate;
  context.beginPath();
  context.roundRect(inset, inset, width - 2 * inset, height - 2 * inset, radius);

  if (file) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const fit = fitPecsTemplateImage(image.naturalWidth, image.naturalHeight);
      // Clip just the rounded corners. The complete picture keeps its aspect ratio.
      context.save();
      context.clip();
      context.imageSmoothingQuality = "high";
      context.drawImage(image, fit.x, fit.y, fit.width, fit.height);
      context.restore();
    } catch {
      throw new Error("This picture could not be opened. Choose another image or use it as uploaded.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  context.strokeStyle = "#000";
  context.lineWidth = stroke;
  context.stroke();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("The card picture could not be prepared. Try again.")), "image/png");
  });
  return new File([blob], `${file?.name.replace(/\.[^.]+$/, "") || "card-template"}.png`, { type: "image/png" });
}
