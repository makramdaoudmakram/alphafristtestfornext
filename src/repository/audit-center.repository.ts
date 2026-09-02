import { API_BASE_URL, getAlfaApiHint } from "@/lib/api-config";
import type {
  AuditCenterEvent,
  AuditCenterQuery,
  AuditCenterQueryResult,
  AuditCenterCount,
  AuditCenterSummary,
  AuditCenterUserProfile,
  AuditFieldChange,
} from "@/types/audit-center";

export class AuditCenterRepositoryError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AuditCenterRepositoryError";
    this.status = status;
  }
}

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
  }
  return "";
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function readBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
  }
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mapChange(value: unknown): AuditFieldChange | null {
  const row = asRecord(value);
  if (!row) return null;
  const field = readString(row, "field", "Field", "fieldName", "FieldName", "columnName", "ColumnName");
  if (!field) return null;
  return {
    field,
    before:
      readString(row, "before", "Before", "oldValue", "OldValue", "originalValue", "OriginalValue") ||
      null,
    after: readString(row, "after", "After", "newValue", "NewValue") || null,
  };
}

function mapEvent(value: unknown, index: number): AuditCenterEvent | null {
  const row = asRecord(value);
  if (!row) return null;
  const timestamp = readString(row, "timestamp", "Timestamp");
  const changesRaw = row.changes ?? row.Changes;
  const changes = Array.isArray(changesRaw)
    ? changesRaw.map(mapChange).filter((item): item is AuditFieldChange => item != null)
    : [];
  return {
    id: readString(row, "id", "Id") || `event-${index}-${timestamp}`,
    timestamp,
    userId: readString(row, "userId", "UserId") || null,
    userName: readString(row, "userName", "UserName") || "Unknown",
    module: readString(row, "module", "Module") || "System",
    action: (readString(row, "action", "Action") || "UPDATE").toUpperCase(),
    document: readString(row, "document", "Document"),
    entityId: readString(row, "entityId", "EntityId") || null,
    eventType: readString(row, "eventType", "EventType") || null,
    item: readString(row, "item", "Item") || null,
    description: readString(row, "description", "Description"),
    critical: readBool(row, "critical", "Critical"),
    criticalReason: readString(row, "criticalReason", "CriticalReason") || null,
    ipAddress: readString(row, "ipAddress", "IpAddress") || null,
    apiUrl: readString(row, "apiUrl", "ApiUrl") || null,
    httpMethod: readString(row, "httpMethod", "HttpMethod") || null,
    transactionId: readString(row, "transactionId", "TransactionId") || null,
    changes,
  };
}

function mapCount(value: unknown): AuditCenterCount | null {
  const row = asRecord(value);
  if (!row) return null;
  const name = readString(row, "name", "Name");
  if (!name) return null;
  return {
    name,
    id: readString(row, "id", "Id") || null,
    count: readNumber(row, "count", "Count"),
  };
}

function mapCounts(value: unknown): AuditCenterCount[] {
  return Array.isArray(value)
    ? value.map(mapCount).filter((item): item is AuditCenterCount => item != null)
    : [];
}

