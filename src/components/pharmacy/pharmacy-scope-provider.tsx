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
import {
  getScopePharmacies,
  setActivePharmacy as setActivePharmacyApi,
} from "@/lib/pharmacy-scope-api";
import type { PharmacyScopeItem } from "@/types/pharmacy-scope";
import { useHydrated } from "@/hooks/use-hydrated";

interface PharmacyScopeContextValue {
  authorizedPharmacies: PharmacyScopeItem[];
  activePharmacy: PharmacyScopeItem | null;
  activePharmacyId: string | null;
  setActivePharmacy: (parmId: string) => Promise<void>;
  loading: boolean;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PharmacyScopeContext = createContext<PharmacyScopeContextValue | null>(
  null
);

export function PharmacyScopeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useHydrated();
  const { data: session, status } = useSession();
  const [authorizedPharmacies, setAuthorizedPharmacies] = useState<
    PharmacyScopeItem[]
  >([]);
  const [activePharmacyId, setActivePharmacyId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScope = useCallback(async () => {
    if (status === "loading") return;

    if (!session?.accessToken) {
      setAuthorizedPharmacies([]);
      setActivePharmacyId(null);
      setError(null);
      setFetching(false);
      return;
    }

    setFetching(true);
    setError(null);

    try {
      const data = await getScopePharmacies(session.accessToken);
      setAuthorizedPharmacies(data.pharmacies);
      setActivePharmacyId(
        typeof data.activePharmacyId === "string" ? data.activePharmacyId : null
      );
    } catch (err) {
      setAuthorizedPharmacies([]);
      setActivePharmacyId(null);
      setError(
        err instanceof Error
          ? err.message
          : "Could not load pharmacy scope from the API."
      );
    } finally {
      setFetching(false);
    }
  }, [session?.accessToken, status]);

  useEffect(() => {
    void loadScope();
  }, [loadScope]);

  const setActivePharmacy = useCallback(
    async (parmId: string) => {
      if (!session?.accessToken) {
        throw new Error("Not authenticated.");
      }

      const response = await setActivePharmacyApi(parmId, session.accessToken);
      setActivePharmacyId(
        typeof response.parmId === "string" ? response.parmId : null
      );
      await loadScope();
    },
    [loadScope, session?.accessToken]
  );

  const activePharmacy = useMemo(
    () =>
      authorizedPharmacies.find((p) => p.parmId === activePharmacyId) ?? null,
    [authorizedPharmacies, activePharmacyId]
  );

  const ready = hydrated && status !== "loading" && !fetching;
  const loading = !ready;

  const value = useMemo(
    () => ({
      authorizedPharmacies,
      activePharmacy,
      activePharmacyId,
      setActivePharmacy,
      loading,
      ready,
      error,
      refresh: loadScope,
    }),
    [
      authorizedPharmacies,
      activePharmacy,
      activePharmacyId,
      setActivePharmacy,
      loading,
      ready,
      error,
      loadScope,
    ]
  );

  return (
    <PharmacyScopeContext.Provider value={value}>
      {children}
    </PharmacyScopeContext.Provider>
  );
}

export function usePharmacyScope() {
  const context = useContext(PharmacyScopeContext);
  if (!context) {
    throw new Error(
      "usePharmacyScope must be used within PharmacyScopeProvider"
    );
  }
  return context;
}
