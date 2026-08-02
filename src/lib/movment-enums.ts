import type { ComboboxOption } from "@/components/ui/searchable-combobox";

/** Mirrors Alfa.Models.ActivityType */
export const ActivityType = {
  Act1: 11001,
  Act2: 11002,
  Act3: 11003,
  Act4: 11004,
  Act5: 11005,
  Act6: 11006,
  Act7: 11007,
  Act8: 11008,
  Act9: 11009,
  Act10: 11010,
  Act11: 11011,
} as const;

/** Mirrors Alfa.Models.MovmentEffect */
export const MovmentEffect = {
  Increse: 1,
  Decrese: 2,
  Inventory: 3,
} as const;

/** Mirrors Alfa.Models.BranchType */
export const BranchType = {
  Br1: 1,
  Br2: 2,
  Br3: 3,
  Br4: 4,
  Br5: 5,
  Br6: 6,
  Br7: 7,
  Br8: 8,
  Br9: 9,
  Br10: 10,
} as const;

export function getActivityTypeOptions(): ComboboxOption[] {
  return Object.entries(ActivityType).map(([name, value]) => ({
    value: String(value),
    label: `${name} (${value})`,
  }));
}

export function getBranchTypeOptions(): ComboboxOption[] {
  return Object.entries(BranchType).map(([name, value]) => ({
    value: String(value),
    label: `${name} (${value})`,
  }));
}

/** Branch options for grids/forms — label is Br1…Br10, value is 1…10. */
export function getBranchTypeSelectOptions(): ComboboxOption[] {
  return Object.entries(BranchType).map(([name, value]) => ({
    value: String(value),
    label: name,
  }));
}

export function getMovmentEffectOptions(): ComboboxOption[] {
  return Object.entries(MovmentEffect).map(([name, value]) => ({
    value: String(value),
    label: `${name} (${value})`,
  }));
}

export function formatActivityTypeValue(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const option = getActivityTypeOptions().find((row) => row.value === value.trim());
  return option?.label ?? value;
}

export function formatBranchTypeValue(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const option = getBranchTypeOptions().find((row) => row.value === value.trim());
  return option?.label ?? value;
}

export function formatMovmentEffectValue(
  value: string | number | null | undefined
): string {
  if (value == null || value === "") return "—";
  const normalized = String(value).trim();
  const option = getMovmentEffectOptions().find((row) => row.value === normalized);
  return option?.label ?? normalized;
}
