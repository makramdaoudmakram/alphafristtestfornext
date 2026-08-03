import { Suspense } from "react";
import { RegisterPageContent } from "@/components/auth/register-page-content";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
