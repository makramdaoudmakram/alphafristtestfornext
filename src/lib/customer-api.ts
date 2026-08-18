import { apiFetch } from "@/lib/api-client";
import type { CustomerCreateRequest, CustomerItem, CustomerNextAccount } from "@/types/customer";

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

function readBoolean(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
  }
  return false;
}

function readNullableDate(obj: Record<string, unknown>, ...keys: string[]): string | null {
  const value = readNullableString(obj, ...keys);
  if (!value) return null;
  return value.slice(0, 10);
}

function normalizeCustomer(item: Record<string, unknown>): CustomerItem {
  return {
    custCode: readNumber(item, "custCode", "CustCode"),
    custNameAr: readNullableString(item, "custNameAr", "CustNameAr"),
    custNameEn: readNullableString(item, "custNameEn", "CustNameEn"),
    custBirthDate: readNullableDate(item, "custBirthDate", "CustBirthDate"),
    custGender: readNullableString(item, "custGender", "CustGender"),
    custJob: readNullableString(item, "custJob", "CustJob"),
    custMobile: readNullableString(item, "custMobile", "CustMobile"),
    custTel: readNullableString(item, "custTel", "CustTel"),
    custAddress: readNullableString(item, "custAddress", "CustAddress"),
    custType: readNullableNumber(item, "custType", "CustType"),
    custActive: readBoolean(item, "custActive", "CustActive"),
    custActiveDate: readNullableDate(item, "custActiveDate", "CustActiveDate"),
    custStopDate: readNullableDate(item, "custStopDate", "CustStopDate"),
    custMaxCredit: readNullableNumber(item, "custMaxCredit", "CustMaxCredit"),
    custDiscountPerc: readNullableNumber(item, "custDiscountPerc", "CustDiscountPerc"),
    custPayment: readNumber(item, "custPayment", "CustPayment"),
    cLocalItemsDisc: readNullableNumber(item, "cLocalItemsDisc", "CLocalItemsDisc"),
    cImportedItemsDisc: readNullableNumber(item, "cImportedItemsDisc", "CImportedItemsDisc"),
    custNotes: readNullableString(item, "custNotes", "CustNotes"),
    pharmCode: readNullableString(item, "pharmCode", "PharmCode"),
    custContractcompany: readNullableString(item, "custContractcompany", "CustContractcompany"),
    custContractcompanydiscount: readNullableString(
      item,
      "custContractcompanydiscount",
      "CustContractcompanydiscount"
    ),
    accountId: readNullableString(item, "accountId", "AccountId"),
    balance: readNumber(item, "balance", "Balance"),
  };
}

function normalizeCustomerNextAccount(item: Record<string, unknown>): CustomerNextAccount {
  return {
    parentAccountCode: readString(item, "parentAccountCode", "ParentAccountCode"),
    nextAccountCode: readString(item, "nextAccountCode", "NextAccountCode"),
  };
}

function toApiPayload(data: CustomerCreateRequest): Record<string, unknown> {
  return {
    CustNameAr: data.custNameAr || null,
    CustNameEn: data.custNameEn || null,
    CustBirthDate: data.custBirthDate || null,
    CustGender: data.custGender || null,
    CustJob: data.custJob || null,
    CustMobile: data.custMobile || null,
    CustTel: data.custTel || null,
    CustAddress: data.custAddress || null,
    CustType: data.custType ?? null,
    CustActive: data.custActive ?? null,
    CustActiveDate: data.custActiveDate || null,
    CustStopDate: data.custStopDate || null,
    CustMaxCredit: data.custMaxCredit ?? null,
    CustDiscountPerc: data.custDiscountPerc ?? null,
    CustPayment: data.custPayment ?? null,
    CLocalItemsDisc: data.cLocalItemsDisc ?? null,
    CImportedItemsDisc: data.cImportedItemsDisc ?? null,
    CustNotes: data.custNotes || null,
    PharmCode: data.pharmCode || null,
    CustContractcompany: data.custContractcompany || null,
    CustContractcompanydiscount: data.custContractcompanydiscount || null,
    AccountId: data.accountId || null,
  };
}

export async function getCustomers(token: string, search?: string): Promise<CustomerItem[]> {
  const params = new URLSearchParams();
  params.set("pageNumber", "1");
  params.set("pageSize", "200");
  params.set("sortBy", "custNameEn");
  if (search?.trim()) params.set("search", search.trim());

  const data = await apiFetch<Record<string, unknown>>(`Customer?${params.toString()}`, {}, token);
  const items = (data.items ?? data.Items) as unknown;
  return Array.isArray(items)
    ? items.map((item) => normalizeCustomer(item as Record<string, unknown>))
    : [];
}

export async function getNextCustomerAccount(token: string): Promise<CustomerNextAccount> {
  const data = await apiFetch<Record<string, unknown>>("Customer/next-account", {}, token);
  return normalizeCustomerNextAccount(data);
}

export async function createCustomer(
  data: CustomerCreateRequest,
  token: string
): Promise<CustomerItem> {
  const result = await apiFetch<Record<string, unknown>>(
    "Customer",
    {
      method: "POST",
      body: JSON.stringify(toApiPayload(data)),
    },
    token
  );

  return normalizeCustomer(result);
}

export async function getCustomerByAccountId(
  accountId: string,
  token: string
): Promise<CustomerItem> {
  const data = await apiFetch<Record<string, unknown>>(
    `Customer/by-account/${encodeURIComponent(accountId)}`,
    {},
    token
  );
  return normalizeCustomer(data);
}

export async function saveCustomerByAccountId(
  accountId: string,
  data: CustomerCreateRequest,
  token: string
): Promise<CustomerItem> {
  const result = await apiFetch<Record<string, unknown>>(
    `Customer/by-account/${encodeURIComponent(accountId)}`,
    {
      method: "PUT",
      body: JSON.stringify(toApiPayload(data)),
    },
    token
  );

  return normalizeCustomer(result);
}
