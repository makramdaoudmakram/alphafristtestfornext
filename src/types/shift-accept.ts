export type ShiftAcceptPendingRow = {
  shiftId: number;
  pharmacyName: string | null;
  scId: number;
  startTime: string | null;
  transferValue: number;
};

export type ShiftAcceptPendingList = {
  rows: ShiftAcceptPendingRow[];
};