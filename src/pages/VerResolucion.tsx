import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EjercicioConDetalle, Resolucion, PasoResolucion } from '../types';
import { PasoAPaso } from '../components/PasoAPaso';
import { MathRenderer } from '../components/MathRenderer';
import { api } from '../services/api';
import { useQuota } from '../context/QuotaContext';
import { useSession } from '../context/SessionContext';
import { useCatalog } from '../context/CatalogContext';
import { SEO } from '../components/SEO';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Share2,
  Check,
  GraduationCap,
  Sparkles,
  Loader2,
  ShieldCheck,
  Compass,
  Lightbulb,
  FileQuestion,
  Clock,
  History,
  Flag,
  Trash2,
  X,
} from 'lucide-react';

interface VerResolucionProps {
  ejercicioId?: string;
}

export const VerResolucion: React.FC<VerResolucionProps> = ({ ejercicioId: propEjercicioId }) => {
  const { id: paramEjercicioId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshQuota } = useQuota();
  const { usuario } = useSession();
  const { refreshEjercicios } = useCatalog();

  const activeId = paramEjercicioId || propEjercicioId || '';

  const [ejercicio, setEjercicio] = useState<EjercicioConDetalle | null>(null);
  const [resolucion, setResolucion] = useState<Resolucion | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [streamStatusMsg, setStreamStatusMsg] = useState('');
  const [pasosNuevos, setPasosNuevos] = useState<PasoResolucion[]>([]);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState<'positivo' | 'negativo' | null>(null);
  const [voteFeedback, setVoteFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMotivo, setReportMotivo] = useState('Resolución errónea o imprecisa');
  const [reportDetalle, setReportDetalle] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Keyboard accessibility & focus restoration
  const feedbackTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const reportTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFeedbackModal) {
          setShowFeedbackModal(false);
          feedbackTriggerRef.current?.focus();
        }
        if (showReportModal) {
          setShowReportModal(false);
          reportTriggerRef.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFeedbackModal, showReportModal]);

  const handleDeleteEjercicio = async () => {
    if (!ejercicio) return;
    if (!window.confirm('¿Seguro que querés borrar este ejercicio? Esta acción eliminará el ejercicio y su resolución.')) return;
    setIsDeleting(true);
    try {
      await api.borrarEjercicio(ejercicio.id);
      await refreshEjercicios();
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el ejercicio');
      setIsDeleting(false);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ejercicio) return;
    setIsSubmittingReport(true);
    try {
      await api.reportarEjercicio(ejercicio.id, reportMotivo, reportDetalle);
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportModal(false);
        setReportDetalle('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Error al registrar el reporte.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!activeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getEjercicioDetalle(activeId);
      setEjercicio(data);
      if (data.resolucion) {
        setResolucion(data.resolucion);
      }
      if (data.mi_voto) {
        setHasVoted(data.mi_voto.tipo);
        if (data.mi_voto.comentario) {
          setDiscrepancyNote(data.mi_voto.comentario);
        }
      }
    } catch (err: any) {
      console.error('Error cargando ejercicio:', err);
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegenerate = async () => {
    if (!ejercicio) return;
    setIsRegenerating(true);
    setRegenError(null);
    setPasosNuevos([]);
    setStreamStatusMsg('Iniciando resolución con IA...');

    try {
      await api.generarResolucionStream(
        {
          ejercicio_id: ejercicio.id,
          catedra_id: ejercicio.catedra_id,
          enunciado: ejercicio.texto_ocr,
          titulo: ejercicio.titulo,
          tema: ejercicio.tema,
          incluir_imagen: false,
        },
        {
          onPaso: (p) => {
            setPasosNuevos((prev) => {
              if (prev.some((existing) => existing.numero === p.numero)) return prev;
              return [...prev, p];
            });
          },
          onStatus: (st) => {
            setStreamStatusMsg(st.mensaje);
          },
        }
      );

      const updated = await api.getEjercicioDetalle(ejercicio.id);
      setEjercicio(updated);
      setResolucion(updated.resolucion || null);
      await refreshQuota();
    } catch (err: any) {
      setRegenError(err.message || 'Se cortó la conexión al resolver. Podés reintentar sin perder cuota.');
    } finally {
      setIsRegenerating(false);
      setStreamStatusMsg('');
    }
  };

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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleShare = async () => {
    if (!ejercicio) return;
    const shareUrl = `${window.location.origin}/resolucion/${ejercicio.id}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: ejercicio.titulo || 'Ejercicio de Cátedra',
          text: `Resolución de ${ejercicio.catedra?.nombre || 'Cátedra'}: ${ejercicio.titulo || 'Paso a paso'}`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // If aborted/cancelled by user, do not fallback to copy
        if (err?.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback: Copy direct URL to clipboard
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Fallback clipboard copy failed:', err);
    }
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
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
        >
          Volver al Feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <SEO
        title={ejercicio ? `${ejercicio.titulo}` : 'Resolución de Ejercicio'}
        description={
          ejercicio
            ? `Resolución paso a paso del ejercicio "${ejercicio.titulo}" (${ejercicio.tema}) para ${ejercicio.materia?.nombre || 'la materia'}.`
            : 'Resolución deductiva paso a paso con formulas en LaTeX.'
        }
      />
      {/* Top back navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al banco de ejercicios</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Delete exercise if owner or admin */}
          {(ejercicio.es_mio || usuario?.es_admin) && (
            <button
              type="button"
              onClick={handleDeleteEjercicio}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 shadow-xs transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
              title="Borrar mi ejercicio"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span className="hidden sm:inline">Borrar ejercicio</span>
            </button>
          )}

          <button
            type="button"
            ref={reportTriggerRef}
            onClick={(e) => {
              reportTriggerRef.current = e.currentTarget;
              setShowReportModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:text-amber-700 hover:bg-amber-50 shadow-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            title="Reportar problema en el ejercicio o resolución"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reportar</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">¡Link copiado al portapapeles!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartir link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resolution Verification Status Banner */}
      {resolucion && (
        resolucion.estado === 'verificada' ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-950">Resolución Verificada por la Comunidad:</span>
              <p className="leading-relaxed text-emerald-900">
                Alcanzó 3 o más votos positivos netos de estudiantes. El procedimiento coincide con el método estándar.
              </p>
            </div>
          </div>
        ) : resolucion.estado === 'en_revision' ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950">Resolución En Revisión Comunitaria:</span>
              <p className="leading-relaxed text-amber-900">
                Dos o más estudiantes señalaron discrepancias con el procedimiento. Revisá las observaciones o dejá tu voto para contrastar.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-3 shadow-xs">
            <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900">Resolución Sin Verificar por Pares:</span>
              <p className="leading-relaxed text-slate-600">
                Esta resolución fue generada por IA. Requiere +3 votos positivos netos de compañeros de la cátedra para pasar al estado Verificada.
              </p>
            </div>
          </div>
        )
      )}

      {/* Live streaming steps rendering when regenerating */}
      {(isRegenerating || pasosNuevos.length > 0) && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Generando Nueva Versión Paso a Paso en Tiempo Real...</span>
            </div>
            {isRegenerating && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
          </div>

          {streamStatusMsg && (
            <p className="text-xs text-slate-300 font-medium animate-pulse">
              {streamStatusMsg}
            </p>
          )}

          <div className="space-y-3">
            {pasosNuevos.map((paso, idx) => (
              <PasoAPaso
                key={`streaming-paso-${activeId || ejercicio?.id || 'nuevo'}-${idx}`}
                paso={paso}
                totalPasos={pasosNuevos.length}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regeneration error with Retry button */}
      {regenError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">No se pudo regenerar la resolución:</span>
              <p>{regenError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors"
          >
            Reintentar
          </button>
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

      {/* AI Disclaimer & Confidence Badge */}
      {resolucion && (
        <div className="space-y-3">
          {/* Prominent AI Generation Notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-300/80 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Generado por IA:</strong> verifica siempre los resultados y el procedimiento con tu apunte o bibliografía de la materia.
              </span>
            </div>

            {/* Confidence badge */}
            {resolucion.confianza && (
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 border ${
                  resolucion.confianza === 'alta'
                    ? 'bg-emerald-100/80 text-emerald-900 border-emerald-300'
                    : resolucion.confianza === 'media'
                    ? 'bg-amber-100/90 text-amber-950 border-amber-300'
                    : 'bg-rose-100/80 text-rose-900 border-rose-300'
                }`}
                title={resolucion.motivo_confianza || ''}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  Confianza {resolucion.confianza.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Reason for confidence if not high */}
          {resolucion.motivo_confianza && resolucion.confianza !== 'alta' && (
            <div className="text-[11px] text-slate-500 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700">Nota de confianza: </span>
              {resolucion.motivo_confianza}
            </div>
          )}

          {/* Fallback or specific warning if any */}
          {resolucion.advertencia && (
            <div className="flex items-center gap-2.5 text-xs text-amber-900 bg-amber-50 border border-amber-200/80 px-3.5 py-2.5 rounded-xl font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Aviso: {resolucion.advertencia}</span>
            </div>
          )}
        </div>
      )}

      {/* Initial Understanding & Strategy Section */}
      {resolucion && (resolucion.entendimiento || resolucion.estrategia) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resolucion.entendimiento && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
                <FileQuestion className="w-4 h-4 text-blue-600" />
                <span>Datos, Incógnitas y Conceptos</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                <MathRenderer text={resolucion.entendimiento} />
              </div>
            </div>
          )}

          {resolucion.estrategia && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span>Estrategia de Resolución</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                <MathRenderer text={resolucion.estrategia} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assumed Conditions / Supuestos if any */}
      {resolucion?.supuestos && resolucion.supuestos.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Supuestos y Condiciones de Contorno</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
            {resolucion.supuestos.map((supuesto, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">•</span>
                <span>{supuesto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chair Methodological Summary Card */}
      {resolucion?.resumen_criterio && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-blue-800/40 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>
              {ejercicio?.catedra?.contexto || (ejercicio?.catedra?.criterios_clave && ejercicio.catedra.criterios_clave.length > 0)
                ? 'Criterio cargado por la comunidad'
                : 'Criterio aplicado según el material cargado'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
            {resolucion.resumen_criterio}
          </p>
        </div>
      )}

      {/* Step by Step Breakdown or Solve Action Card */}
      {resolucion ? (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span>Desarrollo Formal Paso a Paso</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {resolucion.contenido_paso_a_paso?.length || 0} pasos deductivos
              </span>
            </div>

            {resolucion.contenido_paso_a_paso && resolucion.contenido_paso_a_paso.length > 0 ? (
              <div className="space-y-3">
                {resolucion.contenido_paso_a_paso.map((paso, idx) => (
                  <PasoAPaso
                    key={`res-paso-${resolucion.id || 'res'}-${idx}`}
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
          {resolucion.resultado_final && (
            <div className="bg-emerald-50/80 border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Resultado Final Enmarcado</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-emerald-950">
                <MathRenderer text={resolucion.resultado_final} />
              </div>
              <p className="text-xs text-emerald-800">
                Resolución elaborada según las pautas metodológicas de la {ejercicio.catedra?.nombre}. Verificá cada paso en tu cursada antes de entregar.
              </p>
            </div>
          )}

          {/* Common Exam Mistakes Callout */}
          {resolucion.errores_comunes && resolucion.errores_comunes.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-900 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Errores Frecuentes a Evitar en Parciales</span>
              </div>
              <ul className="space-y-2 text-xs text-rose-900 leading-relaxed font-sans">
                {resolucion.errores_comunes.map((errItem, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-rose-600 shrink-0 mt-0.5">⚠️</span>
                    <span>{errItem}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border-2 border-blue-200 rounded-2xl p-8 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              Este ejercicio aún no cuenta con resolución
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Podés generar la resolución paso a paso con IA aplicando los criterios, notaciones y advertencias de examen de{' '}
              <strong className="text-slate-800">{ejercicio.catedra?.nombre || 'la cátedra'}</strong>.
            </p>
          </div>

          {regenError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 max-w-md mx-auto flex items-start gap-2 text-left">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{regenError}</span>
            </div>
          )}

          {isRegenerating ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl max-w-sm mx-auto space-y-2">
              <div className="flex items-center justify-center gap-2 text-blue-700 text-xs font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Resolviendo ejercicio...</span>
              </div>
              <p className="text-[11px] text-blue-600 animate-pulse">{streamStatusMsg || 'Generando pasos en tiempo real...'}</p>
            </div>
          ) : (
            <button
              onClick={handleRegenerate}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Resolver con el criterio de {ejercicio.catedra?.nombre || 'la Cátedra'}</span>
            </button>
          )}
        </div>
      )}

      {/* Community Voting Bar (Section 7: Confiabilidad de la IA) */}
      {resolucion && (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              ¿Esta resolución coincide con lo enseñado en tu cátedra?
            </h3>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono font-semibold">
              1 voto por usuario
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Tu voto confirma o sugiere observaciones sobre el procedimiento para los demás estudiantes.
          </p>
          {hasVoted && (
            <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-xs">
              <span className="text-slate-500">Tu voto actual:</span>
              {hasVoted === 'positivo' ? (
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Coincide con tu cátedra
                </span>
              ) : (
                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Discrepa con tu cátedra {discrepancyNote ? `("${discrepancyNote}")` : ''}
                </span>
              )}
              <button
                type="button"
                onClick={() => setHasVoted(null)}
                className="text-[11px] text-blue-600 hover:underline ml-1 font-medium"
              >
                Cambiar voto
              </button>
            </div>
          )}
        </div>

        {/* Voting controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleVote('positivo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              hasVoted === 'positivo'
                ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Coincide (+{resolucion?.votos_positivos || 0})</span>
          </button>

          <button
            onClick={() => setShowFeedbackModal(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              hasVoted === 'negativo'
                ? 'bg-rose-600 text-white shadow-rose-500/30'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>Discrepa (-{resolucion?.votos_negativos || 0})</span>
          </button>
        </div>
      </div>
      )}

      {/* Archived Versions History */}
      {ejercicio.resoluciones_archivadas && ejercicio.resoluciones_archivadas.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <History className="w-4 h-4 text-slate-500" />
            <span>Versiones anteriores archivadas ({ejercicio.resoluciones_archivadas.length})</span>
          </div>
          <p className="text-xs text-slate-500">
            Al regenerar una resolución, se conserva el historial completo con sus votos y pasos anteriores:
          </p>

          <div className="space-y-2">
            {ejercicio.resoluciones_archivadas.map((arch) => (
              <div
                key={arch.id}
                className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1 sm:space-y-0 sm:flex sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-800">
                    Versión del {new Date(arch.fecha_generada).toLocaleDateString('es-AR')}:
                  </span>{' '}
                  <span className="text-slate-600 font-mono">{arch.resultado_final}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {arch.resumen_criterio}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] shrink-0 font-medium pt-1 sm:pt-0">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    +{arch.votos_positivos || 0}
                  </span>
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    -{arch.votos_negativos || 0}
                  </span>
                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono font-semibold">
                    Archivada
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {voteFeedback && (
        <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 text-xs font-medium animate-in fade-in">
          {voteFeedback}
        </div>
      )}

      {/* Modal for Negative Discrepancy Note with Dialog Semantics */}
      {showFeedbackModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discrepancy-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4">
            <h4 id="discrepancy-dialog-title" className="text-base font-bold text-slate-900">
              ¿En qué difiere con tu cátedra?
            </h4>
            <p className="text-xs text-slate-600">
              Contanos qué regla o notación de la cátedra no se cumplió para enviar la resolución a revisión.
            </p>
            <label htmlFor="discrepancy-textarea" className="sr-only">Detalle de la discrepancia</label>
            <textarea
              id="discrepancy-textarea"
              rows={3}
              value={discrepancyNote}
              onChange={(e) => setDiscrepancyNote(e.target.value)}
              placeholder="Ej: La cátedra exige hacer el cuadro de concavidad y no acepta este atajo..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowFeedbackModal(false);
                  feedbackTriggerRef.current?.focus();
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleVote('negativo', discrepancyNote);
                  feedbackTriggerRef.current?.focus();
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
              >
                Enviar reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Exercise Report with Dialog Semantics */}
      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => {
                setShowReportModal(false);
                reportTriggerRef.current?.focus();
              }}
              aria-label="Cerrar modal de reporte"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                <Flag className="w-3.5 h-3.5 text-amber-600" />
                <span id="report-dialog-title">Reportar Ejercicio</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">
                ¿Qué problema encontraste?
              </h4>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-950">¡Reporte registrado!</p>
                <p className="text-[11px] text-emerald-800">
                  El reporte fue registrado para revisión del contenido.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-3 text-xs">
                <div>
                  <label htmlFor="select-report-motivo" className="block font-semibold text-slate-700 mb-1">
                    Motivo principal:
                  </label>
                  <select
                    id="select-report-motivo"
                    value={reportMotivo}
                    onChange={(e) => setReportMotivo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Resolución errónea o imprecisa">Resolución errónea o imprecisa</option>
                    <option value="Enunciado ilegible o incompleto">Enunciado ilegible o incompleto</option>
                    <option value="Cátedra o materia incorrecta">Cátedra o materia incorrecta</option>
                    <option value="Contenido inapropiado o spam">Contenido inapropiado o spam</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="textarea-report-detalle" className="block font-semibold text-slate-700 mb-1">
                    Detalle o aclaración (opcional):
                  </label>
                  <textarea
                    id="textarea-report-detalle"
                    rows={3}
                    value={reportDetalle}
                    onChange={(e) => setReportDetalle(e.target.value)}
                    placeholder="Ej: El resultado en la parte b no contempla la restricción del dominio..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false);
                      reportTriggerRef.current?.focus();
                    }}
                    className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500 outline-none"
                  >
                    {isSubmittingReport && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Enviar reporte</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
