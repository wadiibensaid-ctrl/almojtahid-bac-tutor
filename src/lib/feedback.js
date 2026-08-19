import { supabase } from "./supabaseClient";

/**
 * Submits free-text feedback (bug/suggestion/other). Insert-only from the
 * client's perspective — see the "users submit their own feedback" RLS
 * policy in supabase/schema.sql. Review happens directly in the Supabase
 * dashboard, not through the app.
 */
export async function submitFeedback({ userId, category, message }) {
  const { error } = await supabase.from("feedback").insert({ user_id: userId, category, message: message.trim() });
  if (error) throw error;
}
