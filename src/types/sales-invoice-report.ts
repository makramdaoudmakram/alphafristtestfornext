export type FinalizedSaleListItem = {
  scId: number | null;
  sthId: number;
  invoiceDate: string | null;
  classifyName: string | null;
  totalValue: number | null;
};

export type FinalizedSaleListPage = {
  items: FinalizedSaleListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
