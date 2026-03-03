import { PaymentPageClient } from "@/components/payment-page-client";

export default function PaymentPage({
  searchParams
}: {
  searchParams: {
    reportId?: string;
  };
}) {
  return <PaymentPageClient reportId={searchParams.reportId ?? ""} />;
}
