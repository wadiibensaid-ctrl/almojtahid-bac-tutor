import { supabase } from "./supabaseClient";

function randomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Creates the caller's profile row. Students get a random invite code
 * they can share with a parent; retries a few times on the rare
 * collision (unique constraint) instead of failing outright.
 */
export async function createProfile(userId, role, displayName) {
  const base = { id: userId, role, display_name: displayName || null };
  if (role === "student") {
    let lastError = null;
    for (let i = 0; i < 5; i++) {
      const payload = { ...base, invite_code: randomCode() };
      const { data, error } = await supabase.from("profiles").insert(payload).select().maybeSingle();
      if (!error) return data;
      lastError = error;
      if (error.code !== "23505") throw error; // not a unique-violation, don't retry
    }
    throw lastError;
  }
  const { data, error } = await supabase.from("profiles").insert(base).select().maybeSingle();
  if (error) throw error;
  return data;
}

/** Parent-side: link a child using the code the student shared with them. */
export async function linkChildByCode(code) {
  const { error } = await supabase.rpc("link_student_by_code", { p_code: code.trim().toUpperCase() });
  if (error) throw error;
}

/** Parent-side: list linked children (active links only). */
export async function getLinkedChildren() {
  const { data, error } = await supabase
    .from("parent_links")
    .select("student_id, profiles!parent_links_student_id_fkey(display_name)")
    .eq("status", "active");
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.student_id, name: r.profiles?.display_name || null }));
}

/** Student-side: list parents who currently have access. */
export async function getLinkedParents() {
  const { data, error } = await supabase
    .from("parent_links")
    .select("parent_id, profiles!parent_links_parent_id_fkey(display_name)")
    .eq("status", "active");
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.parent_id, name: r.profiles?.display_name || null }));
}

/** Student-side: revoke a parent's access. */
export async function revokeParent(parentId) {
  const { error } = await supabase.from("parent_links").delete().eq("parent_id", parentId);
  if (error) throw error;
}
