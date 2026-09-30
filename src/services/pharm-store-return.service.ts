import {
  acceptPharmStoreReturn,
  getPendingPharmStoreReturn,
  PharmStoreReturnRepositoryError,
} from "@/repository/pharm-store-return.repository";
import type {
  PharmStoreReturnAcceptResult,
  PharmStoreReturnPendingPage,
} from "@/types/pharm-store-return";

export class PharmStoreReturnService {
  constructor(private readonly token: string) {}

  getPending(): Promise<PharmStoreReturnPendingPage> {
    return getPendingPharmStoreReturn(this.token);
  }

  accept(headerId: number): Promise<PharmStoreReturnAcceptResult> {
    return acceptPharmStoreReturn(this.token, headerId);
  }
}

export { PharmStoreReturnRepositoryError };
