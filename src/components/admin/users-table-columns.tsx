"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { UserListItem } from "@/types/user";

function BoolBadge({ value, trueLabel, falseLabel }: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <Badge variant={value ? "default" : "secondary"}>
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

export function useUsersListColumns(
  pageIndex: number,
  pageSize: number
): ColumnDef<UserListItem>[] {
  return useMemo(
    () => [
      {
        id: "rowNumber",
        header: "#",
        enableSorting: false,
        cell: ({ row }) => pageIndex * pageSize + row.index + 1,
      },
      {
        accessorKey: "userName",
        header: "User Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.userName || "—"}</span>
        ),
      },
      {
        accessorKey: "fullName",
        header: "Full Name",
        cell: ({ row }) => row.original.fullName || row.original.userName || "—",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email || "—",
      },
      {
        accessorKey: "phoneNumber",
        header: "Phone Number",
        cell: ({ row }) => row.original.phoneNumber || "—",
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <BoolBadge
            value={row.original.isActive}
            trueLabel="Active"
            falseLabel="Inactive"
          />
        ),
      },
      {
        accessorKey: "emailConfirmed",
        header: "Email Confirmed",
        cell: ({ row }) => (
          <BoolBadge
            value={row.original.emailConfirmed}
            trueLabel="Yes"
            falseLabel="No"
          />
        ),
      },
      {
        accessorKey: "lockoutEnabled",
        header: "Lockout Enabled",
        cell: ({ row }) => (
          <BoolBadge
            value={row.original.lockoutEnabled}
            trueLabel="Yes"
            falseLabel="No"
          />
        ),
      },
    ],
    [pageIndex, pageSize]
  );
}
