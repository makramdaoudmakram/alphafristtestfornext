import type { PharmReciveItemLanguage } from "@/types/pharm-recive";
import type { StorToPharmPendingDetail } from "@/types/stor-to-pharm";

export type StorToPharmDetailSortDirection = "asc" | "desc";

export type StorToPharmDetailLabels = {
  code: string;
  itemName: string;
  quantity: string;
  unit: string;
  batchNo: string;
  expiry: string;
  salesPrice: string;
  sortBy: string;
  sortAsc: string;
  sortDesc: string;
};

const DETAIL_LABELS: Record<PharmReciveItemLanguage, StorToPharmDetailLabels> = {
  en: {
    code: "Code",
    itemName: "Item Name",
    quantity: "Quantity",
    unit: "Unit",
    batchNo: "Batch No",
    expiry: "Expiry Date",
    salesPrice: "Sales Price",
    sortBy: "Sort by Item Name",
    sortAsc: "Ascending (A → Z)",
    sortDesc: "Descending (Z → A)",
  },
  ar: {
    code: "الكود",
    itemName: "اسم الصنف",
    quantity: "الكمية",
    unit: "الوحدة",
    batchNo: "رقم التشغيلة",
    expiry: "تاريخ الانتهاء",
    salesPrice: "سعر البيع",
    sortBy: "ترتيب حسب اسم الصنف",
    sortAsc: "تصاعدي",
    sortDesc: "تنازلي",
  },
};

export function getStorToPharmDetailLabels(
  language: PharmReciveItemLanguage
): StorToPharmDetailLabels {
  return DETAIL_LABELS[language];
}

export function getStorToPharmItemName(
  detail: StorToPharmPendingDetail,
  language: PharmReciveItemLanguage
): string {
  const primary =
    language === "ar"
      ? detail.itemNameAr?.trim()
      : detail.itemNameEn?.trim();
  const fallback =
    language === "ar"
      ? detail.itemNameEn?.trim()
      : detail.itemNameAr?.trim();

  return primary || fallback || "—";
}

export function sortStorToPharmDetails(
  details: StorToPharmPendingDetail[],
  language: PharmReciveItemLanguage,
  direction: StorToPharmDetailSortDirection
): StorToPharmPendingDetail[] {
  const collator = new Intl.Collator(language === "ar" ? "ar" : "en", {
    sensitivity: "base",
    numeric: true,
  });

  return [...details].sort((left, right) => {
    const leftName =
      language === "ar"
        ? left.itemNameAr?.trim() ?? ""
        : left.itemNameEn?.trim() ?? "";
    const rightName =
      language === "ar"
        ? right.itemNameAr?.trim() ?? ""
        : right.itemNameEn?.trim() ?? "";

    const comparison = collator.compare(leftName, rightName);
    if (comparison !== 0) {
      return direction === "asc" ? comparison : -comparison;
    }

    return left.lineNo - right.lineNo;
  });
}
