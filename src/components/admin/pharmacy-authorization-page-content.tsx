"use client";

import { useState } from "react";
import { PageGuard } from "@/components/permissions/page-guard";
import { PharmacyJobAssignmentsTab } from "@/components/admin/pharmacy-job-assignments-tab";
import { PharmacyJobTitlePermissionsTab } from "@/components/admin/pharmacy-job-title-permissions-tab";
import { PharmacyJobTitlesTab } from "@/components/admin/pharmacy-job-titles-tab";
import { PERMISSIONS } from "@/lib/route-permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PharmacyAuthorizationPageContent() {
  const [tab, setTab] = useState("job-titles");

  return (
    <PageGuard permission={PERMISSIONS.permissions.manage}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pharmacy Authorization</h2>
          <p className="text-muted-foreground text-sm" dir="rtl">
            صلاحيات الصيدليات — إدارة المسميات الوظيفية وصلاحياتها وتعيين الموظفين للصيدليات.
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Requires <code className="text-xs">Permissions.Manage</code> (same as the API).
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="job-titles">Job Titles</TabsTrigger>
            <TabsTrigger value="permissions">Job Title Permissions</TabsTrigger>
            <TabsTrigger value="assignments">Employee Assignments</TabsTrigger>
          </TabsList>
          <TabsContent value="job-titles" className="mt-4">
            <PharmacyJobTitlesTab />
          </TabsContent>
          <TabsContent value="permissions" className="mt-4">
            <PharmacyJobTitlePermissionsTab />
          </TabsContent>
          <TabsContent value="assignments" className="mt-4">
            <PharmacyJobAssignmentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageGuard>
  );
}
