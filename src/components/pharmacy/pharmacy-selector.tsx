"use client";

import { usePharmacyScope } from "@/components/pharmacy/pharmacy-scope-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export function PharmacySelector() {
  const {
    authorizedPharmacies,
    activePharmacyId,
    setActivePharmacy,
    loading,
    error,
  } = usePharmacyScope();
  const [switching, setSwitching] = useState(false);

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading pharmacies...
      </div>
    );
  }

  if (authorizedPharmacies.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No authorized pharmacies
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground hidden text-sm sm:inline">
        Current Pharmacy:
      </span>
      <Select
        value={activePharmacyId ?? undefined}
        disabled={switching}
        onValueChange={(value) => {
          setSwitching(true);
          void setActivePharmacy(value)
            .catch(() => undefined)
            .finally(() => setSwitching(false));
        }}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue placeholder="Select pharmacy" />
        </SelectTrigger>
        <SelectContent>
          {authorizedPharmacies.map((pharmacy) => (
            <SelectItem key={pharmacy.parmId} value={pharmacy.parmId}>
              {pharmacy.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {switching ? <Loader2 className="size-4 animate-spin" /> : null}
      {error ? (
        <span className="text-destructive text-xs">{error}</span>
      ) : null}
    </div>
  );
}
