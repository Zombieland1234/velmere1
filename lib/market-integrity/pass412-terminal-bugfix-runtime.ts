export const pass412TerminalBugfixRuntime = {
  version: "PASS412.terminal_bugfix_runtime",
  searchRule: "Shield, Browser and Real Markets render at most three suggestions and anchor them to the real input row instead of floating across the page.",
  realMarketsRule: "Real Markets sanitizes pseudo price patches so object-shaped { price, change } values are never rendered as React children.",
  orbitRule: "Orbit 360 is temporarily paused in Real Markets modal; Basic, Pro and Advanced buttons do not spawn the neural brain layer until the kernel is stable.",
  chartRule: "Chart drag keeps a small dead-zone before panning, removing the first-frame jump while retaining visual-direct direction.",
  researchRule: "Research Lab imports every bridge it renders and stays in audit/replication/falsification language.",
} as const;
