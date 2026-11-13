import { apiFetch } from "@/lib/api-client";

function readApiBoolean(
  obj: Record<string, unknown>,
  ...keys: string[]
): boolean {
  for (const key of keys) {
    if (!(key in obj)) continue;
    const value = obj[key];
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true" || value === "True")
      return true;
    if (value === 0 || value === "0" || value === "false" || value === "False")
      return false;
  }
  return false;
}

export type PharmacyPageAccessTreeNode = {
  pageKey: string;
  sectionKey: string;
  arTitle: string;
  enTitle: string;
  level2PermissionCode: string | null;
  isEnabled: boolean;
  inRegistry: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type PharmacyPageAccessSection = {
  sectionKey: string;
  displayName: string;
  pages: PharmacyPageAccessTreeNode[];
};

export type PharmacyPageAccessTreeResponse = {
  sections: PharmacyPageAccessSection[];
  enabledCount: number;
  disabledCount: number;
};

export type PharmacyPageAccessOrphansResponse = {
  databaseKeysNotInRegistry: string[];
  registryKeysMissingFromDatabase: string[];
};

function normalizeTreeNode(raw: Record<string, unknown>): PharmacyPageAccessTreeNode {
  return {
    pageKey: String(raw.pageKey ?? raw.PageKey ?? ""),
    sectionKey: String(raw.sectionKey ?? raw.SectionKey ?? ""),
    arTitle: String(raw.arTitle ?? raw.ArTitle ?? ""),
    enTitle: String(raw.enTitle ?? raw.EnTitle ?? ""),
    level2PermissionCode:
      (raw.level2PermissionCode ?? raw.Level2PermissionCode ?? null) as
        | string
        | null,
    isEnabled: readApiBoolean(raw as Record<string, unknown>, "isEnabled", "IsEnabled"),
    inRegistry:
      "inRegistry" in raw || "InRegistry" in raw
        ? readApiBoolean(raw as Record<string, unknown>, "inRegistry", "InRegistry")
        : true,
    updatedAt: (raw.updatedAt ?? raw.UpdatedAt ?? null) as string | null,
    updatedBy: (raw.updatedBy ?? raw.UpdatedBy ?? null) as string | null,
  };
}

export function getPharmacyPageAccessTree(token: string) {
  return apiFetch<Record<string, unknown>>(
    "PharmacyPageAccess/tree",
    {},
    token
  ).then((data) => {
    const sectionsRaw = (data.sections ?? data.Sections ?? []) as Record<
      string,
      unknown
    >[];
    const sections: PharmacyPageAccessSection[] = sectionsRaw.map((section) => {
      const pagesRaw = (section.pages ?? section.Pages ?? []) as Record<
        string,
        unknown
      >[];
      return {
        sectionKey: String(section.sectionKey ?? section.SectionKey ?? ""),
        displayName: String(section.displayName ?? section.DisplayName ?? ""),
        pages: pagesRaw.map((p) => normalizeTreeNode(p)),
      };
    });
    return {
      sections,
      enabledCount: Number(data.enabledCount ?? data.EnabledCount ?? 0),
      disabledCount: Number(data.disabledCount ?? data.DisabledCount ?? 0),
    } satisfies PharmacyPageAccessTreeResponse;
  });
}

export function getPharmacyPageAccessOrphans(token: string) {
  return apiFetch<Record<string, unknown>>(
    "PharmacyPageAccess/orphans",
    {},
    token
  ).then((data) => ({
    databaseKeysNotInRegistry: (data.databaseKeysNotInRegistry ??
      data.DatabaseKeysNotInRegistry ??
      []) as string[],
    registryKeysMissingFromDatabase: (data.registryKeysMissingFromDatabase ??
      data.RegistryKeysMissingFromDatabase ??
      []) as string[],
  }));
}

export function bulkUpdatePharmacyPageAccess(
  token: string,
  pages: { pageKey: string; isEnabled: boolean }[]
) {
  return apiFetch<PharmacyPageAccessTreeResponse>(
    "PharmacyPageAccess",
    {
      method: "PUT",
      body: JSON.stringify({ pages }),
    },
    token
  );
}
