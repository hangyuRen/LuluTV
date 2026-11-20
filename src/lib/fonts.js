import localFont from "next/font/local";
import "@/styles/noto-fonts.css";

// Keep fonts in the repository so dev/build never depend on Google requests.
export const geist = localFont({
  src: "../../public/fonts/geist/Geist.ttf",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist",
});

// Unicode subsets keep the complete CJK families without downloading every
// glyph on each page. The CSS also supplies the existing layout variables.
export const notoSansSC = { variable: "font-noto-sans-sc" };
export const notoSerifSC = { variable: "font-noto-serif-sc" };
