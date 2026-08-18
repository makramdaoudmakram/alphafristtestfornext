import { VendorDetailsPageContent } from "@/components/admin/vendor-details-page-content";

export default async function VendorDetailsPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <VendorDetailsPageContent accountId={decodeURIComponent(accountId)} />;
}
