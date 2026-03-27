import { useCallback, useEffect, useMemo, useState } from "react";
import { DollarSign, Receipt, BellRing, WalletCards, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWallet } from "../hooks/use-wallet";
import {
  fetchDashboardActivity,
  fetchDashboardSummary,
  fetchProfile,
  getApiErrorMessage,
  normalizeDecimal,
  type ApiActivityRecord,
  type ApiDashboardSummary,
  type ApiProfile,
} from "../utils/api-client";
import { formatCurrency, formatRelativeTime } from "../utils/format";

function describeActivity(
  activity: ApiActivityRecord,
  currency: string,
): { title: string; amount?: string } {
  const amount = normalizeDecimal(activity.metadata.amount as number | string | undefined);
  const totalAmount = normalizeDecimal(activity.metadata.totalAmount as number | string | undefined);
  const titleFromMetadata =
    typeof activity.metadata.title === "string" ? activity.metadata.title : undefined;

  switch (activity.activityType) {
    case "split_created":
      return {
        title: titleFromMetadata
          ? `Created ${titleFromMetadata}`
          : "Created a new split",
        amount: totalAmount > 0 ? formatCurrency(totalAmount, currency) : undefined,
      };
    case "payment_made":
      return {
        title: titleFromMetadata
          ? `Paid toward ${titleFromMetadata}`
          : "Payment sent",
        amount: amount > 0 ? formatCurrency(amount, currency) : undefined,
      };
    case "payment_received":
      return {
        title: titleFromMetadata
          ? `Received payment for ${titleFromMetadata}`
          : "Payment received",
        amount: amount > 0 ? formatCurrency(amount, currency) : undefined,
      };
    case "split_completed":
      return {
        title: titleFromMetadata
          ? `${titleFromMetadata} was completed`
          : "A split was completed",
      };
    case "split_edited":
      return {
        title: titleFromMetadata
          ? `Updated ${titleFromMetadata}`
          : "Updated a split",
      };
    default:
      return {
        title: titleFromMetadata ?? "Activity update",
        amount: amount > 0 ? formatCurrency(amount, currency) : undefined,
      };
  }
}

