"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  inventoryDisplayBaseQtyInCatalogUnit,
} from "@/lib/stock-inventory";
import {
  formatStoreItemPendingMovementLabel,
} from "@/lib/store-stock-pending-sheet";
import type { StockStoreItemPendingMovement } from "@/types/stock";
import type { StockStoreItemSummaryRow } from "@/types/stock";
import { cn } from "@/lib/utils";

type StoreStockPendingMovementsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StockStoreItemSummaryRow | null;
  movements: StockStoreItemPendingMovement[];
  loading?: boolean;
};

function formatQty(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function StoreStockPendingMovementsSheet({
  open,
  onOpenChange,
  item,
  movements,
  loading = false,
}: StoreStockPendingMovementsSheetProps) {
  const title = item
    ? `Pending movements · ${item.itemCode}`
    : "Pending movements";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {item
              ? (item.itemNameEn?.trim() ||
                  item.itemNameAr?.trim() ||
                  item.itemCode)
              : "Select an item to view pending reservations."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : movements.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No trusted pending reservation lines for this item at this store.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((row) => (
                  <TableRow
                    key={`${row.isIncomingUnaccepted ? "in" : "out"}-${row.movementKind}-${row.documentId}-${row.lineNo}`}
                    className={cn(
                      row.isIncomingUnaccepted &&
                        "text-blue-600 dark:text-blue-400"
                    )}
                  >
                    <TableCell>{row.movementSerial ?? "—"}</TableCell>
                    <TableCell>
                      {formatStoreItemPendingMovementLabel(row.movementKind, {
                        isIncomingUnaccepted: row.isIncomingUnaccepted,
                        destinationName: row.destinationName,
                        sourceName: row.sourceName,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQty(
                        inventoryDisplayBaseQtyInCatalogUnit(
                          row.quantityBase,
                          item?.itmUnit1Unit3
                        )
                      )}
                    </TableCell>
                    <TableCell>{row.movementDate ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
