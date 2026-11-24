"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  reminder_times: string[];
  is_active: boolean;
  start_date: string;
  end_date: string | null;
}

interface DoseLog {
  id: string;
  user_id: string;
  medicine_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "pending" | "taken" | "skipped" | "missed";
  taken_at: string | null;
  notes: string | null;
}

export default function DosesPage() {
  const { user } = useAuth();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generationMessage, setGenerationMessage] = useState("");
  const [updatingDoseId, setUpdatingDoseId] = useState<string | null>(null);

  // Today's adherence statistics
  const totalDoses = doseLogs.length;

  const takenDoses = doseLogs.filter(
    (dose) => dose.status === "taken"
  ).length;

  const skippedDoses = doseLogs.filter(
    (dose) => dose.status === "skipped"
  ).length;

  const pendingDoses = doseLogs.filter(
    (dose) => dose.status === "pending"
  ).length;

  const adherencePercentage =
    totalDoses > 0
      ? Math.round((takenDoses / totalDoses) * 100)
      : 0;

  // Get today's date in local timezone
  function getLocalDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // Fetch medicines and generate today's dose records
  useEffect(() => {
    async function fetchMedicinesAndGenerateDoses() {
      if (!user) return;

      setLoading(true);
      setGenerationMessage("");

      const today = getLocalDate();

      // Fetch active medicines belonging to the current user
      const { data: medicineData, error: medicineError } = await supabase
        .from("medicines")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (medicineError) {
        console.error("Error fetching medicines:", medicineError.message);
        setGenerationMessage("Unable to load medicines.");
        setLoading(false);
        return;
      }

      const activeMedicines: Medicine[] = medicineData || [];

      setMedicines(activeMedicines);

      // Generate today's scheduled dose records
      // Generate today's dose records only for medicines within their date range
      const eligibleMedicines = activeMedicines.filter((medicine) => {
      const startDate = medicine.start_date;
      const endDate = medicine.end_date;

      // Medicine must have started
      if (startDate && today < startDate) {
        return false;
      }
      // Medicine must not have passed its end date
      if (endDate && today > endDate) {
        return false;
      }
      return true;});
      
      const doseRecords = eligibleMedicines.flatMap((medicine) =>(medicine.reminder_times || []).map((time) => ({
        user_id: user.id,
        medicine_id: medicine.id,
        scheduled_date: today,
        scheduled_time: time,
        status: "pending",
      }))
    );

      // Insert dose records without creating duplicates
      if (doseRecords.length > 0) {
        const { error: insertError } = await supabase
          .from("dose_logs")
          .upsert(doseRecords, {
            onConflict: "medicine_id,scheduled_date,scheduled_time",
            ignoreDuplicates: true,
          });

        if (insertError) {
          console.error("Dose generation error:", insertError.message);
          setGenerationMessage("Unable to generate today's doses.");
        } else {
          setGenerationMessage("Today's doses have been scheduled.");
        }
      }

      // Fetch today's dose records
      const { data: todayDoses, error: dosesFetchError } = await supabase
        .from("dose_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true });

      if (dosesFetchError) {
        console.error(
          "Error fetching today's doses:",
          dosesFetchError.message
        );

        setGenerationMessage("Unable to load today's dose records.");
      } else {
        setDoseLogs(todayDoses || []);
      }

      setLoading(false);
    }

    fetchMedicinesAndGenerateDoses();
  }, [user]);

  // Update dose status
  async function updateDoseStatus(
    doseId: string,
    status: "taken" | "skipped"
  ) {
    if (!user) return;

    setUpdatingDoseId(doseId);
    setGenerationMessage("");

    const updatedAt = new Date().toISOString();

    const { error } = await supabase
      .from("dose_logs")
      .update({
        status,
        taken_at: status === "taken" ? updatedAt : null,
      })
      .eq("id", doseId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating dose status:", error.message);

      setGenerationMessage("Unable to update dose status.");
      setUpdatingDoseId(null);
      return;
    }

    // Update UI after successful database update
    setDoseLogs((previousLogs) =>
      previousLogs.map((dose) =>
        dose.id === doseId
          ? {
              ...dose,
              status,
              taken_at: status === "taken" ? updatedAt : null,
            }
          : dose
      )
    );

    setUpdatingDoseId(null);
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F7F1E8] px-4 py-10">
        <div className="mx-auto max-w-5xl">

          {/* Page Header */}
          <h1 className="mb-2 text-3xl font-bold text-[#2D5A3D]">
            Today&apos;s Doses
          </h1>

          <p className="mb-8 text-[#2C2C2A]">
            Keep track of your daily medication schedule.
          </p>

          {/* Messages */}
          {generationMessage && (
            <div className="mb-6 rounded-xl bg-[#A8B5A2]/30 p-4 text-sm text-[#2D5A3D]">
              {generationMessage}
            </div>
          )}

          {/* Adherence Dashboard */}
          {!loading && doseLogs.length > 0 && (
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-[#2D5A3D]">
                Today&apos;s Adherence
              </h2>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

                {/* Total */}
                <div className="rounded-xl bg-[#F7F1E8] p-4">
                  <p className="text-sm text-gray-600">
                    Total Doses
                  </p>

                  <p className="mt-1 text-2xl font-bold text-[#2C2C2A]">
                    {totalDoses}
                  </p>
                </div>

                {/* Taken */}
                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-sm text-green-700">
                    Taken
                  </p>

                  <p className="mt-1 text-2xl font-bold text-green-800">
                    {takenDoses}
                  </p>
                </div>

                {/* Skipped */}
                <div className="rounded-xl bg-gray-100 p-4">
                  <p className="text-sm text-gray-600">
                    Skipped
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-800">
                    {skippedDoses}
                  </p>
                </div>

                {/* Pending */}
                <div className="rounded-xl bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-700">
                    Pending
                  </p>

                  <p className="mt-1 text-2xl font-bold text-yellow-800">
                    {pendingDoses}
                  </p>
                </div>

              </div>

              {/* Adherence Progress */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-[#2C2C2A]">
                    Adherence Rate
                  </span>

                  <span className="font-bold text-[#2D5A3D]">
                    {adherencePercentage}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#2D5A3D] transition-all duration-500"
                    style={{
                      width: `${adherencePercentage}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <p className="text-[#2D5A3D]">
              Loading today&apos;s doses...
            </p>
          ) : doseLogs.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-medium text-[#2D5A3D]">
                No doses scheduled for today.
              </p>

              <p className="mt-2 text-gray-600">
                Add active medicines with reminder times to schedule doses.
              </p>
            </div>
          ) : (
            /* Dose List */
            <div className="space-y-4">
              {doseLogs.map((dose) => {
                const medicine = medicines.find(
                  (item) => item.id === dose.medicine_id
                );

                return (
                  <div
                    key={dose.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >

                    {/* Medicine Information */}
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <h2 className="text-xl font-semibold text-[#2D5A3D]">
                          {medicine?.name || "Unknown medicine"}
                        </h2>

                        <p className="mt-1 text-gray-600">
                          Dosage: {medicine?.dosage || "Not available"}
                        </p>

                        <p className="mt-2 font-medium text-[#2C2C2A]">
                          Scheduled: {dose.scheduled_time}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-medium ${
                          dose.status === "taken"
                            ? "bg-green-100 text-green-800"
                            : dose.status === "skipped"
                              ? "bg-gray-200 text-gray-700"
                              : dose.status === "missed"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {dose.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    {dose.status === "pending" && (
                      <div className="mt-5 flex flex-wrap gap-3">

                        {/* Mark Taken */}
                        <button
                          onClick={() =>
                            updateDoseStatus(dose.id, "taken")
                          }
                          disabled={updatingDoseId === dose.id}
                          className="rounded-lg bg-[#2D5A3D] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#244832] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingDoseId === dose.id
                            ? "Updating..."
                            : "Mark as Taken"}
                        </button>

                        {/* Mark Skipped */}
                        <button
                          onClick={() =>
                            updateDoseStatus(dose.id, "skipped")
                          }
                          disabled={updatingDoseId === dose.id}
                          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingDoseId === dose.id
                            ? "Updating..."
                            : "Mark as Skipped"}
                        </button>

                      </div>
                    )}

                    {/* Taken Timestamp */}
                    {dose.status === "taken" && dose.taken_at && (
                      <p className="mt-4 text-sm text-green-700">
                        Recorded as taken at{" "}
                        {new Date(dose.taken_at).toLocaleTimeString()}
                      </p>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </ProtectedRoute>
  );
}