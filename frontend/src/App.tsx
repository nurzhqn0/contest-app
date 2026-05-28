import { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./lib/auth";
import { DashboardPage } from "./pages/DashboardPage";
import { LegalPage } from "./pages/LegalPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PublicHomePage } from "./pages/PublicHomePage";
import { PublicRoomPage } from "./pages/PublicRoomPage";
import { RoomPage } from "./pages/RoomPage";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="page-shell flex min-h-[100dvh] items-center justify-center py-6">
        <section className="surface w-full max-w-xl p-6 md:p-8">
          <div className="eyebrow">Authorizing</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">
            Checking your session
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The app is verifying the current organiser session with the backend.
          </p>
        </section>
      </main>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function GuestRoute({ children }: { children: ReactElement }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="page-shell flex min-h-[100dvh] items-center justify-center py-6">
        <section className="surface w-full max-w-xl p-6 md:p-8">
          <div className="eyebrow">Authorizing</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">
            Checking your session
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The app is verifying whether an organiser session is already active.
          </p>
        </section>
      </main>
    );
  }

  if (status === "authenticated") {
    return <Navigate to="/app" replace />;
  }
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/room/:roomCode" element={<PublicRoomPage />} />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route path="/privacy" element={<LegalPage variant="privacy" />} />
      <Route path="/terms" element={<LegalPage variant="terms" />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="rooms/:roomId" element={<RoomPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
