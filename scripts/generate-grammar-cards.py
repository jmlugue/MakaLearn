"""Draw original grammar placeholders in the established card geometry.

These are code-drawn educational cues, not official Makaton symbols. Activity
variants contain no text and are reserved for future contextual questions.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CARDS = json.loads((ROOT / "public/pecs/grammar_card_manifest.json").read_text())
FONT = Path("C:/Windows/Fonts/arialbd.ttf")


def cue(draw, word):
    blue, pale, ink = "#3b82f6", "#dbeafe", "#111827"
    if word in ("A", "An", "The"):
        # A single item, with The indicating a particular one in a group.
        if word == "The":
            for x in (210, 450, 690):
                draw.ellipse((x - 75, 380, x + 75, 530), fill=pale, outline=ink, width=8)
            draw.ellipse((345, 350, 555, 560), outline=blue, width=16)
            draw.line((450, 650, 450, 590), fill=ink, width=14)
            draw.polygon([(450, 565), (420, 610), (480, 610)], fill=ink)
        elif word == "An":
            draw.ellipse((330, 340, 570, 590), fill=pale, outline=ink, width=10)
            draw.line((450, 335, 470, 295), fill=ink, width=10)
            draw.ellipse((475, 285, 545, 320), fill=blue)
        else:
            draw.rounded_rectangle((325, 345, 575, 595), radius=35, fill=pale, outline=ink, width=10)
    elif word == "To":
        draw.ellipse((200, 390, 320, 510), fill=pale, outline=ink, width=8)
        draw.line((360, 450, 610, 450), fill=blue, width=22)
        draw.polygon([(670, 450), (590, 390), (590, 510)], fill=blue)
    elif word == "And":
        for x in (255, 645):
            draw.ellipse((x - 80, 365, x + 80, 525), fill=pale, outline=ink, width=8)
        draw.line((385, 445, 515, 445), fill=blue, width=18)
        draw.line((450, 380, 450, 510), fill=blue, width=18)
    elif word == "Not":
        draw.ellipse((310, 315, 590, 595), fill=pale, outline=ink, width=10)
        draw.line((330, 575, 570, 335), fill="#dc2626", width=25)


for card in CARDS:
    for labelled in (True, False):
        image = Image.new("RGB", (900, 1200), "white")
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((40, 40, 860, 1160), radius=30, outline="black", width=10)
        if labelled:
            # Match existing Am/Is/Are cards: function word as the main picture,
            # with the normal learning-material label beneath it.
            draw.rounded_rectangle((175, 265, 725, 650), radius=45, outline="black", width=8)
            draw.text((450, 465), card["label"].upper(), font=ImageFont.truetype(str(FONT), 205), fill="black", anchor="mm")
            draw.text((450, 1015), card["label"].upper(), font=ImageFont.truetype(str(FONT), 120), fill="black", anchor="mm")
        else:
            cue(draw, card["label"])
        folder = "generated_cards" if labelled else "generated_cards_no_text"
        image.save(ROOT / "public/pecs" / folder / card["filename"], optimize=True)
print(f"Generated {len(CARDS)} labelled and {len(CARDS)} word-free grammar cards.")
