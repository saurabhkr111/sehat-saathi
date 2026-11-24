import { supabase } from "./supabase";

export async function checkDueReminders() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return [];

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now);

  if (error) {
    console.error("Reminder check error:", error);
    return [];
  }

  return data ?? [];
}

export async function markReminderCompleted(reminderId: string) {
  const { error } = await supabase
    .from("reminders")
    .update({ status: "completed" })
    .eq("id", reminderId);

  if (error) {
    console.error("Reminder completion error:", error);
  }
}