import type { AccountsChartItem } from "@/types/accounts-chart";
import type { AccountSelectItem } from "@/types/collected-voucher";

/**
 * Old TreasuryIn.aspx.cs:
 *
 *   Bank / Cheque / Transfer Bank Name:
 *     SELECT ACCCode, ACCAName FROM AccountsChart
 *     WHERE PARENTCode IN (dbo.GetAccCode('Bank'))
 *
 *   Cash Safe NO.:
 *     WHERE PARENTCode IN (dbo.GetAccCode('Safe'))
 *
 *   Account NO. / Currency (after Safe or Bank selected):
 *     WHERE PARENTCode = @selectedAccCode
 *
 * This installation:
 *   dbo.GetAccCode('Bank') = '111'       → Bank Name = PARENTCode 111
 *   dbo.GetAccCode('Safe') = '110'       → Cash Safe NO. = PARENTCode 110
 *   dbo.GetAccCode('Customers') = '114'  → Collected From Customer leaves under 114
 *   dbo.GetAccCode('Suppliers') = '2140' → Collected From Supplier leaves under 2140
 */
export const GET_ACC_CODE_MAP: Record<string, string> = {
  Bank: "111",
  Safe: process.env.NEXT_PUBLIC_GET_ACC_CODE_SAFE?.trim() || "110",
  Customers: process.env.NEXT_PUBLIC_GET_ACC_CODE_CUSTOMERS?.trim() || "114",
  Suppliers: process.env.NEXT_PUBLIC_GET_ACC_CODE_SUPPLIERS?.trim() || "2140",
};

/** Resolve GetAccCode(@name) → parent ACCCode list used in PARENTCode IN (...). */
export function resolveGetAccCode(
  accounts: AccountsChartItem[],
  groupName: string
): string[] {
  const key =
    groupName.trim().toLowerCase() === "safe"
      ? "Safe"
      : groupName.trim().toLowerCase() === "bank"
        ? "Bank"
        : groupName.trim().toLowerCase().startsWith("cust")
          ? "Customers"
          : groupName.trim().toLowerCase().startsWith("supp")
            ? "Suppliers"
            : groupName.trim();

  const mapped = GET_ACC_CODE_MAP[key]?.trim();
  if (mapped) return [mapped];

  // Safe fallback only if map empty: discover parent of خزن* (exclude Bank 111)
  if (key === "Safe") {
    const bankRoot = GET_ACC_CODE_MAP.Bank || "111";
    const parents = new Set<string>();
    for (const a of accounts) {
      if (!a.parentCode || a.parentCode === bankRoot) continue;
      const label = `${a.accAName ?? ""} ${a.accName ?? ""}`;
      if (/خزن|خزينة/.test(label) || /\bsafe\b/i.test(label)) {
        parents.add(a.parentCode);
      }
    }
    return [...parents];
  }

  return [];
}

/**
 * Direct children only — same as:
 *   WHERE PARENTCode IN (dbo.GetAccCode(@group))
 * No grandchildren, no other branches.
 */
export function selectAccountsByGroup(
  accounts: AccountsChartItem[],
  groupName: string
): AccountSelectItem[] {
  const roots = resolveGetAccCode(accounts, groupName);
  if (roots.length === 0) return [];

  const rootSet = new Set(roots);
  return accounts
    .filter((a) => a.parentCode != null && rootSet.has(a.parentCode))
    .map(toSelectItem)
    .sort((a, b) => a.accCode.localeCompare(b.accCode, undefined, { numeric: true }));
}

/**
 * Dependent Account NO. / Currency ComboBox:
 *   WHERE PARENTCode = @selectedBankOrSafe
 */
export function selectAccountsByParent(
  accounts: AccountsChartItem[],
  parentCode: string
): AccountSelectItem[] {
  if (!parentCode) return [];
  return accounts
    .filter((a) => a.parentCode === parentCode)
    .map(toSelectItem)
    .sort((a, b) => a.accCode.localeCompare(b.accCode, undefined, { numeric: true }));
}

/**
 * Customer / Supplier leaves under GetAccCode group (TreasuryIn CTE).
 * Roots: Customers = 114, Suppliers = 2140.
 */
export function selectSourceLeaves(
  accounts: AccountsChartItem[],
  sourceType: string
): AccountSelectItem[] {
  const group = sourceType.toLowerCase().startsWith("supp")
    ? "Suppliers"
    : "Customers";
  const roots = resolveGetAccCode(accounts, group);
  if (roots.length === 0) return [];

  return selectSourceLeavesUnderRoots(accounts, roots);
}

/** Same as TreasuryIn CTE: all leaf AccCodes under the given parent root(s). */
export function selectSourceLeavesUnderRoots(
  accounts: AccountsChartItem[],
  roots: string[]
): AccountSelectItem[] {
  if (!roots.length) return [];

  const childrenByParent = new Map<string, string[]>();
  for (const a of accounts) {
    if (!a.parentCode) continue;
    const list = childrenByParent.get(a.parentCode) ?? [];
    list.push(a.accCode);
    childrenByParent.set(a.parentCode, list);
  }

  const subtree = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const parent = stack.pop()!;
    for (const kid of childrenByParent.get(parent) ?? []) {
      if (subtree.has(kid)) continue;
      subtree.add(kid);
      stack.push(kid);
    }
  }

  const parentCodes = new Set(
    accounts.map((a) => a.parentCode).filter((p): p is string => !!p)
  );

  return accounts
    .filter((a) => subtree.has(a.accCode) && !parentCodes.has(a.accCode))
    .map(toSelectItem)
    .sort((a, b) => a.accCode.localeCompare(b.accCode, undefined, { numeric: true }));
}

export function currencyFromAccount(
  accounts: AccountsChartItem[],
  accCode: string
): { code: string; rate: number } {
  const acc = accounts.find((a) => a.accCode === accCode);
  return {
    code: (acc?.currency ?? "EGP").trim() || "EGP",
    rate: 1,
  };
}

function toSelectItem(a: AccountsChartItem): AccountSelectItem {
  // Old DataTextField = ACCAName, DataValueField = ACCCode
  const label = (a.accAName ?? a.accName ?? a.accCode).trim();
  return { accCode: a.accCode, name: label || a.accCode };
}
