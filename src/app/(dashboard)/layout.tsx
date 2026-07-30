import { EnterpriseShell } from "@/components/enterprise/shell";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <EnterpriseShell
      outletName={session.user.outletName}
      outletId={session.user.outletId}
      userName={session.user.name || "Staff"}
      role={session.user.role}
    >
      {children}
    </EnterpriseShell>
  );
}
