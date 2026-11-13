import type { AuthorizationPageContractDto } from "@/lib/authorization/types";

export type RouteViewPermission = string | string[] | null | false;

/**
 * Builds the dashboard route → capability map from the API authorization registry.
 */
export function buildRouteCapabilitiesFromRegistry(
  pages: readonly AuthorizationPageContractDto[]
): ReadonlyMap<string, RouteViewPermission> {
  const map = new Map<string, RouteViewPermission>();
  for (const page of pages) {
    const code = page.viewCapabilityCode?.trim();
    if (!code) {
      map.set(page.pageKey, null);
      continue;
    }
    map.set(page.pageKey, code);
  }
  return map;
}

export function getRegistryRoutePermission(
  pathname: string,
  registryRoutes: ReadonlyMap<string, RouteViewPermission>
): RouteViewPermission | undefined {
  const normalized = pathname.replace(/\/$/, "") || "/dashboard";
  if (registryRoutes.has(normalized)) {
    return registryRoutes.get(normalized);
  }
  if (/^\/dashboard\/customers\/[^/]+$/.test(normalized)) {
    return registryRoutes.get("/dashboard/customers/:accountId");
  }
  if (/^\/dashboard\/vendors\/[^/]+$/.test(normalized)) {
    return registryRoutes.get("/dashboard/vendors/:accountId");
  }
  return undefined;
}
