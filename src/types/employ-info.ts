export type EmployInfoLinkedLoginAccount = {
  userId: string;
  email: string | null;
  userName: string | null;
};

export type EmployInfoLoginAccountOption = {
  userId: string;
  email: string | null;
  userName: string | null;
};

export type EmployInfoItem = {
  id: number;
  name: string | null;
  code: string | null;
  pharm: number;
  costCenterName: string | null;
  employType: number;
  employTypeName: string | null;
  active: boolean;
  identityUserId?: string | null;
  linkedLoginAccount?: EmployInfoLinkedLoginAccount | null;
  /** Present when loaded by id for edit; never in list/grid. */
  password?: string | null;
};

export type CreateEmployInfoRequest = {
  name: string;
  code: string;
  pharm: number;
  employType: number;
  active: boolean;
  previewPassword?: string | null;
  identityUserId?: string | null;
};

export type UpdateEmployInfoRequest = Omit<CreateEmployInfoRequest, "previewPassword">;

export type EmployInfoCreateResult = {
  employee: EmployInfoItem;
  generatedPassword: string;
};

export type EmployInfoFormValues = {
  name: string;
  code: string;
  generatedPassword: string;
  pharm: number | null;
  employType: string;
  active: boolean;
  identityUserId: string;
};

export const emptyEmployInfoFormValues: EmployInfoFormValues = {
  name: "",
  code: "",
  generatedPassword: "",
  pharm: null,
  employType: "1",
  active: true,
  identityUserId: "",
};
