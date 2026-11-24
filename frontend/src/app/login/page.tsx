"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setSuccess(true);
          setMessage(
            "Account created! Please check your email to confirm your account."
          );
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7F1E8] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#2D5A3D]">
            Sehat Saathi
          </h1>

          <p className="mt-2 text-gray-600">
            Your health. Your language. Your conversation.
          </p>
        </div>

        <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setMessage("");
              setSuccess(false);
            }}
            className={`flex-1 rounded-md py-2 font-medium ${
              isLogin
                ? "bg-[#2D5A3D] text-white"
                : "text-gray-600"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setMessage("");
              setSuccess(false);
            }}
            className={`flex-1 rounded-md py-2 font-medium ${
              !isLogin
                ? "bg-[#2D5A3D] text-white"
                : "text-gray-600"
            }`}
          >
            Register
          </button>
        </div>

        <h2 className="mb-2 text-2xl font-semibold text-gray-800">
          {isLogin ? "Welcome back!" : "Create your account"}
        </h2>

        <p className="mb-6 text-sm text-gray-500">
          {isLogin
            ? "Login to access your personal health assistant."
            : "Join Sehat Saathi to manage your health records."}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#2D5A3D]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#2D5A3D]"
            />
          </div>

          {message && (
            <div
              role="status"
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
            disabled={loading}
            className="w-full rounded-lg bg-[#2D5A3D] py-3 font-semibold text-white transition hover:bg-[#244a32] disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Login"
                : "Create Account"}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {isLogin
            ? "New to Sehat Saathi?"
            : "Already have an account?"}

          {" "}

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage("");
              setSuccess(false);
            }}
            className="font-semibold text-[#2D5A3D]"
          >
            {isLogin ? "Create account" : "Login"}
          </button>
        </p>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:underline"
          >
            Back to home
          </Link>
        </div>

      </div>
    </main>
  );
}