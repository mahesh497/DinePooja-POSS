import { redirect } from "next/navigation";
import { LicenseActivate } from "@/components/license-activate";
import { getLicenseStatus } from "@/lib/license";

export default async function ActivatePage() {
  const status = await getLicenseStatus();
  if (!status.expired) {
    redirect("/dashboard");
  }

  return <LicenseActivate expiresAt={status.expiresAt} />;
}
