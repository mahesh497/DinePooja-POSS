import type { NextRequest } from "next/server";
import { runNextAuth } from "@/lib/next-auth-route";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return runNextAuth(req, ["csrf"]);
}

export function POST(req: NextRequest) {
  return runNextAuth(req, ["csrf"]);
}
