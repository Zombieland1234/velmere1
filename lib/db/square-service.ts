import type { SquareComment, SquarePost } from "@/lib/square/types";
import { getMockSquarePosts } from "@/lib/db/mock-square";
import { getSupabaseServerClient } from "@/lib/db/supabase";

const POSTS_TABLE = "velmere_square_posts";
const COMMENTS_TABLE = "velmere_square_comments";

type CreatePostInput = {
  locale: string;
  title: string;
  body: string;
  authorName: string;
  authorHandle: string;
  imageUrl?: string;
  tags?: string[];
};

type CreateCommentInput = {
  postId: string;
  body: string;
  authorName: string;
};

function toPost(row: any): SquarePost {
  return {
    id: String(row.id),
    slug: row.slug ?? String(row.id),
    authorName: row.author_name ?? row.authorName ?? "Velmère Member",
    authorHandle: row.author_handle ?? row.authorHandle ?? "@member",
    authorType: row.author_type ?? row.authorType ?? "community",
    locale: row.locale ?? "en",
    title: row.title ?? "Velmère Square Signal",
    body: row.body ?? "",
    imageUrl: row.image_url ?? row.imageUrl ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    views: Number(row.views ?? 0),
    likes: Number(row.likes ?? 0),
    commentsCount: Number(row.comments_count ?? row.commentsCount ?? 0),
    createdAt: row.created_at_label ?? row.createdAt ?? row.created_at ?? "now",
    moderationStatus: row.moderation_status ?? row.moderationStatus ?? "pending",
    comments: Array.isArray(row.comments) ? row.comments : [],
  };
}

function toComment(row: any): SquareComment {
  return {
    id: String(row.id),
    authorName: row.author_name ?? row.authorName ?? "Velmère Member",
    body: row.body ?? "",
    createdAt: row.created_at_label ?? row.createdAt ?? row.created_at ?? "now",
    moderationStatus: row.moderation_status ?? row.moderationStatus ?? "pending",
  };
}

export async function getSquarePosts(locale: string): Promise<{ posts: SquarePost[]; source: "supabase" | "mock" }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { posts: getMockSquarePosts(locale), source: "mock" };

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select("*")
    .eq("locale", locale)
    .in("moderation_status", ["approved", "pending"])
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.warn("Velmère Square Supabase fallback:", error?.message ?? "No data returned");
    return { posts: getMockSquarePosts(locale), source: "mock" };
  }

  return { posts: data.map(toPost), source: "supabase" };
}

export async function createSquarePost(input: CreatePostInput): Promise<{ post: SquarePost; source: "supabase" | "mock" }> {
  const supabase = getSupabaseServerClient();
  const slug = `post-${Date.now()}`;

  if (!supabase) {
    return {
      source: "mock",
      post: {
        id: slug,
        slug,
        authorName: input.authorName,
        authorHandle: input.authorHandle,
        authorType: "community",
        locale: input.locale,
        title: input.title,
        body: input.body,
        imageUrl: input.imageUrl,
        tags: input.tags ?? [],
        views: 1,
        likes: 0,
        commentsCount: 0,
        createdAt: "now",
        moderationStatus: "pending",
        comments: [],
      },
    };
  }

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .insert({
      slug,
      locale: input.locale,
      title: input.title,
      body: input.body,
      author_name: input.authorName,
      author_handle: input.authorHandle,
      author_type: "community",
      image_url: input.imageUrl ?? null,
      tags: input.tags ?? [],
      views: 1,
      likes: 0,
      comments_count: 0,
      moderation_status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Unable to create Square post");
  return { post: toPost(data), source: "supabase" };
}

export async function createSquareComment(input: CreateCommentInput): Promise<{ comment: SquareComment; source: "supabase" | "mock" }> {
  const supabase = getSupabaseServerClient();
  const id = `comment-${Date.now()}`;

  if (!supabase) {
    return {
      source: "mock",
      comment: {
        id,
        authorName: input.authorName,
        body: input.body,
        createdAt: "now",
        moderationStatus: "pending",
      },
    };
  }

  const { data, error } = await supabase
    .from(COMMENTS_TABLE)
    .insert({
      post_id: input.postId,
      author_name: input.authorName,
      body: input.body,
      moderation_status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Unable to create Square comment");
  return { comment: toComment(data), source: "supabase" };
}
