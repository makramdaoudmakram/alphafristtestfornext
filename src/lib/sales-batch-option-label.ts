import { formatUnitOptionLabel } from "@/lib/item-unit-options";
import { formatExpDateMmYyyy } from "@/lib/purchase-exp-date";
import { displayAvailableQtyInSelectedUnit } from "@/lib/sales-workspace-calc";
import type { UnitItem } from "@/types/unit";

const BATCH_OPTION_SEP = " -- ";

export type SalesBatchOptionLabelFields = {
  batchNo: string;
  availableQty: number;
  expDate: string | null;
  unitId: number;
  unit1: number | null;
  unit2: number | null;
  unit3: number | null;
  unit1Unit2: number | null;
  unit1Unit3: number | null;
};

function formatBatchQtyDisplay(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function unitShortName(unitId: number, units: UnitItem[]): string {
  if (unitId <= 0) return "";
  const unit = units.find((u) => u.uCode === unitId);
  const name = unit?.uNameEn?.trim() || unit?.uNameAr?.trim();
  return name || formatUnitOptionLabel(unitId, unit);
}

/** Batch combobox label: batch · qty unit · MM/YYYY expiry (no pharmacy name). */
export function formatSalesBatchOptionLabel(
  fields: SalesBatchOptionLabelFields,
  units: UnitItem[]
): string {
  const batch = fields.batchNo?.length ? fields.batchNo : "—";

  const qtyInUnit = displayAvailableQtyInSelectedUnit({
    availableQty: fields.availableQty,
    unitId: fields.unitId,
    unit1: fields.unit1,
    unit2: fields.unit2,
    unit3: fields.unit3,
    unit1Unit2: fields.unit1Unit2,
    unit1Unit3: fields.unit1Unit3,
  });
  const qtyStr =
    qtyInUnit != null
      ? formatBatchQtyDisplay(qtyInUnit)
      : formatBatchQtyDisplay(fields.availableQty);

  const unitLabel = unitShortName(fields.unitId, units);
  const qtyPart = unitLabel ? `${qtyStr} ${unitLabel}` : qtyStr;

  const expFormatted =
    fields.expDate?.trim() ? formatExpDateMmYyyy(fields.expDate) : "";
  const expPart = expFormatted || "—";

  return `${batch}${BATCH_OPTION_SEP}${qtyPart}${BATCH_OPTION_SEP}${expPart}`;
}
