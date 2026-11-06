import {
  getAcceptedPharmacyOrderById,
  getAcceptedPharmacyOrders,
  getAcceptedPharmacyOrderStockBarcodeLabels,
  AcceptedPharmacyOrdersRepositoryError,
} from "@/repository/accepted-pharmacy-orders.repository";
import type {
  AcceptedPharmacyOrderDetail,
  AcceptedPharmacyOrdersList,
  AcceptedPharmacyOrderQuery,
} from "@/types/accepted-pharmacy-orders";
import type { StockBarcodeLabel } from "@/types/stock";

export class AcceptedPharmacyOrdersService {
  constructor(private readonly token: string) {}

  list(query: AcceptedPharmacyOrderQuery): Promise<AcceptedPharmacyOrdersList> {
    return getAcceptedPharmacyOrders(this.token, query);
  }

  getById(id: number): Promise<AcceptedPharmacyOrderDetail> {
    return getAcceptedPharmacyOrderById(this.token, id);
  }

  getStockBarcodeLabels(id: number): Promise<StockBarcodeLabel[]> {
    return getAcceptedPharmacyOrderStockBarcodeLabels(this.token, id);
  }
}

export { AcceptedPharmacyOrdersRepositoryError };
