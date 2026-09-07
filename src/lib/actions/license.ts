"use server";

import { unlockWithCode, getLicenseStatus } from "@/lib/license";

export async function fetchLicenseStatus() {
  return getLicenseStatus();
}

export async function submitLicenseUnlock(code: string) {
  return unlockWithCode(code);
}
