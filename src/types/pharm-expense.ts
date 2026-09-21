export type PharmExpenseLineRequest = {
  expensesDisc: string;
  expensesVal: number;
};

export type PharmExpenseBulkResponse = {
  savedCount: number;
  movId: number;
  pharmId: string;
  shiftId: number;
  totalExpenses: number;
};

export type PharmExpenseContext = {
  parmId: number;
  pharmId: string;
  pharmacyName: string | null;
  movId: number;
  movName: string | null;
  shiftId: number;
  hasOpenShift: boolean;
  canSave: boolean;
  error: string | null;
};
