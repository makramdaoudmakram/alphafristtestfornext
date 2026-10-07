"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SalesCustomerFormSheet } from "@/components/sales/sales-customer-form-sheet";
import { useSalesCustomersColumns } from "@/components/sales/sales-customers-table-columns";
import { ActionGuard, PageGuard } from "@/components/permissions/page-guard";
import { usePermissions } from "@/components/permissions/permission-provider";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createCustomer,
  deleteCustomer,
  getCustomersPaged,
  updateCustomer,
} from "@/lib/customer-api";
import { PERMISSIONS } from "@/lib/route-permissions";
import type { CustomerCreateRequest, CustomerItem } from "@/types/customer";

function customerRowKey(customer: CustomerItem): string {
  if (customer.custCode > 0) return String(customer.custCode);
  return customer.accountId?.trim() || `row-${customer.custNameEn ?? customer.custNameAr ?? "unknown"}`;
}

function sortColumnToApi(columnId: string | undefined): string {
  switch (columnId) {
    case "custNameAr":
      return "custNameAr";
    case "accountId":
      return "accountId";
    case "custCode":
    case "custNameEn":
    default:
      return "custNameEn";
  }
}

export function SalesCustomersPageContent() {
  const { data: session, status } = useSession();
  const { hasPermission } = usePermissions();
  const token = session?.accessToken;
  const sessionReady = status !== "loading";

  const [items, setItems] = useState<CustomerItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerItem | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "custNameEn", desc: false },
  ]);

  const columns = useSalesCustomersColumns();
  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  const loadCustomers = useCallback(async () => {
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
      const page = await getCustomersPaged(token, {
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: debouncedSearch.trim() || undefined,
        sortBy: sortColumnToApi(sort?.id),
        sortDesc: sort?.desc ?? false,
      });
      setItems(page.items);
      setTotalCount(page.totalCount);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load customers";
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
    void loadCustomers();
  }, [sessionReady, loadCustomers]);

  function openCreateSheet() {
    setEditingItem(null);
    setSheetOpen(true);
  }

  function handleEdit(row: CustomerItem) {
    setEditingItem(row);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(values: CustomerCreateRequest) {
    if (!token) return;

    setSheetSaving(true);
    try {
      if (editingItem) {
        await updateCustomer(editingItem.custCode, values, token);
        toast.success("Customer updated");
      } else {
        await createCustomer(values, token);
        toast.success("Customer created");
      }
      setSheetOpen(false);
      setEditingItem(null);
      await loadCustomers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save customer"
      );
    } finally {
      setSheetSaving(false);
    }
  }

  function handleDelete(row: CustomerItem) {
    const label = row.custNameEn || row.custNameAr || `#${row.custCode}`;
    toast(`Delete customer "${label}"?`, {
      description:
        "This permanently removes the customer record when no sales documents reference it.",
      action: {
        label: "Delete",
        onClick: () => void confirmDelete(row),
      },
      cancel: {
        label: "Cancel",
        onClick: () => toast.message("Delete cancelled"),
      },
    });
  }

  async function confirmDelete(row: CustomerItem) {
    if (!token) return;

    try {
      await deleteCustomer(row.custCode, token);
      toast.success("Customer deleted");
      await loadCustomers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete customer"
      );
    }
  }

  return (
    <PageGuard permission={PERMISSIONS.customer.view}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Customers</h2>
            <p className="text-muted-foreground text-sm">
              Manage customer master data in the Customer table used by Sales and
              Sales Return.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionGuard permission={PERMISSIONS.customer.create}>
              <Button type="button" onClick={openCreateSheet}>
                <Plus className="size-4" />
                Add customer
              </Button>
            </ActionGuard>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadCustomers()}
              disabled={loading}
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All customers ({totalCount})</CardTitle>
            <CardDescription>
              Search by name, account number, mobile, or pharmacy code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={items}
              loading={!sessionReady || loading}
              filterPlaceholder="Search customers..."
              emptyMessage="No customers found."
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
              getRowId={customerRowKey}
              onEdit={
                hasPermission(PERMISSIONS.customer.edit) ? handleEdit : undefined
              }
              onDelete={
                hasPermission(PERMISSIONS.customer.delete)
                  ? handleDelete
                  : undefined
              }
              onRowDoubleClick={
                hasPermission(PERMISSIONS.customer.edit) ? handleEdit : undefined
              }
            />
            {loadError ? (
              <div className="mt-3 space-y-3">
                <p className="text-destructive text-sm">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadCustomers()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <SalesCustomerFormSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          token={token ?? null}
          saving={sheetSaving}
          onSubmit={handleSheetSubmit}
        />
      </div>
    </PageGuard>
  );
}
