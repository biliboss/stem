import type { StorybookConfig } from "@storybook/html-vite";
import tailwind from "@tailwindcss/vite";

// The catalog of the kernel: DaisyUI 5 underneath, the kernel theme on top, and our own
// components rendered by the same View.render the runtime uses.
const config: StorybookConfig = {
  framework: "@storybook/html-vite",
  stories: ["../stories/**/*.stories.ts"],
  viteFinal: async (vite) => ({
    ...vite,
    plugins: [...(vite.plugins ?? []), tailwind()],
    // main.ts reaches the native SurrealDB engine by import() at run time; the browser never runs that path,
    // and neither the dep optimizer nor the bundle may try to load a .node binary.
    optimizeDeps: { ...vite.optimizeDeps, exclude: [...(vite.optimizeDeps?.exclude ?? []), "@surrealdb/node"] },
    build: { ...vite.build, rollupOptions: { ...vite.build?.rollupOptions, external: ["@surrealdb/node"] } },
  }),
};
export default config;
