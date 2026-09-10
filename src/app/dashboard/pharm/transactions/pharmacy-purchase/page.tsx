import { PharmPurchasePageContent } from "@/components/pharm-purchase/PharmPurchasePageContent";
import { Suspense } from "react";

export default function PharmacyPurchasePage() {
  return (
    <Suspense fallback={null}>
      <PharmPurchasePageContent />
    </Suspense>
  );
}
