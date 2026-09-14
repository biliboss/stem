import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

// The chrome around the catalog wears the kernel too. Hex, not oklch: the manager's color helper (polished)
// throws on oklch and the whole Storybook renders blank.
addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "kernel · design system",
    brandUrl: "/",
    fontBase: '"Mona Sans Variable", ui-sans-serif, system-ui, sans-serif',
    colorPrimary: "#223a63",
    colorSecondary: "#223a63",
    appBg: "#f1f3f5",
    appContentBg: "#f9fafb",
    appBorderColor: "#e0e3e7",
    textColor: "#16191f",
    barBg: "#f9fafb",
  }),
});
