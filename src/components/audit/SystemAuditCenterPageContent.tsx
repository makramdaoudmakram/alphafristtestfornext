"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  LayoutList,
  Search,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { PageGuard } from "@/components/permissions/page-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  actionBadgeClass,
  dateRangeForPreset,
  formatAuditDateTime,
  formatAuditDayLabel,
  formatAuditTime,
  formatNumber,
  toDateInputValue,
} from "@/lib/audit-center";
import { PERMISSIONS } from "@/lib/route-permissions";
import { createAuditCenterService } from "@/services/audit-center.service";
import type {
  AuditCenterEvent,
  AuditCenterQueryResult,
  AuditCenterTab,
  AuditDatePreset,
  AuditViewMode,
} from "@/types/audit-center";

const EMPTY_RESULT: AuditCenterQueryResult = {
  summary: {
    totalEvents: 0,
    created: 0,
    modified: 0,
    deleted: 0,
    posted: 0,
    reversed: 0,
    stockAdjusted: 0,
    critical: 0,
    activeUsers: 0,
    mostActiveUsers: [],
    modules: [],
  },
  users: [],
  modules: [],
  actions: [],
  documents: [],
  userProfiles: [],
  items: [],
  pageNumber: 1,
  pageSize: 50,
  totalCount: 0,
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "warn";
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "border-red-200 bg-red-50/60"
          : tone === "warn"
            ? "border-amber-200 bg-amber-50/60"
            : undefined
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
      </CardContent>
    </Card>
  );
}

