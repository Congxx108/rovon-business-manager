import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseAuthConfigured } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (!isSupabaseAuthConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
