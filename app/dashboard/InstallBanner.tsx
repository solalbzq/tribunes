"use client";

import { useEffect, useState } from "react";
import { isDismissed, isIosSafari, rememberDismissal } from "@/lib/installBanner";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "android" | "ios";

export default function InstallBanner() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (isDismissed(window.localStorage)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    if (isIosSafari(navigator.userAgent)) {
      setMode("ios");
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
      setMode("android");
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mode) return null;

  function close() {
    rememberDismissal(window.localStorage);
    setMode(null);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    close();
  }

  return (
    <div
      role="status"
      className="lg:hidden mb-6 flex items-start justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-card"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          Ajoutez Tribunes à votre écran d&apos;accueil
        </p>
        {mode === "ios" ? (
          <p className="mt-1 text-sm text-muted">
            1. Touchez le bouton Partager de Safari.
            <br />
            2. Choisissez « Sur l&apos;écran d&apos;accueil ».
          </p>
        ) : (
          <button
            onClick={install}
            className="mt-2 inline-flex items-center justify-center rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
          >
            Installer
          </button>
        )}
      </div>
      <button
        onClick={close}
        aria-label="Fermer"
        className="shrink-0 rounded-btn px-2 py-1 text-lg leading-none text-muted hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}
