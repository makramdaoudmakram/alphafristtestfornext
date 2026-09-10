export type EmployInfoItem = {
  id: number;
  name: string | null;
  code: string | null;
  pharm: number;
  costCenterName: string | null;
  employType: number;
  employTypeName: string | null;
  active: boolean;
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
};

export const emptyEmployInfoFormValues: EmployInfoFormValues = {
  name: "",
  code: "",
  generatedPassword: "",
  pharm: null,
  employType: "1",
  active: true,
};
