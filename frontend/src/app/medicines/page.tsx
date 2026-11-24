
"use client";


import ProtectedRoute from "../../components/ProtectedRoute";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Medicine = {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  reminder_times: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type MedicineForm = {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  start_date: string;
  end_date: string;
  reminder_times: string[];
};

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyForm(): MedicineForm {
  return {
    name: "",
    dosage: "",
    frequency: "Once daily",
    instructions: "",
    start_date: getLocalDate(),
    end_date: "",
    reminder_times: [""],
  };
}

export default function MedicinesPage() {
  const router = useRouter();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MedicineForm>(createEmptyForm());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);

  const loadMedicines = useCallback(async (id: string) => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("medicines")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setMedicines([]);
    } else {
      setMedicines((data ?? []) as Medicine[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    async function initialize() {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user) {
        router.replace("/login");
        return;
      }

      setUserId(data.user.id);
      await loadMedicines(data.user.id);
    }

    initialize();
  }, [router, loadMedicines]);

  function updateField<K extends keyof MedicineForm>(
    field: K,
    value: MedicineForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
    setMessage("");
    setError("");
  }

  function openEditForm(medicine: Medicine) {
    setEditingId(medicine.id);

    setForm({
      name: medicine.name,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      instructions: medicine.instructions ?? "",
      start_date: medicine.start_date,
      end_date: medicine.end_date ?? "",
      reminder_times:
        medicine.reminder_times?.length
          ? medicine.reminder_times.map((time) => time.slice(0, 5))
          : [""],
    });

    setShowForm(true);
    setMessage("");
    setError("");
  }

  function addReminderTime() {
    setForm((previous) => ({
      ...previous,
      reminder_times: [...previous.reminder_times, ""],
    }));
  }

  function updateReminderTime(index: number, value: string) {
    setForm((previous) => ({
      ...previous,
      reminder_times: previous.reminder_times.map((time, i) =>
        i === index ? value : time
      ),
    }));
  }

  function removeReminderTime(index: number) {
    setForm((previous) => ({
      ...previous,
      reminder_times:
        previous.reminder_times.length > 1
          ? previous.reminder_times.filter((_, i) => i !== index)
          : [""],
    }));
  }

  async function saveMedicine(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId) return;

    setSaving(true);
    setMessage("");
    setError("");

    if (
      form.end_date &&
      form.end_date < form.start_date
    ) {
      setError("End date cannot be before the start date.");
      setSaving(false);
      return;
    }

    const enteredTimes = form.reminder_times
      .map((time) => time.trim())
      .filter(Boolean);

    if (form.frequency !== "As needed" && enteredTimes.length === 0) {
      setError("Add at least one reminder time for this medicine.");
      setSaving(false);
      return;
    }

    if (new Set(enteredTimes).size !== enteredTimes.length) {
      setError("Reminder times must be unique.");
      setSaving(false);
      return;
    }

    const reminderTimes = enteredTimes.map((time) => `${time}:00`);

    const payload = {
      user_id: userId,
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      frequency: form.frequency,
      instructions: form.instructions.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      reminder_times: reminderTimes,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from("medicines")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId);

        if (updateError) throw updateError;

        setMessage("Medicine updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("medicines")
          .insert({
            ...payload,
            is_active: true,
          });

        if (insertError) throw insertError;

        setMessage("Medicine added successfully.");
      }

      await loadMedicines(userId);
      setForm(createEmptyForm());
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save medicine."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleMedicine(medicine: Medicine) {
    if (!userId || actionInProgress) return;

    setActionInProgress(true);
    setError("");
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("medicines")
        .update({
          is_active: !medicine.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", medicine.id)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setMessage(`Medicine ${medicine.is_active ? "deactivated" : "activated"} successfully.`);
      await loadMedicines(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update medicine status.");
    } finally {
      setActionInProgress(false);
    }
  }

  async function deleteMedicine(medicine: Medicine) {
    if (!userId || actionInProgress) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${medicine.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setActionInProgress(true);
    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("medicines")
        .delete()
        .eq("id", medicine.id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      setMessage("Medicine deleted successfully.");
      await loadMedicines(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete medicine.");
    } finally {
      setActionInProgress(false);
    }
  }

  const activeCount = medicines.filter(
    (medicine) => medicine.is_active
  ).length;

  const inactiveCount = medicines.length - activeCount;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F4F8F5]">
        <p className="text-[#176B5B] font-semibold">
          Loading your medicines...
        </p>
      </main>
    );
  }

  return (
  <ProtectedRoute>
    <main className="min-h-screen bg-[#F4F8F5] px-4 py-8">
      <div className="mx-auto max-w-6xl">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#176B5B]">
              My Medicines
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Manage your medicines and dosage information.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-[#176B5B] px-5 py-2 text-sm font-semibold text-[#176B5B] hover:bg-[#E4F2ED]"
          >
            Back to Dashboard
          </Link>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Medicines
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-800">
              {medicines.length}
            </p>
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Active Medicines
            </p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {activeCount}
            </p>
          </div>

          <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Inactive Medicines
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-600">
              {inactiveCount}
            </p>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-gray-800">
            Your Medicine List
          </h2>

          <button
            onClick={() => {
              setForm(createEmptyForm());
              setEditingId(null);
              setShowForm(!showForm);
              setMessage("");
              setError("");
            }}
            className="rounded-lg bg-[#176B5B] px-5 py-3 font-semibold text-white hover:bg-[#125548]"
          >
            {showForm ? "Close Form" : "+ Add Medicine"}
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <section className="mb-8 rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-[#176B5B]">
              {editingId ? "Edit Medicine" : "Add New Medicine"}
            </h2>

            <form onSubmit={saveMedicine} className="space-y-5">

              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Medicine Name *
                  </label>

                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                    placeholder="e.g. Paracetamol"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Dosage *
                  </label>

                  <input
                    required
                    value={form.dosage}
                    onChange={(e) =>
                      updateField("dosage", e.target.value)
                    }
                    placeholder="e.g. 500 mg"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Frequency *
                  </label>

                  <select
                    required
                    value={form.frequency}
                    onChange={(e) =>
                      updateField("frequency", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800"
                  >
                    <option>Once daily</option>
                    <option>Twice daily</option>
                    <option>Three times daily</option>
                    <option>Four times daily</option>
                    <option>As needed</option>
                    <option>Weekly</option>
                    <option>Other (as prescribed)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Instructions
                  </label>

                  <select
                    value={form.instructions}
                    onChange={(e) =>
                      updateField("instructions", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800"
                  >
                    <option value="">No instructions</option>
                    <option value="Before food">Before food</option>
                    <option value="After food">After food</option>
                    <option value="With food">With food</option>
                    <option value="As prescribed">As prescribed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Start Date *
                  </label>

                  <input
                    required
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      updateField("start_date", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    End Date
                  </label>

                  <input
                    type="date"
                    min={form.start_date}
                    value={form.end_date}
                    onChange={(e) =>
                      updateField("end_date", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800"
                  />
                </div>

              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Reminder Times
                </label>

                <div className="space-y-3">
                  {form.reminder_times.map((time, index) => (
                    <div
                      key={index}
                      className="flex max-w-md items-center gap-3"
                    >
                      <input
                        type="time"
                        value={time}
                        onChange={(e) =>
                          updateReminderTime(index, e.target.value)
                        }
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-800"
                      />

                      {form.reminder_times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReminderTime(index)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addReminderTime}
                  className="mt-3 text-sm font-semibold text-[#176B5B] hover:underline"
                >
                  + Add another reminder time
                </button>
              </div>

              <div className="flex flex-wrap gap-3 pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#176B5B] px-7 py-3 font-semibold text-white hover:bg-[#125548] disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Medicine"
                      : "Save Medicine"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-7 py-3 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Enter medicine details exactly as prescribed by your healthcare professional.
              </p>

            </form>
          </section>
        )}

        {medicines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-green-200 bg-white px-6 py-16 text-center">
            <div className="mb-3 text-4xl">💊</div>

            <h3 className="text-lg font-semibold text-gray-800">
              No medicines added yet
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Add your first medicine to start managing your medication records.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="mt-5 rounded-lg bg-[#176B5B] px-5 py-3 font-semibold text-white"
            >
              Add Your First Medicine
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">

            {medicines.map((medicine) => (
              <article
                key={medicine.id}
                className="rounded-xl border border-green-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {medicine.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      {medicine.dosage}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      medicine.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {medicine.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>
                    <strong>Frequency:</strong>{" "}
                    {medicine.frequency}
                  </p>

                  <p>
                    <strong>Instructions:</strong>{" "}
                    {medicine.instructions || "Not specified"}
                  </p>

                  <p>
                    <strong>Start date:</strong>{" "}
                    {medicine.start_date}
                  </p>

                  <p>
                    <strong>End date:</strong>{" "}
                    {medicine.end_date || "Not specified"}
                  </p>

                  <p>
                    <strong>Reminder times:</strong>{" "}
                    {medicine.reminder_times?.length
                      ? medicine.reminder_times
                          .map((time) => time.slice(0, 5))
                          .join(", ")
                      : "Not set"}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => openEditForm(medicine)}
                    className="rounded-lg border border-[#176B5B] px-3 py-2 text-sm font-semibold text-[#176B5B] hover:bg-green-50"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => toggleMedicine(medicine)}
                    disabled={actionInProgress}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {medicine.is_active
                      ? "Deactivate"
                      : "Activate"}
                  </button>

                  <button
                    onClick={() => deleteMedicine(medicine)}
                    disabled={actionInProgress}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}

          </div>
        )}

        <footer className="mt-10 text-center text-xs text-gray-500">
          Sehat Saathi · Medicine management
          <br />
          This tool records medication information. It does not prescribe medicines or change prescribed dosages.
        </footer>

      </div>
    </main>
  </ProtectedRoute>

  );
}
