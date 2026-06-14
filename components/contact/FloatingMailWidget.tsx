"use client";

import { useEffect, useState } from "react";
import { Mail, Paperclip, Send, ShieldCheck, X } from "lucide-react";
import { useLocale } from "next-intl";
import { DrawerRoot } from "@/components/ui/OverlayPrimitives";

const copy = {
  en: {
    chip: "Mail",
    title: "Send a private note",
    intro: "Orders, legal questions, security reports and collaboration files.",
    name: "Name / handle",
    email: "Email (optional)",
    subject: "Subject",
    message: "Message",
    file: "Attach file",
    send: "Send note",
    sending: "Sending…",
    sent: "Message received. We will review it manually.",
    error: "Message could not be sent. Try again.",
    note: "Never send seed phrases, private keys or wallet recovery data.",
    close: "Close private message",
  },
  pl: {
    chip: "Mail",
    title: "Wyślij prywatną wiadomość",
    intro:
      "Zamówienia, kwestie prawne, zgłoszenia bezpieczeństwa i współpraca.",
    name: "Imię / handle",
    email: "E-mail (opcjonalnie)",
    subject: "Tytuł",
    message: "Wiadomość",
    file: "Załącz plik",
    send: "Wyślij wiadomość",
    sending: "Wysyłanie…",
    sent: "Wiadomość przyjęta. Sprawdzimy ją ręcznie.",
    error: "Nie udało się wysłać wiadomości. Spróbuj ponownie.",
    note: "Nigdy nie wysyłaj seed phrase, kluczy prywatnych ani danych odzyskiwania portfela.",
    close: "Zamknij prywatną wiadomość",
  },
  de: {
    chip: "Mail",
    title: "Private Nachricht senden",
    intro:
      "Bestellungen, rechtliche Fragen, Security Reports und Zusammenarbeit.",
    name: "Name / Handle",
    email: "E-Mail (optional)",
    subject: "Betreff",
    message: "Nachricht",
    file: "Datei anhängen",
    send: "Nachricht senden",
    sending: "Wird gesendet…",
    sent: "Nachricht empfangen. Wir prüfen sie manuell.",
    error: "Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.",
    note: "Sende niemals Seed Phrases, Private Keys oder Wallet-Recovery-Daten.",
    close: "Private Nachricht schließen",
  },
} as const;

export default function FloatingMailWidget() {
  const locale = useLocale() as keyof typeof copy;
  const t = copy[locale] ?? copy.en;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [fileName, setFileName] = useState("");
  const maxAttachmentBytes = 5 * 1024 * 1024;
  useEffect(() => {
    const openMail = () => {
      setStatus("idle");
      setOpen(true);
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => setOpen(true));
      }
    };
    window.addEventListener("velmere:open-mail", openMail);
    return () => window.removeEventListener("velmere:open-mail", openMail);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/contact/message", {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error("contact_failed");
      setStatus("sent");
      event.currentTarget.reset();
      setFileName("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <DrawerRoot
      open={open}
      onClose={() => setOpen(false)}
      closeLabel={t.close}
      ariaLabelledBy="velmere-private-mail-title"
      ariaLabel={t.title}
      motionPreset="left"
      lockScroll={true}
      surfaceId="velmere-private-mail-drawer"
      surfaceClassName="velmere-command-shell velmere-side-drawer-panel velmere-private-mail-drawer fixed inset-x-3 bottom-3 top-3 flex flex-col overflow-hidden rounded-[1.8rem] text-velmere-ivory sm:inset-y-auto sm:bottom-4 sm:left-4 sm:right-auto sm:max-h-[min(44rem,calc(100dvh-2rem))] sm:w-[min(31rem,calc(100vw-2rem))]"
      surfaceData={{ surface: "private-mail", pass1975: "header-mail-hard-open", pass1976: "visible-mail-drawer", pass2005: "solid-owned-scroll-file-guard" }}
    >
      <div className="velmere-dialog-header flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <p className="velmere-label inline-flex items-center gap-2 text-velmere-gold">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t.chip}
          </p>
          <h2
            id="velmere-private-mail-title"
            className="mt-2 font-serif text-2xl leading-tight text-white sm:text-3xl"
          >
            {t.title}
          </h2>
          <p className="mt-2 max-w-md text-xs leading-6 text-white/[0.46]">
            {t.intro}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={(event) => { event.preventDefault(); setOpen(false); }}
          onClick={() => setOpen(false)}
          className="velmere-command-pill velmere-interaction-pulse grid h-11 w-11 shrink-0 place-items-center px-0 text-white/[0.55] hover:text-white"
          aria-label={t.close}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form
        onSubmit={submit}
        data-modal-scroll-region="true"
        className="luxury-scrollbar grid min-h-0 flex-1 gap-3 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" placeholder={t.name} className="velmere-field" />
          <input
            name="email"
            type="email"
            placeholder={t.email}
            className="velmere-field"
          />
        </div>
        <input
          name="subject"
          required
          placeholder={t.subject}
          className="velmere-field"
        />
        <textarea
          name="message"
          required
          placeholder={t.message}
          className="velmere-field min-h-40 resize-y leading-7"
        />

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="velmere-command-pill velmere-interaction-pulse inline-flex min-h-12 cursor-pointer justify-start overflow-hidden px-4 text-[10px] text-white/[0.55]">
            <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{fileName || t.file}</span>
            <input
              name="attachment"
              type="file"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && file.size > maxAttachmentBytes) {
                  event.currentTarget.value = "";
                  setFileName("");
                  setStatus("error");
                  return;
                }
                setStatus("idle");
                setFileName(file?.name ?? "");
              }}
            />
          </label>
          <button
            type="submit"
            disabled={status === "loading"}
            className="velmere-button-primary min-h-12 disabled:cursor-wait disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {status === "loading" ? t.sending : t.send}
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {status === "sent" ? (
            <p className="velmere-status-note" data-tone="success">
              {t.sent}
            </p>
          ) : null}
          {status === "error" ? (
            <p className="velmere-status-note" data-tone="danger">
              {t.error}
            </p>
          ) : null}
        </div>

        <p className="velmere-form-note">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-velmere-gold"
            aria-hidden="true"
          />
          <span>{t.note}</span>
        </p>
      </form>
    </DrawerRoot>
  );
}
