/// <reference types="node" />

// PASS4816 targets the ordinary numeric fs.Stat path. Pin the no-options
// overload last so ReturnType<typeof fstatSync> does not widen to BigIntStats.
declare module "node:fs" {
  function fstatSync(fd: number): Stats;
}
