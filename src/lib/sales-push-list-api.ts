import { apiFetch } from "@/lib/api-client";
import { toDateInput } from "@/lib/sales-push-list-validation";
import type {
  SalesPushListBatchOption,
  SalesPushListBulkSaveRequest,
  SalesPushListBulkSaveResponse,
  SalesPushListItem,
  SalesPushListUpdateRequest,
} from "@/types/sales-push-list";

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") return Number(value);
  }
  return 0;
}

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
    if (value != null && typeof value !== "object") return String(value);
  }
  return "";
}

function readBoolean(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes")
        return true;
      if (normalized === "false" || normalized === "0" || normalized === "no")
        return false;
    }
  }
  return false;
}

function normalizeItem(item: Record<string, unknown>): SalesPushListItem {
  return {
    id: readNumber(item, "id", "Id"),
    itemCode: readString(item, "itemCode", "ItemCode"),
    arabicName: readString(item, "arabicName", "ArabicName"),
    englishName: readString(item, "englishName", "EnglishName"),
    batchNo: readString(item, "batchNo", "BatchNo"),
    percent: readNumber(item, "percent", "Percent"),
    comection: readNumber(item, "comection", "Comection"),
    startdate: toDateInput(readString(item, "startdate", "Startdate")),
    endDate: toDateInput(readString(item, "endDate", "EndDate")),
    active: readBoolean(item, "active", "Active"),
  };
}

function parseBatch(data: unknown): SalesPushListItem[] {
  if (Array.isArray(data)) {
    return data.map((item) => normalizeItem(item as Record<string, unknown>));
  }
  if (data && typeof data === "object") {
    const raw = data as Record<string, unknown>;
    const itemsRaw = raw.items ?? raw.Items;
    if (Array.isArray(itemsRaw)) {
      return itemsRaw.map((item) =>
        normalizeItem(item as Record<string, unknown>)
      );
    }
  }
  return [];
}

export async function getSalesPushListItems(
  token: string
): Promise<SalesPushListItem[]> {
  const pageSize = 100;
  let pageNumber = 1;
  const all: SalesPushListItem[] = [];

  while (pageNumber < 500) {
    const params = new URLSearchParams();
    params.set("pageNumber", String(pageNumber));
    params.set("pageSize", String(pageSize));
    const data = await apiFetch<unknown>(
      `SalesPushList?${params.toString()}`,
      {},
      token
    );

    if (Array.isArray(data)) {
      return data.map((item) => normalizeItem(item as Record<string, unknown>));
    }

    const batch = parseBatch(data);
    if (batch.length === 0) break;
    all.push(...batch);

    const totalCount =
      data && typeof data === "object"
        ? readNumber(data as Record<string, unknown>, "totalCount", "TotalCount")
        : 0;

    if (totalCount > 0 && all.length >= totalCount) break;
    if (batch.length < pageSize) break;
    pageNumber += 1;
  }

  return all;
}

function toApiDate(isoDate: string): string {
  return `${isoDate}T00:00:00`;
}

function toPayload(item: SalesPushListUpdateRequest) {
  return {
    itemCode: item.itemCode,
    batchNo: item.batchNo,
    percent: item.percent,
    comection: item.comection,
    startdate: toApiDate(item.startdate),
    endDate: toApiDate(item.endDate),
    active: item.active,
  };
}

export async function updateSalesPushList(
  id: number,
  request: SalesPushListUpdateRequest,
  token: string
): Promise<void> {
  await apiFetch(`SalesPushList/${id}`, {
    method: "PUT",
    body: JSON.stringify(toPayload(request)),
  }, token);
}

export async function bulkSaveSalesPushList(
  token: string,
  request: SalesPushListBulkSaveRequest
): Promise<SalesPushListBulkSaveResponse> {
  const data = await apiFetch<Record<string, unknown>>(
    "SalesPushList/bulk",
    {
      method: "POST",
      body: JSON.stringify({
        create: request.create.map(toPayload),
        update: request.update.map((item) => ({
          id: item.id,
          ...toPayload(item),
        })),
        deleteIds: request.deleteIds,
      }),
    },
    token
  );

  return {
    created: readNumber(data, "created", "Created"),
    updated: readNumber(data, "updated", "Updated"),
    deleted: readNumber(data, "deleted", "Deleted"),
  };
}

export function formatSalesPushListBatchLabel(option: {
  batchNo: string;
  storeName: string;
  expireDate: string | null;
  qty: number;
}): string {
  const exp = option.expireDate
    ? (() => {
        const [year, month] = option.expireDate.split("-");
        return year && month ? `${month}/${year}` : option.expireDate;
      })()
    : "—";
  const qty = Number.isFinite(option.qty) ? String(option.qty) : "—";
  return `${option.batchNo || "—"} / ${option.storeName || "—"} / ${exp} / ${qty}`;
}

export async function getSalesPushListBatches(
  token: string,
  itemCode: string
): Promise<SalesPushListBatchOption[]> {
  const params = new URLSearchParams();
  params.set("itemCode", itemCode);
  const data = await apiFetch<unknown>(
    `SalesPushList/batches?${params.toString()}`,
    {},
    token
  );
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as Record<string, unknown>).items ??
          (data as Record<string, unknown>).Items ??
          [])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const item = row as Record<string, unknown>;
      const expireRaw = readString(item, "expireDate", "ExpireDate");
      return {
        batchNo: readString(item, "batchNo", "BatchNo"),
        storeName: readString(item, "storeName", "StoreName"),
        expireDate: expireRaw ? toDateInput(expireRaw) || expireRaw : null,
        qty: readNumber(item, "qty", "Qty"),
      };
    })
    .sort((a, b) =>
      a.batchNo.localeCompare(b.batchNo, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
}
