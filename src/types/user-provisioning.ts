import type { UserAccountKindValue } from "@/types/user";

export type UserProvisionPharmacyAssignment = {
  parmId: number;
  isDefault: boolean;
};

export type UserProvisionJobAssignment = {
  parmId: number;
  jobTitleId: number;
};

export type UserProvisionProfileAssignment = {
  profileId: number;
};

export type UserProvisionPermissionOverride = {
  permissionId: number;
  isAllowed: boolean;
};

export type UserProvisionRequest = {
  userName: string;
  email: string;
  password: string;
  phoneNumber?: string | null;
  isActive: boolean;
  accountKind: UserAccountKindValue;
  homeParmId?: number | null;
  employInfoId?: number | null;
  displayName?: string | null;
  pharmacyAssignments: UserProvisionPharmacyAssignment[];
  jobAssignments: UserProvisionJobAssignment[];
  responsibilityProfiles: UserProvisionProfileAssignment[];
  permissionOverrides: UserProvisionPermissionOverride[];
};

export type UserProvisionResult = {
  success: boolean;
  message?: string | null;
  userId?: string | null;
  errors?: string[] | null;
  forbidden?: boolean;
};

export type UserEffectiveAccessReview = {
  user: {
    userId: string;
    userName?: string | null;
    displayName?: string | null;
    email?: string | null;
    accountKind: string;
    isActive: boolean;
    homeParmId?: number | null;
  };
  assignedPharmacies: Array<{
    parmId: number;
    parmName: string;
    isDefault: boolean;
    isActive: boolean;
  }>;
  activePharmacyId?: number | null;
  activePharmacyName?: string | null;
  selectedPharmacyInScope: boolean;
  operationalContextAuthorized: boolean;
  operationalContextMessage?: string | null;
  hasAdministrativeBypass: boolean;
  defaultHomePharmacyId?: number | null;
  jobTitleAssignmentsAtSelectedPharmacy: Array<{
    assignmentId: number;
    jobTitleId: number;
    jobTitleName: string;
    isActive: boolean;
  }>;
  assignedResponsibilityProfiles: Array<{
    assignmentId: number;
    profileId: number;
    profileCode: string;
    profileName: string;
    category: string;
    isActive: boolean;
  }>;
  jobTitlePermissionCodes: string[];
  responsibilityProfilePermissionCodes: string[];
  explicitAllowPermissionCodes: string[];
  explicitDenyPermissionCodes: string[];
  effectiveOperationalPermissionCodes: string[];
  effectiveWithSources: Array<{
    permissionCode: string;
    permissionName?: string | null;
    sources: string[];
  }>;
  scopeNote: string;
};

export type UserProvisioningWizardReferenceData = {
  pharmacies: Array<{ parmId: number; name: string }>;
  jobTitles: Array<{ jobTitleId: number; jobTitleCode: string; name: string }>;
  responsibilityProfiles: Array<{
    profileId: number;
    profileCode: string;
    name: string;
    category: string;
  }>;
  permissions: UserProvisioningWizardPermissionOption[];
  employInfoRecords: Array<{
    id: number;
    name: string | null;
    code: string | null;
    active: boolean;
  }>;
};

export type UserProvisioningWizardPermissionOption = {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  permissionDescription?: string | null;
  permissionType: string;
  moduleCode: string;
};

export type UserProvisionExcelValidateResult = {
  totalRows: number;
  validRowCount: number;
  invalidRowCount: number;
  rows: Array<{
    rowNumber: number;
    isValid: boolean;
    errors: string[];
  }>;
};
