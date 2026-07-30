import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

const routePerms: Record<string, Role[]> = {
  "/menu": ["OWNER", "MANAGER"],
  "/menu-availability": ["OWNER", "MANAGER"],
  "/staff": ["OWNER", "MANAGER"],
  "/settings": ["OWNER", "MANAGER"],
  "/store": ["OWNER", "MANAGER"],
  "/tax": ["OWNER", "MANAGER"],
  "/inventory": ["OWNER", "MANAGER"],
  "/cash": ["OWNER", "MANAGER", "CASHIER"],
  "/expenses": ["OWNER", "MANAGER"],
  "/reports": ["OWNER", "MANAGER", "CASHIER"],
  "/service-renewal": ["OWNER", "MANAGER"],
  "/led-display": ["OWNER", "MANAGER"],
  "/dual-screen": ["OWNER", "MANAGER"],
  "/alerts": ["OWNER", "MANAGER", "CASHIER"],
  "/sync": ["OWNER", "MANAGER"],
};

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as Role | undefined;
    const path = req.nextUrl.pathname;
    for (const [prefix, roles] of Object.entries(routePerms)) {
      if (path.startsWith(prefix) && role && !roles.includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith("/login")) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tables/:path*",
    "/orders/:path*",
    "/pos/:path*",
    "/kot/:path*",
    "/menu/:path*",
    "/menu-availability/:path*",
    "/staff/:path*",
    "/settings/:path*",
    "/reports/:path*",
    "/bill/:path*",
    "/online-orders/:path*",
    "/due-payments/:path*",
    "/print-center/:path*",
    "/order-status/:path*",
    "/delivery/:path*",
    "/cash/:path*",
    "/expenses/:path*",
    "/currency-counter/:path*",
    "/tax/:path*",
    "/customers/:path*",
    "/feedback/:path*",
    "/led-display/:path*",
    "/inventory/:path*",
    "/dual-screen/:path*",
    "/sync/:path*",
    "/alerts/:path*",
    "/service-renewal/:path*",
    "/help/:path*",
    "/reservations/:path*",
    "/coupons/:path*",
    "/hold-orders/:path*",
    "/store/:path*",
  ],
};
