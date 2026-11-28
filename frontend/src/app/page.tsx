"use client";

import { cleanReminderMessage } from "../lib/reminderTimeParser";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createReminder } from "../lib/reminders";
import ReminderNotifier from "../components/ReminderNotifier";
import ReminderList from "../components/ReminderList";
import {
  LayoutDashboard,
  Pill,
  Volume2,
  HeartPulse,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ArrowRight,
  Mic,
  MicOff,
  Loader2,
  User,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import ProtectedRoute from "../components/ProtectedRoute";
import ProfilePanel from "../components/ProfilePanel";
import { markDoseAsTaken } from "../lib/doseLogs";
import { useAuth } from "../context/AuthContext";

function getApiBase() {
  const fromEnv = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  const host =
    typeof window !== "undefined" ? window.location.hostname : "";
  const onLocalhost = host === "localhost" || host === "127.0.0.1";
  const envIsLocal =
    fromEnv.includes("localhost") || fromEnv.includes("127.0.0.1");

  if (host && !onLocalhost && envIsLocal) {
    return "https://sehat-saathi-5o7w.onrender.com";
  }

  if (fromEnv) return fromEnv;
  if (onLocalhost) return "http://localhost:8000";

  return "https://sehat-saathi-5o7w.onrender.com";
}

const API = getApiBase();

type Medicine = {
  id: string;
  name: string;
  dosage: string | null;
  reminder_times: string[] | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
};

type AssistantResult = {
  intent: string;
  entities?: Record<string, unknown>;
  response?: string;
};

type MedicineRelation =
  | { name: string | null; dosage?: string | null }
  | { name: string | null; dosage?: string | null }[]
  | null;

type PendingDoseMatch = {
  id: string;
  scheduled_time: string;
  status: string;
  medicines: MedicineRelation;
};

function getMedicineFromDose(dose: PendingDoseMatch) {
  return Array.isArray(dose.medicines) ? dose.medicines[0] ?? null : dose.medicines;
}


type DoseLog = {
  id: string;
  user_id: string;
  medicine_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "pending" | "taken" | "skipped" | "missed";
  taken_at: string | null;
};

function getLocalDate() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function HomeContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"dashboard" | "voice" | "profile">("dashboard");
  const [language, setLanguage] = useState("en");

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [voiceText, setVoiceText] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandResult, setCommandResult] = useState<AssistantResult | null>(null);
  const [commandError, setCommandError] = useState("");

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [sttError, setSttError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const activeMedicineCount = medicines.length;
  const totalDoses = doseLogs.length;
  const takenDoses = doseLogs.filter((dose) => dose.status === "taken").length;
  const pendingDoses = doseLogs.filter((dose) => dose.status === "pending").length;
  const skippedDoses = doseLogs.filter((dose) => dose.status === "skipped").length;
  const missedDoses = doseLogs.filter((dose) => dose.status === "missed").length;

  const adherence =
    totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  async function loadDashboard() {
    if (!user) return;

    setDashboardLoading(true);
    setDashboardError("");

    const today = getLocalDate();

    const { data: medicineData, error: medicineError } = await supabase
      .from("medicines")
      .select("id,name,dosage,reminder_times,is_active,start_date,end_date")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (medicineError) {
      console.error("Dashboard medicine fetch error:", medicineError.message);
      setDashboardError("Unable to load your medicines.");
      setDashboardLoading(false);
      return;
    }

    const activeMedicines: Medicine[] = medicineData ?? [];
    setMedicines(activeMedicines);

    const eligibleMedicines = activeMedicines.filter((medicine) => {
      if (medicine.start_date && today < medicine.start_date) return false;
      if (medicine.end_date && today > medicine.end_date) return false;

      return true;
    });

    const generatedDoseRecords = eligibleMedicines.flatMap((medicine) =>
      (medicine.reminder_times ?? []).map((time) => ({
        user_id: user.id,
        medicine_id: medicine.id,
        scheduled_date: today,
        scheduled_time: time,
        status: "pending" as const,
      })),
    );

    if (generatedDoseRecords.length > 0) {
      const { error: generationError } = await supabase
        .from("dose_logs")
        .upsert(generatedDoseRecords, {
          onConflict: "medicine_id,scheduled_date,scheduled_time",
          ignoreDuplicates: true,
        });

      if (generationError) {
        console.error(
          "Dashboard dose generation error:",
          generationError.message,
        );

        setDashboardError("Unable to prepare today's dose schedule.");
      }
    }

    const { data: todayLogData, error: doseError } = await supabase
      .from("dose_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("scheduled_date", today)
      .order("scheduled_time", { ascending: true });

    if (doseError) {
      console.error("Dashboard dose fetch error:", doseError.message);
      setDashboardError("Unable to load today's dose records.");
    } else {
      setDoseLogs(todayLogData ?? []);
    }

    setDashboardLoading(false);
  }

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  // =========================================================
  // ElevenLabs Text-to-Speech
  // =========================================================

  async function generateVoice() {
    if (!voiceText.trim()) {
      setVoiceError(
        language === "hi"
          ? "कृपया कुछ टेक्स्ट दर्ज करें।"
          : "Please enter some text.",
      );

      return;
    }

    setVoiceLoading(true);
    setVoicePlaying(false);
    setVoiceError("");

    let audioUrl: string | null = null;

    try {
      const response = await fetch(`${API}/api/v1/voice/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: voiceText.trim(),
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.detail || "Voice key not set.",
        );
      }

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("audio")) {
        throw new Error("The server did not return an audio response.");
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("The generated audio is empty.");
      }

      audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setVoicePlaying(false);

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      };

      audio.onerror = () => {
        setVoicePlaying(false);

        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      };

      setVoicePlaying(true);

      await audio.play();
    } catch (error) {
      console.error("Voice generation error:", error);

      setVoiceError(
        error instanceof Error
          ? error.message
          : "Unable to generate or play voice.",
      );

      setVoicePlaying(false);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    } finally {
      setVoiceLoading(false);
    }
  }

// =========================================================
// Assistant Command Processing
// =========================================================

async function processAssistantCommand() {
  if (!voiceText.trim()) {
    setCommandError(
      language === "hi"
        ? "कृपया पहले कुछ बोलें या टेक्स्ट दर्ज करें।"
        : "Please speak or enter some text first.",
    );

    return;
  }

  setCommandLoading(true);
  setCommandError("");
  setCommandResult(null);

  try {
    const formData = new FormData();

    formData.append("text", voiceText.trim());
    formData.append("language", language);

    const response = await fetch(
      `${API}/api/v1/assistant/command`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      throw new Error(
        errorData?.detail ||
          `Assistant API returned status ${response.status}`,
      );
    }

    const result = await response.json();
    let assistantResponse = result.response ?? "";

    // Handle medicine-taking commands locally using authenticated Supabase access.
    if (result.intent === "MARK_MEDICINE_TAKEN") {
      if (!user) throw new Error("Please log in to manage your doses.");
      const { data: pendingDoses, error: pendingError } = await supabase
        .from("dose_logs")
        .select("id,scheduled_time,status,medicines(name,dosage)")
        .eq("user_id", user.id)
        .eq("scheduled_date", getLocalDate())
        .eq("status", "pending");

      if (pendingError) {
        throw new Error("Unable to retrieve pending doses.");
      }

      const pending = pendingDoses ?? [];
      const normalizeMedicineText = (value: string) =>
        value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");

      const normalizedCommand = normalizeMedicineText(voiceText);
      // Only consider explicit medicine-name entities; command_text is not a separate matching signal.
      const entityValues = Object.entries(result.entities ?? {})
        .filter(([key, value]) => key !== "command_text" && typeof value === "string")
        .map(([, value]) => normalizeMedicineText(value as string));

      const phraseMatches = (text: string, phrase: string) =>
        (` ${text} `).includes(` ${phrase} `);

      const pendingDoseMatches = pending as unknown as PendingDoseMatch[];

      const matches = pendingDoseMatches.filter((dose) => {
        const rawName = getMedicineFromDose(dose)?.name;
        if (typeof rawName !== "string" || !rawName.trim()) return false;
        const medicineName = normalizeMedicineText(rawName);
        if (!medicineName) return false;
        return phraseMatches(normalizedCommand, medicineName) ||
          entityValues.some((value) => phraseMatches(value, medicineName));
      });

      let selectedDose: PendingDoseMatch | null = null;
      if (matches.length === 1) {
        selectedDose = matches[0];
      } else if (
        matches.length === 0 &&
        pending.length === 1 &&
        (
          /\b(i have taken|i\'ve taken|i took|taken my medicine|took my medicine|taken my medication|took my medication|mark (it|this) as taken|i have had my dose)\b/.test(normalizedCommand) ||
          /मैंने (दवा|दवाई) (ले ली|लिया|खा ली|खाई)/.test(voiceText.trim())
        )
      ) {
        // Resolve only a clearly generic medicine-taking phrase when exactly one pending dose exists.
        selectedDose = pending[0];
      }

      if (!selectedDose) {
        assistantResponse = pending.length === 0
          ? (language === "hi" ? "आज कोई लंबित दवा की खुराक नहीं मिली।" : "No pending doses were found for today.")
          : (language === "hi" ? "कृपया दवा का नाम स्पष्ट बताएं ताकि सही खुराक दर्ज की जा सके।" : "Please specify the medicine name so I can identify the correct pending dose.");
        result.response = assistantResponse;
      } else {
        const updatedDose = await markDoseAsTaken(selectedDose.id);
        assistantResponse = language === "hi"
          ? `${getMedicineFromDose(selectedDose)?.name ?? "दवा"} की खुराक ली गई के रूप में दर्ज कर दी गई है।`
          : `${getMedicineFromDose(selectedDose)?.name ?? "Medicine"} has been marked as taken.`;
        result.response = assistantResponse;
        result.entities = {
          ...(result.entities ?? {}),
          medicine_name: getMedicineFromDose(selectedDose)?.name ?? "",
          dose_log_id: updatedDose.id,
          status: updatedDose.status,
        };
        await loadDashboard();
      }
    }
    // Handle reminder creation locally using authenticated Supabase access.
if (result.intent === "CREATE_REMINDER") {
  if (!user) {
    throw new Error("Please log in to create reminders.");
  }

  const reminderText = cleanReminderMessage(voiceText);

  if (!reminderText) {
    assistantResponse =
      language === "hi"
        ? "कृपया बताएं कि आपको किस चीज़ की याद दिलानी है।"
        : "Please tell me what you want me to remind you about.";
  } else {
    const savedReminder = await createReminder(voiceText);

    assistantResponse =
      language === "hi"
        ? `${reminderText} के लिए रिमाइंडर सेव कर दिया गया है।`
        : `Your reminder to ${reminderText} has been saved.`;

    result.entities = {
      ...(result.entities ?? {}),
      reminder_text: savedReminder.reminder_text,
      reminder_id: savedReminder.id,
      reminder_status: savedReminder.status,
    };
  }

  result.response = assistantResponse;
}

    setCommandResult(result);

    // Speak the assistant's response
    if (assistantResponse) {
      const ttsResponse = await fetch(
        `${API}/api/v1/voice/speak`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: assistantResponse,
            language,
          }),
        },
      );

      if (!ttsResponse.ok) {
        const errorData = await ttsResponse.json().catch(() => null);
        throw new Error(errorData?.detail || "Voice key not set.");
      }

      const audioBlob = await ttsResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setVoicePlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setVoicePlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      setVoicePlaying(true);

      await audio.play();
    }
  } catch (error) {
    console.error("Assistant command error:", error);

    setCommandError(
      error instanceof Error
        ? error.message
        : "Unable to process your command.",
    );

    setVoicePlaying(false);
  } finally {
    setCommandLoading(false);
  }
}

  // =========================================================
  // Sarvam AI Speech-to-Text
  // =========================================================

  async function startRecording() {
    try {
      setSttError("");
      setVoiceError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone access is not supported by this browser.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        chunksRef.current = [];

        if (audioBlob.size === 0) {
          setSttError("No audio was recorded. Please try again.");
          setRecording(false);
          return;
        }

        await transcribeAudio(audioBlob);
      };

      recorder.start();

      setRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);

      setRecording(false);

      setSttError(
        error instanceof Error
          ? error.message
          : "Unable to access the microphone.",
      );
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    setRecording(false);
  }

  async function transcribeAudio(audioBlob: Blob) {
    setTranscribing(true);
    setSttError("");

    try {
      const formData = new FormData();

      const extension = audioBlob.type.includes("webm")
        ? "webm"
        : audioBlob.type.includes("mp4")
          ? "mp4"
          : "wav";

      const audioFile = new File(
        [audioBlob],
        `sehat-saathi-recording.${extension}`,
        {
          type: audioBlob.type || "audio/webm",
        },
      );

      formData.append("file", audioFile);

      formData.append(
        "language_code",
        language === "hi" ? "hi-IN" : "en-IN",
      );

      const response = await fetch(
        `${API}/api/v1/voice/transcribe`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);

        throw new Error(
          errorBody?.detail ||
            `Transcription API returned status ${response.status}`,
        );
      }

      const result = await response.json();

      if (!result.transcript?.trim()) {
        throw new Error("No speech was detected in the recording.");
      }

      setVoiceText((previousText) =>
        previousText.trim()
          ? `${previousText.trim()} ${result.transcript.trim()}`
          : result.transcript.trim(),
      );
    } catch (error) {
      console.error("Transcription error:", error);

      setSttError(
        error instanceof Error
          ? error.message
          : "Unable to transcribe your speech.",
      );
    } finally {
      setTranscribing(false);
    }
  }

  // Clean up recording if component unmounts.

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, []);

  // =========================================================
  // Dashboard
  // =========================================================

  return (
    <main className="flex min-h-screen bg-[#F7F1E8] text-[#2C2C2A]">
      <aside className="hidden min-h-screen w-64 flex-col bg-[#2D5A3D] p-6 text-white md:flex">
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <HeartPulse size={30} />
            <h1 className="text-2xl font-bold">Sehat Saathi</h1>
          </div>

          <p className="mt-2 text-sm text-green-100">
            Your personal medicine companion
          </p>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
              activeTab === "dashboard"
                ? "bg-white font-semibold text-[#2D5A3D]"
                : "hover:bg-white/10"
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>

          <button
            onClick={() => router.push("/medicines")}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/10"
          >
            <Pill size={20} />
            Medicines
          </button>

          <button
            onClick={() => router.push("/doses")}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/10"
          >
            <CalendarCheck size={20} />
            Today&apos;s Doses
          </button>

          <button
            onClick={() => setActiveTab("voice")}
            className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
              activeTab === "voice"
                ? "bg-white font-semibold text-[#2D5A3D]"
                : "hover:bg-white/10"
            }`}
          >
            <Volume2 size={20} />
            Voice Support
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
              activeTab === "profile"
                ? "bg-white font-semibold text-[#2D5A3D]"
                : "hover:bg-white/10"
            }`}
          >
            <User size={20} />
            Profile
          </button>
        </nav>

        <div className="mt-auto pt-8">
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="font-semibold">Health Disclaimer</p>

            <p className="mt-2 text-xs text-green-100">
              Sehat Saathi helps organize medicine information and reminders. It
              does not replace professional medical advice.
            </p>
          </div>
        </div>
      </aside>

      <section className="mx-auto w-full max-w-7xl flex-1 p-5 md:p-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:hidden">
          <h1 className="text-2xl font-bold text-[#2D5A3D]">
            Sehat Saathi
          </h1>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className="rounded-xl bg-white px-3 py-2"
            >
              Dashboard
            </button>

            <button
              onClick={() => router.push("/medicines")}
              className="rounded-xl bg-white px-3 py-2"
            >
              Medicines
            </button>

            <button
              onClick={() => router.push("/doses")}
              className="rounded-xl bg-white px-3 py-2"
            >
              Doses
            </button>

            <button
              onClick={() => setActiveTab("voice")}
              className="rounded-xl bg-white px-3 py-2"
            >
              Voice
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className="rounded-xl bg-white px-3 py-2"
            >
              Profile
            </button>
          </div>
        </div>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              VOICE-FIRST MEDICINE ASSISTANT
            </p>

            <h2 className="mt-1 text-3xl font-bold text-[#2D5A3D]">
              {activeTab === "dashboard"
                ? "Your Dashboard"
                : activeTab === "voice"
                  ? "Voice Support"
                  : "My Profile"}
            </h2>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              Language / भाषा
            </label>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-xl border bg-white px-4 py-3"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>
        </header>

        {/* =====================================================
            DASHBOARD
        ====================================================== */}

        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="rounded-3xl bg-[#2D5A3D] p-8 text-white md:p-10">
              <p className="text-green-100">Welcome to Sehat Saathi</p>

              <h3 className="mt-3 text-3xl font-bold md:text-4xl">
                Stay on track with
                <br /> your medicines.
              </h3>

              <p className="mt-4 max-w-xl text-green-100">
                Keep your medicine schedule organized and monitor your daily
                progress.
              </p>

              <button
                onClick={() => router.push("/medicines")}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#D4A017] px-6 py-3 font-semibold text-[#2C2C2A]"
              >
                Manage Medicines <ArrowRight size={18} />
              </button>
            </div>

            {dashboardError && (
              <div className="rounded-xl bg-red-100 p-4 text-red-700">
                {dashboardError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-[#2D5A3D]">
                Today&apos;s Overview
              </h3>

              <button
                onClick={loadDashboard}
                disabled={dashboardLoading}
                className="flex items-center gap-2 rounded-xl border border-[#2D5A3D]/20 bg-white px-4 py-2 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={dashboardLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {dashboardLoading ? (
              <div className="rounded-3xl bg-white p-8 text-center text-[#2D5A3D]">
                Loading your dashboard...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    icon={<Pill size={26} />}
                    label="Active Medicines"
                    value={activeMedicineCount}
                    detail="Currently active"
                  />

                  <StatCard
                    icon={<CalendarCheck size={26} />}
                    label="Today&apos;s Doses"
                    value={totalDoses}
                    detail="Scheduled today"
                  />

                  <StatCard
                    icon={<CheckCircle2 size={26} />}
                    label="Taken"
                    value={takenDoses}
                    detail="Recorded as taken"
                  />

                  <StatCard
                    icon={<Clock3 size={26} />}
                    label="Pending"
                    value={pendingDoses}
                    detail="Awaiting action"
                  />
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-[#2D5A3D]">
                      Today&apos;s Adherence
                    </h3>

                    <span className="text-2xl font-bold text-[#2D5A3D]">
                      {adherence}%
                    </span>
                  </div>

                  <div className="mt-4 h-4 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-[#2D5A3D] transition-all duration-500"
                      style={{ width: `${adherence}%` }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>Taken: {takenDoses}</span>
                    <span>Pending: {pendingDoses}</span>
                    <span>Skipped: {skippedDoses}</span>
                    <span>Missed: {missedDoses}</span>
                  </div>

                  {totalDoses === 0 && (
                    <p className="mt-4 text-sm text-gray-500">
                      No doses are scheduled for today. Add active medicines
                      with reminder times.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <QuickAction
                title="Medicine Manager"
                description="Add, edit and organize your medicines."
                icon={<Pill size={36} className="text-[#2D5A3D]" />}
                onClick={() => router.push("/medicines")}
                action="Open Medicine Manager"
              />

              <QuickAction
                title="Today&apos;s Doses"
                description="Track doses and record whether you took them."
                icon={<CalendarCheck size={36} className="text-[#2D5A3D]" />}
                onClick={() => router.push("/doses")}
                action="View Today&apos;s Doses"
              />

              <QuickAction
                title="Voice Support"
                description="Listen to spoken responses in English or Hindi."
                icon={<Volume2 size={36} className="text-[#2D5A3D]" />}
                onClick={() => setActiveTab("voice")}
                action="Try Voice Support"
              />

              <QuickAction
                title="Daily Progress"
                description={`${takenDoses} of ${totalDoses} doses recorded as taken today.`}
                icon={<CheckCircle2 size={36} className="text-[#2D5A3D]" />}
                onClick={() => router.push("/doses")}
                action="Review Progress"
              />
            </div>

            <ReminderList />

            <div className="rounded-2xl border border-[#A8B5A2] bg-[#A8B5A2]/30 p-5">
              <h3 className="font-semibold">Important</h3>

              <p className="mt-2 text-sm text-gray-700">
                This application assists with medicine organization and
                medication-related information. Always follow your healthcare
                professional&apos;s instructions.
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            VOICE SUPPORT
        ====================================================== */}

        {activeTab === "voice" && (
          <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <h3 className="text-xl font-bold text-[#2D5A3D]">
              Voice Support
            </h3>

            <p className="mt-2 text-gray-500">
              {language === "hi"
                ? "हिंदी में बोलें या टेक्स्ट दर्ज करें।"
                : "Speak or enter text to interact with Sehat Saathi."}
            </p>

            {/* Microphone */}

            <div className="mt-6 rounded-2xl border border-[#A8B5A2] bg-[#A8B5A2]/20 p-6">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-[#2D5A3D]">
                  {language === "hi"
                    ? "आवाज़ से टेक्स्ट"
                    : "Speech to Text"}
                </h4>

                <p className="mt-2 text-sm text-gray-600">
                  {language === "hi"
                    ? "माइक दबाएं और हिंदी में बोलें।"
                    : "Press the microphone and speak."}
                </p>

                <button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={transcribing}
                  className={`mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition ${
                    recording
                      ? "animate-pulse bg-red-600"
                      : "bg-[#2D5A3D] hover:bg-[#234832]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {recording ? (
                    <MicOff size={32} />
                  ) : transcribing ? (
                    <Loader2 size={32} className="animate-spin" />
                  ) : (
                    <Mic size={32} />
                  )}
                </button>

                <p className="mt-4 font-medium text-[#2D5A3D]">
                  {recording
                    ? language === "hi"
                      ? "रिकॉर्डिंग हो रही है... रोकने के लिए दबाएं"
                      : "Recording... Press to stop"
                    : transcribing
                      ? language === "hi"
                        ? "आपकी आवाज़ को टेक्स्ट में बदला जा रहा है..."
                        : "Transcribing your audio..."
                      : language === "hi"
                        ? "रिकॉर्डिंग शुरू करने के लिए दबाएं"
                        : "Click to start recording"}
                </p>
              </div>
            </div>

            {sttError && (
              <div className="mt-4 rounded-xl bg-red-100 p-4 text-red-700">
                {sttError}
              </div>
            )}

            {/* Text input */}

            <div className="mt-6">
              <label className="font-medium">
                {language === "hi" ? "टेक्स्ट" : "Text"}
              </label>

              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder={
                  language === "hi"
                    ? "अपना टेक्स्ट यहां लिखें या आवाज़ से ट्रांसक्राइब करें..."
                    : "Enter text here or transcribe using your voice..."
                }
                className="mt-2 min-h-40 w-full rounded-xl border p-4"
              />
            </div>

            {/* TTS */}

            <button
              onClick={generateVoice}
              disabled={voiceLoading || transcribing || !voiceText.trim()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D5A3D] p-3 text-white disabled:opacity-50"
            >
              <Volume2 size={18} />

              {voiceLoading
                ? language === "hi"
                  ? "ऑडियो बनाया जा रहा है..."
                  : "Generating Audio..."
                : voicePlaying
                  ? language === "hi"
                    ? "ऑडियो चल रहा है..."
                    : "Playing Audio..."
                  : language === "hi"
                    ? "आवाज़ सुनें"
                    : "Generate & Play Voice"}
            </button>

            {/* Assistant command processing */}
            <div className="mt-6 rounded-2xl border border-[#A8B5A2] bg-[#A8B5A2]/20 p-5">
              <h4 className="font-semibold text-[#2D5A3D]">
                {language === "hi" ? "वॉइस कमांड" : "Voice Command Assistant"}
              </h4>
              <p className="mt-2 text-sm text-gray-600">
                {language === "hi"
                  ? "अपने टेक्स्ट को समझने और उसके अनुसार जवाब पाने के लिए नीचे दबाएं।"
                  : "Send your text to the assistant to identify the command and get a spoken response."}
              </p>

              <button
                onClick={processAssistantCommand}
                disabled={commandLoading || transcribing || recording || !voiceText.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A017] p-3 font-semibold text-[#2C2C2A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {commandLoading ? (
                  <><Loader2 size={18} className="animate-spin" />
                    {language === "hi" ? "कमांड समझी जा रही है..." : "Processing command..."}</>
                ) : language === "hi" ? "कमांड भेजें" : "Process Command"}
              </button>

              {commandError && (
                <div className="mt-4 rounded-xl bg-red-100 p-4 text-red-700">
                  {commandError}
                </div>
              )}

              {commandResult && (
                <div className="mt-4 rounded-xl bg-white p-4">
                  <p className="font-semibold text-[#2D5A3D]">
                    {language === "hi" ? "पहचाना गया कमांड" : "Recognized Intent"}: {commandResult.intent}
                  </p>
                  {commandResult.entities && Object.keys(commandResult.entities).length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium">{language === "hi" ? "जानकारी" : "Extracted details"}</p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm">
                        {JSON.stringify(commandResult.entities, null, 2)}
                      </pre>
                    </div>
                  )}
                  {commandResult.response && (
                    <p className="mt-3 rounded-lg bg-[#A8B5A2]/30 p-3">
                      {commandResult.response}
                    </p>
                  )}
                </div>
              )}
            </div>

            {voiceError && (
              <p className="mt-4 text-red-600">{voiceError}</p>
            )}

            <button
              onClick={() => setActiveTab("dashboard")}
              className="mt-4 rounded-xl border px-4 py-2"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="flex justify-center">
            <ProfilePanel />
          </div>
        )}

        <footer className="mt-10 text-center text-sm text-gray-500">
          <p>Sehat Saathi · Your personal medicine companion</p>

          <p className="mt-2">
            Not a substitute for professional medical advice.
          </p>
        </footer>
      </section>
    </main>
  );
}

// =========================================================
// Reusable Dashboard Components
// =========================================================

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[#2D5A3D]">{icon}</span>

        <span className="text-3xl font-bold text-[#2D5A3D]">
          {value}
        </span>
      </div>

      <h3 className="mt-4 font-semibold">{label}</h3>

      <p className="mt-1 text-sm text-gray-500">{detail}</p>
    </div>
  );
}

function QuickAction({
  title,
  description,
  icon,
  onClick,
  action,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  action: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-3xl bg-white p-6 text-left shadow-sm transition hover:shadow-md"
    >
      {icon}

      <h3 className="mt-4 text-xl font-bold">{title}</h3>

      <p className="mt-2 text-gray-500">{description}</p>

      <p className="mt-4 font-semibold text-[#2D5A3D]">
        {action} →
      </p>
    </button>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
    <div className="min-h-screen">
     <ReminderNotifier />
      <HomeContent />
    </div>
    </ProtectedRoute>
  );
}