export function SystemAuditCenterPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [tab, setTab] = useState<AuditCenterTab>("overview");
  const [viewMode, setViewMode] = useState<AuditViewMode>("table");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [preset, setPreset] = useState<AuditDatePreset>("today");
  const [customFrom, setCustomFrom] = useState(toDateInputValue(new Date()));
  const [customTo, setCustomTo] = useState(toDateInputValue(new Date()));
  const [module, setModule] = useState("all");
  const [user, setUser] = useState("all");
  const [action, setAction] = useState("all");
  const [document, setDocument] = useState("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [result, setResult] = useState<AuditCenterQueryResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AuditCenterEvent | null>(null);
  const [lifecycle, setLifecycle] = useState<AuditCenterEvent[]>([]);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);

  const dateRange = useMemo(
    () => dateRangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const criticalOnly = tab === "critical";

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, preset, customFrom, customTo, module, user, action, document, tab]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const service = createAuditCenterService(token);
      const data = await service.query({
        q: search || undefined,
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
        module: module === "all" ? undefined : module,
        user: user === "all" ? undefined : user,
        action: action === "all" ? undefined : action,
        document: document === "all" ? undefined : document,
        criticalOnly,
        pageNumber,
        pageSize: 50,
      });
      setResult(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load audit activity.";
      toast.error(message);
      setResult(EMPTY_RESULT);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    search,
    dateRange.dateFrom,
    dateRange.dateTo,
    module,
    user,
    action,
    document,
    criticalOnly,
    pageNumber,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDocument(event: AuditCenterEvent) {
    if (!token || !event.document) return;
    setLifecycleOpen(true);
    try {
      const service = createAuditCenterService(token);
      const rows = await service.getDocumentLifecycle({
        module: event.module,
        entityId: event.entityId ?? undefined,
        document: event.document,
      });
      setLifecycle(rows);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load document history."
      );
      setLifecycle([]);
    }
  }

  const pageCount = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
  const summary = result.summary;

  if (!sessionReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PageGuard permission={PERMISSIONS.permissions.manage}>
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="text-muted-foreground size-5" />
            <h2 className="text-lg font-semibold">System Audit Center</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Monitor and review all activities performed in the ERP system.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search anything: user, document, item, DELETE, PR-1254…"
                className="pl-9"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <Select
                value={preset}
                onValueChange={(value) => setPreset(value as AuditDatePreset)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {preset === "custom" ? (
                <>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </>
              ) : null}
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger>
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {module !== "all" &&
                  !result.modules.some((item) => item.name === module) ? (
                    <SelectItem value={module}>{module}</SelectItem>
                  ) : null}
                  {result.modules.map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      {item.name} ({item.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={user} onValueChange={setUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {result.users.map((item) => (
                    <SelectItem key={item.name} value={item.id || item.name}>
                      {item.name} ({item.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {result.actions.map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      {item.name} ({item.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={document} onValueChange={setDocument}>
                <SelectTrigger>
                  <SelectValue placeholder="All documents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  {result.documents.map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Events" value={summary.totalEvents} />
          <SummaryCard label="Created" value={summary.created} />
          <SummaryCard label="Modified" value={summary.modified} />
          <SummaryCard label="Deleted" value={summary.deleted} tone="danger" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Posted" value={summary.posted} tone="warn" />
          <SummaryCard label="Reversed" value={summary.reversed} tone="warn" />
          <SummaryCard label="Stock Adjusted" value={summary.stockAdjusted} />
          <SummaryCard label="Critical" value={summary.critical} tone="danger" />
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as AuditCenterTab)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="critical">Critical</TabsTrigger>
            </TabsList>
            {(tab === "activity" || tab === "critical") && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "table" ? "default" : "outline"}
                  onClick={() => setViewMode("table")}
                >
                  <LayoutList className="size-4" />
                  Table
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "timeline" ? "default" : "outline"}
                  onClick={() => setViewMode("timeline")}
                >
                  Timeline
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Most active users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {summary.mostActiveUsers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No activity in this range.</p>
                  ) : (
                    summary.mostActiveUsers.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        className="hover:bg-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
                        onClick={() => {
                          setUser(item.id || item.name);
                          setTab("activity");
                        }}
                      >
                        <span>{item.name}</span>
                        <Badge variant="secondary">{formatNumber(item.count)}</Badge>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Activity by module</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {summary.modules.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No activity in this range.</p>
                  ) : (
                    summary.modules.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        className="hover:bg-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
                        onClick={() => {
                          setModule(item.name);
                          setTab("activity");
                        }}
                      >
                        <span>{item.name}</span>
                        <Badge variant="outline">{formatNumber(item.count)}</Badge>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
            <ActivityPanel
              loading={loading}
              items={result.items.slice(0, 12)}
              viewMode="table"
              emptyLabel="No ERP activity found for the selected filters."
              onSelect={setSelected}
              onFollowDocument={(event) => void openDocument(event)}
            />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityPanel
              loading={loading}
              items={result.items}
              viewMode={viewMode}
              emptyLabel="No ERP activity found for the selected filters."
              onSelect={setSelected}
              onFollowDocument={(event) => void openDocument(event)}
            />
          </TabsContent>

          <TabsContent value="users" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.userProfiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users in this range.</p>
            ) : (
              result.userProfiles.map((profile) => (
                <Card key={profile.userId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{profile.userName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      Today <span className="font-medium">{formatNumber(profile.today)}</span>
                    </p>
                    <p>
                      This week{" "}
                      <span className="font-medium">{formatNumber(profile.thisWeek)}</span>
                    </p>
                    <p>
                      Total <span className="font-medium">{formatNumber(profile.total)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Modules used: {profile.modules.join(", ") || "—"}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUser(profile.userId);
                        setTab("activity");
                      }}
                    >
                      Investigate
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="modules" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.modules.length === 0 ? (
              <p className="text-muted-foreground text-sm">No modules in this range.</p>
            ) : (
              result.modules.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className="hover:bg-muted rounded-xl border p-4 text-left"
                  onClick={() => {
                    setModule(item.name);
                    setTab("activity");
                  }}
                >
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatNumber(item.count)} events
                  </p>
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="critical">
            <div className="mb-3 flex items-center gap-2 text-amber-800">
              <AlertTriangle className="size-4" />
              <p className="text-sm font-medium">
                Critical activity: deletes, reversals, posts, stock adjustments, price and
                master-data changes.
              </p>
            </div>
            <ActivityPanel
              loading={loading}
              items={result.items}
              viewMode={viewMode}
              emptyLabel="No critical activity found for the selected filters."
              onSelect={setSelected}
              onFollowDocument={(event) => void openDocument(event)}
            />
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {formatNumber(result.totalCount)} event(s) · page {pageNumber} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageNumber <= 1 || loading}
              onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageNumber >= pageCount || loading}
              onClick={() => setPageNumber((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
          <SheetContent className="sm:max-w-lg">
            {selected ? (
              <>
                <SheetHeader>
                  <SheetTitle>Audit event</SheetTitle>
                  <SheetDescription>
                    {selected.module} · {selected.action} · {selected.document}
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 overflow-y-auto px-4 pb-6">
                  <DetailRow label="User" value={selected.userName} />
                  <DetailRow label="Date" value={formatAuditDateTime(selected.timestamp)} />
                  <DetailRow label="Module" value={selected.module} />
                  <DetailRow label="Action" value={selected.action} />
                  <DetailRow
                    label="Document"
                    value={selected.document || "—"}
                    onClick={
                      selected.document
                        ? () => void openDocument(selected)
                        : undefined
                    }
                  />
                  <DetailRow label="Description" value={selected.description || "—"} />
                  {selected.critical ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {selected.criticalReason || "Critical activity"}
                    </p>
                  ) : null}
                  <div>
                    <p className="mb-2 text-sm font-semibold">What changed</p>
                    {selected.changes.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No structured field changes were stored for this event.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Field</TableHead>
                            <TableHead>Before</TableHead>
                            <TableHead>After</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.changes.map((change) => (
                            <TableRow key={change.field}>
                              <TableCell>{change.field}</TableCell>
                              <TableCell>{change.before || "—"}</TableCell>
                              <TableCell>{change.after || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                  <DetailRow label="IP / Device" value={selected.ipAddress || "Not recorded"} />
                  <DetailRow label="API" value={selected.apiUrl || "—"} />
                  <DetailRow label="Session" value={selected.transactionId || "—"} />
                </div>
              </>
            ) : null}
          </SheetContent>
        </Sheet>

        <Sheet open={lifecycleOpen} onOpenChange={setLifecycleOpen}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Follow the document</SheetTitle>
              <SheetDescription>
                Complete lifecycle for the selected ERP document.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-3 overflow-y-auto px-4 pb-6">
              {lifecycle.length === 0 ? (
                <p className="text-muted-foreground text-sm">No related events found.</p>
              ) : (
                lifecycle.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="hover:bg-muted w-full rounded-md border px-3 py-2 text-left text-sm"
                    onClick={() => setSelected(event)}
                  >
                    <p className="font-medium">
                      {formatAuditTime(event.timestamp)} · {event.action} · {event.userName}
                    </p>
                    <p className="text-muted-foreground">{event.description}</p>
                  </button>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </PageGuard>
  );
}

function DetailRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
      {onClick ? (
        <button type="button" className="text-primary text-sm underline" onClick={onClick}>
          {value}
        </button>
      ) : (
        <p className="text-sm">{value}</p>
      )}
    </div>
  );
}

function ActivityPanel({
  loading,
  items,
  viewMode,
  emptyLabel,
  onSelect,
  onFollowDocument,
}: {
  loading: boolean;
  items: AuditCenterEvent[];
  viewMode: AuditViewMode;
  emptyLabel: string;
  onSelect: (event: AuditCenterEvent) => void;
  onFollowDocument: (event: AuditCenterEvent) => void;
}) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  if (viewMode === "timeline") {
    let lastDay = "";
    return (
      <div className="space-y-4">
        {items.map((event) => {
          const day = formatAuditDayLabel(event.timestamp);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={event.id}>
              {showDay ? (
                <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                  {day}
                </p>
              ) : null}
              <button
                type="button"
                className="hover:bg-muted w-full rounded-md border px-3 py-2 text-left"
                onClick={() => onSelect(event)}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="tabular-nums">{formatAuditTime(event.timestamp)}</span>
                  <span className="font-medium">{event.userName}</span>
                  <Badge variant="outline">{event.module}</Badge>
                  <span className={`rounded-md border px-1.5 py-0.5 text-xs ${actionBadgeClass(event.action)}`}>
                    {event.action}
                  </span>
                  {event.critical ? (
                    <Badge className="border-amber-200 bg-amber-50 text-amber-900">
                      Critical
                    </Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {event.document} · {event.description}
                </p>
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date/Time</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((event) => (
            <TableRow
              key={event.id}
              className="cursor-pointer"
              onClick={() => onSelect(event)}
            >
              <TableCell className="whitespace-nowrap tabular-nums">
                {formatAuditDateTime(event.timestamp)}
              </TableCell>
              <TableCell>{event.userName}</TableCell>
              <TableCell>{event.module}</TableCell>
              <TableCell>
                <span className={`rounded-md border px-1.5 py-0.5 text-xs ${actionBadgeClass(event.action)}`}>
                  {event.action}
                </span>
                {event.critical ? (
                  <span className="ml-1 text-amber-700" title={event.criticalReason ?? "Critical"}>
                    ⚠
                  </span>
                ) : null}
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={(click) => {
                    click.stopPropagation();
                    onFollowDocument(event);
                  }}
                >
                  {event.document || "—"}
                </button>
              </TableCell>
              <TableCell className="max-w-xl whitespace-pre-wrap">
                {event.description || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
