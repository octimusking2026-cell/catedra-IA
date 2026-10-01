import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, ThumbsUp, ThumbsDown, Clock, Sparkles } from 'lucide-react';
import { EjercicioConDetalle } from '../types';

interface EjercicioCardProps {
  ejercicio: EjercicioConDetalle & {
    tiene_resolucion?: boolean;
    estado_resolucion?: string;
    votos_positivos?: number;
    votos_negativos?: number;
    catedra_nombre?: string;
    materia_nombre?: string;
  };
  onSelect: (id: string) => void;
  onSolveNow?: (ejercicio: EjercicioConDetalle) => void;
}

export const EjercicioCard: React.FC<EjercicioCardProps> = ({
  ejercicio,
  onSelect,
  onSolveNow,
}) => {
  const hasResolution = ejercicio.tiene_resolucion;

  return (
    <div
      onClick={() => onSelect(ejercicio.id)}
      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Meta Header: Chair & Topic */}
        <div className="flex items-center justify-between gap-2 mb-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400">
            <span>{ejercicio.catedra_nombre || 'Cátedra'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">{ejercicio.materia_nombre}</span>
          </div>

          {/* Status Label & Ownership */}
          <div className="flex items-center gap-1.5">
            {ejercicio.es_mio && (
              <span className="inline-flex items-center text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Tuyo
              </span>
            )}
            {hasResolution ? (
              ejercicio.estado_resolucion === 'verificada' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                Verificada
              </span>
            ) : ejercicio.estado_resolucion === 'en_revision' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3 h-3" />
                En revisión
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                Sin verificar
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
              <Clock className="w-3 h-3" />
              Sin resolver
            </span>
          )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 mb-2">
          {ejercicio.titulo}
        </h3>

        {/* Topic Tag */}
        <div className="inline-block text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded px-2 py-0.5 mb-3">
          {ejercicio.tema}
        </div>

        {/* Statement excerpt */}
        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-4 font-mono bg-slate-50 dark:bg-slate-950/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
          {ejercicio.texto_ocr}
        </p>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        {/* Votes Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{ejercicio.votos_positivos || 0}</span>
          </div>
          {(ejercicio.votos_negativos || 0) > 0 && (
            <div className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-medium">
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>{ejercicio.votos_negativos}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        {hasResolution ? (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Ver Paso a Paso</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onSolveNow) onSolveNow(ejercicio);
              else onSelect(ejercicio.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 dark:bg-blue-500 text-white font-bold text-xs hover:bg-blue-700 dark:hover:bg-blue-600 shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Resolver</span>
          </button>
        )}
      </div>
    </div>
  );
};
