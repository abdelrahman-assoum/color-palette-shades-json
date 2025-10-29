// --- helpers ---
function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const bigint = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255,
  };
}

function luminance({ r, g, b }) {
  // sRGB relative luminance
  const lin = (c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

async function ensureFonts() {
  await figma
    .loadFontAsync({ family: "Inter", style: "Regular" })
    .catch(() => {});
  await figma
    .loadFontAsync({ family: "Inter", style: "Medium" })
    .catch(() => {});
  await figma.loadFontAsync({ family: "Inter", style: "Bold" }).catch(() => {});
}

// --- UI ---
figma.showUI(__html__, { width: 420, height: 380 });

// --- draw logic ---
async function drawPaletteCard(paletteObj, leftTitle) {
  await ensureFonts();

  const order = [
    "0",
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ];
  const shades = order
    .map((k) => ({ key: k, hex: paletteObj.shades[k] }))
    .filter((s) => !!s.hex);

  if (shades.length === 0) {
    figma.notify("No valid shades found (0–950).");
    return;
  }

  // Card (white background)
  const card = figma.createFrame();
  card.name = `${paletteObj.name || "Palette"} Card`;
  card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  card.cornerRadius = 16;
  card.strokes = [];
  card.layoutMode = "HORIZONTAL";
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "AUTO";
  card.paddingLeft = 24;
  card.paddingRight = 24;
  card.paddingTop = 16;
  card.paddingBottom = 16;
  card.itemSpacing = 24;

  // Left Title (two-line style like screenshot)
  const leftText = figma.createText();
  leftText.characters = leftTitle.includes("\n")
    ? leftTitle
    : leftTitle.replace(" ", "\n");
  leftText.fontName = { family: "Inter", style: "Bold" };
  leftText.fontSize = 14;
  leftText.lineHeight = { unit: "AUTO" };
  leftText.fills = [{ type: "SOLID", color: { r: 0.078, g: 0.078, b: 0.078 } }];

  // Row container with rounded mask (pill)
  const pill = figma.createFrame();
  pill.name = "Shades Row";
  pill.layoutMode = "HORIZONTAL";
  pill.counterAxisAlignItems = "CENTER";
  pill.primaryAxisSizingMode = "FIXED";
  pill.counterAxisSizingMode = "FIXED";
  pill.clipsContent = true; // important for pill ends
  pill.cornerRadius = 16;
  pill.itemSpacing = 0;
  pill.strokeWeight = 0;

  // size choices (tweak to taste)
  const swatchW = 88; // width per swatch
  const swatchH = 44; // height of row
  pill.resizeWithoutConstraints(swatchW * shades.length, swatchH);

  // Add the swatches inside the pill
  shades.forEach((s, i) => {
    const rgb = hexToRgb(s.hex);
    const rect = figma.createRectangle();
    rect.resizeWithoutConstraints(swatchW, swatchH);
    rect.fills = [{ type: "SOLID", color: rgb }];
    rect.strokes = [];
    rect.name = s.key + " " + s.hex.toUpperCase();

    // shade label
    const t = figma.createText();
    t.characters = s.key;
    t.fontName = { family: "Inter", style: "Bold" };
    t.fontSize = 12;

    const L = luminance(rgb);
    const labelColor = L > 0.55 ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 };

    t.fills = [{ type: "SOLID", color: labelColor }];

    // center text
    const wrap = figma.createFrame();
    wrap.layoutMode = "HORIZONTAL";
    wrap.counterAxisAlignItems = "CENTER";
    wrap.primaryAxisAlignItems = "CENTER";
    wrap.counterAxisSizingMode = "FIXED";
    wrap.primaryAxisSizingMode = "FIXED";
    wrap.resizeWithoutConstraints(swatchW, swatchH);
    wrap.fills = [{ type: "SOLID", color: rgb }];
    wrap.strokes = [];
    wrap.appendChild(t);

    // Use the frame wrapper to allow centered text without affecting the rectangular fill
    pill.appendChild(wrap);
  });

  // Compose card
  card.appendChild(leftText);
  card.appendChild(pill);

  // Drop on canvas near the current viewport
  const { x, y, width } = figma.viewport.bounds;
  card.x = x + 80;
  card.y = y + 80;

  figma.currentPage.appendChild(card);

  // optional: select + zoom
  figma.currentPage.selection = [card];
  figma.viewport.scrollAndZoomIntoView([card]);
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "render") {
    // Accept either a single palette object or an array
    const title = msg.title || "Palette";
    if (Array.isArray(msg.payload)) {
      for (const p of msg.payload) await drawPaletteCard(p, title);
    } else {
      await drawPaletteCard(msg.payload, title);
    }
  }
};
