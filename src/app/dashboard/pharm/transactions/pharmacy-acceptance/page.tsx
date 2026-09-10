import { PharmTranAcceptancePageContent } from "@/components/pharm-tran/PharmTranAcceptancePageContent";
import { Suspense } from "react";

export default function PharmTranAcceptancePage() {
  return (
    <Suspense fallback={null}>
      <PharmTranAcceptancePageContent />
    </Suspense>
  );
}
