import { PharmStoreReturnPageContent } from "@/components/pharm-store-return/PharmStoreReturnPageContent";
import { Suspense } from "react";

export default function PharmToStorePage() {
  return (
    <Suspense fallback={null}>
      <PharmStoreReturnPageContent />
    </Suspense>
  );
}
