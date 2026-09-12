import { PosScreen } from "@/components/pos-screen";
import { loadPosScreenProps } from "@/lib/pos-page-data";

export default async function PosIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const props = await loadPosScreenProps(orderId);
  return <PosScreen {...props} />;
}
