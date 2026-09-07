import { redirect } from "next/navigation";
import { EnterpriseShell } from "@/components/enterprise/shell";
import { requireSession } from "@/lib/session";
import { getLicenseStatus } from "@/lib/license";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const status = await getLicenseStatus();
  if (status.expired) {
    redirect("/activate");
  }

  const session = await requireSession();

  return (
    <EnterpriseShell
      outletName={session.user.outletName}
      outletId={session.user.outletId}
      userName={session.user.name || "Staff"}
      role={session.user.role}
      licenseDaysLeft={status.daysLeft}
    >
      {children}
    </EnterpriseShell>
  );
}
