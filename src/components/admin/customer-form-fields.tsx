"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerCreateRequest, CustomerItem } from "@/types/customer";

export type CustomerFormValues = {
  custNameAr: string;
  custNameEn: string;
  custBirthDate: string;
  custGender: string;
  custJob: string;
  custMobile: string;
  custTel: string;
  custAddress: string;
  custType: string;
  custActive: boolean;
  custActiveDate: string;
  custStopDate: string;
  custMaxCredit: string;
  custDiscountPerc: string;
  custPayment: string;
  cLocalItemsDisc: string;
  cImportedItemsDisc: string;
  custNotes: string;
  pharmCode: string;
  custContractcompany: string;
  custContractcompanydiscount: string;
  accountId: string;
};

export const emptyCustomerForm: CustomerFormValues = {
  custNameAr: "",
  custNameEn: "",
  custBirthDate: "",
  custGender: "",
  custJob: "",
  custMobile: "",
  custTel: "",
  custAddress: "",
  custType: "",
  custActive: true,
  custActiveDate: "",
  custStopDate: "",
  custMaxCredit: "",
  custDiscountPerc: "",
  custPayment: "0",
  cLocalItemsDisc: "",
  cImportedItemsDisc: "",
  custNotes: "",
  pharmCode: "",
  custContractcompany: "",
  custContractcompanydiscount: "",
  accountId: "",
};

