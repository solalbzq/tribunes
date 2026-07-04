"use client";

import { useState, useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import ClubSettings from "./ClubSettings";
import ContentTab from "./ContentTab";
import SocialTab from "./SocialTab";
import { Icon } from "./icons";

type Club = {
  id: string;
  name: string;
  sport: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  visualConfig: unknown;
  tennisVisualConfig?: unknown;
  tenupUrl?: string | null;
  matches: Array<{
    id: string;
    opponent: string;
    homeScore: number;
    awayScore: number;
    isHome: boolean;
    competition: string | null;
    date: string;
    posts: Array<{ platform: string; content: string }>;
  }>;
} | null;

type View = "home" | "content" | "history" | "reseaux" | "settings";

const NAV: {
  key: View;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
}[] = [
  { key: "home", label: "Accueil", icon: "home" },
  { key: "content", label: "Générer du contenu", icon: "sparkles" },
  { key: "history", label: "Historique", icon: "clock" },
  { key: "reseaux", label: "Réseaux", icon: "link" },
  { key: "settings", label: "Mon club", icon: "palette" },
];

export default function DashboardClient({
  club,
  userEmail,
}: {
  club: Club;
  userEmail: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("home");

  // Ouvre l'onglet Réseaux au retour du flux OAuth (?tab=reseaux)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "reseaux") setView("reseaux");
  }, []);

  useEffect(() => {
    if (club) return;
    const pending = sessionStorage.getItem("pending_club");
    if (!pending) return;
    const { name, sport } = JSON.parse(pending);
    fetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sport }),
    }).then((r) => {
      if (r.ok) {
        sessionStorage.removeItem("pending_club");
        router.refresh();
      }
    });
  }, [club, router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted mb-4">Erreur de chargement du club.</p>
          <button
            onClick={handleLogout}
            className="text-brand underline text-sm"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const initials = club.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const currentLabel = NAV.find((n) => n.key === view)?.label ?? "";

  return (
    <div className="min-h-screen bg-subtle lg:grid lg:grid-cols-[264px_1fr]">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen border-r border-line bg-white">
        <div className="px-5 py-5">
          <Logo size={24} />
        </div>

        {/* Club identity */}
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-card border border-line bg-subtle/60 px-3 py-3">
          <ClubAvatar club={club} initials={initials} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{club.name}</p>
            <p className="truncate text-xs text-muted">{club.sport}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={view === item.key}
              onClick={() => setView(item.key)}
            />
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <a
            href="/account"
            className="flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-subtle hover:text-ink"
          >
            <Icon name="user" className="h-[18px] w-[18px]" />
            <span className="truncate">{userEmail}</span>
          </a>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-subtle hover:text-ink"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white/85 px-4 py-3 backdrop-blur-md">
          <Logo size={22} />
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-muted"
          >
            Déconnexion
          </button>
        </header>

        {/* Mobile nav */}
        <div className="lg:hidden flex gap-2 overflow-x-auto border-b border-line bg-white px-4 py-2">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex shrink-0 items-center gap-2 rounded-btn px-3 py-2 text-sm font-semibold transition ${
                view === item.key ? "bg-brand text-white" : "text-muted"
              }`}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          {/* Breadcrumb / page title (desktop) */}
          <div className="hidden lg:flex items-center gap-2 mb-6 text-sm">
            <span className="text-muted">Tribunes</span>
            <Icon name="chevron" className="h-4 w-4 text-line" />
            <span className="font-semibold text-ink">{currentLabel}</span>
          </div>

          {view === "home" && (
            <HomeView
              club={club}
              userEmail={userEmail}
              onNavigate={setView}
              initials={initials}
            />
          )}
          {view === "content" && <ContentTab club={club} />}
          {view === "reseaux" && <SocialTab />}
          {view === "history" && (
            <HistoryView club={club} onNavigate={setView} />
          )}
          {view === "settings" && <ClubSettings club={club} />}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────── Home ─────────────────────────── */

function HomeView({
  club,
  userEmail,
  onNavigate,
  initials,
}: {
  club: NonNullable<Club>;
  userEmail: string;
  onNavigate: (v: View) => void;
  initials: string;
}) {
  const totalPosts = club.matches.reduce((acc, m) => acc + m.posts.length, 0);
  const recent = [...club.matches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  const wins = club.matches.filter((m) => score(m).us > score(m).them).length;
  const losses = club.matches.filter((m) => score(m).us < score(m).them).length;
  const draws = club.matches.length - wins - losses;
  const winRate = club.matches.length
    ? Math.round((wins / club.matches.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome + primary action */}
      <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="relative p-6 sm:p-8">
          {/* accent club discret */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full opacity-[0.07] blur-2xl"
            style={{ background: club.primaryColor }}
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <ClubAvatar club={club} initials={initials} size={52} />
              <div>
                <p className="text-[13px] font-semibold text-muted">
                  Bonjour 👋🏻
                </p>
                <h1 className="text-2xl font-black tracking-[-0.02em] text-ink sm:text-3xl">
                  {club.name}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate("content")}
                className="inline-flex items-center gap-2 rounded-btn bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
              >
                <Icon name="sparkles" className="h-[18px] w-[18px]" />
                Générer une publication
              </button>
              <button
                onClick={() => onNavigate("settings")}
                className="inline-flex items-center gap-2 rounded-btn border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                <Icon name="palette" className="h-[18px] w-[18px]" />
                Personnaliser
              </button>
            </div>
          </div>
        </div>
        <p className="border-t border-line bg-subtle/60 px-6 py-3 text-[13px] text-muted sm:px-8">
          Votre communication est prête en quelques secondes — un résultat, un
          match ou un programme suffit.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon="fileText"
          label="Posts générés"
          value={String(totalPosts)}
          tone="brand"
        />
        <StatTile
          icon="calendar"
          label="Matchs suivis"
          value={String(club.matches.length)}
          tone="ink"
        />
        <StatTile
          icon="trophy"
          label="Taux de victoire"
          value={`${winRate}%`}
          tone="gold"
          helper={
            club.matches.length
              ? `${wins}V · ${losses}D · ${draws}N`
              : undefined
          }
        />
        <StatTile
          icon="trending"
          label="Posts / match"
          value={
            club.matches.length
              ? (totalPosts / club.matches.length).toFixed(1)
              : "0"
          }
          tone="success"
        />
      </section>

      {/* Two columns */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Recent activity */}
        <Card>
          <CardHeader
            title="Activité récente"
            subtitle="Vos derniers matchs"
            action={
              club.matches.length > 0 ? (
                <button
                  onClick={() => onNavigate("history")}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Tout voir
                </button>
              ) : undefined
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              icon="clock"
              title="Rien pour l'instant"
              text="Générez votre premier contenu pour voir l'activité de votre club ici."
              cta={
                <button
                  onClick={() => onNavigate("content")}
                  className="rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
                >
                  Commencer
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((m) => (
                <MatchRow key={m.id} club={club} match={m} />
              ))}
            </ul>
          )}
        </Card>

        {/* Réseaux */}
        <Card>
          <CardHeader
            title="Réseaux sociaux"
            subtitle="Publiez directement depuis Tribunes"
            action={
              <button
                onClick={() => onNavigate("reseaux")}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Gérer
              </button>
            }
          />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Audience", value: "—", icon: "users" as const },
              { label: "Engagement", value: "—", icon: "heart" as const },
              { label: "Portée", value: "—", icon: "trending" as const },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-btn bg-subtle p-4 text-center"
              >
                <Icon name={s.icon} className="mx-auto h-5 w-5 text-muted" />
                <p className="mt-2 text-2xl font-black text-ink">{s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-btn border border-line bg-white p-4">
            <p className="text-sm text-muted">
              Reliez votre Page Facebook et Instagram pour publier vos posts en
              un clic.
            </p>
            <button
              onClick={() => onNavigate("reseaux")}
              className="shrink-0 rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Connecter
            </button>
          </div>
        </Card>
      </section>

      <p className="text-center text-xs text-muted">
        Connecté en tant que {userEmail}
      </p>
    </div>
  );
}

/* ─────────────────────────── History ─────────────────────────── */

function HistoryView({
  club,
  onNavigate,
}: {
  club: NonNullable<Club>;
  onNavigate: (v: View) => void;
}) {
  if (club.matches.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="clock"
          title="Aucun match enregistré"
          text="Vos matchs et les publications générées apparaîtront ici."
          cta={
            <button
              onClick={() => onNavigate("content")}
              className="rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Générer un contenu
            </button>
          }
        />
      </Card>
    );
  }
  const sorted = [...club.matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black tracking-[-0.02em] text-ink">
          Historique
        </h1>
        <p className="text-sm text-muted">
          {club.matches.length} match{club.matches.length > 1 ? "s" : ""} ·{" "}
          {club.matches.reduce((a, m) => a + m.posts.length, 0)} publication
          {club.matches.reduce((a, m) => a + m.posts.length, 0) > 1 ? "s" : ""}
        </p>
      </div>
      <Card padded={false}>
        <ul className="divide-y divide-line">
          {sorted.map((m) => (
            <MatchRow key={m.id} club={club} match={m} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ─────────────────────────── Shared bits ─────────────────────────── */

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-brand-soft text-brand"
          : "text-muted hover:bg-subtle hover:text-ink"
      }`}
    >
      <Icon name={item.icon} className="h-[18px] w-[18px]" />
      {item.label}
    </button>
  );
}

