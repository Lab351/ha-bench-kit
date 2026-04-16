import typescript from "@rollup/plugin-typescript"
import terser from "@rollup/plugin-terser"

export default {
  input: "src/index.ts",
  external: ["dotenv/config", "home-assistant-js-websocket/dist/index.js", "ws"],
  output: {
    file: "dist/index.js",
    format: "es",
  },
  plugins: [typescript(), terser()],
}
