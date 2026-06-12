import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
	server: {
		port: 3333,
	},
	plugins: [
		devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		// Enables "@/..." path aliases defined in tsconfig.json
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