function mapUserProfile(value: unknown): AuditCenterUserProfile | null {
  const row = asRecord(value);
  if (!row) return null;
  const modulesRaw = row.modules ?? row.Modules;
  return {
    userId: readString(row, "userId", "UserId") || readString(row, "userName", "UserName"),
    userName: readString(row, "userName", "UserName") || "Unknown",
    total: readNumber(row, "total", "Total"),
    today: readNumber(row, "today", "Today"),
    thisWeek: readNumber(row, "thisWeek", "ThisWeek"),
    modules: Array.isArray(modulesRaw)
      ? modulesRaw.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function emptySummary(): AuditCenterSummary {
  return {
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
  };
}

function mapSummary(value: unknown): AuditCenterSummary {
  const row = asRecord(value);
  if (!row) return emptySummary();
  return {
    totalEvents: readNumber(row, "totalEvents", "TotalEvents"),
    created: readNumber(row, "created", "Created"),
    modified: readNumber(row, "modified", "Modified"),
    deleted: readNumber(row, "deleted", "Deleted"),
    posted: readNumber(row, "posted", "Posted"),
    reversed: readNumber(row, "reversed", "Reversed"),
    stockAdjusted: readNumber(row, "stockAdjusted", "StockAdjusted"),
    critical: readNumber(row, "critical", "Critical"),
    activeUsers: readNumber(row, "activeUsers", "ActiveUsers"),
    mostActiveUsers: mapCounts(row.mostActiveUsers ?? row.MostActiveUsers),
    modules: mapCounts(row.modules ?? row.Modules),
  };
}

function mapQueryResult(value: unknown): AuditCenterQueryResult {
  const row = asRecord(value) ?? {};
  const itemsRaw = row.items ?? row.Items;
  const profilesRaw = row.userProfiles ?? row.UserProfiles;
  return {
    summary: mapSummary(row.summary ?? row.Summary),
    users: mapCounts(row.users ?? row.Users),
    modules: mapCounts(row.modules ?? row.Modules),
    actions: mapCounts(row.actions ?? row.Actions),
    documents: mapCounts(row.documents ?? row.Documents),
    userProfiles: Array.isArray(profilesRaw)
      ? profilesRaw
          .map(mapUserProfile)
          .filter((item): item is AuditCenterUserProfile => item != null)
      : [],
    items: Array.isArray(itemsRaw)
      ? itemsRaw
          .map((item, index) => mapEvent(item, index))
          .filter((item): item is AuditCenterEvent => item != null)
      : [],
    pageNumber: readNumber(row, "pageNumber", "PageNumber") || 1,
    pageSize: readNumber(row, "pageSize", "PageSize") || 20,
    totalCount: readNumber(row, "totalCount", "TotalCount"),
  };
}

export class AuditCenterRepository {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private url(path: string, query?: Record<string, string | undefined>) {
    const normalized = path.replace(/^\//, "");
    const base = `${API_BASE_URL}/${normalized}`;
    if (!query) return base;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  private async parseJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new AuditCenterRepositoryError(
        `Unexpected response from Alfa API (${getAlfaApiHint()}).`,
        response.status
      );
    }
  }

  private async handle<T>(response: Response): Promise<T> {
    if (response.ok) return this.parseJson<T>(response);
    const body = await this.parseJson<{ message?: string; Message?: string }>(response).catch(
      (): { message?: string; Message?: string } => ({})
    );
    throw new AuditCenterRepositoryError(
      body.message || body.Message || `Request failed (${response.status}).`,
      response.status
    );
  }

  async query(filters: AuditCenterQuery): Promise<AuditCenterQueryResult> {
    const response = await fetch(
      this.url("Audit/center", {
        q: filters.q,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        module: filters.module,
        user: filters.user,
        action: filters.action,
        document: filters.document,
        criticalOnly: filters.criticalOnly ? "true" : undefined,
        pageNumber: filters.pageNumber != null ? String(filters.pageNumber) : undefined,
        pageSize: filters.pageSize != null ? String(filters.pageSize) : undefined,
      }),
      {
        headers: { Authorization: `Bearer ${this.token}` },
        cache: "no-store",
      }
    );
    const data = await this.handle<unknown>(response);
    return mapQueryResult(data);
  }

  async getDocumentLifecycle(input: {
    module?: string;
    entityId?: string;
    document?: string;
  }): Promise<AuditCenterEvent[]> {
    const response = await fetch(
      this.url("Audit/center/document", {
        module: input.module,
        entityId: input.entityId,
        document: input.document,
      }),
      {
        headers: { Authorization: `Bearer ${this.token}` },
        cache: "no-store",
      }
    );
    const data = await this.handle<Record<string, unknown>>(response);
    const items = data.items ?? data.Items;
    return Array.isArray(items)
      ? items
          .map((item, index) => mapEvent(item, index))
          .filter((item): item is AuditCenterEvent => item != null)
      : [];
  }
}

export function createAuditCenterRepository(token: string) {
  return new AuditCenterRepository(token);
}
