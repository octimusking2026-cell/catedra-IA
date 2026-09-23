import React from 'react';
import { Usuario, ConsultasStatus, Ejercicio } from '../types';
import {
  User as UserIcon,
  Crown,
  Calendar,
  Zap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface PerfilProps {
  usuario: Usuario | null;
  consultas: ConsultasStatus | null;
  misEjercicios: any[];
  onSelectEjercicio: (id: string) => void;
  onGoToUpgrade: () => void;
  onSwitchUser: (userId: string) => void;
}

export const Perfil: React.FC<PerfilProps> = ({
  usuario,
  consultas,
  misEjercicios,
  onSelectEjercicio,
  onGoToUpgrade,
  onSwitchUser,
}) => {
  const isPremium = usuario?.plan === 'premium';
  const limit = consultas?.limite ?? 3;
  const used = consultas?.usadas ?? 0;
  const remaining = isPremium ? 9999 : consultas?.restantes ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header Profile Info */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
            {usuario?.nombre?.charAt(0) || 'E'}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {usuario?.nombre || 'Estudiante'}
              </h1>
              {isPremium ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                  <Crown className="w-3 h-3 text-amber-500" />
                  Premium
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                  Plan Free
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-500">{usuario?.email}</p>

            <div className="flex items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Registrado en marzo 2026
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Estudiante activo
              </span>
            </div>
          </div>
        </div>

        {/* Quick Quota Switcher for tester */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center sm:text-right space-y-2 w-full sm:w-auto">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Probar cuota en este navegador:
          </span>
          <div className="flex items-center justify-center sm:justify-end gap-1.5">
            <button
              onClick={() => onSwitchUser('usr_free_demo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !isPremium
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Modo Free (3 consultas)
            </button>
            <button
              onClick={() => onSwitchUser('usr_premium_demo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isPremium
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Modo Premium (Ilimitado)
            </button>
          </div>
        </div>
      </div>

      {/* Daily Usage Quota Card */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-7 shadow-md border border-blue-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Consultas Diarias Disponibles</span>
          </div>
          {isPremium ? (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              Ilimitadas
            </span>
          ) : (
            <span className="text-xs text-slate-400">Reinicio: 00:00 hs (hora de Argentina)</span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {isPremium ? (
                'Sin límite diario'
              ) : (
                <>
                  <span className="text-sky-400">{remaining}</span> / {limit} restantes hoy
                </>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-md">
              {isPremium
                ? 'Tenés acceso irrestricto para resolver todos los ejercicios que necesites para tus parciales.'
                : `Has usado ${used} de tus ${limit} consultas gratuitas de hoy (zona horaria de Argentina).`}
            </p>
          </div>

          {!isPremium && (
            <button
              onClick={onGoToUpgrade}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Lista de Espera Premium</span>
            </button>
          )}
        </div>

        {!isPremium && (
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* History: Solved / Submited Exercises */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span>Ejercicios de tu Historial</span>
        </h2>

        {misEjercicios.length > 0 ? (
          <div className="space-y-3">
            {misEjercicios.map((ej) => (
              <div
                key={ej.id}
                onClick={() => onSelectEjercicio(ej.id)}
                className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-blue-700">{ej.catedra_nombre || 'Cátedra'}</span>
                    <span>·</span>
                    <span>{ej.tema}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">{ej.titulo}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1 font-mono">{ej.texto_ocr}</p>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 shrink-0">
                  <span>Ver Paso a Paso</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
            Aún no has subido ejercicios con este usuario.
          </div>
        )}
      </div>
    </div>
  );
};
