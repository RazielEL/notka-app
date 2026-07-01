export const colorThemes = [
  { id: "dark-navy", name: "Dark Navy / Frosted Pearl" },
  { id: "ink-blue", name: "Ink Blue / Mint" },
  { id: "graphite-amber", name: "Graphite / Amber" },
  { id: "midnight-violet", name: "Midnight Violet / Lavender" },
  { id: "forest-sage", name: "Forest / Sage" },
  { id: "arctic-cyan", name: "Arctic Blue / Cyan" },
  { id: "warm-paper", name: "Warm Paper / Espresso" },
  { id: "slate-rose", name: "Slate / Rose" },
  { id: "deep-ocean", name: "Deep Ocean / Seafoam" },
  { id: "minimal-mono", name: "Minimal Mono / Electric Blue" },
] as const;

export const fontChoices = [
  { id: "system", name: "System Sans" },
  { id: "inter", name: "Inter" },
  { id: "geist", name: "Geist Sans" },
  { id: "nunito", name: "Nunito Sans" },
  { id: "atkinson", name: "Atkinson Hyperlegible" },
  { id: "ibm-plex", name: "IBM Plex Sans" },
  { id: "literata", name: "Literata" },
  { id: "source-serif", name: "Source Serif 4" },
] as const;

export type ColorThemeId = (typeof colorThemes)[number]["id"];
export type FontChoiceId = (typeof fontChoices)[number]["id"];
export type ThemeMode = "light" | "dark";
export type SidebarSide = "left" | "right";

export type UserPreferences = {
  mode: ThemeMode;
  colorTheme: ColorThemeId;
  font: FontChoiceId;
  sidebarSide: SidebarSide;
  customThemeCss: string;
};

export const defaultPreferences: UserPreferences = {
  mode: "dark",
  colorTheme: "dark-navy",
  font: "system",
  sidebarSide: "left",
  customThemeCss: "",
};

export function isColorThemeId(value: string): value is ColorThemeId {
  return colorThemes.some((theme) => theme.id === value);
}

export function isFontChoiceId(value: string): value is FontChoiceId {
  return fontChoices.some((font) => font.id === value);
}

export function sanitizeCustomThemeCss(value: string) {
  return value
    .slice(0, 4000)
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => /^--notka-[a-z0-9-]+\s*:/i.test(entry))
    .filter((entry) => !/[{}<>]/.test(entry))
    .filter((entry) => !/url\s*\(|@import|expression\s*\(/i.test(entry))
    .map((entry) => `${entry};`)
    .join("\n");
}
