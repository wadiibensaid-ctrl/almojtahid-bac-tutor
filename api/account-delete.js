import { createClient } from "@supabase/supabase-js";

// Server-side only — uses the SERVICE ROLE key, never exposed to the browser.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Self-service account deletion (Loi 09-08 right to erasure). Deletes the
// auth.users row for the caller's own account only — every other table
// (profiles, classes, assignments, submissions, parent_links, live_sessions,
// usage_daily...) references auth.users/profiles with `on delete cascade`,
// so this one call removes all of it. past_papers.uploaded_by is the one
// `on delete set null` in the schema: papers a deleted teacher uploaded stay
// in the shared library, just unattributed.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  return res.status(200).json({ deleted: true });
}
