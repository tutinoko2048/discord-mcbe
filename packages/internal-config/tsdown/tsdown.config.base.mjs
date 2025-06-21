// @ts-check

/** @type {import('tsdown').Options} */
export default {
  entry: "src/index.ts",
  outDir: "dist",
  external: [
    /^@minecraft\/(?!vanilla-data|math)[\w-\/]+$/
  ],
}
