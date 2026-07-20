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
  automationMode: string;
  telegramChatId: string | null;
  automationEnabled: boolean;
  contentTone: string;
  matches: Array<{
    id: string;
    opponent: string;
    homeScore: number;
    awayScore: number;
    isHome: boolean;
    competition: string | null;
    date: string;
    posts: Array<{ id: string; platform: string; content: string; status: string }>;
  }>;
} | null;

type SocialConnection = {
  id: string;
  provider: string;
};

type Draft = {
  id: string;
  platform: string;
  content: string;
  postType: string;
  status: string;
  createdAt: string;
  match: {
    id: string;
    opponent: string;
    competition: string | null;
    date: string;
  } | null;
  tournamentSchedule: {
    id: string;
    tournamentName: string;
    matchDate: string;
  } | null;
  weeklySchedule: {
    id: string;
    weekStart: string;
    weekEnd: string;
  } | null;
  seasonRecap: {
    id: string;
    periodStart: string;
    periodEnd: string;
    wins: number;
    draws: number;
    losses: number;
  } | null;
};

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
  drafts,
  userEmail,
}: {
  club: Club;
  drafts: Draft[];
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
            <HistoryView club={club} drafts={drafts} onNavigate={setView} />
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
  const [connections, setConnections] = useState<SocialConnection[] | null>(null);
  const totalPosts = club.matches.reduce((acc, m) => acc + m.posts.length, 0);
  const recent = [...club.matches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  const coveredEvents = club.matches.filter((m) => m.posts.length > 0).length;
  const estimatedMinutesSaved = totalPosts * 12;
  const scheduledPosts = club.matches.reduce(
    (acc, match) =>
      acc + match.posts.filter((post) => post.status === "PUBLISHED").length,
    0,
  );
  const pendingPosts = club.matches.reduce(
    (acc, match) =>
      acc +
      match.posts.filter((post) => post.status !== "PUBLISHED").length,
    0,
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/social/connections", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setConnections(data?.connections ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConnections([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const todayActions = buildTodayActions({
    club,
    connections,
    onNavigate,
  });
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome + primary action */}
      <section className="overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="relative p-6 sm:p-8">
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
            </div>
          </div>
        </div>
        <p className="border-t border-line bg-subtle/60 px-6 py-3 text-[13px] text-muted sm:px-8">
          Votre communication est prête en quelques secondes — un résultat, un
          match ou un programme suffit.
        </p>
      </section>

      <Card>
        <CardHeader
          title="A faire aujourd'hui"
          subtitle="Les prochaines actions utiles pour la communication du club"
        />
        {todayActions.length === 0 ? (
          <EmptyState
            icon="check"
            title="Tout est en place"
            text="Votre club est configure et aucune action urgente n'attend une publication."
            cta={
              <button
                onClick={() => onNavigate("content")}
                className="rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                Générer un contenu
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {todayActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex w-full items-start gap-3 rounded-btn border border-line bg-white px-4 py-4 text-left transition hover:border-brand/30 hover:bg-subtle/70"
              >
                <span
                  className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${action.tone.bg} ${action.tone.fg}`}
                >
                  <Icon name={action.icon} className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{action.label}</p>
                  <p className="mt-1 text-sm text-muted">{action.description}</p>
                </div>
                <Icon
                  name="arrowRight"
                  className="mt-1 h-4 w-4 shrink-0 text-muted"
                />
              </button>
            ))}
          </div>
        )}
      </Card>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon="fileText"
          label="Publications creees"
          value={String(totalPosts)}
          tone="brand"
        />
        <StatTile
          icon="calendar"
          label="Evenements couverts"
          value={String(coveredEvents)}
          tone="ink"
        />
        <StatTile
          icon="clock"
          label="Temps economise"
          value={formatSavedTime(estimatedMinutesSaved)}
          tone="success"
          helper="Estimation moyenne"
        />
        <StatTile
          icon="sparkles"
          label={scheduledPosts > 0 ? "Publications publiees" : "Publications en attente"}
          value={String(scheduledPosts > 0 ? scheduledPosts : pendingPosts)}
          tone={scheduledPosts > 0 ? "gold" : "brand"}
          helper={scheduledPosts > 0 ? "Deja envoyees" : "Pretes a relire"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Activité récente"
            subtitle="Les derniers contenus prepares par Tribunes"
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

        <Card>
          <CardHeader
            title="Réseaux sociaux"
            subtitle="Etat actuel de vos connexions"
            action={
              <button
                onClick={() => onNavigate("reseaux")}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Gérer les connexions
              </button>
            }
          />
          <div className="space-y-3">
            {buildConnectionItems(connections).map((network) => (
              <div
                key={network.label}
                className="flex items-center justify-between rounded-btn border border-line bg-subtle/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{network.label}</p>
                  <p className="text-xs text-muted">{network.helper}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${network.connected ? "bg-emerald-50 text-emerald-700" : "bg-subtle text-muted"}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${network.connected ? "bg-emerald-500" : "bg-line"}`}
                  />
                  {network.connected ? "Connecté" : "À connecter"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader
          title="Historique"
          subtitle="Retrouvez toutes les publications et rencontres deja traitees"
          action={
            club.matches.length > 0 ? (
              <button
                onClick={() => onNavigate("history")}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Voir tout l'historique
              </button>
            ) : undefined
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <HistoryMiniStat
            label="Publications"
            value={String(totalPosts)}
            helper="Generees au total"
          />
          <HistoryMiniStat
            label="Dernier evenement"
            value={recent[0] ? formatShortDate(recent[0].date) : "-"}
            helper={recent[0]?.competition ?? "Aucun historique"}
          />
          <HistoryMiniStat
            label="Dernier statut"
            value={recent[0] ? getMatchStatusLabel(recent[0]) : "-"}
            helper="Sur vos contenus recents"
          />
        </div>
      </Card>

      <p className="text-center text-xs text-muted">
        Connecté en tant que {userEmail}
      </p>
    </div>
  );
}

/* ─────────────────────────── History ─────────────────────────── */

function HistoryView({
  club,
  drafts,
  onNavigate,
}: {
  club: NonNullable<Club>;
  drafts: Draft[];
  onNavigate: (v: View) => void;
}) {
  const sorted = [...club.matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const draftMatches = new Set(drafts.map((draft) => draft.match?.id).filter(Boolean));

  if (club.matches.length === 0) {
    return (
      <div className="space-y-4">
        {drafts.length > 0 && (
          <DraftsPanel drafts={drafts} />
        )}
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
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

      {drafts.length > 0 && <DraftsPanel drafts={drafts} />}

      <Card>
        <CardHeader
          title="Rencontres et publications"
          subtitle={`${sorted.length} evenement${sorted.length > 1 ? "s" : ""} dans l'historique`}
        />
        <div className="space-y-3">
          {sorted.map((match) => (
            <HistoryMatchCard
              key={match.id}
              club={club}
              match={match}
              hasDraft={draftMatches.has(match.id)}
            />
          ))}
        </div>
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
        {match.posts.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
            {uniquePlatforms(match.posts).map((platform) => (
              <span
                key={platform}
                className="rounded-full bg-subtle px-2.5 py-1 text-[11px] font-semibold text-muted"
              >
                {formatPlatform(platform)}
              </span>
            ))}
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">
              {getMatchStatusLabel(match)}
            </span>
          </div>
        )}
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

function HistoryMiniStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-btn bg-subtle/60 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-lg font-black tracking-[-0.02em] text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{helper}</p>
    </div>
  );
}

function DraftsPanel({ drafts }: { drafts: Draft[] }) {
  return (
    <Card>
      <CardHeader
        title="Brouillons"
        subtitle="Retouchez vos textes avant publication"
        action={
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            {drafts.length} brouillon{drafts.length > 1 ? "s" : ""}
          </span>
        }
      />
      <div className="space-y-4">
        {drafts.map((draft) => (
          <DraftEditorCard key={draft.id} draft={draft} />
        ))}
      </div>
    </Card>
  );
}

function DraftEditorCard({ draft }: { draft: Draft }) {
  const [content, setContent] = useState(draft.content);
  const [savedContent, setSavedContent] = useState(draft.content);
  const [status, setStatus] = useState(draft.status);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState<"publish" | "reject" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const dirty = content !== savedContent;
  const pendingReview = status === "PENDING_REVIEW";

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/generated-posts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        setMessage("Impossible d'enregistrer ce brouillon.");
        return;
      }

      const data = await res.json();
      setContent(data.content);
      setSavedContent(data.content);
      setMessage("Brouillon mis a jour.");
    } catch {
      setMessage("Impossible d'enregistrer ce brouillon.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    setReviewing("reject");
    setMessage(null);
    try {
      const res = await fetch(`/api/generated-posts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      if (!res.ok) {
        setMessage("Impossible de rejeter ce post.");
        return;
      }
      setStatus("REJECTED");
      setMessage("Post rejeté.");
    } catch {
      setMessage("Impossible de rejeter ce post.");
    } finally {
      setReviewing(null);
    }
  }

  async function handlePublish() {
    setReviewing("publish");
    setMessage(null);
    try {
      const connsRes = await fetch("/api/social/connections", { cache: "no-store" });
      const connsData = await connsRes.json();
      const targets: string[] = (connsData.connections ?? [])
        .filter((c: { provider: string }) => c.provider === draft.platform)
        .map((c: { id: string }) => c.id);

      if (targets.length === 0) {
        setMessage("Aucun réseau connecté pour cette plateforme.");
        return;
      }

      const fd = new FormData();
      fd.append("text", content);
      fd.append("targets", JSON.stringify(targets));
      fd.append("generatedPostId", draft.id);
      const res = await fetch("/api/social/publish", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        setMessage(data.error ?? "Échec de la publication.");
        return;
      }
      const allOk = (data.results ?? []).every((r: { ok: boolean }) => r.ok);
      setStatus(allOk ? "PUBLISHED" : "PARTIAL");
      setMessage(allOk ? "Publié." : "Publication partielle.");
    } catch {
      setMessage("Échec de la publication.");
    } finally {
      setReviewing(null);
    }
  }

  return (
    <div className="rounded-card border border-line bg-subtle/40 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink shadow-card">
              {formatPostType(draft.postType)}
            </span>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              {formatPlatform(draft.platform)}
            </span>
            {pendingReview && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                En attente de validation
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-ink">{describeDraftContext(draft)}</p>
          <p className="text-xs text-muted">
            Cree le {formatDateTime(draft.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {pendingReview && (
            <>
              <button
                onClick={handleReject}
                disabled={reviewing !== null}
                className="inline-flex items-center justify-center rounded-btn border border-line px-4 py-2 text-sm font-semibold text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewing === "reject" ? "Rejet..." : "Rejeter"}
              </button>
              <button
                onClick={handlePublish}
                disabled={reviewing !== null}
                className="inline-flex items-center justify-center rounded-btn bg-success px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewing === "publish" ? "Publication..." : "Publier"}
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving || !content.trim()}
            className="inline-flex items-center justify-center rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={7}
        className="mt-4 w-full rounded-btn border border-line bg-white px-4 py-3 text-sm leading-relaxed text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
      />

      <div className="mt-3 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>{content.length} caracteres</span>
        <span className={message === "Brouillon mis a jour." ? "text-emerald-700" : "text-muted"}>
          {message ?? (dirty ? "Modifications non enregistrees" : "" )}
        </span>
      </div>
    </div>
  );
}

function HistoryMatchCard({
  club,
  match,
  hasDraft,
}: {
  club: NonNullable<Club>;
  match: NonNullable<Club>["matches"][number];
  hasDraft: boolean;
}) {
  const { us, them } = score(match);
  const result = us > them ? "Victoire" : us < them ? "Defaite" : "Nul";
  const status = getMatchStatusLabel(match);

  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${resultTone(result)}`}>
              {result}
            </span>
            <span className="rounded-full bg-subtle px-3 py-1 text-xs font-semibold text-muted">
              {formatDate(match.date)}
            </span>
            {hasDraft && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Brouillon en cours
              </span>
            )}
          </div>
          <p className="text-base font-bold text-ink sm:text-lg">
            {club.name} <span className="tabular-nums">{us}–{them}</span> {match.opponent}
          </p>
          <p className="text-sm text-muted">
            {match.competition ?? "Match amical"}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            {status}
          </span>
          <span className="rounded-full bg-subtle px-3 py-1 text-xs font-semibold text-muted">
            {match.posts.length} post{match.posts.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {match.posts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {match.posts.map((post) => (
            <span
              key={post.id}
              className="rounded-full border border-line bg-subtle/70 px-3 py-1 text-xs font-semibold text-muted"
            >
              {formatPlatform(post.platform)} · {formatPostStatus(post.status)}
            </span>
          ))}
        </div>
      )}
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

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatSavedTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} h ${String(minutes).padStart(2, "0")}`;
}

function uniquePlatforms(posts: Array<{ platform: string }>) {
  return [...new Set(posts.map((post) => post.platform))];
}

function formatPlatform(platform: string) {
  const labels: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    whatsapp: "WhatsApp",
  };

  return labels[platform] ?? platform;
}

function formatPostType(postType: string) {
  const labels: Record<string, string> = {
    MATCH_RESULT: "Resultat",
    INTERCLUB_RESULT: "Resultat interclubs",
    WEEKLY_SCHEDULE: "Programme",
    TOURNAMENT_SCHEDULE: "Tournoi",
    SEASON_RECAP: "Bilan",
  };

  return labels[postType] ?? postType;
}

function formatPostStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    PENDING_REVIEW: "En attente de validation",
    PUBLISHED: "Publie",
    PARTIAL: "Partiel",
    FAILED: "Echec",
    REJECTED: "Rejete",
  };

  return labels[status] ?? status;
}

function describeDraftContext(draft: Draft) {
  if (draft.match) {
    return `${draft.match.competition ?? "Match"} contre ${draft.match.opponent} · ${formatDate(draft.match.date)}`;
  }

  if (draft.tournamentSchedule) {
    return `${draft.tournamentSchedule.tournamentName} · ${formatDate(draft.tournamentSchedule.matchDate)}`;
  }

  if (draft.weeklySchedule) {
    return `Programme de la semaine du ${formatShortDate(draft.weeklySchedule.weekStart)} au ${formatShortDate(draft.weeklySchedule.weekEnd)}`;
  }

  if (draft.seasonRecap) {
    const r = draft.seasonRecap;
    return `Bilan du ${formatShortDate(r.periodStart)} au ${formatShortDate(r.periodEnd)} · ${r.wins}V ${r.draws}N ${r.losses}D`;
  }

  return "Brouillon Tribunes";
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resultTone(result: string) {
  if (result === "Victoire") return "bg-emerald-50 text-emerald-700";
  if (result === "Defaite") return "bg-brand-soft text-brand";
  return "bg-subtle text-muted";
}

function getMatchStatusLabel(match: NonNullable<Club>["matches"][number]) {
  if (match.posts.some((post) => post.status === "PUBLISHED")) {
    return "Publié";
  }

  if (match.posts.length > 0) {
    return "Brouillon";
  }

  return "A créer";
}

function buildTodayActions({
  club,
  connections,
  onNavigate,
}: {
  club: NonNullable<Club>;
  connections: SocialConnection[] | null;
  onNavigate: (v: View) => void;
}) {
  const actions: Array<{
    kind: string;
    label: string;
    description: string;
    icon: Parameters<typeof Icon>[0]["name"];
    onClick: () => void;
    tone: { bg: string; fg: string };
  }> = [];
  const sortedMatches = [...club.matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const nextUnpublished = sortedMatches.find((match) => match.posts.length === 0);
  const lastDraft = [...sortedMatches]
    .reverse()
    .find((match) => match.posts.some((post) => post.status !== "PUBLISHED"));
  const hasFacebook =
    connections?.some((connection) => connection.provider === "facebook") ?? false;
  const hasInstagram =
    connections?.some((connection) => connection.provider === "instagram") ?? false;
  const needsBrandSetup =
    !club.logoUrl ||
    club.primaryColor === "#1a1a2e" ||
    club.secondaryColor === "#e94560";

  if (lastDraft) {
    actions.push({
      kind: "draft",
      label: `Finaliser ${getResultLabel(lastDraft)}`,
      description: `Un brouillon est deja pret pour ${formatDate(lastDraft.date).toLowerCase()}.`,
      icon: "fileText",
      onClick: () => onNavigate("history"),
      tone: { bg: "bg-emerald-50", fg: "text-emerald-700" },
    });
  }

  if (nextUnpublished) {
    actions.push({
      kind: "generate",
      label: `Generer ${getResultLabel(nextUnpublished)}`,
      description: `${nextUnpublished.competition ?? "Cette rencontre"} n'a pas encore de publication associee.`,
      icon: "sparkles",
      onClick: () => onNavigate("content"),
      tone: { bg: "bg-brand-soft", fg: "text-brand" },
    });
  }

  if (!hasInstagram || !hasFacebook) {
    actions.push({
      kind: "social",
      label: !hasInstagram ? "Connecter Instagram" : "Connecter Facebook",
      description:
        "Publiez directement depuis Tribunes sans repasser par un autre outil.",
      icon: "link",
      onClick: () => onNavigate("reseaux"),
      tone: { bg: "bg-amber-50", fg: "text-amber-700" },
    });
  }

  if (needsBrandSetup) {
    actions.push({
      kind: "branding",
      label: "Ajouter les couleurs du club",
      description:
        "Personnalisez l'identite visuelle pour gagner du temps sur chaque publication.",
      icon: "palette",
      onClick: () => onNavigate("settings"),
      tone: { bg: "bg-violet-50", fg: "text-violet-700" },
    });
  }

  return actions.slice(0, 4);
}

function getResultLabel(match: NonNullable<Club>["matches"][number]) {
  return new Date(match.date).getTime() <= Date.now()
    ? `le resultat contre ${match.opponent}`
    : `l'annonce du match contre ${match.opponent}`;
}

function buildConnectionItems(connections: SocialConnection[] | null) {
  const providers = new Set((connections ?? []).map((connection) => connection.provider));

  return [
    {
      label: "Facebook",
      helper: "Page reliee a Tribunes",
      connected: providers.has("facebook"),
    },
    {
      label: "Instagram",
      helper: "Compte professionnel relie",
      connected: providers.has("instagram"),
    },
    {
      label: "LinkedIn",
      helper: "Connexion non activee",
      connected: providers.has("linkedin"),
    },
    {
      label: "Meta Business Suite",
      helper: "Pilote Facebook et Instagram",
      connected: providers.has("facebook") || providers.has("instagram"),
    },
  ];
}
