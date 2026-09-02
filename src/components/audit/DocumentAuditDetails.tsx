"use client";

import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  actionBadgeClass,
  extractAuditItem,
  formatAuditActionLabel,
  formatDocumentAuditDateTime,
  parseChangesFromDescription,
} from "@/lib/audit-center";
import { createAuditCenterService } from "@/services/audit-center.service";
import type { AuditCenterEvent, AuditFieldChange } from "@/types/audit-center";

export type DocumentAuditEntityType =
  | "Purchase"
  | "Return"
  | "PharmReceive"
  | "InventoryAdjustment";

type DocumentAuditDetailsProps = {
  token: string | undefined;
  entityType: DocumentAuditEntityType;
  entityId: number | null;
  documentNumber?: string | number | null;
  refreshKey?: number;
};

const PREVIEW_COUNT = 5;
const ALL_PAGE_SIZE = 10;

const DOCUMENT_META: Record<
  DocumentAuditEntityType,
  { caption: string; prefix: string }
> = {
  Purchase: { caption: "Invoice", prefix: "PUR" },
  Return: { caption: "Return", prefix: "RET" },
  PharmReceive: { caption: "Invoice", prefix: "PR" },
  InventoryAdjustment: { caption: "Inventory", prefix: "INV" },
};

function formatDocumentValue(
  entityType: DocumentAuditEntityType,
  documentNumber?: string | number | null,
  entityId?: number | null
): string | null {
  const raw =
    documentNumber != null && String(documentNumber).trim() !== ""
      ? String(documentNumber).trim()
      : entityId != null && entityId > 0
        ? String(entityId)
        : null;
  if (!raw) return null;
  const prefix = DOCUMENT_META[entityType].prefix;
  if (raw.toUpperCase().startsWith(`${prefix}-`)) return raw;
  return `${prefix}-${raw}`;
}

function isCreateAction(action: string): boolean {
  const value = action.toUpperCase();
  return value === "INSERT" || value === "CREATE";
}

function enrichEvent(event: AuditCenterEvent): AuditCenterEvent {
  const parsed =
    event.changes.length > 0
      ? event.changes
      : parseChangesFromDescription(event.description);
  return {
    ...event,
    item: extractAuditItem(event.description, event.item),
    changes: parsed,
  };
}

function sortNewestFirst(events: AuditCenterEvent[]): AuditCenterEvent[] {
  return [...events].sort((left, right) => {
    const leftTime = new Date(left.timestamp).getTime();
    const rightTime = new Date(right.timestamp).getTime();
    return rightTime - leftTime;
  });
}

function dedupeCreateEvents(
  events: AuditCenterEvent[],
  entityType: DocumentAuditEntityType
): AuditCenterEvent[] {
  const creates = events.filter((event) => isCreateAction(event.action));
  if (creates.length <= 1) return events;

  const matching = creates.find(
    (event) =>
      event.eventType?.toLowerCase() === entityType.toLowerCase() ||
      event.module.toLowerCase() === entityType.toLowerCase()
  );
  const keep = matching ?? creates[creates.length - 1];
  return events.filter(
    (event) => !isCreateAction(event.action) || event.id === keep.id
  );
}

function summaryForAction(event: AuditCenterEvent): string {
  const action = event.action.toUpperCase();
  if (event.changes.length > 0) return "";
  if (event.description.trim()) return event.description.trim();
  if (action === "INSERT" || action === "CREATE") return "Document created.";
  if (action === "DELETE") return "Detail deleted.";
  if (action === "POST") return "Invoice posted successfully.";
  if (action === "REVERSE" || action === "UNPOST") return "Invoice reversed.";
  if (action === "ADJUST") return "Stock adjusted.";
  return event.description.trim() || "Document updated.";
}

function formatChangeValue(value: string | null): string {
  if (value == null || value.trim() === "") return "—";
  return value.trim();
}

