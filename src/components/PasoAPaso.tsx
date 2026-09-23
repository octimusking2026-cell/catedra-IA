import React, { useState } from 'react';
import { PasoResolucion } from '../types';
import { MathRenderer } from './MathRenderer';
import { CheckCircle, AlertTriangle, BookOpen, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface PasoAPasoProps {
  paso: PasoResolucion;
  totalPasos: number;
}

export const PasoAPaso: React.FC<PasoAPasoProps> = ({ paso, totalPasos }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 bg-slate-50/50 hover:bg-slate-50 border-b border-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
            {paso.numero}
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              Paso {paso.numero} de {totalPasos}
            </div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-900">
              {paso.titulo}
            </h4>
          </div>
        </div>

        <div className="text-slate-400 p-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Body content */}
      {expanded && (
        <div className="p-4 sm:p-6 space-y-4">
          {/* Explanation */}
          <div className="text-sm text-slate-700 leading-relaxed font-sans">
            <p>{paso.explicacion}</p>
          </div>

          {/* Mathematical formulation block */}
          {paso.desarrollo_matematico && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Desarrollo Matemático / Formal:
              </div>
              <MathRenderer text={paso.desarrollo_matematico} />
            </div>
          )}

          {/* Chair Specific Criterion Callout */}
          {paso.justificacion_catedra && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-lg flex items-start gap-2.5 text-xs text-blue-900">
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-blue-950">Criterio de Cátedra: </span>
                <span className="text-blue-800 leading-relaxed">
                  {paso.justificacion_catedra}
                </span>
              </div>
            </div>
          )}

          {/* Exam Warning / Common Mistake */}
          {paso.advertencia_examen && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-950">Atención para el Parcial: </span>
                <span className="text-amber-800 leading-relaxed">
                  {paso.advertencia_examen}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
