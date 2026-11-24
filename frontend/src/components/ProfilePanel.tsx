"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Calendar, LogOut, Loader2 } from "lucide-react";
import { getUserProfile, logoutUser } from "../lib/profile";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: string;
}

export default function ProfilePanel() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const userProfile = await getUserProfile();
        setProfile(userProfile);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleLogout() {
    setLogoutLoading(true);
    setError("");

    try {
      await logoutUser();
      router.replace("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Logout failed."
      );
    } finally {
      setLogoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-8">
        <Loader2 size={24} className="animate-spin text-green-600" />
        <span className="ml-3 text-sm text-gray-600">
          Loading profile...
        </span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">
          My Profile
        </h2>

        <p className="mt-3 text-sm text-red-600">
          {error || "Unable to retrieve profile information."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

      {/* Profile Header */}
      <div className="flex items-center gap-4">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt="Profile avatar"
            className="h-16 w-16 rounded-full border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <User size={28} />
          </div>
        )}

        <div className="min-w-0">
          <h2 className="break-words text-xl font-semibold text-gray-800">
            {profile.name || "User"}
          </h2>

          <p className="text-sm text-gray-500">
            Sehat Saathi Account
          </p>
        </div>
      </div>

      {/* Profile Details */}
      <div className="mt-8 space-y-5">

        {/* Email */}
        <div className="flex items-start gap-3">
          <Mail size={20} className="mt-1 text-gray-500" />

          <div className="min-w-0">
            <p className="text-sm text-gray-500">
              Email Address
            </p>

            <p className="break-all font-medium text-gray-800">
              {profile.email || "Not available"}
            </p>
          </div>
        </div>

        {/* Account Creation Date */}
        <div className="flex items-start gap-3">
          <Calendar size={20} className="mt-1 text-gray-500" />

          <div>
            <p className="text-sm text-gray-500">
              Account Created
            </p>

            <p className="font-medium text-gray-800">
              {profile.createdAt
                ? new Date(profile.createdAt).toLocaleDateString()
                : "Not available"}
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Logout Button */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={logoutLoading}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {logoutLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Logging out...
          </>
        ) : (
          <>
            <LogOut size={18} />
            Logout
          </>
        )}
      </button>
    </div>
  );
}