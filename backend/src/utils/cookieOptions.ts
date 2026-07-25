type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "none" | "strict" | undefined;
  maxAge?: number;
};

// NOTE: @fastify/cookie uses SECONDS for maxAge, NOT milliseconds
const cookieOption = (mode: "access" | "refresh" = "refresh"): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: mode === "refresh" ? 7 * 24 * 60 * 60 : 1 * 24 * 60 * 60, // 7d / 1d in seconds
});

export default cookieOption;