export function customerToFormValues(customer: CustomerItem): CustomerFormValues {
  return {
    custNameAr: customer.custNameAr ?? "",
    custNameEn: customer.custNameEn ?? "",
    custBirthDate: customer.custBirthDate ?? "",
    custGender: customer.custGender ?? "",
    custJob: customer.custJob ?? "",
    custMobile: customer.custMobile ?? "",
    custTel: customer.custTel ?? "",
    custAddress: customer.custAddress ?? "",
    custType: customer.custType == null ? "" : String(customer.custType),
    custActive: customer.custActive,
    custActiveDate: customer.custActiveDate ?? "",
    custStopDate: customer.custStopDate ?? "",
    custMaxCredit: customer.custMaxCredit == null ? "" : String(customer.custMaxCredit),
    custDiscountPerc: customer.custDiscountPerc == null ? "" : String(customer.custDiscountPerc),
    custPayment: String(customer.custPayment ?? 0),
    cLocalItemsDisc: customer.cLocalItemsDisc == null ? "" : String(customer.cLocalItemsDisc),
    cImportedItemsDisc:
      customer.cImportedItemsDisc == null ? "" : String(customer.cImportedItemsDisc),
    custNotes: customer.custNotes ?? "",
    pharmCode: customer.pharmCode ?? "",
    custContractcompany: customer.custContractcompany ?? "",
    custContractcompanydiscount: customer.custContractcompanydiscount ?? "",
    accountId: customer.accountId ?? "",
  };
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formValuesToRequest(values: CustomerFormValues): CustomerCreateRequest {
  return {
    custNameAr: values.custNameAr.trim(),
    custNameEn: values.custNameEn.trim(),
    custBirthDate: values.custBirthDate.trim() || null,
    custGender: values.custGender.trim() || null,
    custJob: values.custJob.trim() || null,
    custMobile: values.custMobile.trim() || null,
    custTel: values.custTel.trim() || null,
    custAddress: values.custAddress.trim() || null,
    custType: parseOptionalNumber(values.custType),
    custActive: values.custActive,
    custActiveDate: values.custActiveDate.trim() || null,
    custStopDate: values.custStopDate.trim() || null,
    custMaxCredit: parseOptionalNumber(values.custMaxCredit),
    custDiscountPerc: parseOptionalNumber(values.custDiscountPerc),
    custPayment: parseOptionalNumber(values.custPayment),
    cLocalItemsDisc: parseOptionalNumber(values.cLocalItemsDisc),
    cImportedItemsDisc: parseOptionalNumber(values.cImportedItemsDisc),
    custNotes: values.custNotes.trim() || null,
    pharmCode: values.pharmCode.trim() || null,
    custContractcompany: values.custContractcompany.trim() || null,
    custContractcompanydiscount: values.custContractcompanydiscount.trim() || null,
    accountId: values.accountId.trim() || null,
  };
}

function FormField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function CustomerFormFields({
  values,
  onChange,
  accountRequired = false,
}: {
  values: CustomerFormValues;
  onChange: (values: CustomerFormValues) => void;
  accountRequired?: boolean;
}) {
  function setField<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="customer-account"
          label="Account No"
          value={values.accountId}
          onChange={(value) => setField("accountId", value)}
          required={accountRequired}
        />
        <FormField
          id="customer-pharm-code"
          label="Pharm Code"
          value={values.pharmCode}
          onChange={(value) => setField("pharmCode", value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="customer-name-en"
          label="Customer Name"
          value={values.custNameEn}
          onChange={(value) => setField("custNameEn", value)}
        />
        <FormField
          id="customer-name-ar"
          label="Customer Name Arabic"
          value={values.custNameAr}
          onChange={(value) => setField("custNameAr", value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          id="customer-birth-date"
          label="Birth Date"
          type="date"
          value={values.custBirthDate}
          onChange={(value) => setField("custBirthDate", value)}
        />
        <FormField
          id="customer-gender"
          label="Gender"
          value={values.custGender}
          onChange={(value) => setField("custGender", value)}
        />
        <FormField
          id="customer-job"
          label="Job"
          value={values.custJob}
          onChange={(value) => setField("custJob", value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="customer-mobile"
          label="Mobile"
          value={values.custMobile}
          onChange={(value) => setField("custMobile", value)}
        />
        <FormField
          id="customer-tel"
          label="Phone"
          value={values.custTel}
          onChange={(value) => setField("custTel", value)}
        />
      </div>

      <FormField
        id="customer-address"
        label="Address"
        value={values.custAddress}
        onChange={(value) => setField("custAddress", value)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          id="customer-type"
          label="Customer Type"
          type="number"
          value={values.custType}
          onChange={(value) => setField("custType", value)}
        />
        <FormField
          id="customer-payment"
          label="Payment"
          type="number"
          value={values.custPayment}
          onChange={(value) => setField("custPayment", value)}
        />
        <div className="space-y-2">
          <Label htmlFor="customer-active">Active</Label>
          <div className="flex h-10 items-center">
            <input
              id="customer-active"
              type="checkbox"
              checked={values.custActive}
              onChange={(e) => setField("custActive", e.target.checked)}
              className="size-4 rounded border"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="customer-active-date"
          label="Active Date"
          type="date"
          value={values.custActiveDate}
          onChange={(value) => setField("custActiveDate", value)}
        />
        <FormField
          id="customer-stop-date"
          label="Stop Date"
          type="date"
          value={values.custStopDate}
          onChange={(value) => setField("custStopDate", value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          id="customer-max-credit"
          label="Max Credit"
          type="number"
          value={values.custMaxCredit}
          onChange={(value) => setField("custMaxCredit", value)}
        />
        <FormField
          id="customer-discount-perc"
          label="Discount %"
          type="number"
          value={values.custDiscountPerc}
          onChange={(value) => setField("custDiscountPerc", value)}
        />
        <FormField
          id="customer-local-disc"
          label="Local Items Disc"
          type="number"
          value={values.cLocalItemsDisc}
          onChange={(value) => setField("cLocalItemsDisc", value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="customer-imported-disc"
          label="Imported Items Disc"
          type="number"
          value={values.cImportedItemsDisc}
          onChange={(value) => setField("cImportedItemsDisc", value)}
        />
        <FormField
          id="customer-contract-company"
          label="Contract Company"
          value={values.custContractcompany}
          onChange={(value) => setField("custContractcompany", value)}
        />
      </div>

      <FormField
        id="customer-contract-discount"
        label="Contract Company Discount"
        value={values.custContractcompanydiscount}
        onChange={(value) => setField("custContractcompanydiscount", value)}
      />

      <FormField
        id="customer-notes"
        label="Notes"
        value={values.custNotes}
        onChange={(value) => setField("custNotes", value)}
      />
    </div>
  );
}
