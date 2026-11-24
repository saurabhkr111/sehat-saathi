import { supabase } from "./supabase";

interface PendingDose {
  id: string;
  user_id: string;
  medicine_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "pending" | "taken" | "skipped" | "missed";
  taken_at: string | null;
  notes: string | null;
  medicines: { name: string; dosage?: string | null } | null;
}

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getPendingTodayDoses(): Promise<PendingDose[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in to manage your doses.");
  }

  const today = getLocalDate();

  const { data, error } = await supabase
    .from("dose_logs")
    .select("*, medicines(name, dosage)")
    .eq("user_id", user.id)
    .eq("scheduled_date", today)
    .eq("status", "pending");

  if (error) {
    console.error("Fetch pending doses error:", error);
    throw new Error("Unable to retrieve today's pending doses.");
  }

  return (data ?? []) as PendingDose[];
}

function normalizeMedicineName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function findPendingDoseByMedicineName(medicineName: string) {
  const pendingDoses = await getPendingTodayDoses();
  const searchName = normalizeMedicineName(medicineName);

  if (!searchName) {
    throw new Error("Please specify a medicine name.");
  }

  const matches = pendingDoses.filter((dose) => {
    const name = normalizeMedicineName(dose.medicines?.name ?? "");
    return name === searchName || name.includes(searchName) || searchName.includes(name);
  });

  if (matches.length === 0) return null;

  if (matches.length > 1) {
    throw new Error(
      "Multiple matching doses were found. Please specify the medicine more clearly."
    );
  }

  return matches[0];
}

export async function markDoseAsTaken(doseLogId: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in to manage your doses.");
  }

  const { data, error } = await supabase
    .from("dose_logs")
    .update({
      status: "taken",
      taken_at: new Date().toISOString(),
    })
    .eq("id", doseLogId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) {
    console.error("Mark dose as taken error:", error);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "This dose is no longer pending. It may already have been recorded."
    );
  }

  return data;
}
