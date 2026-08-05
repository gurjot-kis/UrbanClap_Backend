// helpers/resolveCartIdentity.js
import { v4 as uuidv4 } from "uuid";

const GUEST_COOKIE = "guestId";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

/**
 * Returns { user_id, guestId, isGuest, guestCreated }
 *
 * Priority:
 *   1. If req.user exists (authMiddleware ran) → use user_id
 *   2. Otherwise read guestId cookie; if missing → create one and set cookie
 *
 * The caller is responsible for attaching `res` only when a new guest token
 * may need to be written (i.e. public/guest routes).
 */
export function resolveCartIdentity(req, res = null) {
  const userId = req.user?.user_id ?? null;

  if (userId) {
    return { user_id: userId, guestId: null, isGuest: false, guestCreated: false };
  }

  let guestId = req.cookies?.[GUEST_COOKIE] ?? null;
  let guestCreated = false;

  if (!guestId) {
    guestId = uuidv4();
    guestCreated = true;

    if (res) {
      res.cookie(GUEST_COOKIE, guestId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        // secure: true   ← enable in production
      });
    }
  }

  return { user_id: null, guestId, isGuest: true, guestCreated };
}