export type PharmacyJobTitleListItem = {
  jobTitleId: number;
  jobTitleCode: string;
  name: string;
  description: string | null;
  isActive: boolean;
  permissionCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type PharmacyJobTitlePermissionItem = {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  permissionType: string;
  moduleCode: string;
};

export type PharmacyJobTitleDetail = {
  jobTitleId: number;
  jobTitleCode: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  permissions: PharmacyJobTitlePermissionItem[];
};

export type CreatePharmacyJobTitleRequest = {
  jobTitleCode: string;
  name: string;
  description?: string | null;
  permissionIds: number[];
};

export type UpdatePharmacyJobTitleRequest = {
  name: string;
  description?: string | null;
  isActive?: boolean | null;
  permissionIds: number[];
};

export type PharmacyJobAssignmentItem = {
  assignmentId: number;
  userId: string;
  userEmail: string | null;
  parmId: number;
  pharmacyName: string | null;
  jobTitleId: number;
  jobTitleCode: string;
  jobTitleName: string;
  isActive: boolean;
  grantedAt: string;
  updatedAt: string | null;
  grantedBy: string | null;
};

export type CreatePharmacyJobAssignmentRequest = {
  userId: string;
  parmId: number;
  jobTitleId: number;
};
