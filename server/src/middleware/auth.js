/**
 * Lightweight single-password gate. The client logs in once with APP_PASSWORD
 * and stores it; every request sends it as a Bearer token. If APP_PASSWORD is
 * unset we treat the API as open (handy for local dev).
 */
export function requireAuth(req, res, next) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return next(); // open mode

  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token && token === expected) return next();

  return res.status(401).json({ error: "Unauthorized" });
}
