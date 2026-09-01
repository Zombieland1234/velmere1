import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifestPath = join(root, "config/pass15/route-dispatch-manifest.json");

type RouteManifestEntry = {
  operation: string;
  publicPath: string;
  originalPath: string;
  handlerModule: string;
  methods: string[];
};
type RouteManifestGroup = {
  dispatcher: string;
  registry: string;
  routes: RouteManifestEntry[];
};
type RouteManifest = Record<string, unknown> & {
  marketIntegrity: RouteManifestGroup;
  internalWorkers: RouteManifestGroup;
  security: RouteManifestGroup;
  search: RouteManifestGroup;
  admin: RouteManifestGroup;
};

const groups = ["marketIntegrity", "internalWorkers", "security", "search", "admin"] as const;

function read(relative: string) {
  return readFileSync(join(root, relative), "utf8");
}

export type CurrentConsolidatedRoute = {
  publicPath: string;
  operation: string;
  methods: string[];
  dispatcherPath: string;
  registryPath: string;
  handlerPath: string;
  dispatcherSource: string;
  registrySource: string;
  handlerSource: string;
};

export function readCurrentConsolidatedRoute(publicPath: string): CurrentConsolidatedRoute {
  const manifest = JSON.parse(read(manifestPath.slice(root.length + 1))) as RouteManifest;
  for (const groupName of groups) {
    const group = manifest[groupName];
    const route = group.routes.find((candidate) => candidate.publicPath === publicPath);
    if (!route) continue;
    for (const relative of [group.dispatcher, group.registry, route.handlerModule]) {
      if (!existsSync(join(root, relative))) throw new Error(`current_route_surface_missing:${publicPath}:${relative}`);
    }
    const dispatcherSource = read(group.dispatcher);
    const registrySource = read(group.registry);
    const handlerSource = read(route.handlerModule);
    const importTarget = `@/${route.handlerModule.replace(/\.ts$/u, "")}`;
    if (!dispatcherSource.includes("dispatchLazyRoute") || !dispatcherSource.includes("unknownError")) {
      throw new Error(`current_route_dispatch_not_fail_closed:${publicPath}`);
    }
    if (!registrySource.includes(`"${route.operation}"`) || !registrySource.includes(`import("${importTarget}")`)) {
      throw new Error(`current_route_registry_binding_missing:${publicPath}`);
    }
    return {
      publicPath,
      operation: route.operation,
      methods: [...route.methods],
      dispatcherPath: group.dispatcher,
      registryPath: group.registry,
      handlerPath: route.handlerModule,
      dispatcherSource,
      registrySource,
      handlerSource,
    };
  }
  throw new Error(`current_route_not_in_consolidation_manifest:${publicPath}`);
}
