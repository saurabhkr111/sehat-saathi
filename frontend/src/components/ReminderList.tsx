"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

type Reminder = {
  id: string;
  reminder_text: string;
  scheduled_at: string | null;
  status: string;
  created_at: string;
};

export default function ReminderList() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  async function fetchReminders() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Please log in to view reminders.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });

    if (fetchError) {
      console.error("Reminder fetch error:", fetchError);
      setError(fetchError.message);
    } else {
      setReminders(data ?? []);
    }

    setLoading(false);
  }

  async function updateReminderStatus(
    reminderId: string,
    status: string
  ) {
    setActionId(reminderId);
    setError("");

    const { error: updateError } = await supabase
      .from("reminders")
      .update({ status })
      .eq("id", reminderId);

    if (updateError) {
      setError(updateError.message);
    } else {
      await fetchReminders();
    }

    setActionId(null);
  }

  async function deleteReminder(reminderId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this reminder?"
    );

    if (!confirmed) return;

    setActionId(reminderId);
    setError("");

    const { error: deleteError } = await supabase
      .from("reminders")
      .delete()
      .eq("id", reminderId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchReminders();
    }

    setActionId(null);
  }

  useEffect(() => {
    fetchReminders();
  }, []);

  function formatDate(dateString: string | null) {
    if (!dateString) return "Time not scheduled";

    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const pendingReminders = reminders.filter(
    (reminder) => reminder.status === "pending"
  );

  const completedReminders = reminders.filter(
    (reminder) => reminder.status === "completed"
  );

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 rounded-2xl border border-[#A8B5A2] bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#2D5A3D]">
            Reminder Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your upcoming and completed reminders.
          </p>
        </div>

        <button
          onClick={fetchReminders}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#2D5A3D] px-4 py-2 text-sm text-[#2D5A3D] hover:bg-[#F7F1E8] disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-600">
          <Loader2 size={20} className="animate-spin" />
          Loading reminders...
        </div>
      ) : (
        <>
          {/* Upcoming Reminders */}
          <section className="mb-8">
            <h3 className="font-semibold text-gray-800 mb-4">
              Upcoming Reminders ({pendingReminders.length})
            </h3>

            {pendingReminders.length === 0 ? (
              <div className="rounded-xl bg-[#F7F1E8] p-6 text-center text-gray-600">
                No pending reminders.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Clock
                        size={20}
                        className="mt-1 text-[#2D5A3D]"
                      />

                      <div>
                        <p className="font-medium text-gray-800">
                          {reminder.reminder_text}
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          {formatDate(reminder.scheduled_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          updateReminderStatus(reminder.id, "completed")
                        }
                        disabled={actionId === reminder.id}
                        title="Mark completed"
                        className="flex items-center gap-2 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700 hover:bg-green-200 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} />
                        Done
                      </button>

                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        disabled={actionId === reminder.id}
                        title="Delete reminder"
                        className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Completed Reminders */}
          <section>
            <h3 className="font-semibold text-gray-800 mb-4">
              Completed Reminders ({completedReminders.length})
            </h3>

            {completedReminders.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">
                No completed reminders yet.
              </div>
            ) : (
              <div className="space-y-3">
                {completedReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-700">
                        {reminder.reminder_text}
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(reminder.scheduled_at)}
                      </p>

                      <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Completed
                      </span>
                    </div>

                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      disabled={actionId === reminder.id}
                      className="flex items-center justify-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}