export function DocumentAuditDetails({
  token,
  entityType,
  entityId,
  documentNumber,
  refreshKey = 0,
}: DocumentAuditDetailsProps) {
  const [items, setItems] = useState<AuditCenterEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullRecord, setFullRecord] = useState<AuditCenterEvent | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [allPage, setAllPage] = useState(1);

  const documentValue = formatDocumentValue(entityType, documentNumber, entityId);
  const documentCaption = DOCUMENT_META[entityType].caption;

  useEffect(() => {
    if (!token || entityId == null || entityId <= 0) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const service = createAuditCenterService(token);
    void service
      .getDocumentLifecycle({
        module: entityType,
        entityId: String(entityId),
      })
      .then((rows) => {
        if (cancelled) return;
        setItems(
          dedupeCreateEvents(sortNewestFirst(rows).map(enrichEvent), entityType)
        );
      })
      .catch((cause) => {
        if (cancelled) return;
        setItems([]);
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load audit history."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, entityType, entityId, refreshKey]);

  const previewItems = items.slice(0, PREVIEW_COUNT);
  const allPageCount = Math.max(1, Math.ceil(items.length / ALL_PAGE_SIZE));
  const allPageItems = useMemo(() => {
    const start = (allPage - 1) * ALL_PAGE_SIZE;
    return items.slice(start, start + ALL_PAGE_SIZE);
  }, [allPage, items]);

  function retry() {
    setError(null);
    setItems([]);
    setLoading(true);
    if (!token || entityId == null || entityId <= 0) {
      setLoading(false);
      return;
    }
    const service = createAuditCenterService(token);
    void service
      .getDocumentLifecycle({
        module: entityType,
        entityId: String(entityId),
      })
      .then((rows) => {
        setItems(
          dedupeCreateEvents(sortNewestFirst(rows).map(enrichEvent), entityType)
        );
      })
      .catch((cause) => {
        setItems([]);
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load audit history."
        );
      })
      .finally(() => setLoading(false));
  }

  return (
    <>
      <Card className="shrink-0 gap-3 py-4 print:hidden">
        <CardHeader className="border-b px-4 pb-3 [.border-b]:pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <History className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <CardTitle className="text-sm">Audit Details</CardTitle>
                <p className="text-muted-foreground text-xs">
                  History of changes made to this document
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {loading ? "…" : `${items.length} ${items.length === 1 ? "Event" : "Events"}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          {loading ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Loading audit history...</p>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-destructive text-sm">Unable to load audit history.</p>
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No changes have been recorded for this document.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {previewItems.map((event) => (
                  <AuditEventCard
                    key={event.id}
                    event={event}
                    documentCaption={documentCaption}
                    documentValue={documentValue || event.document}
                    onViewFull={() => setFullRecord(event)}
                  />
                ))}
              </div>
              {items.length > PREVIEW_COUNT ? (
                <div className="flex justify-center pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAllPage(1);
                      setAllOpen(true);
                    }}
                  >
                    View All Audit History
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={fullRecord != null} onOpenChange={(open) => !open && setFullRecord(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {fullRecord ? (
            <FullAuditRecord
              event={fullRecord}
              entityType={entityType}
              documentCaption={documentCaption}
              documentValue={documentValue || fullRecord.document}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={allOpen}
        onOpenChange={(open) => {
          setAllOpen(open);
          if (!open) setAllPage(1);
        }}
      >
        <DialogContent className="max-h-[85vh] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit History</DialogTitle>
            <DialogDescription>
              All recorded changes for this {entityType} document.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] space-y-2 pr-1">
            <div className="space-y-2">
              {allPageItems.map((event) => (
                <AuditEventCard
                  key={event.id}
                  event={event}
                  documentCaption={documentCaption}
                  documentValue={documentValue || event.document}
                  onViewFull={() => setFullRecord(event)}
                />
              ))}
            </div>
          </ScrollArea>
          {allPageCount > 1 ? (
            <div className="flex items-center justify-between gap-2 pt-2">
              <p className="text-muted-foreground text-xs tabular-nums">
                Page {allPage} of {allPageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={allPage <= 1}
                  onClick={() => setAllPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={allPage >= allPageCount}
                  onClick={() => setAllPage((page) => Math.min(allPageCount, page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditEventCard({
  event,
  documentCaption,
  documentValue,
  onViewFull,
}: {
  event: AuditCenterEvent;
  documentCaption: string;
  documentValue: string | null;
  onViewFull: () => void;
}) {
  const actionLabel = formatAuditActionLabel(event.action);
  const item = extractAuditItem(event.description, event.item);
  const summary = summaryForAction(event);

  return (
    <div className="bg-background rounded-lg border px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span
          className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${actionBadgeClass(event.action)}`}
        >
          {actionLabel}
        </span>
        <p className="text-muted-foreground text-xs tabular-nums">
          {formatDocumentAuditDateTime(event.timestamp, { seconds: false })}
        </p>
      </div>

      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[5.5rem_minmax(0,1fr)]">
        <MetaRow label="User" value={event.userName || "Unknown"} />
        {documentValue ? <MetaRow label={documentCaption} value={documentValue} /> : null}
        {item ? <MetaRow label="Item" value={item} /> : null}
      </dl>

      {event.changes.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Changed Fields
          </p>
          {event.changes.map((change, index) => (
            <ChangedField key={`${change.field}-${index}`} change={change} />
          ))}
        </div>
      ) : summary ? (
        <p className="text-muted-foreground mt-2 text-sm">{summary}</p>
      ) : null}

      <div className="mt-2 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onViewFull}>
          View Full Record
        </Button>
      </div>
    </div>
  );
}

function ChangedField({ change }: { change: AuditFieldChange }) {
  return (
    <div className="bg-muted/40 rounded-md border px-2.5 py-1.5">
      <p className="text-xs font-medium">{change.field}</p>
      <div className="mt-0.5 grid gap-1 text-xs sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Before: </span>
          <span className="tabular-nums">{formatChangeValue(change.before)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">After: </span>
          <span className="tabular-nums">{formatChangeValue(change.after)}</span>
        </p>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-words">{value}</dd>
    </>
  );
}

function FullAuditRecord({
  event,
  entityType,
  documentCaption,
  documentValue,
}: {
  event: AuditCenterEvent;
  entityType: DocumentAuditEntityType;
  documentCaption: string;
  documentValue: string | null;
}) {
  const item = extractAuditItem(event.description, event.item);
  const rows: Array<{ label: string; value: string }> = [
    { label: "Audit ID", value: event.id || "—" },
    { label: "Action", value: formatAuditActionLabel(event.action) },
    { label: "Entity", value: event.module || entityType },
    { label: "Entity ID", value: event.entityId || "—" },
    { label: documentCaption, value: documentValue || event.document || "—" },
    { label: "User ID", value: event.userId || "—" },
    { label: "User Name", value: event.userName || "Unknown" },
    { label: "Date/Time", value: formatDocumentAuditDateTime(event.timestamp) },
  ];

  if (event.eventType) rows.splice(3, 0, { label: "Event Type", value: event.eventType });
  if (item) rows.push({ label: "Item", value: item });
  if (event.apiUrl) rows.push({ label: "API", value: event.apiUrl });
  if (event.httpMethod) rows.push({ label: "HTTP Method", value: event.httpMethod });
  if (event.transactionId) rows.push({ label: "Transaction ID", value: event.transactionId });
  if (event.ipAddress) rows.push({ label: "IP Address", value: event.ipAddress });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Full Audit Record</DialogTitle>
        <DialogDescription>Read-only details from the existing audit log.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <p className="text-muted-foreground text-xs">{row.label}</p>
            <p className="min-w-0 text-sm break-words">{row.value}</p>
          </div>
        ))}
      </div>
      {event.changes.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Changed Fields</p>
          {event.changes.map((change, index) => (
            <ChangedField key={`${change.field}-${index}`} change={change} />
          ))}
        </div>
      ) : null}
      {event.description ? (
        <div>
          <p className="text-muted-foreground text-xs">Description</p>
          <p className="text-sm whitespace-pre-wrap">{event.description}</p>
        </div>
      ) : null}
    </>
  );
}
