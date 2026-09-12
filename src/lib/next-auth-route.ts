import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export async function runNextAuth(req: NextRequest, segments: string[]) {
  try {
    return await handler(req, { params: Promise.resolve({ nextauth: segments }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "NextAuth failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

function segmentsFromRequest(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("nextauth");
  if (query) return query.split("/").filter(Boolean);
  const path = req.nextUrl.pathname.replace(/^\/api\/(?:nextauth|auth)\/?/, "");
  return path.split("/").filter(Boolean);
}

export function nextAuthQueryHandlers() {
  return {
    GET: (req: NextRequest) => runNextAuth(req, segmentsFromRequest(req)),
    POST: (req: NextRequest) => runNextAuth(req, segmentsFromRequest(req)),
  };
}
