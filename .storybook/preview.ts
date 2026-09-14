import type { Preview } from "@storybook/html-vite";
import "@fontsource-variable/mona-sans";
import "./storybook.css";
import { Kernel } from "../main.ts";

// The kernel is two strings in main.ts, and the catalog gets them the way the Shell inlines them: the same style
// after DaisyUI, and the same behavior as a module script, which mounts on every htmx:afterSwap.
const style = document.createElement("style");
style.textContent = Kernel.css;
document.head.append(style);
const behavior = document.createElement("script");
behavior.type = "module";
behavior.textContent = Kernel.js;
document.head.append(behavior);

const preview: Preview = {
  decorators: [(story) => {
    document.documentElement.dataset.theme = "kernel";
    const out = story();
    // Stories return strings; mount the kernel behavior once Storybook has put them in the DOM.
    setTimeout(() => document.dispatchEvent(new CustomEvent("htmx:afterSwap", { detail: {} })), 0);
    return typeof out === "string" ? `<div class="min-h-screen bg-base-100 p-6">${out}</div>` : out;
  }],
  parameters: { layout: "fullscreen", options: { showPanel: false, storySort: { order: ["Showcase", "Kernel", "DaisyUI"] } } },
};
export default preview;
