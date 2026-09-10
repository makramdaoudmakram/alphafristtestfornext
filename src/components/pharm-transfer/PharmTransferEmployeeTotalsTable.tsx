"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { formControlFocusClass } from "@/components/ui/form-field-inline";
import { cn } from "@/lib/utils";

type PharmTransferEmployeeTotalsTableProps = {
  deliveryEmployeeCode: string;
  deliveryEmployeeName: string;
  receivingEmployeePassword: string;
  receivingEmployeeCode: string;
  receivingEmployeeName: string;
  employeeIdentified: boolean;
  totalQuantity: number;
  totalAmount: number;
  /** Kept for callers; TraTotalCost is still calculated/saved but not shown. */
  totalCost?: number;
  disabled?: boolean;
  onDeliveryCodeChange: (value: string) => void;
  onDeliveryCodeBlur: (value: string) => void;
  onReceivingPasswordChange: (value: string) => void;
  onReceivingPasswordBlur: (value: string) => void;
};

function TableCell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5 p-3", className)}>
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      {children}
    </div>
  );
}

export function PharmTransferEmployeeTotalsTable({
  deliveryEmployeeCode,
  deliveryEmployeeName,
  receivingEmployeePassword,
  receivingEmployeeCode,
  receivingEmployeeName,
  employeeIdentified,
  totalQuantity,
  totalAmount,
  totalCost: _totalCost,
  disabled = false,
  onDeliveryCodeChange,
  onDeliveryCodeBlur,
  onReceivingPasswordChange,
  onReceivingPasswordBlur,
}: PharmTransferEmployeeTotalsTableProps) {
  const showPasswordEntry = !disabled && !employeeIdentified;

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <TableCell label="Delivery Code">
          <Input
            id="delivery-code"
            disabled={disabled}
            value={deliveryEmployeeCode}
            className={formControlFocusClass}
            onChange={(event) => onDeliveryCodeChange(event.target.value)}
            onBlur={(event) => onDeliveryCodeBlur(event.currentTarget.value)}
          />
        </TableCell>
        <TableCell label="Delivery Name">
          <Input
            id="delivery-name"
            readOnly
            disabled
            value={deliveryEmployeeName}
            className="bg-muted/50"
          />
        </TableCell>
      </div>

      <div className="grid grid-cols-1 divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <TableCell label={showPasswordEntry ? "Employee Password" : "Employee Code"}>
          {showPasswordEntry ? (
            <Input
              id="employee-password"
              type="password"
              autoComplete="one-time-code"
              spellCheck={false}
              maxLength={4}
              disabled={disabled}
              value={receivingEmployeePassword}
              className={cn(formControlFocusClass, "font-mono uppercase")}
              onChange={(event) =>
                onReceivingPasswordChange(event.target.value.toUpperCase())
              }
              onBlur={(event) =>
                onReceivingPasswordBlur(event.currentTarget.value)
              }
            />
          ) : (
            <Input
              id="employee-code"
              readOnly
              disabled
              value={receivingEmployeeCode}
              className="bg-muted/50"
            />
          )}
        </TableCell>
        <TableCell label="Employee Name">
          <Input
            id="employee-name"
            readOnly
            disabled
            value={receivingEmployeeName}
            className="bg-muted/50"
          />
        </TableCell>
      </div>

      <div className="grid grid-cols-1 divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <TableCell label="Total Quantity">
          <Input
            id="total-qty"
            readOnly
            disabled
            value={String(totalQuantity)}
            className="bg-muted/50 font-medium tabular-nums"
          />
        </TableCell>
        <TableCell label="Total Amount">
          <Input
            id="total-sales"
            readOnly
            disabled
            value={totalAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            className="bg-muted/50 font-medium tabular-nums"
          />
        </TableCell>
      </div>
    </div>
  );
}
