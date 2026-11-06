import type {
  StorToPharmPendingDetail,
  StorToPharmPendingHeader,
} from "@/types/stor-to-pharm";

export type AcceptedPharmacyOrderSummary = {
  id: number;
  fathId: number | null;
  serialNo: number | null;
  sendingStorageId: string | null;
  sendingStorageName: string | null;
  receivingStorageId: string | null;
  receivingStorageName: string | null;
  totalQuantity: number | null;
  receiveDate: string | null;
  totalSalesPrice: number | null;
  movFlag: number;
};

export type AcceptedPharmacyOrdersList = {
  currentPharmacyName: string | null;
  currentStorageId: string | null;
  currentStorageName: string | null;
  storageConfigurationMessage: string | null;
  items: AcceptedPharmacyOrderSummary[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type AcceptedPharmacyOrderQuery = {
  dateFrom?: string | null;
  dateTo?: string | null;
  pageNumber?: number;
  pageSize?: number;
};

export type AcceptedPharmacyOrderDetail = StorToPharmPendingHeader;
export type AcceptedPharmacyOrderDetailLine = StorToPharmPendingDetail;
