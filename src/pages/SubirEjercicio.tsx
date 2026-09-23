import React, { useState } from 'react';
import {
  Catedra,
  ConsultasStatus,
  Usuario,
} from '../types';
import { EJERCICIOS_DEMO_PRECARGADOS } from '../data/seed';
import { api } from '../services/api';
import {
  Upload,
  Camera,
  FileText,
  Sparkles,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface SubirEjercicioProps {
  catedras: Catedra[];
  selectedCatedra: Catedra | null;
  setSelectedCatedra: (c: Catedra) => void;
  usuario: Usuario | null;
  consultas: ConsultasStatus | null;
  onEjercicioGenerado: (ejercicioId: string) => void;
  onOpenUpgradeModal: () => void;
}

export const SubirEjercicio: React.FC<SubirEjercicioProps> = ({
  catedras,
  selectedCatedra,
  setSelectedCatedra,
  usuario,
  consultas,
  onEjercicioGenerado,
  onOpenUpgradeModal,
}) => {
  const [titulo, setTitulo] = useState('');
  const [enunciado, setEnunciado] = useState('');
  const [tema, setTema] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [solvingPhase, setSolvingPhase] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeCatedra = selectedCatedra || catedras[0];
  const isPremium = usuario?.plan === 'premium';
  const remaining = consultas?.restantes ?? 0;

  // Handle image upload from file or camera
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      triggerOcr(base64);
    };
    reader.readAsDataURL(file);
  };

  // Trigger OCR with Gemini
  const triggerOcr = async (base64Img: string) => {
    setIsExtractingOcr(true);
    setErrorMsg(null);
    try {
      const res = await api.extraerTextoOCR(base64Img);
      if (res.texto_ocr) {
        setEnunciado(res.texto_ocr);
        if (!titulo) {
          setTitulo(`Ejercicio de ${activeCatedra.nombre}`);
        }
      }
    } catch (err: any) {
      console.warn('OCR fallback warning:', err);
      // Fallback message if OCR fails or is empty
      if (!enunciado) {
        setEnunciado('Transcribí aquí el enunciado del ejercicio de tu cátedra...');
      }
    } finally {
      setIsExtractingOcr(false);
    }
  };

  // 1-Click Preset Demo Loader
  const handleLoadDemo = (demo: typeof EJERCICIOS_DEMO_PRECARGADOS[0]) => {
    setTitulo(demo.titulo);
    setEnunciado(demo.enunciado);
    setTema(demo.tema);
    const cat = catedras.find((c) => c.id === demo.catedra_id);
    if (cat) setSelectedCatedra(cat);
    setImagePreview(null);
    setErrorMsg(null);
  };

  // Submit and solve
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!enunciado.trim()) {
      setErrorMsg('Por favor ingresá o transcribí el enunciado del ejercicio.');
      return;
    }

    // Check Freemium quota
    if (!isPremium && remaining === 0) {
      onOpenUpgradeModal();
      return;
    }

    setIsSolving(true);
    setErrorMsg(null);

    // Sequence pedagogical solving phases for UX
    setSolvingPhase('Extrayendo variables y analizando restricciones...');
    const t1 = setTimeout(() => {
      setSolvingPhase(`Aplicando criterios metodológicos de la ${activeCatedra.nombre}...`);
    }, 1200);

    const t2 = setTimeout(() => {
      setSolvingPhase('Desglosando justificaciones paso a paso y comprobaciones de examen...');
    }, 2500);

    try {
      const res = await api.generarResolucion({
        catedra_id: activeCatedra.id,
        titulo: titulo.trim() || `Ejercicio de ${activeCatedra.nombre}`,
        enunciado: enunciado.trim(),
        imagen_base64: imagePreview || undefined,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      // Navigate to the newly generated resolution
      onEjercicioGenerado(res.ejercicio_id);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      if (err.upgrade_required) {
        onOpenUpgradeModal();
      } else {
        setErrorMsg(err.message || 'Error al resolver el ejercicio. Intentá nuevamente.');
      }
    } finally {
      setIsSolving(false);
      setSolvingPhase('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Subir Ejercicio para Resolución por Cátedra
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Saca una foto, adjunta un PDF o pega el enunciado. La IA lo resolverá con los criterios exigidos
          por tu docente.
        </p>
      </div>

      {/* 1-Click Fast Presets */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Ejercicios de prueba rápida (1-Clic)</span>
          </div>
          <span className="text-[11px] text-blue-700">Sin necesidad de subir archivos</span>
        </div>
        <p className="text-xs text-blue-800 mb-3">
          Seleccioná un enunciado real de examen para probar el razonamiento según la cátedra:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {EJERCICIOS_DEMO_PRECARGADOS.map((demo, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLoadDemo(demo)}
              className="text-left p-3 rounded-xl bg-white hover:bg-blue-100/50 border border-blue-200 text-xs text-slate-800 hover:border-blue-400 transition-all shadow-xs flex flex-col justify-between"
            >
              <span className="font-semibold text-blue-950 line-clamp-1 mb-1">{demo.titulo}</span>
              <span className="text-[11px] text-slate-500 line-clamp-2">{demo.tema}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Grid: Upload box + Chair selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Image / Photo Upload */}
          <div className="lg:col-span-1 space-y-3">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Foto o Captura del Ejercicio
            </label>

            <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center min-h-[220px]">
              {imagePreview ? (
                <div className="space-y-3 w-full">
                  <img
                    src={imagePreview}
                    alt="Preview del ejercicio"
                    className="max-h-48 mx-auto rounded-lg object-contain shadow-xs border border-slate-200"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <label
                      htmlFor="file-upload"
                      className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline"
                    >
                      Cambiar foto
                    </label>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                      }}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800">
                      Saca una foto o arrastra un archivo
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">JPG, PNG o PDF de tu guía</p>
                  </div>
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Seleccionar imagen
                  </label>
                </div>
              )}

              <input
                id="file-upload"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {isExtractingOcr && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>Extrayendo enunciado con OCR de IA...</span>
              </div>
            )}
          </div>

          {/* Right: Cátedra selector and Methodological alert */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                2. Cátedra Universitaria
              </label>
              <select
                value={activeCatedra.id}
                onChange={(e) => {
                  const cat = catedras.find((c) => c.id === e.target.value);
                  if (cat) setSelectedCatedra(cat);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-xs"
              >
                {catedras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.profesor})
                  </option>
                ))}
              </select>
            </div>

            {/* Chair Method Rules Box */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <BookOpen className="w-4 h-4" />
                <span>Criterio Exigido por {activeCatedra.nombre}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {activeCatedra.estilo_metodologico}
              </p>
              <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">Requisitos indispensables:</span>
                {activeCatedra.criterios_clave.slice(0, 2).map((ck, i) => (
                  <span key={i} className="text-blue-300">
                    • {ck}
                  </span>
                ))}
              </div>
            </div>

            {/* Title & Topic Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título identificador
                </label>
                <input
                  type="text"
                  placeholder="Ej: Límite de Taylor para 2do Parcial"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tema o Unidad
                </label>
                <select
                  value={tema || activeCatedra.temas[0]}
                  onChange={(e) => setTema(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {activeCatedra.temas.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Text Area for Problem Statement (Enunciado) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. Enunciado Completo del Ejercicio
            </label>
            <span className="text-[11px] text-slate-500">
              Podés editarlo o ajustar fórmulas antes de resolver
            </span>
          </div>

          <textarea
            rows={5}
            placeholder="Pega o escribe aquí el enunciado del ejercicio, incluyendo datos y consignas..."
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl p-4 text-xs sm:text-sm font-mono text-slate-800 leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-xs"
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">No pudimos procesar la resolución:</span>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Submit Button & Solving status */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {!isPremium ? (
              <span>
                Consultas gratis hoy: <strong>{remaining}</strong> restantes
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Plan Premium activo (ilimitado)
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSolving || isExtractingOcr}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              isSolving
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-500/25 hover:scale-[1.01]'
            }`}
          >
            {isSolving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{solvingPhase || 'Resolviendo con IA según cátedra...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Resolver con Criterio de {activeCatedra.nombre}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
