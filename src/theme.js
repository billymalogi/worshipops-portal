// WorshipOps theme
// One source of truth for every color, size and timing in the app.
// Usage: call applyTheme(mode, churchBrandHex) once at startup and whenever
// the mode or the church brand color changes. It writes CSS variables onto
// <html>, so inline styles can use them: style={{ color: "var(--text-1)" }}.
//
// Visual direction from unslop by Damir Sokolovsky (@heydamir), CC BY 4.0.

export const ramps = {
  light: {
    "--page": "#fafafa",      // app background
    "--card": "#ffffff",      // cards, panels, table
    "--raised": "#f4f4f5",    // hover rows, inputs, active segment
    "--deep": "#f0f0f1",      // scripture strip, side panels
    "--line": "rgba(23,23,23,0.08)",
    "--line-2": "rgba(23,23,23,0.14)",
    "--text-1": "#171717",    // primary text
    "--text-2": "#525252",    // secondary text
    "--text-3": "#737373",    // muted: meta, captions, icons
    "--positive": "#16a34a",
    "--negative": "#dc2626",
    "--shadow-sm": "0 1px 2px rgba(0,0,0,0.05)",
    "--shadow-lg": "0 8px 24px rgba(0,0,0,0.08)",
  },
  dark: {
    "--page": "#141415",
    "--card": "#19191b",
    "--raised": "#232325",
    "--deep": "#0f0f10",
    "--line": "rgba(237,237,237,0.08)",
    "--line-2": "rgba(237,237,237,0.14)",
    "--text-1": "#ededed",
    "--text-2": "#a1a1a6",
    "--text-3": "#85858b",
    "--positive": "#4cc38a",
    "--negative": "#e5484d",
    "--shadow-sm": "none",
    "--shadow-lg": "0 8px 24px rgba(0,0,0,0.4)",
  },
};

export const type = {
  "--font-sans": '"Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  "--font-mono": '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
  // size / line height. Weights: 400 body, 500 labels and titles, 600 rare emphasis.
  "--fs-meta": "12px",  "--lh-meta": "16px",   // times, counts, tags (mono welcome)
  "--fs-small": "13px", "--lh-small": "20px",  // secondary text, table cells
  "--fs-body": "14px",  "--lh-body": "20px",   // body, nav, buttons
  "--fs-item": "15px",  "--lh-item": "22px",   // service item titles
  "--fs-title": "24px", "--lh-title": "32px",  // page titles
  "--fs-figure": "28px",                       // stat figures, tabular
};

// 4px grid. Use only these.
export const space = { 1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px", 8: "32px", 10: "40px", 12: "48px", 16: "64px" };

export const radius = {
  "--r-tag": "6px",     // tags, keycaps, small buttons
  "--r-control": "8px", // buttons, inputs, rows
  "--r-card": "12px",   // cards, tables
  "--r-panel": "16px",  // modals, large panels
};

export const motion = {
  "--ease": "cubic-bezier(0.22, 1, 0.36, 1)",
  "--t-fast": "140ms",  // hover, press
  "--t-menu": "200ms",  // menus, popovers
  "--t-enter": "360ms", // sheets, page enter
};

// ---------- Church brand color ----------
// A church picks one brand color. It becomes the accent: the primary
// button, the active tab and the selected item. It never fills surfaces.

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const mix = (a, b, t) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
};

// Text on a filled color: whichever of near-black or white reads better.
const textOn = (hex) => (contrast(hex, "#ffffff") >= contrast(hex, "#171717") ? "#ffffff" : "#171717");

// A color used as text on a background: shift it darker (light mode) or
// lighter (dark mode) until it reaches 4.5:1.
const readableInk = (hex, background, mode) => {
  let ink = hex;
  const toward = mode === "dark" ? "#ffffff" : "#000000";
  for (let t = 0.05; contrast(ink, background) < 4.5 && t <= 0.9; t += 0.05) ink = mix(hex, toward, t);
  return ink;
};

export function deriveBrand(brandHex, mode) {
  const surface = ramps[mode]["--card"];
  const onAccent = textOn(brandHex);
  const ink = readableInk(brandHex, surface, mode);
  const [r, g, b] = hexToRgb(brandHex);
  return {
    "--accent": brandHex,
    "--on-accent": onAccent,
    "--accent-ink": ink,
    "--accent-soft": `rgba(${r},${g},${b},${mode === "dark" ? 0.16 : 0.1})`,
    "--accent-line": `rgba(${r},${g},${b},0.35)`,
  };
}

// ---------- Service section colors ----------
// Each church picks section colors from a full palette, so any hue can
// arrive here, including pale yellows. Returns CSS variables to set on a
// section header element (style={{...sectionColors(section.color, mode)}}).
//   --sc       the picked color, for the dot and the line
//   --sc-soft  a light wash for the tinted band style
//   --sc-ink   the section name color, readable on the band (4.5:1)
//   --sc-on    text color for the solid fill style
export function sectionColors(hex, mode) {
  const surface = ramps[mode]["--card"];
  const alpha = mode === "dark" ? 0.16 : 0.1;
  const band = mix(surface, hex, alpha);
  const [r, g, b] = hexToRgb(hex);
  return {
    "--sc": hex,
    "--sc-soft": `rgba(${r},${g},${b},${alpha})`,
    "--sc-ink": readableInk(hex, band, mode),
    "--sc-on": textOn(hex),
  };
}

export function applyTheme(mode = "light", brandHex = "#e3a857", root = document.documentElement) {
  const vars = { ...ramps[mode], ...type, ...radius, ...motion, ...deriveBrand(brandHex, mode) };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.colorScheme = mode;
  root.dataset.theme = mode;
}
