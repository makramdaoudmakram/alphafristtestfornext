"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { signOut, useSession } from "next-auth/react";
import { getAuthorizationRegistry, getMyPermissions, ApiError } from "@/lib/api-client";
import { setAuthorizationRegistry } from "@/lib/authorization/registry-state";
import {
  buildPharmacyPageEnabledMap,
  canAccessPage,
} from "@/lib/pharmacy-page-access";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";

interface PermissionContextValue {
  roles: string[];
  permissions: string[];
  activePharmacyId: string | null;
  operationalPermissions: string[];
  accountKind: string | null;
  pharmacyPageAccessApplies: boolean;
  pharmacyPageEnabledByKey: ReadonlyMap<string, boolean>;
  loading: boolean;
  ready: boolean;
  error: string | null;
  hasPermission: (code: string) => boolean;
  hasGrantedPermission: (code: string) => boolean;
  hasRole: (role: string) => boolean;
  canAccessPage: (pageKey: string | null) => boolean;
  canReversePurchase: () => boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

/** Matches backend administrative UI bypass for Admin and SuperAdmin (not Head Office path semantics). */
export function isAdminRole(roles: string[]) {
  return roles.some((role) => {
    const normalized = role.toLowerCase();
    return normalized === "admin" || normalized === "superadmin";
  });
}

/** Admin or Account — required for posted purchase invoice reversal. */
export function canReversePurchaseInvoice(roles: string[]) {
  return roles.some((role) => {
    const normalized = role.toLowerCase();
    return normalized === "admin" || normalized === "account";
  });
}

export function canAccessPermission(
  code: string,
  roles: string[],
  permissions: string[],
  operationalPermissions?: string[]
) {
  return (
    isAdminRole(roles) ||
    permissions.includes(code) ||
    (operationalPermissions?.includes(code) ?? false)
  );
}

/** Matches API effective grants from Permissions/me (no Admin role UI bypass). */
export function hasGrantedPermission(
  code: string,
  permissions: string[],
  operationalPermissions?: string[]
) {
  return (
    permissions.includes(code) ||
    (operationalPermissions?.includes(code) ?? false)
  );
}

export { canAccessPage };

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const { data: session, status } = useSession();
  const {
    activePharmacyId: scopeActivePharmacyId,
    ready: scopeReady,
    loading: scopeLoading,
  } = usePharmacyScope();
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [activePharmacyId, setActivePharmacyId] = useState<string | null>(null);
  const [operationalPermissions, setOperationalPermissions] = useState<string[]>([]);
  const [accountKind, setAccountKind] = useState<string | null>(null);
  const [pharmacyPageAccessApplies, setPharmacyPageAccessApplies] =
    useState(false);
  const [pharmacyPageEnabledByKey, setPharmacyPageEnabledByKey] = useState<
    ReadonlyMap<string, boolean>
  >(new Map());
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signingOutRef = useRef(false);

  const redirectToLogin = useCallback(() => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    void signOut({ callbackUrl: "/login" });
  }, []);

  const loadPermissions = useCallback(async () => {
    if (status === "loading") {
      return;
    }

    if (!session?.accessToken) {
      setRoles([]);
      setPermissions([]);
      setActivePharmacyId(null);
      setOperationalPermissions([]);
      setAccountKind(null);
      setPharmacyPageAccessApplies(false);
      setPharmacyPageEnabledByKey(new Map());
      setError(null);
      setFetching(false);
      return;
    }

    if (!scopeReady) {
      return;
    }

    setFetching(true);
    setError(null);

    try {
      const [data, registry] = await Promise.all([
        getMyPermissions(session.accessToken),
        getAuthorizationRegistry(session.accessToken).catch(() => null),
      ]);
      setAuthorizationRegistry(registry);
      setRoles(data.roles);
      setPermissions(data.permissions);
      setActivePharmacyId(data.activePharmacyId);
      setOperationalPermissions(data.operationalPermissions);
      setAccountKind(data.accountKind);
      setPharmacyPageAccessApplies(data.pharmacyPageAccessApplies);
      setPharmacyPageEnabledByKey(
        buildPharmacyPageEnabledMap(data.pharmacyPages)
      );
    } catch (err) {
      setRoles([]);
      setPermissions([]);
      setActivePharmacyId(null);
      setOperationalPermissions([]);
      setAccountKind(null);
      setPharmacyPageAccessApplies(false);
      setPharmacyPageEnabledByKey(new Map());
      setAuthorizationRegistry(null);

      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin();
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Could not load your permissions from the API."
      );
    } finally {
      setFetching(false);
    }
  }, [redirectToLogin, scopeReady, session?.accessToken, status, scopeActivePharmacyId]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const ready =
    hydrated && status !== "loading" && scopeReady && !scopeLoading && !fetching;
  const loading = !ready;

  const value = useMemo(
    () => ({
      roles,
      permissions,
      activePharmacyId,
      operationalPermissions,
      loading,
      ready,
      error,
      accountKind,
      pharmacyPageAccessApplies,
      pharmacyPageEnabledByKey,
      hasPermission: (code: string) =>
        canAccessPermission(code, roles, permissions, operationalPermissions),
      hasGrantedPermission: (code: string) =>
        hasGrantedPermission(code, permissions, operationalPermissions),
      canAccessPage: (pageKey: string | null) =>
        canAccessPage(
          pageKey,
          pharmacyPageAccessApplies,
          pharmacyPageEnabledByKey
        ),
      hasRole: (role: string) =>
        role.toLowerCase() === "admin"
          ? isAdminRole(roles)
          : roles.some((r) => r.toLowerCase() === role.toLowerCase()),
      canReversePurchase: () => canReversePurchaseInvoice(roles),
      refresh: loadPermissions,
    }),
    [
      roles,
      permissions,
      activePharmacyId,
      operationalPermissions,
      accountKind,
      pharmacyPageAccessApplies,
      pharmacyPageEnabledByKey,
      loading,
      ready,
      error,
      loadPermissions,
    ]
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionProvider");
  }
  return context;
}
