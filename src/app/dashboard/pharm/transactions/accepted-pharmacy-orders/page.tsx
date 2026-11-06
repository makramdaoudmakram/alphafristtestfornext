import { AcceptedPharmacyOrdersPageContent } from "@/components/accepted-pharmacy-orders/AcceptedPharmacyOrdersPageContent";
import { Suspense } from "react";

export default function AcceptedPharmacyOrdersPage() {
  return (
    <Suspense fallback={null}>
      <AcceptedPharmacyOrdersPageContent />
    </Suspense>
  );
}
