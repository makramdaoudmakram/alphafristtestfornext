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

export function ItemFormatsPageContent() {
  return (
    <PageGuard permission={PERMISSIONS.itemFormat.view}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Item Formats</h2>
            <p className="text-muted-foreground text-sm">
              Requires <Badge variant="outline">ItemFormat.View</Badge>
            </p>
          </div>
          <ActionGuard permission={PERMISSIONS.itemFormat.create}>
            <Button onClick={() => toast.success("Create item format (demo)")}>
              + New Item Format
            </Button>
          </ActionGuard>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Item format list</CardTitle>
            <CardDescription>
              Connect to your ItemFormat API when ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border p-4">
              <p className="font-medium">Tablet</p>
              <p className="text-muted-foreground text-sm">Code: TAB</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageGuard>
  );
}
