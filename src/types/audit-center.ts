export type AuditFieldChange = {
  field: string;
  before: string | null;
  after: string | null;
};

export type AuditCenterEvent = {
  id: string;
  timestamp: string;
  userId: string | null;
  userName: string;
  module: string;
  action: string;
  document: string;
  entityId: string | null;
  eventType: string | null;
  item: string | null;
  description: string;
  critical: boolean;
  criticalReason: string | null;
  ipAddress: string | null;
  apiUrl: string | null;
  httpMethod: string | null;
  transactionId: string | null;
  changes: AuditFieldChange[];
};

export type AuditCenterCount = {
  name: string;
  id: string | null;
  count: number;
};

export type AuditCenterUserProfile = {
  userId: string;
  userName: string;
  total: number;
  today: number;
  thisWeek: number;
  modules: string[];
};

export type AuditCenterSummary = {
  totalEvents: number;
  created: number;
  modified: number;
  deleted: number;
  posted: number;
  reversed: number;
  stockAdjusted: number;
  critical: number;
  activeUsers: number;
  mostActiveUsers: AuditCenterCount[];
  modules: AuditCenterCount[];
};

export type AuditCenterQueryResult = {
  summary: AuditCenterSummary;
  users: AuditCenterCount[];
  modules: AuditCenterCount[];
  actions: AuditCenterCount[];
  documents: AuditCenterCount[];
  userProfiles: AuditCenterUserProfile[];
  items: AuditCenterEvent[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export type AuditCenterQuery = {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  module?: string;
  user?: string;
  action?: string;
  document?: string;
  criticalOnly?: boolean;
  pageNumber?: number;
  pageSize?: number;
};

export type AuditDatePreset = "today" | "7d" | "30d" | "all" | "custom";
export type AuditCenterTab = "overview" | "activity" | "users" | "modules" | "critical";
export type AuditViewMode = "table" | "timeline";
