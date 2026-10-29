const MOVEMENT_KIND_LABELS: Record<string, string> = {
  PharmacyTransfer: "Pharmacy transfer",
  PharmacyStoreReturn: "Store return",
  PharmacyReceive: "Pharmacy receive",
};

export function pendingMovementKindLabel(kind: string): string {
  return MOVEMENT_KIND_LABELS[kind] ?? kind;
}

export function formatPendingMovementKindLabel(
  kind: string,
  destinationName: string | null | undefined
): string {
  const base = pendingMovementKindLabel(kind);
  const destination = destinationName?.trim();
  if (!destination) return base;
  return `${base} (${destination})`;
}

/** Label for a pending sheet row (outbound uses destination; inbound uses source). */
export function formatStoreItemPendingMovementLabel(
  kind: string,
  options: {
    isIncomingUnaccepted: boolean;
    destinationName?: string | null;
    sourceName?: string | null;
  }
): string {
  if (options.isIncomingUnaccepted) {
    return formatPendingMovementKindLabel(kind, options.sourceName);
  }
  return formatPendingMovementKindLabel(kind, options.destinationName);
}
