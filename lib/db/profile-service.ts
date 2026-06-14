import { getSupabaseServerClient } from "@/lib/db/supabase";

export type ProfileRecord = {
  displayName: string;
  handle: string;
  bio: string;
  lastNameChange: string;
};

const PROFILE_TABLE = "velmere_profiles";
const DEFAULT_PROFILE: ProfileRecord = {
  displayName: "Velmère Member",
  handle: "velmere.member",
  bio: "Spokojny profil dostępu dla dropów Velmère, archiwum i aktywności Square.",
  lastNameChange: "2026-05-01T00:00:00.000Z",
};

export async function getProfile(): Promise<{ profile: ProfileRecord; source: "supabase" | "mock" }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { profile: DEFAULT_PROFILE, source: "mock" };

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select("display_name, handle, bio, last_name_change")
    .limit(1)
    .maybeSingle();

  if (error || !data) return { profile: DEFAULT_PROFILE, source: "mock" };

  return {
    source: "supabase",
    profile: {
      displayName: data.display_name ?? DEFAULT_PROFILE.displayName,
      handle: data.handle ?? DEFAULT_PROFILE.handle,
      bio: data.bio ?? DEFAULT_PROFILE.bio,
      lastNameChange: data.last_name_change ?? DEFAULT_PROFILE.lastNameChange,
    },
  };
}

export async function updateProfile(profileId: string, profile: ProfileRecord): Promise<{ profile: ProfileRecord; source: "supabase" | "mock" }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { profile, source: "mock" };

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert({
      id: profileId,
      display_name: profile.displayName,
      handle: profile.handle,
      bio: profile.bio,
      last_name_change: profile.lastNameChange,
    })
    .select("display_name, handle, bio, last_name_change")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Unable to update profile");

  return {
    source: "supabase",
    profile: {
      displayName: data.display_name,
      handle: data.handle,
      bio: data.bio,
      lastNameChange: data.last_name_change,
    },
  };
}
