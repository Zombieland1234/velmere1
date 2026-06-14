"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Edit3, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";
import { updateProfileRequest, useProfile } from "@/lib/hooks/useProfile";
import type { ProfileRecord } from "@/lib/db/profile-service";

type ProfileDraft = {
  displayName: string;
  handle: string;
  bio: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_LAST_NAME_CHANGE = new Date("2026-05-01T00:00:00.000Z");

export default function ProfileAccountClient() {
  const t = useTranslations("Account.profileEditor");
  const fallbackProfile = useMemo<ProfileRecord>(() => ({
    displayName: "Velmère Member",
    handle: "velmere.member",
    bio: t("defaultBio"),
    lastNameChange: DEFAULT_LAST_NAME_CHANGE.toISOString(),
  }), [t]);
  const { data, mutate, isLoading } = useProfile(fallbackProfile);
  const profile = data?.profile ?? fallbackProfile;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>({
    displayName: profile.displayName,
    handle: profile.handle,
    bio: profile.bio,
  });

  useEffect(() => {
    if (!editing) {
      setDraft({ displayName: profile.displayName, handle: profile.handle, bio: profile.bio });
    }
  }, [editing, profile.bio, profile.displayName, profile.handle]);

  const nextNameChangeDate = useMemo(() => {
    const lastNameChange = new Date(profile.lastNameChange || DEFAULT_LAST_NAME_CHANGE.toISOString());
    return new Date(lastNameChange.getTime() + 30 * MS_PER_DAY);
  }, [profile.lastNameChange]);
  const canChangeName = Date.now() >= nextNameChangeDate.getTime();

  async function saveProfile() {
    const changedName = draft.displayName.trim() !== profile.displayName || draft.handle.trim() !== profile.handle;
    const nextProfile: ProfileRecord = {
      displayName: draft.displayName.trim() || profile.displayName,
      handle: draft.handle.trim().replace(/^@/, "") || profile.handle,
      bio: draft.bio.trim() || profile.bio,
      lastNameChange: changedName && canChangeName ? new Date().toISOString() : profile.lastNameChange,
    };

    await mutate(updateProfileRequest(nextProfile), {
      optimisticData: { profile: nextProfile, source: data?.source ?? "mock" },
      rollbackOnError: true,
      populateCache: true,
      revalidate: false,
    });
    setEditing(false);
  }

  return (
    <section className="velmere-command-shell mt-10 overflow-hidden rounded-[2rem] border-white/[0.08] bg-[#07090c]" data-pass2005-account-profile="solid-cyan-focus-no-row-lines">
      <div className="grid gap-6 border-b border-white/[0.055] bg-[#07090c] p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:p-7">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-200/[0.18] bg-cyan-300/[0.055] font-serif text-3xl text-cyan-100">
          {profile.displayName.slice(0, 1)}
        </div>
        <div>
          <p className="font-sans text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/[0.78]">{t("kicker")}</p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-white">{profile.displayName}</h2>
          <p className="mt-1 font-mono text-xs text-white/[0.42]">@{profile.handle}</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/[0.58]">{profile.bio}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft({ displayName: profile.displayName, handle: profile.handle, bio: profile.bio });
            setEditing((value) => !value);
          }}
          className="velmere-command-pill velmere-interaction-pulse px-5 text-[10px]"
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
          {editing ? t("cancel") : t("edit")}
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 p-6 md:grid-cols-3 md:p-7">
          {[0, 1, 2].map((item) => (
            <div key={item} className="velmere-readout-card h-28 rounded-2xl p-4">
              <div className="h-4 w-20 animate-pulse bg-white/[0.05]" />
              <div className="mt-5 h-3 w-full animate-pulse bg-white/[0.05]" />
              <div className="mt-3 h-3 w-2/3 animate-pulse bg-white/[0.05]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 p-6 md:grid-cols-3 md:p-7">
          <div className="velmere-readout-card rounded-2xl p-4" data-tone="cyan">
            <WalletCards className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/[0.40]">{t("wallet.label")}</p>
            <p className="mt-2 text-sm leading-6 text-white/[0.64]">{t("wallet.value")}</p>
          </div>
          <div className="velmere-readout-card rounded-2xl p-4">
            <ShieldCheck className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/[0.40]">{t("rank.label")}</p>
            <p className="mt-2 text-sm leading-6 text-white/[0.64]">{t("rank.value")}</p>
          </div>
          <div className="velmere-readout-card rounded-2xl p-4" data-tone={canChangeName ? "ready" : "gold"}>
            <CalendarClock className="h-4 w-4 text-velmere-gold" aria-hidden="true" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/[0.40]">{t("cooldown.label")}</p>
            <p className="mt-2 text-sm leading-6 text-white/[0.64]">
              {canChangeName ? t("cooldown.ready") : t("cooldown.wait", { date: nextNameChangeDate.toLocaleDateString() })}
            </p>
          </div>
        </div>
      )}

      {editing ? (
        <div className="border-t border-white/[0.055] p-6 md:p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block scroll-mt-28">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/[0.42]">{t("fields.displayName")}</span>
              <input
                value={draft.displayName}
                onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                disabled={!canChangeName}
                className="mt-3 min-h-12 w-full rounded-full border border-white/[0.10] bg-black/[0.40] px-5 text-sm text-white outline-none placeholder:text-white/[0.24] transition focus:border-cyan-200/[0.42] focus:bg-[#080d10] disabled:opacity-45"
              />
            </label>
            <label className="block scroll-mt-28">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/[0.42]">{t("fields.handle")}</span>
              <input
                value={draft.handle}
                onChange={(event) => setDraft((current) => ({ ...current, handle: event.target.value }))}
                disabled={!canChangeName}
                className="mt-3 min-h-12 w-full rounded-full border border-white/[0.10] bg-black/[0.40] px-5 font-mono text-sm text-white outline-none placeholder:text-white/[0.24] transition focus:border-cyan-200/[0.42] focus:bg-[#080d10] disabled:opacity-45"
              />
            </label>
          </div>
          {!canChangeName ? <p className="mt-3 text-xs leading-6 text-cyan-100/[0.78]">{t("cooldown.rule")}</p> : null}
          <label className="mt-5 block scroll-mt-28">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/[0.42]">{t("fields.bio")}</span>
            <textarea
              value={draft.bio}
              onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
              className="mt-3 min-h-28 w-full resize-none rounded-[1.5rem] border border-white/[0.10] bg-black/[0.40] p-4 text-sm leading-7 text-white outline-none placeholder:text-white/[0.24] transition focus:border-cyan-200/[0.42] focus:bg-[#080d10]"
            />
          </label>
          <button
            type="button"
            onClick={() => void saveProfile()}
            className="velmere-command-pill velmere-interaction-pulse mt-5 min-h-12 bg-[#F5F0E8] px-6 text-[11px] text-black hover:bg-white"
            data-tone="cyan"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            {t("save")}
          </button>
          <p className="mt-4 text-xs leading-6 text-white/[0.42]">{t("persistenceNote")}</p>
        </div>
      ) : null}
    </section>
  );
}
