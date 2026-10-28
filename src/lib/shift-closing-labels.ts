import type { ShiftClosingTotals } from "@/types/shift";

/** User-facing labels for legacy Shift counter fields (not raw DB names). */
export const SHIFT_CLOSING_TOTAL_ROWS: {
  key: keyof ShiftClosingTotals;
  labelAr: string;
  labelEn: string;
  integer?: boolean;
}[] = [
  { key: "salesPostPay", labelAr: "مبيعات آجل (بعد الدفع)", labelEn: "Post-payment sales" },
  {
    key: "salesPostPayDiscount",
    labelAr: "خصم آجل (10%)",
    labelEn: "Post-payment discount (10%)",
  },
  {
    key: "salesMedicalDiscount",
    labelAr: "خصم تعاقد / طبي",
    labelEn: "Medical / contract discount",
  },
  { key: "salesMedicen", labelAr: "مبيعات أدوية", labelEn: "Medicine sales (excl. VAT)" },
  {
    key: "salesAccessories",
    labelAr: "مبيعات مستلزمات",
    labelEn: "Accessories sales (excl. VAT)",
  },
  { key: "salesTax", labelAr: "ضريبة المبيعات", labelEn: "Sales tax" },
  { key: "salesTragurt", labelAr: "تحصيل نقدي (طرق تؤثر على النقد)", labelEn: "Cash-affecting payments" },
  { key: "salesCostMedicen", labelAr: "تكلفة الأدوية", labelEn: "Medicine cost" },
  { key: "salesAccessoricCost", labelAr: "تكلفة المستلزمات", labelEn: "Accessories cost" },
  { key: "salesParmCost", labelAr: "إجمالي تكلفة الأصناف", labelEn: "Total item cost" },
  { key: "salesExpensive", labelAr: "مصروفات الصيدلية", labelEn: "Pharmacy expenses" },
  { key: "salesPurches", labelAr: "مشتريات الوردية", labelEn: "Shift purchases" },
  { key: "deliveryValue", labelAr: "قيمة التوصيل", labelEn: "Delivery Value" },
  {
    key: "deliveryCount",
    labelAr: "عدد فواتير التوصيل",
    labelEn: "Delivery Count",
    integer: true,
  },
  {
    key: "totalReturnSales",
    labelAr: "إجمالي مرتجع المبيعات",
    labelEn: "Total Return Sales",
  },
  { key: "returnCash", labelAr: "مرتجع نقدي", labelEn: "Return Cash" },
  {
    key: "totalPurchReturn",
    labelAr: "إجمالي مرتجع المشتريات",
    labelEn: "Total Purchase Return",
  },
  {
    key: "totalSales",
    labelAr: "إجمالي المبيعات",
    labelEn: "Total Sales",
  },
  {
    key: "totalDiscountValue",
    labelAr: "إجمالي قيمة الخصم",
    labelEn: "Total Discount Value",
  },
];
