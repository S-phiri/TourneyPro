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
import ManagerLogin from "./pages/ManagerLogin";
import ManagerSignUp from "./pages/ManagerSignUp";
import Dashboard from "./pages/Dashboard";
import TournamentBySlug from "./pages/TournamentBySlug";
import RegisterTeam from "./pages/RegisterTeam";
import AddPlayers from "./pages/AddPlayers";
import TeamHub from "./pages/TeamHub";
import PlayerProfile from "./pages/PlayerProfile";
import Fixtures from "./pages/Fixtures";
import TournamentWizard from "./pages/host/wizard/TournamentWizard";
import ProtectedRoute from "./components/ProtectedRoute";
import RegistrationSuccess from "./pages/RegistrationSuccess";
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
            <Route path="/manager/login" element={<ManagerLogin />} />
            <Route path="/manager/signup" element={<ManagerSignUp />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/start-hosting" element={<ProtectedRoute><StartHosting /></ProtectedRoute>} />
            <Route path="/host/new" element={<ProtectedRoute><TournamentWizard /></ProtectedRoute>} />
            <Route path="/host/new/:id" element={<ProtectedRoute><TournamentWizard /></ProtectedRoute>} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/tournaments/:id/edit" element={<ProtectedRoute><EditTournament /></ProtectedRoute>} />
                <Route path="/tournaments/:id/register" element={<RegisterTeam />} />
                <Route path="/tournaments/:id/registration/success" element={<RegistrationSuccess />} />
                <Route path="/tournaments/:id/fixtures" element={<Fixtures />} />
                <Route path="/teams/:id/add-players" element={<AddPlayers />} />
                <Route path="/teams/:id" element={<TeamHub />} />
                <Route path="/players/:id" element={<PlayerProfile />} />
                <Route path="/t/:slug" element={<TournamentBySlug />} />
                <Route path="/t/:slug/fixtures" element={<Fixtures />} />
                <Route path="/t/:slug/register" element={<RegisterTeam />} />
                <Route path="/t/:slug/registration/success" element={<RegistrationSuccess />} />
                <Route path="/registration/success" element={<RegistrationSuccess />} />
            <Route path="/venues" element={<Venues />} />
          </Routes>
          {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
        </>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
