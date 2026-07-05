type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "none" | "strict" | undefined;
  maxAge?: number;
};

const cookieOption = (mode: "access" | "refresh" = "refresh"): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: mode === "refresh" ? 7 * 24 * 60 * 60 * 1000 : 1 * 24 * 60 * 60 * 1000,
});

export default cookieOption;
