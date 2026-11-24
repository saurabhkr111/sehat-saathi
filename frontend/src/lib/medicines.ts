import { supabase } from "./supabase";

type Medicine = { id: string; reminder_times: string[] | null };
type DoseLogKey = { medicine_id: string; scheduled_time: string };

function getLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function getTodaysMedicines() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Please log in to view your medicines.");
  const today = getLocalDate();

  const { data, error } = await supabase.from("medicines").select("*")
    .eq("user_id", user.id).eq("is_active", true)
    .lte("start_date", today).or(`end_date.is.null,end_date.gte.${today}`)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fetch medicines error:", error);
    throw new Error("Unable to retrieve your medicines.");
  }
  return data ?? [];
}

/** Ensures today's scheduled doses exist without duplicating existing records. */
export async function generateTodaysDoseLogs() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Please log in.");
  const today = getLocalDate();
  const medicines = (await getTodaysMedicines()) as Medicine[];

  const scheduledLogs = medicines.flatMap((medicine) =>
    (medicine.reminder_times ?? []).map((time) => ({
      user_id: user.id, medicine_id: medicine.id, scheduled_date: today,
      scheduled_time: time, status: "pending" as const,
    }))
  );
  if (!scheduledLogs.length) return [];

  const { data: existingLogs, error: fetchError } = await supabase.from("dose_logs")
    .select("medicine_id,scheduled_time").eq("user_id", user.id).eq("scheduled_date", today);
  if (fetchError) throw new Error("Unable to check existing dose logs.");

  const existingKeys = new Set(((existingLogs ?? []) as DoseLogKey[])
    .map((log) => `${log.medicine_id}_${log.scheduled_time}`));
  const newLogs = scheduledLogs.filter((log) =>
    !existingKeys.has(`${log.medicine_id}_${log.scheduled_time}`)
  );
  if (!newLogs.length) return existingLogs ?? [];

  const { data, error } = await supabase.from("dose_logs").insert(newLogs).select();
  if (error) {
    console.error("Dose log creation error:", error);
    throw new Error("Unable to generate today's dose logs.");
  }
  return data ?? [];
}
