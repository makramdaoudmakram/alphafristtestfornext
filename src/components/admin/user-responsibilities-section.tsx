"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  assignUserResponsibilityProfile,
  deactivateUserResponsibilityAssignment,
  activateUserResponsibilityAssignment,
  getApiErrorMessage,
  getResponsibilityProfiles,
  getUserResponsibilityAssignments,
  removeUserResponsibilityAssignment,
} from "@/lib/responsibility-profile-api";
import type { ResponsibilityProfileListItem } from "@/types/responsibility-profile";
import type { UserResponsibilityAssignmentItem } from "@/types/responsibility-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function UserResponsibilitiesSection({
  userId,
  token,
}: {
  userId: string;
  token: string;
}) {
  const [assignments, setAssignments] = useState<UserResponsibilityAssignmentItem[]>([]);
  const [profileOptions, setProfileOptions] = useState<ResponsibilityProfileListItem[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const [rows, profiles] = await Promise.all([
        getUserResponsibilityAssignments(userId, token),
        getResponsibilityProfiles(token, { isActive: true, pageSize: 500 }),
      ]);
      setAssignments(rows);
      setProfileOptions(profiles);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignedProfileIds = useMemo(
    () => new Set(assignments.filter((a) => a.isActive).map((a) => a.profileId)),
    [assignments]
  );

  const availableProfiles = profileOptions.filter(
    (p) => p.isActive && !assignedProfileIds.has(p.profileId)
  );

  async function handleAssign() {
    if (!selectedProfileId || !token) return;
    setAssigning(true);
    try {
      await assignUserResponsibilityProfile(
        userId,
        Number(selectedProfileId),
        token
      );
      toast.success("Responsibility profile assigned.");
      setSelectedProfileId("");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setAssigning(false);
    }
  }

  async function handleToggle(assignment: UserResponsibilityAssignmentItem) {
    if (!token) return;
    try {
      if (assignment.isActive) {
        await deactivateUserResponsibilityAssignment(
          userId,
          assignment.assignmentId,
          token
        );
        toast.success("Assignment deactivated.");
      } else {
        await activateUserResponsibilityAssignment(
          userId,
          assignment.assignmentId,
          token
        );
        toast.success("Assignment activated.");
      }
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function handleRemove(assignment: UserResponsibilityAssignmentItem) {
    if (!token) return;
    if (!window.confirm(`Remove profile "${assignment.profileName}" from this user?`)) return;
    try {
      await removeUserResponsibilityAssignment(
        userId,
        assignment.assignmentId,
        token
      );
      toast.success("Assignment removed.");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Additional responsibilities</h3>
        <p className="text-muted-foreground text-xs">
          Global responsibility profiles (same permissions at every pharmacy in scope).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[14rem] flex-1 space-y-1">
          <Label htmlFor="assign-profile">Add profile</Label>
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger id="assign-profile">
              <SelectValue placeholder="Select profile…" />
            </SelectTrigger>
            <SelectContent>
              {availableProfiles.map((profile) => (
                <SelectItem key={profile.profileId} value={String(profile.profileId)}>
                  {profile.name} ({profile.category}) — {profile.permissionCount} perms
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!selectedProfileId || assigning}
          onClick={() => void handleAssign()}
        >
          Assign
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Profile</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead>Assignment</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          ) : assignments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No responsibility profiles assigned.
              </TableCell>
            </TableRow>
          ) : (
            assignments.map((row) => (
              <TableRow key={row.assignmentId}>
                <TableCell>
                  <div className="font-medium">{row.profileName}</div>
                  <div className="text-muted-foreground font-mono text-xs">
                    {row.profileCode}
                  </div>
                </TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.permissionCount}</TableCell>
                <TableCell>
                  <Badge variant={row.profileIsActive ? "default" : "secondary"}>
                    {row.profileIsActive ? "Active" : "Inactive profile"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={row.isActive ? "outline" : "secondary"}>
                    {row.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleToggle(row)}
                  >
                    {row.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleRemove(row)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
