import { Suspense } from "react";
import { PendingVoucherPageContent } from "@/components/admin/pending-voucher-page-content";

export default function PendingVoucherPage() {
  return (
    <Suspense fallback={null}>
      <PendingVoucherPageContent />
    </Suspense>
  );
}
