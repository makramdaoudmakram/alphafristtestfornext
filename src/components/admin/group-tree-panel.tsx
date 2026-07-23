"use client";

import { ChevronRight, FolderTree, GitBranch, Layers3 } from "lucide-react";
import type { GroupTreeNode } from "@/lib/group-tree";
import { getGroupLabel } from "@/lib/group-tree";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function TreeNodeButton({
  node,
  selectedId,
  onSelect,
  onAddChild,
  canAddChild,
}: {
  node: GroupTreeNode;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAddChild?: (parentId: number) => void;
  canAddChild?: boolean;
}) {
  const active = selectedId === node.id;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-1"
        style={{ paddingInlineStart: `${node.depth * 1.1}rem` }}
      >
        {node.depth > 0 ? (
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <GitBranch className="text-primary size-3.5 shrink-0" />
        )}
        <div className="group flex min-w-0 flex-1 items-center gap-1">
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all",
              active
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "hover:border-primary/40 hover:bg-muted/60 border-transparent"
            )}
          >
            <span className="truncate font-medium">{getGroupLabel(node)}</span>
            {node.children.length ? (
              <Badge variant={active ? "default" : "secondary"} className="ml-2 shrink-0">
                {node.children.length}
              </Badge>
            ) : null}
          </button>
          {canAddChild ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => onAddChild?.(node.id)}
            >
              +
            </Button>
          ) : null}
        </div>
      </div>

      {node.children.map((child) => (
        <TreeNodeButton
          key={child.id}
          node={child}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddChild={onAddChild}
          canAddChild={canAddChild}
        />
      ))}
    </div>
  );
}

export function GroupTreePanel({
  tree,
  totalGroups,
  rootCount,
  maxDepth,
  selectedId,
  onSelect,
  onClearSelection,
  onAddChild,
  canAddChild,
}: {
  tree: GroupTreeNode[];
  totalGroups: number;
  rootCount: number;
  maxDepth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClearSelection: () => void;
  onAddChild?: (parentId: number) => void;
  canAddChild?: boolean;
}) {
  return (
    <Card className="overflow-hidden border-none bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/10 shadow-md">
      <CardHeader className="border-b bg-background/70 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="text-primary size-5" />
              Group hierarchy
            </CardTitle>
            <CardDescription>
              Self-referencing parent/child structure. Click a node to focus the table.
            </CardDescription>
          </div>
          {selectedId != null ? (
            <Button type="button" size="sm" variant="outline" onClick={onClearSelection}>
              Show all
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-background/80 p-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Total</p>
            <p className="text-2xl font-semibold">{totalGroups}</p>
          </div>
          <div className="rounded-xl border bg-background/80 p-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Roots</p>
            <p className="text-2xl font-semibold">{rootCount}</p>
          </div>
          <div className="rounded-xl border bg-background/80 p-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Depth</p>
            <p className="text-2xl font-semibold">{maxDepth}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="max-h-[32rem] overflow-y-auto pt-4">
        {tree.length ? (
          <div className="space-y-1">
            {tree.map((node) => (
              <TreeNodeButton
                key={node.id}
                node={node}
                selectedId={selectedId}
                onSelect={onSelect}
                onAddChild={onAddChild}
                canAddChild={canAddChild}
              />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm">
            <Layers3 className="size-10 opacity-40" />
            <p>No groups yet. Create a root group to start the tree.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
