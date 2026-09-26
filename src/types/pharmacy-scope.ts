export type PharmacyScopeItem = {
  parmId: string;
  name: string;
  isDefault: boolean;
};

export type UserPharmaciesResponse = {
  activePharmacyId: string | null;
  pharmacies: PharmacyScopeItem[];
};

export type ActivePharmacyResponse = {
  parmId: string | null;
  name: string | null;
  storageId: string | null;
  storageName: string | null;
};

export type ScopeTestPharmacy = {
  parmId: string;
  name: string;
};

export type ScopeTestResponse = {
  authenticated: boolean;
  userId: string;
  userName: string;
  roles: string[];
  salesViewPermission: boolean;
  authorizedPharmacies: ScopeTestPharmacy[];
  activePharmacy: ScopeTestPharmacy | null;
  activePharmacyAuthorized: boolean;
  scopeValid: boolean;
};

export type ValidatePharmacyResponse = {
  allowed: boolean;
  message?: string | null;
};

export type UserPharmacyAssignment = {
  userPharmacyId: number;
  parmId: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  grantedAt: string;
  grantedBy?: string | null;
};
