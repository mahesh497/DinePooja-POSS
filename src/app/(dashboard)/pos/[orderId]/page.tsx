import { PosScreen } from "@/components/pos-screen";
import { loadPosScreenProps } from "@/lib/pos-page-data";

export default async function PosOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const props = await loadPosScreenProps(orderId);
  return <PosScreen {...props} />;
}
