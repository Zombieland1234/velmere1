# P47 exact Windows build-relevant projection runbook

This is an internal engineering control, not a customer feature and not full-source Windows closure.

## Purpose

Reconstruct the exact P46 build-relevant byte projection on `windows-2025` from the retained P42 tracked-source artifact plus a hash-bound Zstandard delta, then execute clean dependency closure, semantic TypeScript, ESLint, Webpack and Turbopack without granting Browser, PDF, customer-value, rights or sale credit.

## Bound identities

- Full P46 source: 6666 files; aggregate `c91742b787cb75d8aaabb1eef2f1aef51ab038da6eca3453cc898f393f09d0da`.
- Projection: 1597 files; 20,952,834 bytes; aggregate `83fd00183e9d8a6c5ec1c27dba81ab99679e204b50e8f45f414a45abd2bd21b7`.
- P42 uncompressed base tar: `1c578ad0287c8090d1af4f7ebbdf2b461ef1d34211b5c3fef71463518f95cc7a`.
- Patch: 2,286,590 bytes; `b66d5e6bff4185bb210987d8ee5c79145778d591096d9987cf21ab9d04db31ef`.
- Reconstructed projection tar: 22,333,440 bytes; `bc2b9c810cac5762b0c27e8dcbe0be3e3e5c30315bc10114f9711955815a90e0`.

## Required execution

1. Download the exact retained P42 artifact from workflow run `31791166532`.
2. Verify and decompress `branch-source-tracked.tar.gz`.
3. Verify all eight patch transport parts and reconstruct the Zstandard patch.
4. Reconstruct and verify the projection tar and all 1597 extracted files.
5. Install exact Node `24.18.0` and npm `11.16.0`.
6. Run `npm ci --ignore-scripts --include=dev --audit=false --fund=false`.
7. Run `npm ls --all`.
8. Probe the native Windows Next SWC package.
9. Run semantic TypeScript and ESLint with zero warnings.
10. Run independent Webpack and Turbopack production builds.
11. Reverify every projection byte and the lockfile after execution.

## Truth boundary

A PASS closes only the native-Windows engineering result for the exact build-relevant projection. It does not close the full 6666-file Windows source gate and cannot be counted as any of the three Browser SKUs, PDF replay, 17 customer outputs, six material paid deltas, 176 source-rights rows, sale eligibility, GO_INTERNAL, PILOT_READY, GO_PAID, LIVE or WORLD_CLASS_PROVEN.
