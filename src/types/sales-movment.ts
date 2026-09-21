export type SalesMovementParent = 1 | 2;

export type SalesmovmentDetail = {
  id: number;
  movId: number | null;
  movName: string | null;
  movParint: number | null;
  pharmId: number | null;
  pharmacyName: string | null;
  store1: number | null;
  store1Name: string | null;
  store2: number | null;
  store2Name: string | null;
  cashDebit: string | null;
  creditCardDebit: string | null;
  creditCardMachinNo: string | null;
  discountEmployeesDebit: string | null;
  discountMedicalDebit: string | null;
  medicinesSalesCredit: string | null;
  accesSalesCredit: string | null;
  salesTaxCredit: string | null;
  salesCostDebit: string | null;
  accessCostDebit: string | null;
  pharmStorCredit: string | null;
  extraordinaryPurchasesDebit: string | null;
  extraordinaryPurchasesCredit: string | null;
  expensesDebit: string | null;
  expensesCredit: string | null;
  transferDebit: string | null;
  transferCredit: string | null;
  postMedicalDebit: string | null;
  postEmployeesDebit: string | null;
  excessDeficitdept: string | null;
  excessDeficitcredit: string | null;
  cashdiscount: string | null;
  otheraRevinue: string | null;
};

export type SalesmovmentUpsertRequest = {
  movId: number | null;
  movName: string | null;
  movParint: SalesMovementParent;
  pharmId: number | null;
  store1: number | null;
  store2: number | null;
  cashDebit: string | null;
  creditCardDebit: string | null;
  creditCardMachinNo: string | null;
  discountEmployeesDebit: string | null;
  discountMedicalDebit: string | null;
  medicinesSalesCredit: string | null;
  accesSalesCredit: string | null;
  salesTaxCredit: string | null;
  salesCostDebit: string | null;
  accessCostDebit: string | null;
  pharmStorCredit: string | null;
  extraordinaryPurchasesDebit: string | null;
  extraordinaryPurchasesCredit: string | null;
  expensesDebit: string | null;
  expensesCredit: string | null;
  transferDebit: string | null;
  transferCredit: string | null;
  postMedicalDebit: string | null;
  postEmployeesDebit: string | null;
  excessDeficitdept: string | null;
  excessDeficitcredit: string | null;
  cashdiscount: string | null;
  otheraRevinue: string | null;
};

export const SALES_MOVEMENT_PARENT_OPTIONS: {
  value: SalesMovementParent;
  label: string;
}[] = [
  { value: 1, label: "Sales" },
  { value: 2, label: "Return Sales" },
];

export const SALES_MOVEMENT_ACCOUNT_FIELDS: {
  key: keyof SalesmovmentUpsertRequest;
  label: string;
}[] = [
  { key: "cashDebit", label: "Cash Debit" },
  { key: "creditCardDebit", label: "Credit Card Debit" },
  { key: "discountEmployeesDebit", label: "Discount Employees Debit" },
  { key: "discountMedicalDebit", label: "Discount Medical Debit" },
  { key: "medicinesSalesCredit", label: "Medicines Sales Credit" },
  { key: "accesSalesCredit", label: "Access Sales Credit" },
  { key: "salesTaxCredit", label: "Sales Tax Credit" },
  { key: "salesCostDebit", label: "Sales Cost Debit" },
  { key: "accessCostDebit", label: "Access Cost Debit" },
  { key: "pharmStorCredit", label: "Pharm Store Credit" },
  { key: "extraordinaryPurchasesDebit", label: "Extraordinary Purchases Debit" },
  { key: "extraordinaryPurchasesCredit", label: "Extraordinary Purchases Credit" },
  { key: "expensesDebit", label: "Expenses Debit" },
  { key: "expensesCredit", label: "Expenses Credit" },
  { key: "transferDebit", label: "Transfer Debit" },
  { key: "transferCredit", label: "Transfer Credit" },
  { key: "postMedicalDebit", label: "Post Medical Debit" },
  { key: "postEmployeesDebit", label: "Post Employees Debit" },
  { key: "excessDeficitdept", label: "Excess / Deficit Debit" },
  { key: "excessDeficitcredit", label: "Excess / Deficit Credit" },
  { key: "cashdiscount", label: "Cash Discount" },
  { key: "otheraRevinue", label: "Other Revenue" },
];
