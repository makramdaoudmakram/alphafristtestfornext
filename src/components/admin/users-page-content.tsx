"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getUsersPage } from "@/lib/api-client";
import { useUsersListColumns } from "@/components/admin/users-table-columns";
import { ActionGuard, PageGuard } from "@/components/permissions/page-guard";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { UserListItem } from "@/types/user";

export function UsersPageContent() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<UserListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "email", desc: false },
  ]);

  const columns = useUsersListColumns(pagination.pageIndex, pagination.pageSize);
  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  const loadUsers = useCallback(async () => {
    if (!token) {
      setItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const sort = sorting[0];
    try {
      const page = await getUsersPage(token, {
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch.trim() || undefined,
        sortBy: sort?.id,
        sortDesc: sort?.desc ?? false,
      });
      setItems(page.items);
      setTotalCount(page.totalCount);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load users";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, pagination, sorting, debouncedSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(tableSearch);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [tableSearch]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [debouncedSearch]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadUsers();
  }, [sessionReady, loadUsers]);

  return (
    <PageGuard
      permission={[PERMISSIONS.users.view, PERMISSIONS.permissions.manage]}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Users</h2>
            <p className="text-muted-foreground text-sm">
              Browse AspNetUsers accounts. Use Create to open the registration form.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionGuard permission={PERMISSIONS.users.create}>
              <Button type="button" asChild>
                <Link href="/register?from=users">
                  <Plus className="size-4" />
                  Create
                </Link>
              </Button>
            </ActionGuard>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadUsers()}
              disabled={loading}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All users ({totalCount})</CardTitle>
            <CardDescription>
              Search by user name or email. Click a row to select it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Search user name, email..."
              emptyMessage="No users found"
              manualPagination
              manualSorting
              pageCount={pageCount}
              pagination={pagination}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={setSorting}
              totalRowCount={totalCount}
              filterValue={tableSearch}
              onFilterChange={setTableSearch}
              pageSizeOptions={[10, 20, 50, 100]}
              showActions={false}
              getRowId={(row) => row.id}
              selectedRowId={selectedUserId}
              onRowClick={(row) => setSelectedUserId(row.id)}
              onRowDoubleClick={() => {
                /* Edit user — Step 2 */
              }}
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadUsers()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
