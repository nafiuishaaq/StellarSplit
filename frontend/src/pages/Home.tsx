import { Link } from "react-router-dom";

const quickLinks = [
  {
    title: "Open dashboard",
    description: "See your live split summary, balances, and recent activity.",
    to: "/dashboard",
  },
  {
    title: "Create a split",
    description: "Start a new expense, invite participants, and save a real draft.",
    to: "/create-split",
  },
  {
    title: "Review history",
    description: "Browse previous groups, settlements, and notifications.",
    to: "/history",
  },
];

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-8 sm:px-8 sm:py-10">
      <div className="rounded-[2rem] border border-theme bg-card-theme p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Expense Splitting On Stellar
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-theme sm:text-4xl">
          Track shared expenses, settle balances, and keep every split in sync.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-theme sm:text-base">
          The app shell is live again, and you can jump straight into the
          dashboard, create a split, or review payment history from here.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go to dashboard
          </Link>
          <Link
            to="/create-split"
            className="rounded-full border border-theme px-5 py-2.5 text-sm font-semibold text-theme"
          >
            Start a new split
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-[1.5rem] border border-theme bg-card-theme p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent"
          >
            <h2 className="text-lg font-semibold text-theme">{link.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-theme">
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
