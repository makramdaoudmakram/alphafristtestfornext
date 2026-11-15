import { redirect } from "next/navigation";

export default function LegacyEmployeeCommissionRedirect() {
  redirect("/dashboard/accounts/employee-commission");
}