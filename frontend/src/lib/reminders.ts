import { supabase } from "./supabase";
import {
  parseReminderTime,
  cleanReminderMessage,
} from "./reminderTimeParser";

export async function createReminder(reminderText: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User is not authenticated.");
  }

  // Extract scheduled time from the user's command
  const scheduledAt = parseReminderTime(reminderText);

  if (!scheduledAt) {
    throw new Error(
      "I couldn't understand the reminder time. Try saying 'in 5 minutes' or 'at 8 PM'."
    );
  }

  // Clean the reminder message before saving
  const cleanText = cleanReminderMessage(reminderText);

  // Save reminder to Supabase
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      user_id: user.id,
      reminder_text: cleanText,
      scheduled_at: scheduledAt,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Reminder creation error:", error);
    throw new Error(error.message);
  }

  return data;
}