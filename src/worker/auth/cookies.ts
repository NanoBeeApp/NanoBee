/**
 * Session cookie helpers shared by every auth route.
 * HttpOnly + SameSite=Lax; Secure is added automatically on HTTPS.
 */

import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { CONFIG } from "../config";

function isSecureRequest(c: Context): boolean {
	return new URL(c.req.url).protocol === "https:";
}

export function setSessionCookie(
	c: Context,
	token: string,
	expiresAt: number,
): void {
	setCookie(c, CONFIG.AUTH.SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: "Lax",
		path: "/",
		secure: isSecureRequest(c),
		expires: new Date(expiresAt * 1000),
	});
}

export function clearSessionCookie(c: Context): void {
	deleteCookie(c, CONFIG.AUTH.SESSION_COOKIE, { path: "/" });
}

export function getSessionToken(c: Context): string | undefined {
	return getCookie(c, CONFIG.AUTH.SESSION_COOKIE);
}
