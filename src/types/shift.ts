export type ShiftStatus = {
  parmId: number | null;
  pharmacyName: string | null;
  hasOpenShift: boolean;
  hasShiftHistory: boolean;
  isFirstShiftOpening: boolean;
  costCenterCode: string | null;
  costCenterName: string | null;
  status: string;
  scId: number | null;
  openedAt: string | null;
  openingBalance: number | null;
  openedBy: string | null;
  cashier: string | null;
  notes: string | null;
  moveId: number | null;
  movName: string | null;
};

export type OpenFirstShiftRequest = {
  startingCash: number;
  notes: string | null;
};

export type ShiftMovementOption = {
  id: number;
  movId: number;
  movName: string | null;
  movParint: number | null;
};

export type OpenShiftRequest = {
  openingBalance: number;
  notes: string | null;
  movId: number;
};

export type ShiftClosingUnresolvedSale = {
  sthId: number;
  totalBillNet: number | null;
  createdAt: string | null;
};

export type ShiftClosingPendingDelivery = {
  sthId: number;
  contact: string | null;
  tel: string | null;
  delivStat: string | null;
};

export type ShiftClosingTotals = {
  salesPostPay: number;
  salesPostPayDiscount: number;
  salesMedicalDiscount: number;
  salesMedicen: number;
  salesAccessories: number;
  salesTax: number;
  salesTragurt: number;
  salesCostMedicen: number;
  salesAccessoricCost: number;
  salesParmCost: number;
  salesExpensive: number;
  salesPurches: number;
};

export type ShiftClosingPreview = {
  parmId: number;
  pharmKey: string;
  scId: number;
  moveId: number;
  costCenterCode: string | null;
  costCenterName: string | null;
  shiftStartedAt: string | null;
  openingBalance: number | null;
  canClose: boolean;
  blockReason: string | null;
  unresolvedSales: ShiftClosingUnresolvedSale[];
  pendingDeliveries: ShiftClosingPendingDelivery[];
  totals: ShiftClosingTotals;
};

export type ShiftClosedResult = {
  scId: number;
  closedAt: string | null;
  totals: ShiftClosingTotals;
  nextScId: number;
  nextOpeningBalance: number;
  nextShiftStartedAt: string | null;
};

export type ShiftCloseRequest = {
  scId: number | null;
  actualPharmacyCash: number;
  headOfficeTransferAmount: number;
  employeePassword: string;
  closingNotes: string | null;
};
