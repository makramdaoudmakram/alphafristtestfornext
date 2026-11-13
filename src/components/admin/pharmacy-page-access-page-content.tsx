"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import {
  bulkUpdatePharmacyPageAccess,
  getPharmacyPageAccessOrphans,
  getPharmacyPageAccessTree,
  type PharmacyPageAccessTreeNode,
} from "@/lib/pharmacy-page-access-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DraftState = Record<string, boolean>;

export function PharmacyPageAccessPageContent() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<
    Awaited<ReturnType<typeof getPharmacyPageAccessTree>>["sections"]
  >([]);
  const [orphanDbKeys, setOrphanDbKeys] = useState<string[]>([]);
  const [draft, setDraft] = useState<DraftState>({});
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [tree, orphans] = await Promise.all([
        getPharmacyPageAccessTree(token),
        getPharmacyPageAccessOrphans(token),
      ]);
      setSections(tree.sections);
      setOrphanDbKeys(orphans.databaseKeysNotInRegistry);
      const initial: DraftState = {};
      for (const section of tree.sections) {
        for (const page of section.pages) {
          if (page.inRegistry) {
            initial[page.pageKey] = page.isEnabled;
          }
        }
      }
      setDraft(initial);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load page access");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const registryPages: PharmacyPageAccessTreeNode[] = useMemo(
    () =>
      sections.flatMap((s) => s.pages.filter((p) => p.inRegistry !== false)),
    [sections]
  );

  const orphanNodes = useMemo(
    () => sections.flatMap((s) => s.pages.filter((p) => p.inRegistry === false)),
    [sections]
  );

  function toggle(pageKey: string, enabled: boolean) {
    setDraft((prev) => ({ ...prev, [pageKey]: enabled }));
    setDirty(true);
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      const pages = Object.entries(draft).map(([pageKey, isEnabled]) => ({
        pageKey,
        isEnabled,
      }));
      await bulkUpdatePharmacyPageAccess(token, pages);
      toast.success("Pharmacy page access saved");
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save pharmacy page access"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageGuard
      permission={PERMISSIONS.pharmacyPageAccess.manage}
      pageKey="/dashboard/admin/pharmacy-page-access"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Pharmacy Page Access</h2>
          <p className="text-muted-foreground text-sm" dir="rtl">
            صلاحيات صفحات الصيدليات — المستوى 1 (تفعيل الصفحة) مستقل عن صلاحيات
            المسمى الوظيفي (المستوى 2). الصفحات التشغيلية (مبيعات، كارت الصنف،
            مشتريات الفرع، …) تحت قسم «صيدليات — عمليات».
          </p>
        </div>

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Could not load</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive text-sm">{error}</p>
              <Button variant="outline" className="mt-3" onClick={() => void load()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading registry tree…</p>
        ) : (
          <>
            {sections.map((section) => {
              const pages = section.pages.filter((p) => p.inRegistry !== false);
              if (pages.length === 0) return null;
              return (
                <Card key={section.sectionKey}>
                  <CardHeader>
                    <CardTitle className="text-base">{section.displayName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PageKey</TableHead>
                          <TableHead>English</TableHead>
                          <TableHead dir="rtl">العربية</TableHead>
                          <TableHead>Level 2 permission</TableHead>
                          <TableHead className="text-right">Level 1 enabled</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pages.map((page) => (
                          <TableRow key={page.pageKey}>
                            <TableCell className="font-mono text-xs">
                              {page.pageKey}
                            </TableCell>
                            <TableCell>{page.enTitle}</TableCell>
                            <TableCell dir="rtl">{page.arTitle}</TableCell>
                            <TableCell className="text-xs">
                              {page.level2PermissionCode ?? (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Checkbox
                                checked={draft[page.pageKey] ?? false}
                                onChange={(event) =>
                                  toggle(page.pageKey, event.target.checked)
                                }
                                aria-label={`Toggle ${page.pageKey}`}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}

            {orphanNodes.length > 0 || orphanDbKeys.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Orphan database entries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    These rows exist in the database but are not in the code
                    registry. They are shown for review only and are not changed
                    by bulk save.
                  </p>
                  <ul className="list-disc pl-5">
                    {orphanNodes.map((p) => (
                      <li key={p.pageKey}>
                        <code className="text-xs">{p.pageKey}</code> — enabled:{" "}
                        {String(p.isEnabled)}
                      </li>
                    ))}
                    {orphanDbKeys.map((key) => (
                      <li key={key}>
                        <code className="text-xs">{key}</code>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <p className="text-muted-foreground text-xs">
              Registry pages in tree: {registryPages.length}. Level 1 toggles
              apply to pharmacy accounts only; Level 2 remains on job titles.
            </p>

            <Button
              type="button"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        )}
      </div>
    </PageGuard>
  );
}
