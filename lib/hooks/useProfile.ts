"use client";

import useSWR from "swr";
import type { ProfileRecord } from "@/lib/db/profile-service";

type ProfileResponse = {
  profile: ProfileRecord;
  source: "supabase" | "mock";
};

function previewHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (typeof window === "undefined") return headers;

  const active = window.localStorage.getItem("velmere:account-session") === "active";
  if (active) headers["x-velmere-preview-session"] = "active";

  return headers;
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to fetch profile");
  return response.json() as Promise<ProfileResponse>;
};

export function useProfile(fallback: ProfileRecord) {
  return useSWR<ProfileResponse>("/api/profile", fetcher, {
    fallbackData: { profile: fallback, source: "mock" },
    revalidateOnFocus: false,
  });
}

export async function updateProfileRequest(profile: ProfileRecord) {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: previewHeaders(),
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error("Unable to update profile");
  return response.json() as Promise<ProfileResponse>;
}
