"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserEffectiveAccess } from "@/lib/user-provisioning-api";
import type { UserEffectiveAccessReview } from "@/types/user-provisioning";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserEffectiveAccessSection({
  userId,
  token,
}: {
  userId: string;
  token: string;
}) {
  const [parmId, setParmId] = useState<string>("");
  const [review, setReview] = useState<UserEffectiveAccessReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = parmId ? Number.parseInt(parmId, 10) : undefined;
      const data = await getUserEffectiveAccess(
        userId,
        token,
        Number.isFinite(parsed) ? parsed : undefined
      );
      setReview(data);
      if (!parmId && data.assignedPharmacies[0]) {
        setParmId(String(data.assignedPharmacies[0].parmId));
      }
    } catch (err) {
      setReview(null);
      setError(err instanceof Error ? err.message : "Failed to load effective access.");
    } finally {
      setLoading(false);
    }
  }, [userId, token, parmId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Effective access review</h3>
        <p className="text-muted-foreground text-xs">
          Operational permissions for the selected pharmacy. Pharmacy scope is separate from
          permissions.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={parmId} onValueChange={setParmId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Review pharmacy" />
          </SelectTrigger>
          <SelectContent>
            {review?.assignedPharmacies.map((p) => (
              <SelectItem key={p.parmId} value={String(p.parmId)}>
                {p.parmName}
                {p.isDefault ? " (default)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {review && !loading ? (
        <div className="space-y-3 rounded-md border p-3 text-sm">
          <p className="text-muted-foreground text-xs">{review.scopeNote}</p>
          {review.hasAdministrativeBypass ? (
            <p className="text-amber-600 text-xs">Administrative bypass is active for this user.</p>
          ) : null}
          {review.defaultHomePharmacyId != null ? (
            <p className="text-muted-foreground text-xs">
              Default (home) pharmacy id: {review.defaultHomePharmacyId}
            </p>
          ) : null}
          {!review.selectedPharmacyInScope ? (
            <p className="text-destructive text-sm">
              Selected pharmacy is outside authorized scope. Operational permissions are not
              authorized.
            </p>
          ) : null}

          <div>
            <p className="font-medium">Job titles at selected pharmacy</p>
            <ul className="text-muted-foreground text-xs">
              {review.jobTitleAssignmentsAtSelectedPharmacy.length === 0
                ? "None"
                : review.jobTitleAssignmentsAtSelectedPharmacy.map((j) => (
                    <li key={j.assignmentId}>
                      {j.jobTitleName}
                      {!j.isActive ? " (inactive)" : ""}
                    </li>
                  ))}
            </ul>
          </div>

          <div>
            <p className="font-medium">Assigned responsibility profiles</p>
            <ul className="text-muted-foreground text-xs">
              {review.assignedResponsibilityProfiles.length === 0
                ? "None"
                : review.assignedResponsibilityProfiles.map((p) => (
                    <li key={p.assignmentId}>
                      {p.profileName} ({p.category}){!p.isActive ? " — inactive" : ""}
                    </li>
                  ))}
            </ul>
          </div>

          <Section title="Job title permissions (selected pharmacy)" items={review.jobTitlePermissionCodes} />
          <Section title="Responsibility profiles (global)" items={review.responsibilityProfilePermissionCodes} />
          <Section title="Explicit allows" items={review.explicitAllowPermissionCodes} />
          <Section title="Explicit denies" items={review.explicitDenyPermissionCodes} />
          <Section title="Effective operational" items={review.effectiveOperationalPermissionCodes} bold />

          {review.effectiveWithSources.length > 0 ? (
            <div>
              <p className="mb-1 font-medium">Sources</p>
              <ul className="text-muted-foreground max-h-40 space-y-1 overflow-y-auto text-xs">
                {review.effectiveWithSources.map((row) => (
                  <li key={row.permissionCode}>
                    <span className="text-foreground font-mono">{row.permissionCode}</span>
                    {" — "}
                    {row.sources.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : loading ? (
        <p className="text-muted-foreground text-sm">Loading effective access…</p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  items,
  bold,
}: {
  title: string;
  items: string[];
  bold?: boolean;
}) {
  return (
    <div>
      <p className={bold ? "font-semibold" : "font-medium"}>{title}</p>
      <p className="text-muted-foreground text-xs">
        {items.length === 0 ? "None" : items.join(", ")}
      </p>
    </div>
  );
}
