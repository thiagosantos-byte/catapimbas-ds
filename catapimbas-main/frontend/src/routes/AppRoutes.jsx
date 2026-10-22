
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Auth/Login';
import Cadastro from '../pages/Auth/Cadastro';
import Dashboard from '../pages/Dashboard/Dashboard';
import AguardandoAprovacao from '../pages/Auth/AguardandoAprovacao';
import RecuperarSenha from '../pages/Auth/RecuperarSenha';
import RedefinirSenha from '../pages/Auth/RedefinirSenha';
import Apresentacao from '../pages/Auth/Apresentacao';

function ProtectedRoute({ children }) {
  const { signed, loading, activeVinculo } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          height: '100vh',
          placeItems: 'center',
          background: '#17131d',
          color: 'white',
        }}
      >
        Carregando sessão...
      </div>
    );
  }

  if (!signed) {
    return <Navigate to="/login" replace />;
  }

  if (!activeVinculo) {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Apresentacao />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
