import "server-only";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** A one-time temporary password shown to the admin/staff creating the account; the new
 * user must change it on first login (see User.mustChangePassword). */
export function generateTempPassword(length = 12) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}
