export type ClosedShiftListItem = {
  scId: number;
  startTime: string | null;
  totalSales: string | null;
  sendMoney: number | null;
};

export type ClosedShiftListPage = {
  items: ClosedShiftListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
