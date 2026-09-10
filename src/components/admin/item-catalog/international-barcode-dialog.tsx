"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createInternationalBarcode,
  deleteInternationalBarcode,
  getInternationalBarcodesByItemId,
  updateInternationalBarcode,
} from "@/lib/api-client";
import type { InternationalBarcodeItem } from "@/types/international-barcode";
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

export function InternationalBarcodDialog({
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
  const [barcodes, setBarcodes] = useState<InternationalBarcodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const resetForm = useCallback(() => {
    setBarcodeValue("");
    setEditingId(null);
  }, []);

  const loadBarcodes = useCallback(async () => {
    if (!token || !itmId) {
      setBarcodes([]);
      return;
    }

    setLoading(true);
    try {
      setBarcodes(await getInternationalBarcodesByItemId(itmId, token));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load international codes"
      );
      setBarcodes([]);
    } finally {
      setLoading(false);
    }
  }, [token, itmId]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    if (!itmId) {
      toast.error("Save the item first before managing international codes.");
      onOpenChange(false);
      return;
    }

    resetForm();
    void loadBarcodes();
  }, [open, itmId, loadBarcodes, onOpenChange, resetForm]);

  function handleEdit(row: InternationalBarcodeItem) {
    setEditingId(row.id);
    setBarcodeValue(row.interBarcode?.trim() ?? "");
  }

  function handleCancelEdit() {
    resetForm();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !itmId || saving) return;

    const barcode = barcodeValue.trim();
    if (!barcode) {
      toast.error("International barcode is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        itmId,
        itemCode: itemCode?.trim() || null,
        interBarcode: barcode,
      };

      if (editingId) {
        await updateInternationalBarcode(editingId, payload, token);
        toast.success("International code updated");
      } else {
        await createInternationalBarcode(payload, token);
        toast.success("International code added");
      }

      resetForm();
      await loadBarcodes();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save international code"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row: InternationalBarcodeItem) {
    toast(`Delete international barcode "${row.interBarcode ?? row.id}"?`, {
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

  async function confirmDelete(row: InternationalBarcodeItem) {
    if (!token) return;

    try {
      await deleteInternationalBarcode(row.id, token);
      toast.success("International code deleted");
      if (editingId === row.id) resetForm();
      await loadBarcodes();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete international code"
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={itemCatalogDialogContentClass}>
        <DialogHeader className={itemCatalogDialogHeaderClass}>
          <DialogTitle>International Extra Codes</DialogTitle>
          <DialogDescription>
            Manage international barcodes linked to this catalog item.
          </DialogDescription>
        </DialogHeader>

        <div className={itemCatalogDialogBodyClass}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="international-barcode-value">
                International Barcode
              </Label>
              <Input
                id="international-barcode-value"
                value={barcodeValue}
                onChange={(event) => setBarcodeValue(event.target.value)}
                placeholder="Enter international barcode"
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
            <h3 className="text-sm font-medium">Existing International Codes</h3>
            {loading ? (
              <p className="text-muted-foreground text-sm">
                Loading international codes...
              </p>
            ) : barcodes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No international codes yet for this item.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead className="w-[140px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barcodes.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.interBarcode ?? "—"}</TableCell>
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
