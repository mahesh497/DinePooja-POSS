import { Coins } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { CurrencyCounterBoard } from "@/components/currency-counter-board";
import { requirePermission } from "@/lib/session";

export default async function CurrencyCounterPage() {
  await requirePermission("pos");

  return (
    <ModulePage title="Currency Counter" subtitle="Denomination cash count" icon={Coins}>
      <StatRow
        stats={[
          { label: "Denoms", value: "9" },
          { label: "Mode", value: "Count" },
          { label: "Post to", value: "Cash" },
          { label: "Synced", value: "Live" },
        ]}
      />
      <CurrencyCounterBoard />
    </ModulePage>
  );
}
