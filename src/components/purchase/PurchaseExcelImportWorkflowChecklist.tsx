"use client";

const WORKFLOW_STEPS = [
  {
    phase: "1–2",
    title: "Template",
    detail: "Purchase page → Create Excel Template → fill rows from row 4",
  },
  {
    phase: "3",
    title: "Preview",
    detail: "Import Excel page → Load file → Read Excel → preview grid",
  },
  {
    phase: "4",
    title: "Names & unit",
    detail: "Arabic/English names from ItemCatalog; empty Unit → Itm_Unit1",
  },
  {
    phase: "5",
    title: "Prices",
    detail: "Empty purchase/sales prices from catalog + unit conversion (PriceQtyNet)",
  },
  {
    phase: "6–7",
    title: "Validation",
    detail: "Invalid rows turn red; all errors listed; Import blocked until fixed",
  },
  {
    phase: "8–9",
    title: "Import",
    detail: "Movement + Invoice ID + Date → Import / Save → one transaction (header + lines + stock)",
  },
  {
    phase: "10",
    title: "Verify",
    detail: "Return to Purchase page with imported document open; confirm lines and stock",
  },
] as const;

const TEST_SCENARIOS = [
  "Valid file — all rows import; redirect opens the saved purchase",
  "Quantity = ABC — red row, Import / Save disabled, nothing saved",
  "Unknown item code — red row, nothing saved",
  "Empty Unit — defaults to Itm_Unit1 after Read Excel",
  "Empty purchase/sales price — filled from ItemCatalog for the unit",
  "Multiple errors — every error shown in banner and Errors column",
  "Server failure during stock — rollback message; no partial purchase in DB",
] as const;

export function PurchaseExcelImportWorkflowChecklist() {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
      <div>
        <p className="font-medium">End-to-end workflow</p>
        <ol className="text-muted-foreground mt-2 list-decimal space-y-1 ps-5">
          {WORKFLOW_STEPS.map((step) => (
            <li key={step.phase}>
              <span className="text-foreground font-medium">
                Phase {step.phase} — {step.title}:
              </span>{" "}
              {step.detail}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className="font-medium">Suggested test scenarios</p>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 ps-5">
          {TEST_SCENARIOS.map((scenario) => (
            <li key={scenario}>{scenario}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
