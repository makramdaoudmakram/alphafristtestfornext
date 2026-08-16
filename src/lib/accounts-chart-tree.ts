import type { AccountsChartItem } from "@/types/accounts-chart";

export type AccountsChartTreeNode = AccountsChartItem & {
  children: AccountsChartTreeNode[];
  depth: number;
};

export type AccountsChartRow = AccountsChartItem & {
  parentLabel: string;
  pathLabel: string;
  depth: number;
  childCount: number;
};

export function getAccountLabel(account: AccountsChartItem): string {
  return (
    account.accAName?.trim() ||
    account.accName?.trim() ||
    account.accCode
  );
}

export function buildAccountLookup(
  accounts: AccountsChartItem[]
): Map<string, AccountsChartItem> {
  return new Map(accounts.map((account) => [account.accCode, account]));
}

export function getAccountPath(
  accCode: string,
  lookup: Map<string, AccountsChartItem>
): AccountsChartItem[] {
  const path: AccountsChartItem[] = [];
  const visited = new Set<string>();
  let current = lookup.get(accCode);

  while (current) {
    if (visited.has(current.accCode)) break;
    visited.add(current.accCode);
    path.unshift(current);
    current = current.parentCode
      ? lookup.get(current.parentCode) ?? undefined
      : undefined;
  }

  return path;
}

/** Collect ACCCode of this node and all descendants (for invalid parent exclusion). */
export function collectDescendantCodes(
  rootCode: string,
  accounts: AccountsChartItem[]
): Set<string> {
  const result = new Set<string>([rootCode]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const account of accounts) {
      if (
        account.parentCode &&
        result.has(account.parentCode) &&
        !result.has(account.accCode)
      ) {
        result.add(account.accCode);
        changed = true;
      }
    }
  }
  return result;
}

/**
 * Builds tree using self-reference:
 * Child.PARENTCode === Parent.ACCCode
 */
export function buildAccountsChartTree(
  accounts: AccountsChartItem[]
): AccountsChartTreeNode[] {
  const nodes = new Map<string, AccountsChartTreeNode>();

  for (const account of accounts) {
    nodes.set(account.accCode, { ...account, children: [], depth: 0 });
  }

  const roots: AccountsChartTreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.parentCode && nodes.has(node.parentCode)) {
      nodes.get(node.parentCode)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function assignDepth(node: AccountsChartTreeNode, depth: number) {
    node.depth = depth;
    node.children.sort((a, b) =>
      getAccountLabel(a).localeCompare(getAccountLabel(b))
    );
    for (const child of node.children) {
      assignDepth(child, depth + 1);
    }
  }

  roots.sort((a, b) =>
    a.accCode.localeCompare(b.accCode, undefined, { numeric: true })
  );
  for (const root of roots) {
    assignDepth(root, 0);
  }

  return roots;
}

export function flattenAccountsTree(
  nodes: AccountsChartTreeNode[]
): AccountsChartTreeNode[] {
  const flat: AccountsChartTreeNode[] = [];

  function walk(node: AccountsChartTreeNode) {
    flat.push(node);
    for (const child of node.children) walk(child);
  }

  for (const root of nodes) walk(root);
  return flat;
}

export function enrichAccountsForTable(
  accounts: AccountsChartItem[]
): AccountsChartRow[] {
  const lookup = buildAccountLookup(accounts);
  const childCounts = new Map<string, number>();

  for (const account of accounts) {
    if (account.parentCode) {
      childCounts.set(
        account.parentCode,
        (childCounts.get(account.parentCode) ?? 0) + 1
      );
    }
  }

  return accounts.map((account) => {
    const path = getAccountPath(account.accCode, lookup);
    const parent = account.parentCode
      ? lookup.get(account.parentCode)
      : undefined;

    return {
      ...account,
      parentLabel: parent ? getAccountLabel(parent) : "Root level",
      pathLabel: path.map(getAccountLabel).join(" › "),
      depth: Math.max(path.length - 1, 0),
      childCount: childCounts.get(account.accCode) ?? 0,
    };
  });
}

export function countAccountsTreeDepth(
  nodes: AccountsChartTreeNode[]
): number {
  if (!nodes.length) return 0;
  return Math.max(...flattenAccountsTree(nodes).map((node) => node.depth)) + 1;
}

export function filterAccountsBySelection(
  rows: AccountsChartRow[],
  selectedCode: string | null,
  includeDescendants: boolean,
  accounts: AccountsChartItem[]
): AccountsChartRow[] {
  if (!selectedCode) return rows;

  const allowed = includeDescendants
    ? collectDescendantCodes(selectedCode, accounts)
    : new Set([selectedCode]);

  return rows.filter((row) => allowed.has(row.accCode));
}
