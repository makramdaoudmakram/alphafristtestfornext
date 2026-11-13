export type HeadOfficeEligibleStore = {
  storId: number;
  storEnName: string | null;
  storArName: string | null;
};

export type HeadOfficeStoreAssignmentItem = {
  assignmentId: number;
  storId: number;
  storEnName: string | null;
  storArName: string | null;
  isActive: boolean;
  grantedAt: string;
  grantedBy: string | null;
};

export type HeadOfficeJobAssignmentItem = {
  assignmentId: number;
  jobTitleId: number;
  jobTitleCode: string;
  jobTitleName: string;
  isActive: boolean;
  grantedAt: string;
  grantedBy: string | null;
};

export type HeadOfficeUserAssignment = {
  userId: string;
  email: string | null;
  accountKind: string;
  isHeadOfficePrincipal: boolean;
  headOfficeConfigurationValid: boolean;
  headOfficeDenyReason: string | null;
  configurationStatus: string;
  pharmacyScopeRowCount: number;
  pharmacyJobRowCount: number;
  activeScopeRowCount: number;
  jobAssignment: HeadOfficeJobAssignmentItem | null;
  storeAssignments: HeadOfficeStoreAssignmentItem[];
  jobTitlePermissionCodes: string[];
  approvedJobTitle: {
    jobTitleId: number | null;
    jobTitleCode: string;
    jobTitleName: string | null;
  };
};
