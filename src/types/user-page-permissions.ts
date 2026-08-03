export const PERMISSION_ACTION_KEYS = [
  "insert",
  "update",
  "delete",
  "select",
  "save",
  "validate",
  "sendToReview",
] as const;

export type PermissionActionKey = (typeof PERMISSION_ACTION_KEYS)[number];

export type PermissionActionFlags = Record<PermissionActionKey, boolean>;

export const PERMISSION_ACTION_LABELS: Record<PermissionActionKey, string> = {
  insert: "Insert",
  update: "Update",
  delete: "Delete",
  select: "Select",
  save: "Save",
  validate: "Validate",
  sendToReview: "Send to Review",
};

export type PagePermissionItem = {
  id: number;
  name: string;
  actions: PermissionActionFlags;
};

export type PermissionModuleGroup = {
  module: string;
  permissions: PagePermissionItem[];
};

export type PermissionModuleGroups = PermissionModuleGroup[];

export function createEmptyActions(
  overrides: Partial<PermissionActionFlags> = {}
): PermissionActionFlags {
  return {
    insert: false,
    update: false,
    delete: false,
    select: false,
    save: false,
    validate: false,
    sendToReview: false,
    ...overrides,
  };
}
