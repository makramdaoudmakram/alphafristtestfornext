import { StorToPharmPageContent } from "@/components/stor-to-pharm/StorToPharmPageContent";
import { Suspense } from "react";

export default function StorToPharmPage() {
  return (
    <Suspense fallback={null}>
      <StorToPharmPageContent />
    </Suspense>
  );
}
