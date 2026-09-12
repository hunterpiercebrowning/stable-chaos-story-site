import { clearCookie, isSecure } from '../../_lib/cookies';
import { ADMIN_COOKIE, type Fn } from '../../_lib/env';
import { json } from '../../_lib/http';

/** `POST /api/admin/logout` → `{ ok: true }`, clears `sc_admin`. */
export const onRequestPost: Fn = async ({ request }) => {
  const res = json({ ok: true });
  res.headers.append('set-cookie', clearCookie(ADMIN_COOKIE, isSecure(request)));
  return res;
};
