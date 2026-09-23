import React, { useState, useEffect } from 'react';
import { EjercicioConDetalle, Resolucion } from '../types';
import { PasoAPaso } from '../components/PasoAPaso';
import { MathRenderer } from '../components/MathRenderer';
import { api } from '../services/api';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Share2,
  Copy,
  Check,
  GraduationCap,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface VerResolucionProps {
  ejercicioId: string;
  onBack: () => void;
  onGoToSubir: () => void;
}

export const VerResolucion: React.FC<VerResolucionProps> = ({
  ejercicioId,
  onBack,
  onGoToSubir,
}) => {
  const [ejercicio, setEjercicio] = useState<EjercicioConDetalle | null>(null);
  const [resolucion, setResolucion] = useState<Resolucion | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState<'positivo' | 'negativo' | null>(null);
  const [voteFeedback, setVoteFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getEjercicioDetalle(ejercicioId);
      setEjercicio(data);
      if (data.resolucion) {
        setResolucion(data.resolucion);
      }
    } catch (err) {
      console.error('Error al cargar ejercicio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ejercicioId) {
      loadData();
    }
  }, [ejercicioId]);

  const handleVote = async (tipo: 'positivo' | 'negativo', comentario?: string) => {
    if (!resolucion || hasVoted) return;

    try {
      const res = await api.votarResolucion(resolucion.id, tipo, comentario);
      setResolucion((prev) =>
        prev
          ? {
              ...prev,
              votos_positivos: res.votos_positivos,
              votos_negativos: res.votos_negativos,
              estado: res.estado,
            }
          : null
      );
      setHasVoted(tipo);
      setVoteFeedback(res.mensaje);
      setShowFeedbackModal(false);
      setTimeout(() => setVoteFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error al votar:', err);
    }
  };

  const handleShare = () => {
    if (!ejercicio) return;
    const shareText = `*${ejercicio.titulo}* - Resuelto con el criterio de ${
      ejercicio.catedra?.nombre || 'la cátedra'
    } en CátedraIA.\nResultado: ${resolucion?.resultado_final || ''}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500 font-medium">
          Cargando resolución paso a paso de la cátedra...
        </p>
      </div>
    );
  }

  if (!ejercicio) {
    return (
      <div className="py-16 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Ejercicio no encontrado</h3>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
        >
          Volver al Feed
        </button>
      </div>
    );
  }

  const isEnRevision = resolucion?.estado === 'en_revision';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top back navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al banco de ejercicios</span>
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">¡Copiado al portapapeles!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartir con compañeros</span>
            </>
          )}
        </button>
      </div>

      {/* Review Warning if negative votes threshold reached */}
      {isEnRevision && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-950">Resolución en revisión comunitaria:</span>
            <p className="leading-relaxed">
              Varios estudiantes de esta cátedra señalaron discrepancias con el método exigido por el profesor.
              La resolución está siendo revisada por los moderadores estudiantiles.
            </p>
          </div>
        </div>
      )}

      {/* Exercise Enunciado Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        {/* Meta badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-700">{ejercicio.facultad?.siglas || 'Universidad'}</span>
            <span>·</span>
            <span className="font-medium text-slate-700">{ejercicio.materia?.nombre}</span>
            <span>·</span>
            <span className="font-semibold text-slate-900">{ejercicio.catedra?.nombre}</span>
          </div>
          <span className="text-slate-400">Subido por {ejercicio.usuario_nombre || 'Estudiante'}</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {ejercicio.titulo}
        </h1>

        {/* OCR Statement text */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-sm font-mono leading-relaxed whitespace-pre-wrap">
          {ejercicio.texto_ocr}
        </div>

        {/* Thumbnail if present */}
        {ejercicio.imagen_url && (
          <div className="pt-2">
            <img
              src={ejercicio.imagen_url}
              alt="Enunciado original"
              className="max-h-64 rounded-lg object-contain border border-slate-200"
            />
          </div>
        )}
      </div>

      {/* Chair Methodological Summary Card */}
      {resolucion?.resumen_criterio && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-blue-800/40 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Criterio Metodológico Oficial Aplicado</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
            {resolucion.resumen_criterio}
          </p>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-blue-800/40">
            Docente: {ejercicio.catedra?.profesor || 'Titular de Cátedra'}
          </div>
        </div>
      )}

      {/* Step by Step Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <span>Desarrollo Formal Paso a Paso</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {resolucion?.contenido_paso_a_paso?.length || 0} pasos deductivos
          </span>
        </div>

        {resolucion?.contenido_paso_a_paso && resolucion.contenido_paso_a_paso.length > 0 ? (
          <div className="space-y-3">
            {resolucion.contenido_paso_a_paso.map((paso) => (
              <PasoAPaso
                key={paso.numero}
                paso={paso}
                totalPasos={resolucion.contenido_paso_a_paso.length}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
            No se encontraron pasos registrados para este ejercicio.
          </div>
        )}
      </div>

      {/* Final Highlighted Result */}
      {resolucion?.resultado_final && (
        <div className="bg-emerald-50/80 border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Resultado Final Enmarcado</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-950 font-mono">
            {resolucion.resultado_final}
          </div>
          <p className="text-xs text-emerald-700">
            Respuesta validada según las convenciones de examen de la {ejercicio.catedra?.nombre}.
          </p>
        </div>
      )}

      {/* Community Voting Bar (Section 7: Confiabilidad de la IA) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            ¿Esta resolución coincide con lo enseñado en tu cátedra?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tu voto ayuda a mantener la precisión académica del banco de parciales.
          </p>
        </div>

        {/* Voting controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleVote('positivo')}
            disabled={hasVoted !== null}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              hasVoted === 'positivo'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Coincide (+{resolucion?.votos_positivos || 0})</span>
          </button>

          <button
            onClick={() => setShowFeedbackModal(true)}
            disabled={hasVoted !== null}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              hasVoted === 'negativo'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>Discrepa (-{resolucion?.votos_negativos || 0})</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {voteFeedback && (
        <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 text-xs font-medium animate-in fade-in">
          {voteFeedback}
        </div>
      )}

      {/* Modal for Negative Discrepancy Note */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-900">
              ¿En qué difiere con tu cátedra?
            </h4>
            <p className="text-xs text-slate-600">
              Contanos qué regla o notación del profesor no se cumplió para enviar la resolución a revisión.
            </p>
            <textarea
              rows={3}
              value={discrepancyNote}
              onChange={(e) => setDiscrepancyNote(e.target.value)}
              placeholder="Ej: El profesor Gutiérrez exige hacer el cuadro de concavidad y no acepta este atajo..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleVote('negativo', discrepancyNote)}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
