import { supabase } from "./supabase";

export async function getUserProfile() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unable to retrieve user profile.");
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.user_metadata?.display_name ??
      "",
    avatar: user.user_metadata?.avatar_url ?? null,
    createdAt: user.created_at,
  };
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    throw new Error("Unable to log out.");
  }
}