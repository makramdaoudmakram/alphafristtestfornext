"use client";

import type { ElementType } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings2,
  Users,
  Package,
  Globe,
  Ruler,
  Shield,
  UserCog,
  KeyRound,
  ListChecks,
  Boxes,
  Building2,
  ChevronDown,
  Network,
  Receipt,
} from "lucide-react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_NAV,
  type NavGroupItem,
  type NavItem,
  type NavLinkItem,
} from "@/lib/sidebar-config";
import { useSidebar } from "@/components/dashboard/sidebar-context";

const ICONS: Record<string, ElementType> = {
  Overview: LayoutDashboard,
  Settings: Settings2,
  "Permission Setting": Shield,
  "Product Setting": Boxes,
  TransSetting: Receipt,
  "Account Setting": Building2,
  Company: Building2,
  Customers: Users,
  "Item Formats": Package,
  "Item Origins": Globe,
  "Item Catalog": Package,
  Groups: Network,
  "Move Parient": Receipt,
  "Movement Setting": Receipt,
  Transaction: Receipt,
  Purchase: Receipt,
  Units: Ruler,
  "Create Permission": KeyRound,
  "Create Role": Shield,
  "Assign User Roles": UserCog,
  "User Permissions": UserCog,
  "Role Permissions": ListChecks,
};

function groupIsActive(group: NavGroupItem, pathname: string) {
  return group.items.some((item) => pathname === item.href);
}

function itemTreeIsActive(item: NavItem, pathname: string) {
  if (item.href && pathname === item.href) return true;
  if (item.items?.some((sub) => pathname === sub.href)) return true;
  if (item.groups?.some((group) => groupIsActive(group, pathname))) return true;
  return false;
}

