"use client";

import { useEffect } from "react";
import {
  checkDueReminders,
  markReminderCompleted,
} from "../lib/reminderScheduler";

export default function ReminderNotifier() {
  useEffect(() => {
    if (!("Notification" in window)) {
      console.warn("Browser notifications are not supported.");
      return;
    }

    let isChecking = false;

    const requestPermission = async () => {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    };

    const checkReminders = async () => {
      if (Notification.permission !== "granted" || isChecking) return;

      isChecking = true;

      try {
        const reminders = await checkDueReminders();

        for (const reminder of reminders) {
          new Notification("Sehat Saathi Reminder", {
            body: reminder.reminder_text,
            icon: "/favicon.ico",
          });

          await markReminderCompleted(reminder.id);
        }
      } catch (error) {
        console.error("Reminder notification error:", error);
      } finally {
        isChecking = false;
      }
    };

    requestPermission();

    checkReminders();

    const interval = setInterval(checkReminders, 5_000);

    return () => clearInterval(interval);
  }, []);

  return null;
}