function DashboardLoadingState() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-theme bg-card-theme p-5 shadow-sm animate-pulse"
          >
            <div className="h-10 w-10 rounded-xl bg-gray-200" />
            <div className="mt-4 h-3 w-24 rounded bg-gray-200" />
            <div className="mt-3 h-8 w-28 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-theme bg-card-theme p-5 shadow-sm animate-pulse">
        <div className="h-5 w-36 rounded bg-gray-200" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3 border-b border-theme pb-4 last:border-b-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-2/3 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
              </div>
              <div className="h-4 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { activeUserId } = useWallet();
  const [summary, setSummary] = useState<ApiDashboardSummary | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [activities, setActivities] = useState<ApiActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currency = profile?.preferredCurrency ?? "USD";

  const loadDashboard = useCallback(async () => {
    if (!activeUserId) {
      setSummary(null);
      setProfile(null);
      setActivities([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [summaryResult, activityResult, profileResult] = await Promise.all([
        fetchDashboardSummary(),
        fetchDashboardActivity(1, 6),
        fetchProfile(activeUserId),
      ]);

      setSummary(summaryResult);
      setActivities(activityResult.data);
      setProfile(profileResult);
    } catch (dashboardError) {
      setError(getApiErrorMessage(dashboardError));
    } finally {
      setIsLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        title: t("dashboard.stats.youOwe"),
        value: formatCurrency(normalizeDecimal(summary.totalOwed), currency),
        change: "Across your active splits",
        icon: DollarSign,
        color: "bg-rose-500",
      },
      {
        title: "Owed to you",
        value: formatCurrency(normalizeDecimal(summary.totalOwedToUser), currency),
        change: "Waiting to be settled",
        icon: WalletCards,
        color: "bg-emerald-500",
      },
      {
        title: t("dashboard.stats.pendingSplits"),
        value: String(summary.activeSplits),
        change: "Splits still in progress",
        icon: Receipt,
        color: "bg-orange-500",
      },
      {
        title: "Unread activity",
        value: String(summary.unreadNotifications),
        change: `${summary.splitsCreated} open split${summary.splitsCreated === 1 ? "" : "s"} created by you`,
        icon: BellRing,
        color: "bg-blue-500",
      },
    ];
  }, [currency, summary, t]);

  return (
    <main
      className="min-h-dvh bg-theme [padding-top:calc(clamp(1rem,3vw,1.5rem)+env(safe-area-inset-top))] [padding-right:calc(clamp(0.75rem,4vw,1.5rem)+env(safe-area-inset-right))] [padding-bottom:calc(clamp(1rem,3vw,1.5rem)+env(safe-area-inset-bottom))] [padding-left:calc(clamp(0.75rem,4vw,1.5rem)+env(safe-area-inset-left))]"
      aria-label="Dashboard"
    >
      <div className="max-w-7xl mx-auto">
        <header className="mb-[clamp(1.25rem,4vw,2rem)] flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.375rem,5vw,1.875rem)] font-bold leading-tight text-theme">
              {t("dashboard.title")}
            </h1>
            <p className="text-sm text-muted-theme mt-0.5">
              {activeUserId
                ? profile?.displayName
                  ? `Signed in as ${profile.displayName}`
                  : `Signed in as ${activeUserId.slice(0, 6)}...${activeUserId.slice(-4)}`
                : "Connect your wallet to load live split totals and activity."}
            </p>
          </div>

          {activeUserId ? (
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="inline-flex items-center gap-2 rounded-xl border border-theme bg-card-theme px-4 py-2 text-sm font-semibold text-theme transition hover:bg-surface"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          ) : null}
        </header>

        {!activeUserId ? (
          <div className="rounded-2xl border border-theme bg-card-theme p-8 shadow-sm">
            <h2 className="text-xl font-bold text-theme">Connect your wallet to continue</h2>
            <p className="mt-2 text-sm text-muted-theme">
              Dashboard cards, recent activity, and split balances load from the backend for the currently connected account.
            </p>
          </div>
        ) : isLoading ? (
          <DashboardLoadingState />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-red-800">Could not load your dashboard</h2>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.title}
                    className="rounded-2xl border border-theme bg-card-theme p-5 shadow-sm"
                  >
                    <div className={`${stat.color} w-fit rounded-xl p-3`}>
                      <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-sm font-medium text-muted-theme">
                      {stat.title}
                    </h2>
                    <p className="mt-2 text-3xl font-bold text-theme tabular-nums">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm text-muted-theme">{stat.change}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="rounded-2xl border border-theme bg-card-theme p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-theme">
                    {t("dashboard.recentActivity")}
                  </h2>
                  <button
                    type="button"
                    onClick={() => void loadDashboard()}
                    className="inline-flex items-center gap-2 rounded-lg border border-theme px-3 py-1.5 text-xs font-semibold text-theme transition hover:bg-surface"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry fetch
                  </button>
                </div>

                {activities.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-theme p-8 text-center">
                    <p className="text-base font-semibold text-theme">No recent activity yet</p>
                    <p className="mt-2 text-sm text-muted-theme">
                      Split creation, receipt updates, and payment events will appear here once the backend records them.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-theme">
                    {activities.map((activity) => {
                      const description = describeActivity(activity, currency);
                      const content = (
                        <>
                          <div className="min-w-0">
                            <p className="font-medium text-theme text-sm sm:text-base truncate">
                              {description.title}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-theme mt-0.5 truncate">
                              {activity.splitId ? `Split ${activity.splitId.slice(0, 8)}` : "Account activity"} • {formatRelativeTime(new Date(activity.createdAt))}
                            </p>
                          </div>
                          {description.amount ? (
                            <p className="font-semibold text-theme text-sm sm:text-base tabular-nums shrink-0">
                              {description.amount}
                            </p>
                          ) : null}
                        </>
                      );

                      return activity.splitId ? (
                        <Link
                          to={`/split/${activity.splitId}`}
                          key={activity.id}
                          className="flex items-center justify-between gap-3 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 focus-visible:rounded-md"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={activity.id} className="flex items-center justify-between gap-3 py-4">
                          {content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-theme bg-card-theme p-5 shadow-sm">
                <h2 className="text-lg font-bold text-theme">{t("dashboard.quickActions")}</h2>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <Link
                    to="/create-split"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                  >
                    {t("dashboard.actions.addExpense")}
                  </Link>
                  <Link
                    to="/history"
                    className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
                  >
                    View History
                  </Link>
                  <Link
                    to="/analytics"
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    {t("dashboard.actions.viewReports")}
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
