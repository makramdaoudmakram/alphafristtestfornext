import { Suspense } from "react";
import { PaymentVoucherPageContent } from "@/components/admin/payment-voucher-page-content";

export default function PaymentVoucherPage() {
  return (
    <Suspense fallback={null}>
      <PaymentVoucherPageContent />
    </Suspense>
  );
}
