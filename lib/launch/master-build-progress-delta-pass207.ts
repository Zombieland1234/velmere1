export type VelmerePass207ProgressDelta = {
  id: string;
  area: string;
  previous: number;
  current: number;
  change: number;
  status: "improved" | "newly_tracked" | "blocked";
};

export const velmerePass207ProgressDeltas: VelmerePass207ProgressDelta[] = [
  { id: "D14", area: "Tile-specific explainer taxonomy", previous: 91, current: 92, change: 1, status: "improved" },
  { id: "D15", area: "Risk driver mapping", previous: 62, current: 66, change: 4, status: "improved" },
  { id: "D16", area: "Source confidence lanes", previous: 61, current: 64, change: 3, status: "improved" },
  { id: "D17", area: "Missing-data semantics", previous: 69, current: 72, change: 3, status: "improved" },
  { id: "D19", area: "Brain interaction click coverage", previous: 90, current: 91, change: 1, status: "improved" },
  { id: "D23", area: "Brain accessibility / keyboard flow", previous: 58, current: 60, change: 2, status: "improved" },
  { id: "D24", area: "Brain copy localization PL/EN/DE", previous: 82, current: 83, change: 1, status: "improved" },
];

export const velmerePass207ProductDelta = velmerePass207ProgressDeltas.reduce(
  (sum, row) => sum + row.change,
  0,
);

// PASS207 marker: Previous → Current → Change tracks the selected Tile decision dock, confidence cap, source mode and review window.
