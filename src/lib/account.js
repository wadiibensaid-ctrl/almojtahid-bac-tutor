/**
 * Self-service account deletion — calls /api/account-delete, which uses the
 * service role to delete the caller's own auth.users row. Every owned row
 * (profile, classes, assignments, submissions, parent links...) cascades
 * from there; see the comment in api/account-delete.js.
 */
export async function deleteMyAccount(token) {
  const res = await fetch("/api/account-delete", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Account deletion failed (${res.status}): ${body}`);
  }
  return res.json();
}
