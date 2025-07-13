// Temporarily disabled middleware to debug
// import { authMiddleware } from "@clerk/nextjs";

// export default authMiddleware({
//   publicRoutes: ["/", "/sign-in", "/sign-up", "/api/(.*)"],
//   ignoredRoutes: ["/_next/(.*)", "/favicon.ico"]
// });

// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)', '/'],
// };

export default function middleware() {
  // No-op middleware for debugging
  return;
}