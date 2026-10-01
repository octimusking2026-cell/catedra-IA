import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './context/ThemeContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { QuotaProvider, useQuota } from './context/QuotaContext';
import { CatalogProvider, useCatalog } from './context/CatalogContext';
import { Navbar } from './components/Navbar';
import { LimiteConsultas } from './components/LimiteConsultas';
import { FloatingFeedback } from './components/FloatingFeedback';
import { LoginScreen } from './components/LoginScreen';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const SubirEjercicio = React.lazy(() => import('./pages/SubirEjercicio').then(m => ({ default: m.SubirEjercicio })));
const VerResolucion = React.lazy(() => import('./pages/VerResolucion').then(m => ({ default: m.VerResolucion })));
const Perfil = React.lazy(() => import('./pages/Perfil').then(m => ({ default: m.Perfil })));
const AyudaPrivacidad = React.lazy(() => import('./pages/AyudaPrivacidad').then(m => ({ default: m.AyudaPrivacidad })));
const PoliticaPrivacidad = React.lazy(() => import('./pages/PoliticaPrivacidad').then(m => ({ default: m.PoliticaPrivacidad })));
const TerminosCondiciones = React.lazy(() => import('./pages/TerminosCondiciones').then(m => ({ default: m.TerminosCondiciones })));
const Admin = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));

const PageLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 py-12">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold select-none">
      Cargando página...
    </p>
  </div>
);

function AppContent() {
  const { authUser, usuario, authLoading, terminosAceptados, setTerminosAceptados, refreshUser, logout } = useSession();
  const { consultas, showLimiteModal, closeLimiteModal, refreshQuota } = useQuota();
  const { loadingCatalog } = useCatalog();
  const location = useLocation();

  const [acceptedChecked, setAcceptedChecked] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Escuchar el evento de términos pendientes de cualquier llamada API
  useEffect(() => {
    const handleTermsPending = () => {
      setTerminosAceptados(false);
    };
    window.addEventListener('terminos-pendientes-detected', handleTermsPending);
    return () => window.removeEventListener('terminos-pendientes-detected', handleTermsPending);
  }, [setTerminosAceptados]);

  const handleAcceptTerms = async () => {
    if (!acceptedChecked) return;
    setAcceptLoading(true);
    setAcceptError(null);
    try {
      const { getCurrentUserIdToken } = await import('./services/firebase');
      const idToken = await getCurrentUserIdToken(false);
      const response = await fetch('/api/auth/aceptar-terminos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ version: '30/09/2026' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'No se pudo registrar la aceptación de los términos.');
      }

      setTerminosAceptados(true);
      await refreshUser();
    } catch (err: any) {
      console.error('Error al aceptar términos actualizados:', err);
      setAcceptError(err.message || 'Error al registrar la aceptación de los términos.');
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleBorrarMisDatos = async () => {
    if (!window.confirm('¿Estás seguro de que querés borrar de forma permanente todos tus datos de la base de datos? Esta acción es irreversible.')) {
      return;
    }
    setAcceptLoading(true);
    try {
      const { api } = await import('./services/api');
      await api.borrarMisDatos();
      alert('Tus datos han sido eliminados correctamente.');
      await logout();
    } catch (err: any) {
      alert(err.message || 'No se pudieron borrar tus datos.');
    } finally {
      setAcceptLoading(false);
    }
  };

  const isPublicPage = location.pathname === '/terminos' || location.pathname === '/privacidad';

  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/privacidad" element={<PoliticaPrivacidad />} />
              <Route path="/terminos" element={<TerminosCondiciones />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </main>
      </div>
    );
  }

  // Loading spinner during auth handshake
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <div className="text-xl font-bold tracking-tight">CátedraIA</div>
          <p className="text-xs text-slate-400">Verificando sesión universitaria...</p>
        </div>
      </div>
    );
  }

  // Pantalla de bloqueo si hay sesión pero faltan términos actualizados
  if (authUser && !terminosAceptados) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Actualizamos los Términos
            </h2>
            <p className="text-xs text-slate-400">
              Para seguir utilizando CátedraIA, debés leer y aceptar la última versión de nuestros términos de servicio y política de privacidad.
            </p>
          </div>

          {acceptError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {acceptError}
            </div>
          )}

          <div className="space-y-4">
            <label className="flex items-start gap-2.5 text-xs text-slate-300 text-left cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedChecked}
                onChange={(e) => setAcceptedChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>
                Leí y acepto los{' '}
                <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">
                  Términos y Condiciones
                </a>{' '}
                y la{' '}
                <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">
                  Política de Privacidad
                </a>.
              </span>
            </label>

            <button
              onClick={handleAcceptTerms}
              disabled={acceptLoading || !acceptedChecked}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              {acceptLoading ? 'Guardando aceptación...' : 'Aceptar y continuar'}
            </button>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => logout()}
              className="hover:text-white transition-colors cursor-pointer font-medium"
            >
              Cerrar sesión
            </button>
            <button
              onClick={handleBorrarMisDatos}
              className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer font-medium"
            >
              Borrar mis datos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in: Show Google Login Screen Gate
  if (!authUser) {
    return (
      <LoginScreen
        onLoginSuccess={async () => {
          await refreshUser();
          await refreshQuota();
        }}
      />
    );
  }

  // Loading initial academic catalog
  if (loadingCatalog) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <div className="text-xl font-bold tracking-tight">CátedraIA</div>
          <p className="text-xs text-slate-400">Cargando cátedras universitarias y banco de ejercicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Skip to Main Content Link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-blue-600 focus:text-white focus:font-bold focus:rounded-xl focus:shadow-lg focus:outline-none"
      >
        Saltar al contenido principal
      </a>

      {/* Global Navbar with user profile & navigation */}
      <Navbar />

      {/* Main Content Area with React Router */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <React.Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/feed" element={<Home />} />
            <Route path="/subir" element={<SubirEjercicio />} />
            <Route path="/ejercicio/:id" element={<VerResolucion />} />
            <Route path="/resolucion/:id" element={<VerResolucion />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/ayuda" element={<AyudaPrivacidad />} />
            <Route path="/privacidad" element={<PoliticaPrivacidad />} />
            <Route path="/terminos" element={<TerminosCondiciones />} />
            <Route
              path="/admin"
              element={
                usuario?.es_admin ? <Admin /> : <Navigate to="/" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </main>

      {/* Floating Feedback Button */}
      <FloatingFeedback />

      {/* Limit Reached Modal */}
      {showLimiteModal && (
        <LimiteConsultas
          isModal={true}
          consultas={consultas}
          onClose={closeLimiteModal}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              © 2026 Cátedra IA. Potenciando el estudio independiente con inteligencia artificial.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
              <Link to="/privacidad" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacidad
              </Link>
              <span>·</span>
              <Link to="/terminos" className="text-blue-600 dark:text-blue-400 hover:underline">
                Términos
              </Link>
              {usuario?.es_admin && (
                <>
                  <span>·</span>
                  <Link to="/admin" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium">
                    Admin
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <SessionProvider>
            <QuotaProvider>
              <CatalogProvider>
                <AppContent />
              </CatalogProvider>
            </QuotaProvider>
          </SessionProvider>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}
