import {
  acceptPharmTransfer,
  getPendingPharmTransfers,
  PharmTranRepositoryError,
} from "@/repository/pharm-tran.repository";
import type { PharmTranAcceptResult, PharmTranPendingList } from "@/types/pharm-tran";

export class PharmTranService {
  constructor(private readonly token: string) {}

  getPending(): Promise<PharmTranPendingList> {
    return getPendingPharmTransfers(this.token);
  }

  accept(headerId: number): Promise<PharmTranAcceptResult> {
    return acceptPharmTransfer(this.token, headerId);
  }
}

export { PharmTranRepositoryError };
