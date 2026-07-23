"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { getMyPermissions, ApiError } from "@/lib/api-client";

interface PermissionContextValue {
  roles: string[];
  permissions: string[];
  loading: boolean;
  ready: boolean;
  error: string | null;
  hasPermission: (code: string) => boolean;
  hasRole: (role: string) => boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function isAdminRole(roles: string[]) {
  return roles.some((role) => role.toLowerCase() === "admin");
}

export function canAccessPermission(
  code: string,
  roles: string[],
  permissions: string[]
) {
  return isAdminRole(roles) || permissions.includes(code);
}

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = useCallback(async () => {
    if (status === "loading") {
      return;
    }

    if (!session?.accessToken) {
      setRoles([]);
      setPermissions([]);
      setError(null);
      setFetching(false);
      return;
    }

    setFetching(true);
    setError(null);

    try {
      const data = await getMyPermissions(session.accessToken);
      setRoles(data.roles);
      setPermissions(data.permissions);
    } catch (err) {
      setRoles([]);
      setPermissions([]);

      if (err instanceof ApiError && err.status === 401) {
        setError(
          "Your session expired or the token is invalid. Please sign out and sign in again."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your permissions from the API."
        );
      }
    } finally {
      setFetching(false);
    }
  }, [session?.accessToken, status]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const ready = status !== "loading" && !fetching;
  const loading = !ready;

  const value = useMemo(
    () => ({
      roles,
      permissions,
      loading,
      ready,
      error,
      hasPermission: (code: string) => canAccessPermission(code, roles, permissions),
      hasRole: (role: string) =>
        role.toLowerCase() === "admin"
          ? isAdminRole(roles)
          : roles.includes(role),
      refresh: loadPermissions,
    }),
    [roles, permissions, loading, ready, error, loadPermissions]
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
