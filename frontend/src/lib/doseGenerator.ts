import { supabase } from "./supabase";

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function generateTodayDoses() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in to generate your doses.");
  }

  const today = getLocalDate();

  // Fetch active medicines
  const { data: medicines, error: medicineError } = await supabase
    .from("medicines")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .lte("start_date", today)
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (medicineError) {
    throw new Error("Unable to fetch active medicines.");
  }

  if (!medicines || medicines.length === 0) {
    return { generated: 0 };
  }

  // Fetch existing logs for today
  const { data: existingLogs, error: logError } = await supabase
    .from("dose_logs")
    .select("medicine_id, scheduled_time")
    .eq("user_id", user.id)
    .eq("scheduled_date", today);

  if (logError) {
    throw new Error("Unable to check today's dose logs.");
  }

  const existingSet = new Set(
    (existingLogs ?? []).map(
      (log) => `${log.medicine_id}_${log.scheduled_time}`
    )
  );

  const newLogs = medicines.flatMap((medicine) => {
    const times: string[] = medicine.reminder_times ?? [];

    return times
      .filter(
        (time: string) =>
          !existingSet.has(`${medicine.id}_${time}`)
      )
      .map((time: string) => ({
        user_id: user.id,
        medicine_id: medicine.id,
        scheduled_date: today,
        scheduled_time: time,
        status: "pending",
      }));
  });

  if (newLogs.length === 0) {
    return { generated: 0 };
  }

  const { error: insertError } = await supabase
    .from("dose_logs")
    .insert(newLogs);

  if (insertError) {
    console.error("Dose generation error:", insertError);
    throw new Error("Unable to generate today's doses.");
  }

  return { generated: newLogs.length };
}