"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

interface UserProfile {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  preferred_language: string | null;
}

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    id: "",
    full_name: "",
    date_of_birth: "",
    gender: "",
    preferred_language: "en",
  });

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        if (!mounted) return;
        setEmail(user.email ?? "");

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, date_of_birth, gender, preferred_language")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!mounted) return;

        if (data) {
          setProfile({
            id: data.id,
            full_name: data.full_name ?? "",
            date_of_birth: data.date_of_birth ?? "",
            gender: data.gender ?? "",
            preferred_language: data.preferred_language ?? "en",
          });
        } else {
          setProfile((previous) => ({
            ...previous,
            id: user.id,
          }));
        }
      } catch (error) {
        if (mounted) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your profile."
          );
          setSuccess(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  function updateField(field: keyof UserProfile, value: string) {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));
    setMessage("");
    setSuccess(false);
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (profile.date_of_birth && profile.date_of_birth > getLocalDate()) {
      setMessage("Date of birth cannot be in the future.");
      setSuccess(false);
      return;
    }

    setSaving(true);
    setMessage("");
    setSuccess(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please log in again.");
      }

      const profileData = {
        id: user.id,
        full_name: profile.full_name?.trim() || null,
        date_of_birth: profile.date_of_birth || null,
        gender: profile.gender || null,
        preferred_language: profile.preferred_language || "en",
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" });

      if (error) throw error;

      setSuccess(true);
      setMessage("Your profile has been saved successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      setSuccess(false);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F1E8]">
        <p className="font-medium text-[#2D5A3D]">Loading your profile...</p>
      </main>
    );
  }

  const inputStyle =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#2D5A3D] focus:ring-1 focus:ring-[#2D5A3D]";

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#F7F1E8] px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#2D5A3D]">
                Sehat Saathi
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your personal health profile
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-[#2D5A3D] px-4 py-2 text-[#2D5A3D] hover:bg-green-50 disabled:opacity-60"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </header>

          <section className="rounded-2xl bg-white p-6 shadow-lg md:p-8">
            <h2 className="mb-2 text-2xl font-semibold text-gray-800">
              My Profile
            </h2>

            <p className="mb-6 text-sm text-gray-500">
              Keep your personal information up to date.
            </p>

            <form onSubmit={saveProfile} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Registered Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className={`${inputStyle} bg-gray-100`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your registered email cannot be changed here.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.full_name ?? ""}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  placeholder="Enter your full name"
                  maxLength={120}
                  autoComplete="name"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  max={getLocalDate()}
                  value={profile.date_of_birth ?? ""}
                  onChange={(e) =>
                    updateField("date_of_birth", e.target.value)
                  }
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  value={profile.gender ?? ""}
                  onChange={(e) => updateField("gender", e.target.value)}
                  className={inputStyle}
                >
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Preferred Language
                </label>
                <select
                  value={profile.preferred_language ?? "en"}
                  onChange={(e) =>
                    updateField("preferred_language", e.target.value)
                  }
                  className={inputStyle}
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>

              {message && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-lg p-3 text-sm ${
                    success
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || loggingOut}
                className="w-full rounded-lg bg-[#2D5A3D] py-3 font-semibold text-white hover:bg-[#244a32] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>

            <div className="mt-6 border-t pt-5 text-center">
              <Link
                href="/"
                className="text-sm font-medium text-[#2D5A3D] hover:underline"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </section>

          <p className="mt-6 text-center text-xs text-gray-500">
            Your profile information is private and protected by Supabase Row
            Level Security.
          </p>
        </div>
      </main>
    </ProtectedRoute>
  );
}
