import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import { useQuota } from '../context/QuotaContext';
import { useCatalog } from '../context/CatalogContext';
import { useTheme } from '../context/ThemeContext';
import { SEO } from '../components/SEO';
import {
  Calendar,
  Zap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Users,
  GraduationCap,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

export const Perfil: React.FC = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useSession();
  const { consultas } = useQuota();
  const { selectedCarrera } = useCatalog();
  const { theme, setTheme } = useTheme();

  const limit = consultas?.limite ?? 50;
  const used = consultas?.usadas ?? 0;
  const remaining = consultas?.restantes ?? Math.max(0, limit - used);

  const [selectedMateriaId, setSelectedMateriaId] = useState<string>('todas');
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [historialData, setHistorialData] = useState<{
    ejercicios: any[];
    total: number;
    pagina: number;
    total_paginas: number;
    materias_con_historial: { id: string; nombre: string; cantidad: number }[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .getHistorial({
        materia_id: selectedMateriaId,
        page,
      })
      .then((data) => {
        if (isMounted) {
          setHistorialData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching historial in Perfil:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMateriaId, page]);

  const handleTabChange = (materiaId: string) => {
    setSelectedMateriaId(materiaId);
    setPage(1);
  };

  const totalEjercicios = historialData
    ? historialData.materias_con_historial.reduce((sum, m) => sum + m.cantidad, 0)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <SEO
        title="Mi Perfil"
        description="Gestioná tu cuenta de estudiante, preferencia de tema visual y consultá tu historial de ejercicios."
      />
      {/* Header Profile Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {usuario?.foto_url ? (
            <img
              src={usuario.foto_url}
              alt={usuario.nombre}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/30 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              {usuario?.nombre?.charAt(0) || 'E'}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {usuario?.nombre || 'Estudiante'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Google Verificado
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{usuario?.email}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Registrado en{' '}
                  {usuario?.fecha_registro
                    ? new Date(usuario.fecha_registro).toLocaleDateString('es-AR', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'recientemente'}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Estudiante activo
              </span>
              {selectedCarrera && (
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{selectedCarrera.nombre}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logout action */}
        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer w-full sm:w-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Theme Preference Settings Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Sun className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Preferencia de Tema Visual</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Persistido en tu navegador</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Claro</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Oscuro</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              theme === 'system'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-400 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Sistema</span>
          </button>
        </div>
      </div>

      {/* Daily Fair Usage Quota Card */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-7 shadow-md border border-blue-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Consultas Diarias de Uso Justo</span>
          </div>
          <span className="text-xs text-slate-400">Reinicio: 00:00 hs (hora de Argentina)</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              <span className="text-sky-400">{remaining}</span> / {limit} disponibles hoy
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              Has utilizado {used} de tus {limit} consultas de uso justo de hoy. Esta cuota asegura disponibilidad continua y equitativa para todos los estudiantes.
            </p>
          </div>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
          <div
            className={`h-full transition-all duration-300 ${remaining === 0 ? 'bg-rose-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
          />
        </div>
      </div>

      {/* Server-driven History with Subject Tabs and Pagination */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Historial de Ejercicios Subidos</span>
          </h2>
          {historialData && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {historialData.total} {historialData.total === 1 ? 'ejercicio' : 'ejercicios'} en total
            </span>
          )}
        </div>

        {/* Materia Tabs */}
        {historialData && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleTabChange('todas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedMateriaId === 'todas'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todas ({totalEjercicios})
            </button>

            {historialData.materias_con_historial.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleTabChange(m.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedMateriaId === m.id
                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.nombre} ({m.cantidad})
              </button>
            ))}
          </div>
        )}

        {/* Exercises List */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            <p className="text-xs font-semibold">Cargando tu historial desde el servidor...</p>
          </div>
        ) : historialData && historialData.ejercicios.length > 0 ? (
          <div className="space-y-3">
            {historialData.ejercicios.map((ej) => (
              <div
                key={ej.id}
                onClick={() => {
                  navigate(`/ejercicio/${ej.id}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">{ej.materia_nombre || ej.catedra_nombre}</span>
                    <span>·</span>
                    <span className="font-medium">{ej.tema}</span>
                    <span>·</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(ej.fecha_subida).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{ej.titulo}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-mono">{ej.texto_ocr}</p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {/* Visibilidad Badge */}
                  {ej.visibilidad === 'compartido' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                      <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      Compartido
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                      <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      Privado
                    </span>
                  )}

                  <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <span>Ver Paso a Paso</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {historialData.total_paginas > 1 && (
              <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-colors ${
                    page <= 1
                      ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 cursor-pointer'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Página <strong>{historialData.pagina}</strong> de <strong>{historialData.total_paginas}</strong>
                </span>

                <button
                  type="button"
                  disabled={page >= historialData.total_paginas}
                  onClick={() => setPage((p) => Math.min(historialData.total_paginas, p + 1))}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-colors ${
                    page >= historialData.total_paginas
                      ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 cursor-pointer'
                  }`}
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            {selectedMateriaId === 'todas'
              ? 'Aún no has subido ejercicios con tu cuenta.'
              : 'No tenés ejercicios subidos para esta materia.'}
          </div>
        )}
      </div>
    </div>
  );
};
