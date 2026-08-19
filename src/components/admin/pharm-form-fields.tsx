"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CostCenterCombobox } from "@/components/admin/cost-center-combobox";
import { StorIdCombobox } from "@/components/admin/stor-id-combobox";
import { normalizeLedgerCode } from "@/lib/journal-binding";
import type { PharmFormValues, PharmItem } from "@/types/pharm";

type PharmFormFieldsProps = {
  values: PharmFormValues;
  onChange: (patch: Partial<PharmFormValues>) => void;
  idPrefix?: string;
  /** For edit sheet — restore combobox labels when value not in loaded page. */
  editingItem?: PharmItem | null;
};

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  dir,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  dir?: "rtl" | "ltr";
  className?: string;
}) {
  return (
    <div className={className ?? "space-y-2"}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function PharmFormFields({
  values,
  onChange,
  idPrefix = "",
  editingItem,
}: PharmFormFieldsProps) {
  const p = idPrefix;

  const handleCostCenterChange = useCallback(
    (code: string) => onChange({ costCenter: code }),
    [onChange]
  );

  const handleStorChange = useCallback(
    (storId: string) => onChange({ parmStor: storId }),
    [onChange]
  );

  const originalCostCenter = editingItem?.costCenter ?? "";
  const originalParmStor = editingItem?.parmStor ?? "";
  const costCenterMatchesOriginal =
    normalizeLedgerCode(values.costCenter) ===
    normalizeLedgerCode(originalCostCenter);
  const storMatchesOriginal =
    values.parmStor.trim() === originalParmStor.trim();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          id={`${p}parmArName`}
          label="Arabic name"
          value={values.parmArName}
          onChange={(v) => onChange({ parmArName: v })}
          dir="rtl"
        />
        <Field
          id={`${p}parmEnName`}
          label="English name"
          value={values.parmEnName}
          onChange={(v) => onChange({ parmEnName: v })}
        />
        <Field
          id={`${p}parmTel`}
          label="Telephone"
          value={values.parmTel}
          onChange={(v) => onChange({ parmTel: v })}
        />
        <div className="space-y-2">
          <Label>Cost center</Label>
          <CostCenterCombobox
            value={values.costCenter}
            onValueChange={handleCostCenterChange}
            nameOnly
            fallbackValue={originalCostCenter}
            fallbackLabel={
              costCenterMatchesOriginal ? editingItem?.costCenterName : null
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Store</Label>
          <StorIdCombobox
            value={values.parmStor}
            onValueChange={handleStorChange}
            fallbackValue={originalParmStor}
            fallbackLabel={
              storMatchesOriginal
                ? editingItem?.storName ?? editingItem?.parmStor
                : null
            }
          />
        </div>
        <Field
          id={`${p}parmAdress`}
          label="Address"
          value={values.parmAdress}
          onChange={(v) => onChange({ parmAdress: v })}
          className="space-y-2 sm:col-span-2 lg:col-span-3"
        />
        <Field
          id={`${p}parmBussReg`}
          label="Business registration"
          value={values.parmBussReg}
          onChange={(v) => onChange({ parmBussReg: v })}
        />
        <Field
          id={`${p}parmTaxNo`}
          label="Tax no"
          value={values.parmTaxNo}
          onChange={(v) => onChange({ parmTaxNo: v })}
        />
        <Field
          id={`${p}parmOrder`}
          label="Display order"
          type="number"
          value={values.parmOrder}
          onChange={(v) => onChange({ parmOrder: v })}
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Owner</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            id={`${p}parmOwnerName`}
            label="Owner name"
            value={values.parmOwnerName}
            onChange={(v) => onChange({ parmOwnerName: v })}
          />
          <Field
            id={`${p}parmOwnerMob`}
            label="Owner mobile"
            value={values.parmOwnerMob}
            onChange={(v) => onChange({ parmOwnerMob: v })}
          />
          <Field
            id={`${p}parmOwnerTel`}
            label="Owner telephone"
            value={values.parmOwnerTel}
            onChange={(v) => onChange({ parmOwnerTel: v })}
          />
          <Field
            id={`${p}parmOwnerEMail`}
            label="Owner email"
            type="email"
            value={values.parmOwnerEMail}
            onChange={(v) => onChange({ parmOwnerEMail: v })}
            className="space-y-2 sm:col-span-2"
          />
          <Field
            id={`${p}parmOwnerAdress`}
            label="Owner address"
            value={values.parmOwnerAdress}
            onChange={(v) => onChange({ parmOwnerAdress: v })}
            className="space-y-2 sm:col-span-2 lg:col-span-3"
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Manager</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            id={`${p}parmMangerName`}
            label="Manager name"
            value={values.parmMangerName}
            onChange={(v) => onChange({ parmMangerName: v })}
          />
          <Field
            id={`${p}parmMangerMob`}
            label="Manager mobile"
            value={values.parmMangerMob}
            onChange={(v) => onChange({ parmMangerMob: v })}
          />
          <Field
            id={`${p}parmMangerTel`}
            label="Manager telephone"
            value={values.parmMangerTel}
            onChange={(v) => onChange({ parmMangerTel: v })}
          />
          <Field
            id={`${p}parmMangerAdress`}
            label="Manager address"
            value={values.parmMangerAdress}
            onChange={(v) => onChange({ parmMangerAdress: v })}
            className="space-y-2 sm:col-span-2 lg:col-span-3"
          />
        </div>
      </div>
    </div>
  );
}

export function pharmItemToFormValues(item: {
  parmArName?: string;
  parmEnName?: string;
  parmTel?: string;
  parmAdress?: string;
  parmStor?: string;
  parmBussReg?: string;
  parmTaxNo?: string;
  parmOwnerName?: string;
  parmOwnerAdress?: string;
  parmOwnerMob?: string;
  parmOwnerTel?: string;
  parmOwnerEMail?: string;
  parmMangerName?: string;
  parmMangerAdress?: string;
  parmMangerTel?: string;
  parmMangerMob?: string;
  parmOrder?: number;
  costCenter?: string;
}): PharmFormValues {
  return {
    parmArName: item.parmArName ?? "",
    parmEnName: item.parmEnName ?? "",
    parmTel: item.parmTel ?? "",
    parmAdress: item.parmAdress ?? "",
    parmStor: item.parmStor ?? "",
    parmBussReg: item.parmBussReg ?? "",
    parmTaxNo: item.parmTaxNo ?? "",
    parmOwnerName: item.parmOwnerName ?? "",
    parmOwnerAdress: item.parmOwnerAdress ?? "",
    parmOwnerMob: item.parmOwnerMob ?? "",
    parmOwnerTel: item.parmOwnerTel ?? "",
    parmOwnerEMail: item.parmOwnerEMail ?? "",
    parmMangerName: item.parmMangerName ?? "",
    parmMangerAdress: item.parmMangerAdress ?? "",
    parmMangerTel: item.parmMangerTel ?? "",
    parmMangerMob: item.parmMangerMob ?? "",
    parmOrder: String(item.parmOrder ?? 0),
    costCenter: item.costCenter ?? "",
  };
}
