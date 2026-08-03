import { redirect } from "next/navigation";

/** Legacy route — user creation uses the shared Register page. */
export default function AdminUsersCreatePage() {
  redirect("/register?from=users");
}
