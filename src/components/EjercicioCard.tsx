import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, ThumbsUp, ThumbsDown, BookCheck, Clock } from 'lucide-react';

interface EjercicioCardProps {
  ejercicio: any;
  onSelect: (id: string) => void;
  onSolveNow?: (ejercicio: any) => void;
}

export const EjercicioCard: React.FC<EjercicioCardProps> = ({
  ejercicio,
  onSelect,
  onSolveNow,
}) => {
  const isEnRevision = ejercicio.estado_resolucion === 'en_revision';
  const hasResolution = ejercicio.tiene_resolucion;

  return (
    <div
      onClick={() => onSelect(ejercicio.id)}
      className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Meta Header: Chair & Topic */}
        <div className="flex items-center justify-between gap-2 mb-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium text-blue-700">
            <span>{ejercicio.catedra_nombre || 'Cátedra'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 font-normal">{ejercicio.materia_nombre}</span>
          </div>

          {/* Status Label */}
          {hasResolution ? (
            isEnRevision ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertTriangle className="w-3 h-3" />
                En revisión
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Resuelto
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3" />
              Pendiente
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
          {ejercicio.titulo}
        </h3>

        {/* Topic Tag */}
        <div className="inline-block text-[11px] font-medium text-slate-600 bg-slate-100 rounded px-2 py-0.5 mb-3">
          {ejercicio.tema}
        </div>

        {/* Statement excerpt */}
        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          {ejercicio.texto_ocr}
        </p>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        {/* Votes Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-emerald-600 font-medium">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{ejercicio.votos_positivos || 0}</span>
          </div>
          {(ejercicio.votos_negativos || 0) > 0 && (
            <div className="flex items-center gap-1 text-rose-500 font-medium">
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>{ejercicio.votos_negativos}</span>
            </div>
          )}
        </div>

        {/* Action link */}
        <div className="flex items-center gap-1 text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
          <span>{hasResolution ? 'Ver Paso a Paso' : 'Resolver'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
