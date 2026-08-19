import { supabase } from "./supabaseClient";

/**
 * Thin wrapper around the kv_store table. `owner` is whichever user's
 * data you're reading/writing — normally the current user's id, but a
 * parent can also pass a linked child's id when reading progress: keys.
 * Row-level security (see supabase/schema.sql) is what actually enforces
 * who's allowed to read what — this file has no special privilege.
 */

export async function kvGet(key, owner) {
  const { data, error } = await supabase
    .from("kv_store")
    .select("value")
    .eq("owner", owner)
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data ? { key, value: data.value, owner } : null;
}

export async function kvSet(key, value, owner) {
  const { error } = await supabase
    .from("kv_store")
    .upsert(
      { owner, key, value, updated_at: new Date().toISOString() },
      { onConflict: "owner,key" }
    );
  if (error) throw error;
  return { key, value, owner };
}

export async function kvList(prefix, owner) {
  const { data, error } = await supabase
    .from("kv_store")
    .select("key")
    .eq("owner", owner)
    .like("key", `${prefix}%`);
  if (error) throw error;
  return { keys: (data || []).map((r) => r.key) };
}
