// helpers/resolveCartIdentity.js
import { v4 as uuidv4 } from "uuid";

const GUEST_COOKIE = "guestId";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

export function resolveCartIdentity(req, res = null) {
  console.log("resolveCartIdentity: req.user:", req.user);
  const userId = req.user?._id ?? null;

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