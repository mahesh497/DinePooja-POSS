import { nextAuthQueryHandlers } from "@/lib/next-auth-route";

export const dynamic = "force-dynamic";

export const { GET, POST } = nextAuthQueryHandlers();
