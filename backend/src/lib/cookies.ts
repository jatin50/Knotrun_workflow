import { Response } from "express";

const isProd = process.env.NODE_ENV === "production";

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// On cloud platforms like Render where frontend & backend may live on different
// subdomains (*.onrender.com), browsers treat them as cross-site (due to Public Suffix List).
// Cross-site cookies MUST use sameSite: "none" and secure: true to be transmitted with credentials.
const sameSitePolicy: "none" | "lax" | "strict" =
  (process.env.COOKIE_SAME_SITE as "none" | "lax" | "strict") || (isProd ? "none" : "lax");

const isSecure = isProd || sameSitePolicy === "none" || process.env.COOKIE_SECURE === "true";

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: sameSitePolicy,
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: sameSitePolicy,
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: "/",
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken", {
    path: "/",
    secure: isSecure,
    sameSite: sameSitePolicy,
  });
  res.clearCookie("refreshToken", {
    path: "/",
    secure: isSecure,
    sameSite: sameSitePolicy,
  });
}