function ClubAvatar({
  club,
  initials,
  size = 40,
}: {
  club: NonNullable<Club>;
  initials: string;
  size?: number;
}) {
  if (club.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={club.logoUrl}
        alt={club.name}
        width={size}
        height={size}
        className="rounded-xl object-contain bg-white border border-line"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-xl font-black text-white"
      style={{
        width: size,
        height: size,
        background: club.primaryColor,
        fontSize: size * 0.36,
      }}
    >
      {initials || "TC"}
    </div>
  );
}

function Card({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-white shadow-card ${padded ? "p-5 sm:p-6" : ""}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  brand: { bg: "bg-brand-soft", fg: "text-brand" },
  gold: { bg: "bg-gold-soft", fg: "text-gold-hover" },
  success: { bg: "bg-emerald-50", fg: "text-emerald-600" },
  ink: { bg: "bg-subtle", fg: "text-ink" },
} as const;

function StatTile({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  value: string;
  helper?: string;
  tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-btn ${t.bg} ${t.fg}`}
      >
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-3 text-2xl font-black tracking-[-0.02em] text-ink sm:text-[1.7rem]">
        {value}
      </p>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      {helper && <p className="mt-0.5 text-xs text-muted/80">{helper}</p>}
    </div>
  );
}

function MatchRow({
  club,
  match,
}: {
  club: NonNullable<Club>;
  match: NonNullable<Club>["matches"][number];
}) {
  const { us, them } = score(match);
  const res = us > them ? "V" : us < them ? "D" : "N";
  const cls =
    res === "V"
      ? "bg-emerald-50 text-emerald-700"
      : res === "D"
        ? "bg-brand-soft text-brand"
        : "bg-subtle text-muted";
  return (
    <li className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black ${cls}`}
          >
            {res}
          </span>
          <p className="truncate text-[14px] font-semibold text-ink">
            {club.name}{" "}
            <span className="tabular-nums">
              {us}–{them}
            </span>{" "}
            {match.opponent}
          </p>
        </div>
        <p className="mt-0.5 pl-8 text-[12px] text-muted">
          {match.competition ?? "Match amical"} · {formatDate(match.date)}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted">
        {match.posts.length} post{match.posts.length > 1 ? "s" : ""}
      </span>
    </li>
  );
}

function EmptyState({
  icon,
  title,
  text,
  cta,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  text: string;
  cta?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-btn bg-subtle/60 px-6 py-10 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-muted shadow-card">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="font-bold text-ink">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      </div>
      {cta}
    </div>
  );
}

function score(m: NonNullable<Club>["matches"][number]) {
  return {
    us: m.isHome ? m.homeScore : m.awayScore,
    them: m.isHome ? m.awayScore : m.homeScore,
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
