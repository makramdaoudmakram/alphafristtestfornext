import type { GroupItem } from "@/types/group";

export type GroupTreeNode = GroupItem & {
  children: GroupTreeNode[];
  depth: number;
};

export type GroupRow = GroupItem & {
  parentLabel: string;
  pathLabel: string;
  depth: number;
  childCount: number;
};

export function getGroupLabel(group: GroupItem): string {
  return group.gNameEn?.trim() || group.gNameAr?.trim() || `Group #${group.id}`;
}

export function buildGroupLookup(groups: GroupItem[]): Map<number, GroupItem> {
  return new Map(groups.map((group) => [group.id, group]));
}

export function getGroupPath(
  groupId: number,
  lookup: Map<number, GroupItem>
): GroupItem[] {
  const path: GroupItem[] = [];
  const visited = new Set<number>();
  let current = lookup.get(groupId);

  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    path.unshift(current);
    current =
      current.gParent != null ? lookup.get(current.gParent) ?? undefined : undefined;
  }

  return path;
}

export function buildGroupTree(groups: GroupItem[]): GroupTreeNode[] {
  const lookup = buildGroupLookup(groups);
  const nodes = new Map<number, GroupTreeNode>();

  for (const group of groups) {
    nodes.set(group.id, { ...group, children: [], depth: 0 });
  }

  const roots: GroupTreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.gParent != null && nodes.has(node.gParent)) {
      nodes.get(node.gParent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function assignDepth(node: GroupTreeNode, depth: number) {
    node.depth = depth;
    node.children.sort((a, b) => getGroupLabel(a).localeCompare(getGroupLabel(b)));
    for (const child of node.children) {
      assignDepth(child, depth + 1);
    }
  }

  roots.sort((a, b) => getGroupLabel(a).localeCompare(getGroupLabel(b)));
  for (const root of roots) {
    assignDepth(root, 0);
  }

  return roots;
}

export function flattenGroupTree(nodes: GroupTreeNode[]): GroupTreeNode[] {
  const flat: GroupTreeNode[] = [];

  function walk(node: GroupTreeNode) {
    flat.push(node);
    for (const child of node.children) walk(child);
  }

  for (const root of nodes) walk(root);
  return flat;
}

export function enrichGroupsForTable(groups: GroupItem[]): GroupRow[] {
  const lookup = buildGroupLookup(groups);
  const childCounts = new Map<number, number>();

  for (const group of groups) {
    if (group.gParent != null) {
      childCounts.set(group.gParent, (childCounts.get(group.gParent) ?? 0) + 1);
    }
  }

  return groups.map((group) => {
    const path = getGroupPath(group.id, lookup);
    const parent = group.gParent != null ? lookup.get(group.gParent) : undefined;

    return {
      ...group,
      parentLabel: parent ? getGroupLabel(parent) : "Root level",
      pathLabel: path.map(getGroupLabel).join(" › "),
      depth: Math.max(path.length - 1, 0),
      childCount: childCounts.get(group.id) ?? 0,
    };
  });
}

export function countTreeDepth(nodes: GroupTreeNode[]): number {
  if (!nodes.length) return 0;

  return Math.max(...flattenGroupTree(nodes).map((node) => node.depth)) + 1;
}

export function filterGroupsBySelection(
  rows: GroupRow[],
  selectedId: number | null,
  includeDescendants: boolean,
  groups: GroupItem[]
): GroupRow[] {
  if (selectedId == null) return rows;

  const lookup = buildGroupLookup(groups);
  const allowed = new Set<number>([selectedId]);

  if (includeDescendants) {
    function collectChildren(parentId: number) {
      for (const group of groups) {
        if (group.gParent === parentId && !allowed.has(group.id)) {
          allowed.add(group.id);
          collectChildren(group.id);
        }
      }
    }

    collectChildren(selectedId);
  }

  const selectedPath = getGroupPath(selectedId, lookup);
  for (const node of selectedPath) {
    allowed.add(node.id);
  }

  return rows.filter((row) => allowed.has(row.id));
}
