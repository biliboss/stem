import type { StorybookConfig } from "@storybook/html-vite";
import tailwind from "@tailwindcss/vite";

// The catalog of the kernel: DaisyUI 5 underneath, the kernel theme on top, and our own
// components rendered by the same render() the runtime uses.
const config: StorybookConfig = {
  framework: "@storybook/html-vite",
  stories: ["../stories/**/*.stories.ts"],
  viteFinal: async (vite) => ({
    ...vite,
    plugins: [...(vite.plugins ?? []), tailwind()],
    esbuild: { jsx: "transform", jsxFactory: "h", jsxFragment: "Fragment" },
  }),
};
export default config;
