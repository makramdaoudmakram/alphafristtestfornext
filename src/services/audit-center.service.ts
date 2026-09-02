import {
  createAuditCenterRepository,
  AuditCenterRepositoryError,
} from "@/repository/audit-center.repository";
import type { AuditCenterQuery } from "@/types/audit-center";

export class AuditCenterService {
  private repository: ReturnType<typeof createAuditCenterRepository>;

  constructor(token: string) {
    this.repository = createAuditCenterRepository(token);
  }

  query(filters: AuditCenterQuery) {
    return this.repository.query(filters);
  }

  getDocumentLifecycle(input: {
    module?: string;
    entityId?: string;
    document?: string;
  }) {
    return this.repository.getDocumentLifecycle(input);
  }
}

export function createAuditCenterService(token: string) {
  return new AuditCenterService(token);
}

export { AuditCenterRepositoryError };
