import React, { useState } from 'react';
import { loginWithGoogle } from '../services/firebase';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const handleGoogleLogin = async () => {
    if (!accepted) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Popup login con Google
      await loginWithGoogle();

      // 2. Obtener el idToken para autenticar contra la API
      const { getCurrentUserIdToken } = await import('../services/firebase');
      const idToken = await getCurrentUserIdToken(false);

      if (!idToken) {
        throw new Error('No se pudo verificar la sesión con Google.');
      }

      // 3. Registrar aceptación en el servidor
      const termsVersion = '30/09/2026';
      const response = await fetch('/api/auth/aceptar-terminos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ version: termsVersion }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'No se pudo guardar la aceptación de los términos.');
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Error logging in with Google:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('El inicio de sesión fue cancelado. Por favor, volvé a intentar.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Tu navegador bloqueó la ventana emergente. Permití las ventanas emergentes para iniciar sesión.');
      } else {
        setError(err.message || 'No se pudo iniciar sesión con Google. Verificá tu conexión e intentá nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-white">
                Cátedra<span className="text-blue-400">IA</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                100% Gratis
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Plataforma Académica Universitaria</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Acceso seguro con cuenta Google</span>
        </div>
      </header>

      {/* Main Hero & Auth Card */}
      <main className="max-w-4xl w-full mx-auto my-auto py-10 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* Left column: Academic pitch */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Resoluciones Paso a Paso con IA</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Cada materia tiene su método.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              CátedraIA te lo resuelve paso a paso.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
            Subí una foto o PDF de tus ejercicios y obtené el desarrollo paso a paso
          </p>

          {/* Value props */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300 text-left max-w-lg mx-auto lg:mx-0">
            <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Resolución paso a paso según el método estándar</span>
            </div>
            <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Extracción automática de enunciados por OCR</span>
            </div>
            <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Desarrollo deductivo en LaTeX</span>
            </div>
            <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Cuota diaria equitativa y sin costo</span>
            </div>
          </div>
        </div>

        {/* Right column: Login Card */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-slate-400">
                Ingresá con tu cuenta institucional o personal de Google para acceder a tus ejercicios y cuota diaria.
              </p>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-400/20 text-[11px] text-slate-300 text-left space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Protección de Datos Personales (Ley 25.326)</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Tu correo electrónico se utiliza exclusivamente para autenticar tu cuenta y gestionar tu historial. Podés consultar nuestra{' '}
                  <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">
                    Política de Privacidad
                  </a>{' '}
                  o ejercer tus derechos de acceso y supresión en cualquier momento.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Sign-in Button */}
            <div className="space-y-4">
              <label className="flex items-start gap-2.5 text-xs text-slate-300 text-left cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>
                  Leí y acepto los{' '}
                  <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">
                    Términos y Condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">
                    Política de Privacidad (Ley 25.326)
                  </a>.
                </span>
              </label>

              <button
                onClick={handleGoogleLogin}
                disabled={loading || !accepted}
                aria-disabled={loading || !accepted}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Conectando con Google...</span>
                  </>
                ) : (
                  <>
                    {/* Google G Logo SVG */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continuar con Google</span>
                  </>
                )}
              </button>

              {!accepted && (
                <p className="text-[11px] text-amber-300 text-center font-medium">
                  * Debés marcar la casilla de aceptación para habilitar el inicio de sesión.
                </p>
              )}
            </div>

            {/* 3-point summary */}
            <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 text-xs text-slate-300 space-y-2 text-left">
              <p className="font-bold text-slate-200">Información importante sobre el servicio:</p>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                <li>Proyecto independiente, no afiliado a ninguna universidad o facultad.</li>
                <li>Tus ejercicios se envían a Google (Gemini) para generar la resolución.</li>
                <li>Las resoluciones son orientativas y pueden tener errores conceptuales o algebraicos.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-slate-500 pt-4 border-t border-white/5 z-10">
        © 2026 Cátedra IA. Potenciando el estudio independiente con inteligencia artificial.
      </footer>
    </div>
  );
};
