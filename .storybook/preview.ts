import type { Preview } from "@storybook/html-vite";
import "@fontsource-variable/mona-sans";
import "./storybook.css";
import { mount } from "../kernel.js";

const preview: Preview = {
  decorators: [(story) => {
    document.documentElement.dataset.theme = "kernel";
    const out = story();
    // Stories return strings; mount the kernel behavior once Storybook has put them in the DOM.
    setTimeout(() => mount(document.getElementById("storybook-root") ?? document), 0);
    return typeof out === "string" ? `<div class="min-h-screen bg-base-100 p-6">${out}</div>` : out;
  }],
  parameters: { layout: "fullscreen", options: { showPanel: false, storySort: { order: ["Showcase", "Kernel", "DaisyUI"] } } },
};
export default preview;
