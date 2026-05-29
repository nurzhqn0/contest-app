import { ArrowSquareOut, SignOut, SquaresFour } from "@phosphor-icons/react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function AppShell() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="page-shell flex min-h-[100dvh] flex-col py-4 md:py-6">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="surface sticky top-4 z-10 mb-6 px-5 py-4 backdrop-blur md:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <Link to="/app" className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink text-white">
              <SquaresFour size={22} weight="fill" />
            </div>
            <div className="space-y-1">
              <div className="eyebrow">Organizer workspace</div>
              <div className="text-xl font-semibold tracking-[-0.03em] text-ink">
                Student Contest
              </div>
            </div>
          </Link>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between xl:justify-end">
            <nav
              aria-label="Primary"
              className="flex flex-wrap items-center gap-2"
            >
              <NavLink
                to="/app"
                end
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isActive
                      ? "bg-ink text-white"
                      : "border border-line bg-white text-ink hover:border-accent/35 hover:bg-accentSoft/35"
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isActive
                      ? "bg-ink text-white"
                      : "border border-line bg-white text-ink hover:border-accent/35 hover:bg-accentSoft/35"
                  }`
                }
              >
                Public access
                <ArrowSquareOut size={16} weight="bold" />
              </NavLink>
            </nav>

            <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                await signOut();
                navigate("/login");
              }}
            >
              <SignOut size={16} weight="bold" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
