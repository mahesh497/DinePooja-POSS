import type { NextRequest } from "next/server";
import { runNextAuth } from "@/lib/next-auth-route";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return runNextAuth(req, ["callback", "credentials"]);
}

export function POST(req: NextRequest) {
  return runNextAuth(req, ["callback", "credentials"]);
}
