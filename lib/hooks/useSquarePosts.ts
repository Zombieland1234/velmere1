"use client";

import useSWR from "swr";
import type { SquarePost } from "@/lib/square/types";

type SquarePostsResponse = {
  posts: SquarePost[];
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
  if (!response.ok) throw new Error("Unable to fetch Square posts");
  return response.json() as Promise<SquarePostsResponse>;
};

export function useSquarePosts(locale: string, fallbackPosts: SquarePost[]) {
  return useSWR<SquarePostsResponse>(`/api/square/posts?locale=${locale}`, fetcher, {
    fallbackData: { posts: fallbackPosts, source: "mock" },
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
}

export async function createSquarePostRequest(input: {
  locale: string;
  title: string;
  body: string;
  authorName: string;
  authorHandle: string;
  imageUrl?: string;
  tags: string[];
}) {
  const response = await fetch("/api/square/posts", {
    method: "POST",
    headers: previewHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) throw new Error("Unable to publish Square post");
  return response.json() as Promise<{ post: SquarePost; source: "supabase" | "mock" }>;
}
