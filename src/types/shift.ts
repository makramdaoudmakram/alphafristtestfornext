export type ShiftStatus = {
  parmId: number | null;
  pharmacyName: string | null;
  hasOpenShift: boolean;
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
