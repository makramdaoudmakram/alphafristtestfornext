import { CustomerDetailsPageContent } from "@/components/admin/customer-details-page-content";

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <CustomerDetailsPageContent accountId={decodeURIComponent(accountId)} />;
}
