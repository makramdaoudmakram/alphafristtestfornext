"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createVendorCode,
  deleteVendorCode,
  getVendorCodesByItemId,
  updateVendorCode,
} from "@/lib/api-client";
import { getVendors } from "@/lib/vendor-api";
import type { VendorCodeItem } from "@/types/vendor-code";
import type { VendorItem } from "@/types/vendor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/searchable-combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  itemCatalogDialogBodyClass,
  itemCatalogDialogContentClass,
  itemCatalogDialogFooterClass,
  itemCatalogDialogHeaderClass,
} from "@/components/admin/item-catalog/item-catalog-dialog-styles";

function vendorLabel(vendor: VendorItem): string {
  return (
    vendor.vendorNameEn?.trim() ||
    vendor.vendorNameAr?.trim() ||
    `#${vendor.vendorId}`
  );
}

export function VendorCodeDialog({
  open,
  onOpenChange,
  itmId,
  itemCode,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itmId: number | null;
  itemCode: string | null;
  token: string | undefined;
}) {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [vendorCodes, setVendorCodes] = useState<VendorCodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendorCodeValue, setVendorCodeValue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const vendorOptions = useMemo<ComboboxOption[]>(
    () =>
      vendors.map((vendor) => ({
        value: String(vendor.vendorId),
        label: vendorLabel(vendor),
      })),
    [vendors]
  );

  const vendorNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const vendor of vendors) {
      map.set(vendor.vendorId, vendorLabel(vendor));
    }
    return map;
  }, [vendors]);

  const resetForm = useCallback(() => {
    setSelectedVendorId("");
    setVendorCodeValue("");
    setEditingId(null);
  }, []);

  const loadVendorCodes = useCallback(async () => {
    if (!token || !itmId) {
      setVendorCodes([]);
      return;
    }

    setLoading(true);
    try {
      setVendorCodes(await getVendorCodesByItemId(itmId, token));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load vendor codes"
      );
      setVendorCodes([]);
    } finally {
      setLoading(false);
    }
  }, [token, itmId]);

  const loadVendors = useCallback(async () => {
    if (!token) {
      setVendors([]);
      return;
    }

    setVendorsLoading(true);
    try {
      setVendors(await getVendors(token));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load vendors"
      );
      setVendors([]);
    } finally {
      setVendorsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    if (!itmId) {
      toast.error("Save the item first before managing vendor codes.");
      onOpenChange(false);
      return;
    }

    resetForm();
    void loadVendors();
    void loadVendorCodes();
  }, [open, itmId, loadVendorCodes, loadVendors, onOpenChange, resetForm]);

  function handleEdit(row: VendorCodeItem) {
    setEditingId(row.id);
    setSelectedVendorId(String(row.vendorId));
    setVendorCodeValue(row.vendorCode?.trim() ?? "");
  }

  function handleCancelEdit() {
    resetForm();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !itmId || saving) return;

    const vendorId = Number.parseInt(selectedVendorId, 10);
    const code = vendorCodeValue.trim();

    if (!Number.isFinite(vendorId) || vendorId <= 0) {
      toast.error("Select a vendor.");
      return;
    }

    if (!code) {
      toast.error("Vendor code is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        itmId,
        vendorId,
        itemCode: itemCode?.trim() || null,
        vendorCode: code,
      };

      if (editingId) {
        await updateVendorCode(editingId, payload, token);
        toast.success("Vendor code updated");
      } else {
        await createVendorCode(payload, token);
        toast.success("Vendor code added");
      }

      resetForm();
      await loadVendorCodes();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save vendor code"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row: VendorCodeItem) {
    const vendorName = vendorNameById.get(row.vendorId) ?? `Vendor #${row.vendorId}`;
    toast(`Delete vendor code for "${vendorName}"?`, {
      description: row.vendorCode ?? undefined,
      duration: Infinity,
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

  async function confirmDelete(row: VendorCodeItem) {
    if (!token) return;

    try {
      await deleteVendorCode(row.id, token);
      toast.success("Vendor code deleted");
      if (editingId === row.id) resetForm();
      await loadVendorCodes();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete vendor code"
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={itemCatalogDialogContentClass}>
        <DialogHeader className={itemCatalogDialogHeaderClass}>
          <DialogTitle>Vendor Codes</DialogTitle>
          <DialogDescription>
            Manage vendor-specific item codes for this catalog item.
          </DialogDescription>
        </DialogHeader>

        <div className={itemCatalogDialogBodyClass}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <SearchableCombobox
                value={selectedVendorId}
                onValueChange={setSelectedVendorId}
                options={vendorOptions}
                placeholder={
                  vendorsLoading ? "Loading vendors..." : "Select vendor"
                }
                searchPlaceholder="Search vendor..."
                emptyMessage="No vendors found."
                disabled={saving || vendorsLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-code-value">Vendor Code</Label>
              <Input
                id="vendor-code-value"
                value={vendorCodeValue}
                onChange={(event) => setVendorCodeValue(event.target.value)}
                placeholder="Enter vendor item code"
                disabled={saving}
                required
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || loading}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save"
                    : "Add"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>

          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium">Existing Vendor Codes</h3>
            {loading ? (
              <p className="text-muted-foreground text-sm">
                Loading vendor codes...
              </p>
            ) : vendorCodes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No vendor codes yet for this item.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="w-[140px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorCodes.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {vendorNameById.get(row.vendorId) ??
                            `Vendor #${row.vendorId}`}
                        </TableCell>
                        <TableCell>{row.vendorCode ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(row)}
                              disabled={saving}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(row)}
                              disabled={saving}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className={itemCatalogDialogFooterClass}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
