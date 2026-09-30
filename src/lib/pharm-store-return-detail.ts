import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import type { PharmStoreReturnPendingDetail } from "@/types/pharm-store-return";

export type PharmStoreReturnDetailSortDirection = "asc" | "desc";

export type PharmStoreReturnDetailLabels = {
  code: string;
  itemName: string;
  quantity: string;
  unit: string;
  unitValue: string;
  stockId: string;
  batchNo: string;
  expiry: string;
  sortBy: string;
  sortAsc: string;
  sortDesc: string;
};

const DETAIL_LABELS: Record<PharmReciveItemLanguage, PharmStoreReturnDetailLabels> = {
  en: {
    code: "Code",
    itemName: "Item Name",
    quantity: "Quantity",
    unit: "Unit",
    unitValue: "Unit Value",
    stockId: "Stock Id",
    batchNo: "Batch No",
    expiry: "Expiry Date",
    sortBy: "Sort by Item Name",
    sortAsc: "Ascending (A → Z)",
    sortDesc: "Descending (Z → A)",
  },
  ar: {
    code: "الكود",
    itemName: "اسم الصنف",
    quantity: "الكمية",
    unit: "الوحدة",
    unitValue: "قيمة الوحدة",
    stockId: "رقم المخزون",
    batchNo: "رقم التشغيلة",
    expiry: "تاريخ الانتهاء",
    sortBy: "ترتيب حسب اسم الصنف",
    sortAsc: "تصاعدي",
    sortDesc: "تنازلي",
  },
};

export function getPharmStoreReturnDetailLabels(
  language: PharmReciveItemLanguage
): PharmStoreReturnDetailLabels {
  return DETAIL_LABELS[language];
}

export function getPharmStoreReturnItemName(
  detail: PharmStoreReturnPendingDetail,
  language: PharmReciveItemLanguage
): string {
  const primary =
    language === "ar" ? detail.itemNameAr?.trim() : detail.itemNameEn?.trim();
  const fallback =
    language === "ar" ? detail.itemNameEn?.trim() : detail.itemNameAr?.trim();
  return primary || fallback || "—";
}

export function sortPharmStoreReturnDetails(
  details: PharmStoreReturnPendingDetail[],
  language: PharmReciveItemLanguage,
  direction: PharmStoreReturnDetailSortDirection
): PharmStoreReturnPendingDetail[] {
  const collator = new Intl.Collator(language === "ar" ? "ar" : "en", {
    sensitivity: "base",
    numeric: true,
  });

  return [...details].sort((left, right) => {
    const leftName =
      language === "ar" ? left.itemNameAr?.trim() ?? "" : left.itemNameEn?.trim() ?? "";
    const rightName =
      language === "ar" ? right.itemNameAr?.trim() ?? "" : right.itemNameEn?.trim() ?? "";
    const comparison = collator.compare(leftName, rightName);
    if (comparison !== 0) {
      return direction === "asc" ? comparison : -comparison;
    }
    return left.lineNo - right.lineNo;
  });
}
