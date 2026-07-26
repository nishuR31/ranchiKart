type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "none" | "strict" | undefined;
  maxAge?: number;
  path?: string;
};

// NOTE: @fastify/cookie uses SECONDS for maxAge, NOT milliseconds
const cookieOption = (mode: "access" | "refresh" = "refresh"): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: mode === "refresh" ? 7 * 24 * 60 * 60 : 1 * 24 * 60 * 60, // 7d / 1d in seconds
  path: "/",
});

export default cookieOption;
