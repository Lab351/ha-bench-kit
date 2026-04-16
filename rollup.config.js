import { builtinModules } from "node:module"
import commonjs from "@rollup/plugin-commonjs"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import terser from "@rollup/plugin-terser"

const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
])

export default {
  input: "src/index.ts",
  external: (id) => builtins.has(id),
  output: {
    file: "dist/index.js",
    format: "es",
  },
  plugins: [
    nodeResolve({
      exportConditions: ["node", "import", "default"],
      preferBuiltins: true,
    }),
    commonjs(),
    typescript(),
    terser(),
  ],
}
