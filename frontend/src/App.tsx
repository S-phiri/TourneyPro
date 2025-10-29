import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./components/home";
import Leagues from "./pages/Leagues";
import TournamentDetail from "./pages/TournamentDetail";
import EditTournament from "./pages/EditTournament";
import StartHosting from "./pages/StartHosting";
import Venues from "./pages/Venues";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import TournamentBySlug from "./pages/TournamentBySlug";
import RegisterTeam from "./pages/RegisterTeam";
import Fixtures from "./pages/Fixtures";
import TournamentShowcase from "./pages/TournamentShowcase";
import ProtectedRoute from "./components/ProtectedRoute";
import routes from "tempo-routes";

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<p>Loading...</p>}>
        <>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/start-hosting" element={<ProtectedRoute><StartHosting /></ProtectedRoute>} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/tournaments/:id/showcase" element={<TournamentShowcase />} />
            <Route path="/tournaments/:id/edit" element={<ProtectedRoute><EditTournament /></ProtectedRoute>} />
            <Route path="/tournaments/:id/register" element={<RegisterTeam />} />
            <Route path="/tournaments/:id/fixtures" element={<Fixtures />} />
            <Route path="/t/:slug" element={<TournamentBySlug />} />
            <Route path="/t/:slug/register" element={<RegisterTeam />} />
            <Route path="/venues" element={<Venues />} />
          </Routes>
          {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        </>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
