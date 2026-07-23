"use client";

import { toast } from "sonner";
import { ActionGuard, PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/route-permissions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CustomersPageContent() {
  return (
    <PageGuard permission={PERMISSIONS.customer.view}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Customers</h2>
            <p className="text-muted-foreground text-sm">
              Page access requires <Badge variant="outline">Customer.View</Badge>
            </p>
          </div>
          <ActionGuard permission={PERMISSIONS.customer.create}>
            <Button onClick={() => toast.success("Create customer (demo)")}>
              + New Customer
            </Button>
          </ActionGuard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer list</CardTitle>
            <CardDescription>
              Buttons below are shown only if you have the matching permission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium">Sample Customer #1</p>
              <p className="text-muted-foreground text-sm">Makram Trading Co.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionGuard permission={PERMISSIONS.customer.edit}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info("Edit (demo)")}
                  >
                    Edit
                  </Button>
                </ActionGuard>
                <ActionGuard permission={PERMISSIONS.customer.delete}>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => toast.error("Delete (demo)")}
                  >
                    Delete
                  </Button>
                </ActionGuard>
                <ActionGuard permission={PERMISSIONS.customer.export}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toast.success("Export (demo)")}
                  >
                    Export
                  </Button>
                </ActionGuard>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <ActionGuard permission={PERMISSIONS.customer.saveButton}>
                <Button onClick={() => toast.success("Save (demo)")}>
                  Save
                </Button>
              </ActionGuard>
              <ActionGuard permission={PERMISSIONS.customer.deleteButton}>
                <Button
                  variant="destructive"
                  onClick={() => toast.error("Delete selected (demo)")}
                >
                  Delete selected
                </Button>
              </ActionGuard>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
