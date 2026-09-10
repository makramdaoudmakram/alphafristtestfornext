export const EMPLOY_TYPE_EMPLOY = 1;
export const EMPLOY_TYPE_DELIVERY = 2;

export const EMPLOY_TYPE_OPTIONS = [
  { value: String(EMPLOY_TYPE_EMPLOY), label: "Employ" },
  { value: String(EMPLOY_TYPE_DELIVERY), label: "Delivery" },
] as const;

export function formatEmployType(value: number): string {
  if (value === EMPLOY_TYPE_EMPLOY) return "Employ";
  if (value === EMPLOY_TYPE_DELIVERY) return "Delivery";
  return String(value);
}

export function isValidEmployType(value: number): boolean {
  return value === EMPLOY_TYPE_EMPLOY || value === EMPLOY_TYPE_DELIVERY;
}
