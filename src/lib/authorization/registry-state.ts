import {
  buildRouteCapabilitiesFromRegistry,
  getRegistryRoutePermission,
} from "@/lib/authorization/route-capabilities";
import type { AuthorizationRegistryContractDto } from "@/lib/authorization/types";
import type { RouteViewPermission } from "@/lib/route-permissions";

let registryRoutes: ReadonlyMap<string, RouteViewPermission> | null = null;
let policyVersion: string | null = null;

export function setAuthorizationRegistry(
  contract: AuthorizationRegistryContractDto | null
) {
  if (!contract?.pages?.length) {
    registryRoutes = null;
    policyVersion = null;
    return;
  }
  registryRoutes = buildRouteCapabilitiesFromRegistry(contract.pages);
  policyVersion = contract.policyVersion ?? null;
}

export function getAuthorizationPolicyVersion() {
  return policyVersion;
}

export function resolveCentralRoutePermission(
  pathname: string
): RouteViewPermission | undefined {
  if (!registryRoutes) {
    return undefined;
  }
  return getRegistryRoutePermission(pathname, registryRoutes);
}
