import {
  acceptStorToPharm,
  getPendingStorToPharm,
  StorToPharmRepositoryError,
} from "@/repository/stor-to-pharm.repository";
import type { StorToPharmAcceptResult, StorToPharmPendingList } from "@/types/stor-to-pharm";

export class StorToPharmService {
  constructor(private readonly token: string) {}

  getPending(): Promise<StorToPharmPendingList> {
    return getPendingStorToPharm(this.token);
  }

  accept(headerId: number): Promise<StorToPharmAcceptResult> {
    return acceptStorToPharm(this.token, headerId);
  }
}

export { StorToPharmRepositoryError };
