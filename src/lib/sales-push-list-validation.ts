import type {
  SalesPushListFormValues,
} from "@/types/sales-push-list";

export function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return "";
}

export function duplicateKey(values: {
  itemCode: string;
  batchNo: string;
  startdate: string;
  endDate: string;
}): string {
  return `${values.itemCode.trim().toLowerCase()}|${values.batchNo.trim().toLowerCase()}|${values.startdate}|${values.endDate}`;
}

export function validateFormValues(values: SalesPushListFormValues): string[] {
  const errors: string[] = [];

  if (!values.itemCode.trim()) {
    errors.push("Item is required");
  }

  if (!values.batchNo.trim()) {
    errors.push("BatchNo is required");
  }

  if (!Number.isFinite(values.percent)) {
    errors.push("Invalid Discount %");
  }

  if (!Number.isFinite(values.comection)) {
    errors.push("Invalid Discount Value");
  }

  if (!values.startdate) {
    errors.push("Start Date is required");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.startdate)) {
    errors.push("Invalid Start Date");
  }

  if (!values.endDate) {
    errors.push("End Date is required");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.endDate)) {
    errors.push("Invalid End Date");
  }

  if (
    values.startdate &&
    values.endDate &&
    values.endDate < values.startdate
  ) {
    errors.push("End Date cannot be before Start Date");
  }

  return errors;
}

export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function emptyFormValues(): SalesPushListFormValues {
  const today = todayIsoDate();
  return {
    itemCode: "",
    arabicName: "",
    englishName: "",
    searchText: "",
    batchNo: "",
    percent: 0,
    comection: 0,
    startdate: today,
    endDate: today,
    active: true,
  };
}

export function displaySearchText(values: {
  itemCode: string;
  arabicName: string;
  englishName: string;
}): string {
  return (
    values.englishName.trim() ||
    values.arabicName.trim() ||
    values.itemCode.trim()
  );
}
