import { Suspense } from "react";
import { CollectionVoucherPageContent } from "@/components/admin/collection-voucher-page-content";

export default function CollectionVoucherPage() {
  return (
    <Suspense fallback={null}>
      <CollectionVoucherPageContent />
    </Suspense>
  );
}
