import { apiFetch } from "@/lib/api-client";
import type { VendorCreateRequest, VendorItem, VendorNextAccount } from "@/types/vendor";

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") return value;
    if (value != null && typeof value !== "object") return String(value);
  }
  return "";
}

function readNullableString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  const value = readString(obj, ...keys);
  return value ? value : null;
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") return Number(value);
  }
  return 0;
}

function readNullableNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in obj)) continue;
    const value = obj[key];
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return value;
    if (typeof value === "string" && value !== "") return Number(value);
  }
  return null;
}

function normalizeVendor(item: Record<string, unknown>): VendorItem {
  return {
    vendorId: readNumber(item, "vendorId", "VendorId"),
    vendorNameAr: readNullableString(item, "vendorNameAr", "VendorNameAr"),
    vendorNameEn: readNullableString(item, "vendorNameEn", "VendorNameEn"),
    address: readNullableString(item, "address", "Address"),
    tel: readNullableString(item, "tel", "Tel"),
    accountId: readNullableString(item, "accountId", "AccountId"),
    taxId: readNullableString(item, "taxId", "TaxId"),
    licenseId: readNullableString(item, "licenseId", "LicenseId"),
    paymentBankNo: readNullableString(item, "paymentBankNo", "PaymentBankNo"),
    responsibleName: readNullableString(item, "responsibleName", "ResponsibleName"),
    maxValue: readNullableNumber(item, "maxValue", "MaxValue"),
    balance: readNumber(item, "balance", "Balance"),
  };
}

function normalizeVendorNextAccount(item: Record<string, unknown>): VendorNextAccount {
  return {
    parentAccountCode: readString(item, "parentAccountCode", "ParentAccountCode"),
    nextAccountCode: readString(item, "nextAccountCode", "NextAccountCode"),
  };
}

export async function getVendors(token: string, search?: string): Promise<VendorItem[]> {
  const params = new URLSearchParams();
  params.set("pageNumber", "1");
  params.set("pageSize", "200");
  params.set("sortBy", "vendorNameEn");
  if (search?.trim()) params.set("search", search.trim());

  const data = await apiFetch<Record<string, unknown>>(`Vendor?${params.toString()}`, {}, token);
  const items = (data.items ?? data.Items) as unknown;
  return Array.isArray(items)
    ? items.map((item) => normalizeVendor(item as Record<string, unknown>))
    : [];
}

export async function getNextVendorAccount(token: string): Promise<VendorNextAccount> {
  const data = await apiFetch<Record<string, unknown>>("Vendor/next-account", {}, token);
  return normalizeVendorNextAccount(data);
}

export async function createVendor(data: VendorCreateRequest, token: string): Promise<VendorItem> {
  const result = await apiFetch<Record<string, unknown>>(
    "Vendor",
    {
      method: "POST",
      body: JSON.stringify({
        VendorNameAr: data.vendorNameAr,
        VendorNameEn: data.vendorNameEn,
        Address: data.address || null,
        Tel: data.tel || null,
        AccountId: data.accountId || null,
        TaxId: data.taxId || null,
        LicenseId: data.licenseId || null,
        PaymentBankNo: data.paymentBankNo || null,
        ResponsibleName: data.responsibleName || null,
        MaxValue: data.maxValue ?? null,
      }),
    },
    token
  );

  return normalizeVendor(result);
}

export async function getVendorByAccountId(
  accountId: string,
  token: string
): Promise<VendorItem> {
  const data = await apiFetch<Record<string, unknown>>(
    `Vendor/by-account/${encodeURIComponent(accountId)}`,
    {},
    token
  );
  return normalizeVendor(data);
}

export async function saveVendorByAccountId(
  accountId: string,
  data: VendorCreateRequest,
  token: string
): Promise<VendorItem> {
  const result = await apiFetch<Record<string, unknown>>(
    `Vendor/by-account/${encodeURIComponent(accountId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        VendorNameAr: data.vendorNameAr,
        VendorNameEn: data.vendorNameEn,
        Address: data.address || null,
        Tel: data.tel || null,
        AccountId: data.accountId || null,
        TaxId: data.taxId || null,
        LicenseId: data.licenseId || null,
        PaymentBankNo: data.paymentBankNo || null,
        ResponsibleName: data.responsibleName || null,
        MaxValue: data.maxValue ?? null,
      }),
    },
    token
  );

  return normalizeVendor(result);
}
