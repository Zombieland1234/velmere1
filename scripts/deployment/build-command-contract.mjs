export const DEPLOYMENT_BUILD_COMMANDS = Object.freeze({
  "build:webpack": "node scripts/deployment/run-segmented-build.mjs webpack && node scripts/deployment/verify-segmented-build-lock-boundary.mjs --phase post-build",
  "build:turbopack": "node scripts/deployment/run-segmented-build.mjs turbopack && node scripts/deployment/verify-segmented-build-lock-boundary.mjs --phase post-build",
  build: "npm run build:turbopack",
  "build:deployment": "npm run verify:runtime-contract && npm run deployment:preflight && npm run build",
});

export function validateDeploymentBuildCommands(scripts) {
  const failures = [];
  for (const [name, expected] of Object.entries(DEPLOYMENT_BUILD_COMMANDS)) {
    const observed = scripts?.[name];
    if (observed !== expected) failures.push({ name, expected, observed: observed ?? null });
  }
  return { passed: failures.length === 0, failures };
}
