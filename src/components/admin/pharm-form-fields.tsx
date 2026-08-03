"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PharmFormValues } from "@/types/pharm";

type PharmFormFieldsProps = {
  values: PharmFormValues;
  onChange: (patch: Partial<PharmFormValues>) => void;
  idPrefix?: string;
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
}: PharmFormFieldsProps) {
  const p = idPrefix;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          id={`${p}parmArName`}
          label="ParmArName"
          value={values.parmArName}
          onChange={(v) => onChange({ parmArName: v })}
          dir="rtl"
        />
        <Field
          id={`${p}parmEnName`}
          label="ParmEnName"
          value={values.parmEnName}
          onChange={(v) => onChange({ parmEnName: v })}
        />
        <Field
          id={`${p}parmTel`}
          label="ParmTel"
          value={values.parmTel}
          onChange={(v) => onChange({ parmTel: v })}
        />
        <Field
          id={`${p}parmStor`}
          label="ParmStor"
          value={values.parmStor}
          onChange={(v) => onChange({ parmStor: v })}
        />
        <Field
          id={`${p}parmAdress`}
          label="ParmAdress"
          value={values.parmAdress}
          onChange={(v) => onChange({ parmAdress: v })}
          className="space-y-2 sm:col-span-2 lg:col-span-3"
        />
        <Field
          id={`${p}parmBussReg`}
          label="ParmBussReg"
          value={values.parmBussReg}
          onChange={(v) => onChange({ parmBussReg: v })}
        />
        <Field
          id={`${p}parmTaxNo`}
          label="ParmTaxNo"
          value={values.parmTaxNo}
          onChange={(v) => onChange({ parmTaxNo: v })}
        />
        <Field
          id={`${p}parmOrder`}
          label="ParmOrder"
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
            label="ParmOwnerName"
            value={values.parmOwnerName}
            onChange={(v) => onChange({ parmOwnerName: v })}
          />
          <Field
            id={`${p}parmOwnerMob`}
            label="ParmOwnerMob"
            value={values.parmOwnerMob}
            onChange={(v) => onChange({ parmOwnerMob: v })}
          />
          <Field
            id={`${p}parmOwnerTel`}
            label="ParmOwnerTel"
            value={values.parmOwnerTel}
            onChange={(v) => onChange({ parmOwnerTel: v })}
          />
          <Field
            id={`${p}parmOwnerEMail`}
            label="ParmOwnerEMail"
            type="email"
            value={values.parmOwnerEMail}
            onChange={(v) => onChange({ parmOwnerEMail: v })}
            className="space-y-2 sm:col-span-2"
          />
          <Field
            id={`${p}parmOwnerAdress`}
            label="ParmOwnerAdress"
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
            label="ParmMangerName"
            value={values.parmMangerName}
            onChange={(v) => onChange({ parmMangerName: v })}
          />
          <Field
            id={`${p}parmMangerMob`}
            label="ParmMangerMob"
            value={values.parmMangerMob}
            onChange={(v) => onChange({ parmMangerMob: v })}
          />
          <Field
            id={`${p}parmMangerTel`}
            label="ParmMangerTel"
            value={values.parmMangerTel}
            onChange={(v) => onChange({ parmMangerTel: v })}
          />
          <Field
            id={`${p}parmMangerAdress`}
            label="ParmMangerAdress"
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
  };
}
