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
import { getMyPermissions, ApiError } from "@/lib/api-client";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";

interface PermissionContextValue {
  roles: string[];
  permissions: string[];
  activePharmacyId: string | null;
  operationalPermissions: string[];
  loading: boolean;
  ready: boolean;
  error: string | null;
  hasPermission: (code: string) => boolean;
  hasRole: (role: string) => boolean;
  canReversePurchase: () => boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function isAdminRole(roles: string[]) {
  return roles.some((role) => role.toLowerCase() === "admin");
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
      const data = await getMyPermissions(session.accessToken);
      setRoles(data.roles);
      setPermissions(data.permissions);
      setActivePharmacyId(data.activePharmacyId);
      setOperationalPermissions(data.operationalPermissions);
    } catch (err) {
      setRoles([]);
      setPermissions([]);
      setActivePharmacyId(null);
      setOperationalPermissions([]);

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
      hasPermission: (code: string) => canAccessPermission(code, roles, permissions),
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