function NavLeafLink({
  href,
  title,
  active,
  nestedLevel = 0,
  collapsed,
  onNavigate,
}: {
  href: string;
  title: string;
  active: boolean;
  nestedLevel?: number;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[title] ?? LayoutDashboard;

  return (
    <Link
      href={href}
      title={collapsed ? title : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-md py-2 text-sm transition-colors",
        collapsed ? "justify-center px-2" : "pr-3",
        !collapsed && nestedLevel >= 2 && "pl-10",
        !collapsed && nestedLevel === 1 && "pl-7",
        !collapsed && nestedLevel === 0 && "px-3",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed ? <span className="truncate">{title}</span> : null}
    </Link>
  );
}

function filterNavLinks(
  items: NavLinkItem[],
  canAccess: (permission?: string | null) => boolean
) {
  return items.filter(
    (sub) => !sub.permission || canAccess(sub.permission)
  );
}

function filterNavGroups(
  groups: NavGroupItem[],
  canAccess: (permission?: string | null) => boolean
) {
  return groups
    .map((group) => ({
      ...group,
      items: filterNavLinks(group.items, canAccess),
    }))
    .filter((group) => group.items.length > 0);
}

function NavGroupSection({
  group,
  pathname,
  collapsed,
  onNavigate,
  canAccess,
}: {
  group: NavGroupItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  canAccess: (permission?: string | null) => boolean;
}) {
  const visibleItems = filterNavLinks(group.items, canAccess);
  const active = visibleItems.some((item) => pathname === item.href);
  const [open, setOpen] = useState(active);
  const Icon = ICONS[group.title] ?? Settings2;

  useEffect(() => {
    if (active) setOpen(true);
  }, [active, pathname]);

  if (collapsed || visibleItems.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "hover:bg-muted flex w-full items-center gap-2 rounded-md py-2 pr-3 pl-5 text-left text-sm transition-colors",
          active
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate">{group.title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="space-y-0.5">
          {visibleItems.map((sub) => (
            <NavLeafLink
              key={sub.href}
              href={sub.href}
              title={sub.title}
              active={pathname === sub.href}
              nestedLevel={2}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavParentSection({
  item,
  pathname,
  collapsed,
  onNavigate,
  onExpandSidebar,
  canAccess,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  onExpandSidebar: () => void;
  canAccess: (permission?: string | null) => boolean;
}) {
  const flatItems = filterNavLinks(item.items ?? [], canAccess);
  const groups = filterNavGroups(item.groups ?? [], canAccess);
  const active =
    flatItems.some((sub) => pathname === sub.href) ||
    groups.some((group) => group.items.some((sub) => pathname === sub.href));
  const [open, setOpen] = useState(active);
  const Icon = ICONS[item.title] ?? Settings2;

  useEffect(() => {
    if (active) setOpen(true);
  }, [active, pathname]);

  function handleCollapsedClick() {
    onExpandSidebar();
    setOpen(true);
  }

  if (collapsed) {
    return (
      <button
        type="button"
        title={item.title}
        onClick={handleCollapsedClick}
        className={cn(
          "flex w-full items-center justify-center rounded-md p-2 transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="size-5 shrink-0" />
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate">{item.title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="space-y-1 pt-0.5">
          {groups.map((group) => (
            <NavGroupSection
              key={group.title}
              group={group}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
              canAccess={canAccess}
            />
          ))}
          {flatItems.map((sub) => (
            <NavLeafLink
              key={sub.href}
              href={sub.href}
              title={sub.title}
              active={pathname === sub.href}
              nestedLevel={1}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavItemRenderer({
  item,
  pathname,
  canAccess,
  collapsed,
  onNavigate,
  onExpandSidebar,
}: {
  item: NavItem;
  pathname: string;
  canAccess: (permission?: string | null) => boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  onExpandSidebar: () => void;
}) {
  if (item.permission && !canAccess(item.permission)) {
    return null;
  }

  if (item.groups?.length || item.items?.length) {
    const visibleFlatItems = filterNavLinks(item.items ?? [], canAccess);
    const visibleGroups = filterNavGroups(item.groups ?? [], canAccess);
    if (visibleFlatItems.length === 0 && visibleGroups.length === 0) {
      return null;
    }

    return (
      <NavParentSection
        item={item}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
        onExpandSidebar={onExpandSidebar}
        canAccess={canAccess}
      />
    );
  }

  if (!item.href) return null;

  return (
    <NavLeafLink
      href={item.href}
      title={item.title}
      active={pathname === item.href}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  );
}

function SidebarNavSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <nav className="flex flex-col gap-1 p-2" aria-hidden="true">
      {!collapsed ? (
        <p className="text-muted-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
          Menu
        </p>
      ) : null}
      {SIDEBAR_NAV.map((item) => {
        const Icon = ICONS[item.title] ?? LayoutDashboard;
        const hasChildren = Boolean(item.groups?.length || item.items?.length);

        if (collapsed && hasChildren) {
          return (
            <div
              key={item.title}
              className="flex w-full items-center justify-center rounded-md p-2"
            >
              <Icon className="text-muted-foreground size-5 shrink-0" />
            </div>
          );
        }

        return (
          <div
            key={item.title}
            className={cn(
              "text-muted-foreground flex items-center gap-2 rounded-md py-2 text-sm font-medium",
              collapsed ? "justify-center px-2" : "px-3"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed ? <span className="truncate">{item.title}</span> : null}
          </div>
        );
      })}
    </nav>
  );
}

export function SidebarNav({
  onNavigate,
  forceExpanded = false,
}: {
  onNavigate?: () => void;
  forceExpanded?: boolean;
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { hasPermission, loading } = usePermissions();
  const { collapsed, setCollapsed } = useSidebar();
  const isCollapsed = forceExpanded ? false : collapsed;

  const canAccess = (permission?: string | null) => {
    if (!permission) return true;
    if (!hydrated || loading) return true;
    return hasPermission(permission);
  };

  function handleExpandSidebar() {
    if (!forceExpanded) setCollapsed(false);
  }

  if (!hydrated) {
    return <SidebarNavSkeleton collapsed={isCollapsed} />;
  }

  return (
    <nav className="flex flex-col gap-1 p-2">
      {!isCollapsed ? (
        <p className="text-muted-foreground px-3 py-2 text-xs font-medium uppercase tracking-wide">
          Menu
        </p>
      ) : null}
      {loading && !isCollapsed ? (
        <p className="text-muted-foreground px-3 py-2 text-sm">Loading menu...</p>
      ) : null}
      {SIDEBAR_NAV.map((item) => (
        <NavItemRenderer
          key={item.title}
          item={item}
          pathname={pathname}
          canAccess={canAccess}
          collapsed={isCollapsed}
          onNavigate={onNavigate}
          onExpandSidebar={handleExpandSidebar}
        />
      ))}
    </nav>
  );
}
