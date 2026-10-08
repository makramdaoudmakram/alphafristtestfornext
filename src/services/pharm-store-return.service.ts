import {
  acceptPharmStoreReturn,
  getPendingPharmStoreReturn,
  sendPharmStoreReturn,
  PharmStoreReturnRepositoryError,
} from "@/repository/pharm-store-return.repository";
import type {
  PharmStoreReturnAcceptResult,
  PharmStoreReturnPendingPage,
} from "@/types/pharm-store-return";
import type {
  PharmStoreReturnSendPayload,
  PharmStoreReturnSendResult,
} from "@/types/pharm-store-return-send";

export class PharmStoreReturnService {
  constructor(private readonly token: string) {}

  getPending(): Promise<PharmStoreReturnPendingPage> {
    return getPendingPharmStoreReturn(this.token);
  }

  send(payload: PharmStoreReturnSendPayload): Promise<PharmStoreReturnSendResult> {
    return sendPharmStoreReturn(this.token, payload);
  }

  accept(headerId: number): Promise<PharmStoreReturnAcceptResult> {
    return acceptPharmStoreReturn(this.token, headerId);
  }
}

export { PharmStoreReturnRepositoryError };
