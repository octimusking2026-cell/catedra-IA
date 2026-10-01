import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PasoResolucion } from '../types';
import { PasoAPaso } from '../components/PasoAPaso';
import { api } from '../services/api';
import { useCatalog } from '../context/CatalogContext';
import { useQuota } from '../context/QuotaContext';
import { useSession } from '../context/SessionContext';
import { useFileUpload } from '../hooks/useFileUpload';
import { SEO } from '../components/SEO';
import {
  Upload,
  Camera,
  FileText,
  Sparkles,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
} from 'lucide-react';

export const SubirEjercicio: React.FC = () => {
  const navigate = useNavigate();
  const {
    carreras,
    selectedCarrera,
    setSelectedCarrera,
    materias,
    selectedMateria,
    setSelectedMateria,
    catedras,
    selectedCatedra,
    setSelectedCatedra,
    refreshEjercicios,
  } = useCatalog();
  const { consultas, openLimiteModal, refreshQuota } = useQuota();
  const { authUser } = useSession();

  const [titulo, setTitulo] = useState('');
  const [enunciado, setEnunciado] = useState('');
  const [tema, setTema] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [streamStatusMsg, setStreamStatusMsg] = useState('');
  const [pasosRecibidos, setPasosRecibidos] = useState<PasoResolucion[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [visibilidad, setVisibilidad] = useState<'privado' | 'compartido'>('privado');

  // Drag and Drop state
  const [isDragging, setIsDragging] = useState(false);

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const activeCatedra = selectedCatedra || (catedras && catedras.length > 0 ? catedras[0] : undefined);
  const remaining = consultas?.restantes ?? 0;
  const limit = consultas?.limite ?? 50;

  // Custom hook for File & PDF management and OCR
  const {
    preview: imagePreview,
    fileObject, // Native File object from useFileUpload
    fileMeta: uploadedFileMeta,
    isProcessing: isExtractingOcr,
    setIsProcessing: setIsExtractingOcr,
    error: fileError,
    warning: ocrWarning,
    setWarning: setOcrWarning,
    incluirImagen,
    setIncluirImagen,
    clearFile,
    processFile,
    handleInputChange: handleImageChange,
  } = useFileUpload({
    onExtractedText: (extracted) => {
      setEnunciado(extracted);
      if (!titulo) {
        setTitulo(activeCatedra ? `Ejercicio de ${activeCatedra.nombre}` : 'Nuevo Ejercicio');
      }
    },
    onOcrFallbackNeeded: async (base64, mimeType) => {
      setIsExtractingOcr(true);
      try {
        const res = await api.extraerTextoOCR(base64, mimeType);
        await refreshQuota();
        if (res.texto_ocr) {
          setEnunciado(res.texto_ocr);
          if (!titulo) {
            setTitulo(activeCatedra ? `Ejercicio de ${activeCatedra.nombre}` : 'Nuevo Ejercicio');
          }
        } else if (res.advertencia) {
          setOcrWarning(res.advertencia);
        }
      } catch (err: any) {
        if (err.limite_alcanzado || err.status === 429) {
          openLimiteModal();
        }
        setOcrWarning('No se pudo extraer el texto automáticamente. Podés transcribir el enunciado en el cuadro de texto.');
      } finally {
        setIsExtractingOcr(false);
      }
    },
  });

  // Drag and Drop event handlers for full desktop support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Filtered materias according to selected carrera
  const materiasDeCarrera = materias.filter(
    (m) =>
      !selectedCarrera ||
      (m.carreras_ids && m.carreras_ids.includes(selectedCarrera.id))
  );

  // Filtered catedras according to selected materia
  const catedrasDeMateria = selectedMateria
    ? catedras.filter((c) => c.materia_id === selectedMateria.id)
    : catedras;

  // Auto-select single catedra if only 1 exists
  useEffect(() => {
    if (selectedMateria) {
      const matCats = catedras.filter((c) => c.materia_id === selectedMateria.id);
      if (matCats.length === 1) {
        if (!selectedCatedra || selectedCatedra.id !== matCats[0].id) {
          setSelectedCatedra(matCats[0]);
        }
      }
    }
  }, [selectedMateria, catedras, selectedCatedra, setSelectedCatedra]);

  // Keep topic synced when chair changes
  useEffect(() => {
    if (activeCatedra?.temas && activeCatedra.temas.length > 0) {
      if (!tema || !activeCatedra.temas.includes(tema)) {
        setTema(activeCatedra.temas[0]);
      }
    }
  }, [activeCatedra, tema]);

  // Send feedback / problem / suggestion directly to Firestore
  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;
    setIsSubmittingRequest(true);
    setRequestError(null);
    try {
      await api.enviarFeedback({
        mensaje: requestText.trim(),
        pantalla: 'SubirEjercicio',
      });
      setRequestSuccess(true);
      setTimeout(() => {
        setRequestSuccess(false);
        setShowRequestModal(false);
        setRequestText('');
      }, 2000);
    } catch (err: any) {
      setRequestError(err.message || 'Error al enviar el mensaje');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Submit and solve
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!enunciado.trim()) {
      setErrorMsg('Por favor ingresá o transcribí el enunciado del ejercicio.');
      return;
    }

    // Check Fair Usage quota
    if (remaining === 0) {
      openLimiteModal();
      return;
    }

    if (!activeCatedra) {
      setErrorMsg('Por favor seleccioná una cátedra universitaria válida antes de resolver.');
      return;
    }

    setIsSolving(true);
    setErrorMsg(null);
    setPasosRecibidos([]);
    setStreamStatusMsg('Iniciando resolución con IA...');

    try {
      const activeTema = (tema || activeCatedra.temas?.[0] || 'General').trim();
      const detectedMime =
        uploadedFileMeta?.mimeType ||
        (imagePreview?.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg');

      // Convert File object to base64 strictly on-demand right before API dispatch
      let finalBase64: string | undefined = undefined;
      if (fileObject) {
        finalBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Error al codificar el archivo adjunto.'));
          reader.readAsDataURL(fileObject);
        });
      }

      const res = await api.generarResolucionStream(
        {
          catedra_id: activeCatedra.id,
          enunciado: enunciado.trim(),
          titulo: titulo.trim() || `Ejercicio de ${activeCatedra.nombre}`,
          tema: activeTema,
          imagen_base64: finalBase64,
          mime_type: detectedMime,
          incluir_imagen: incluirImagen,
          visibilidad,
        },
        {
          onPaso: (p) => {
            setPasosRecibidos((prev) => {
              if (prev.some((existing) => existing.numero === p.numero)) return prev;
              return [...prev, p];
            });
          },
          onStatus: (st) => {
            setStreamStatusMsg(st.mensaje);
          },
        }
      );

      // Refresh catalog and quota
      await refreshEjercicios();
      await refreshQuota();

      // Navigate to the newly generated resolution route
      navigate(`/ejercicio/${res.ejercicio_id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      if (err.limite_alcanzado || err.status === 429) {
        openLimiteModal();
      } else {
        setErrorMsg(err.message || 'Se cortó la conexión con la IA al resolver. Podés reintentar sin perder cuota.');
      }
    } finally {
      setIsSolving(false);
      setStreamStatusMsg('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <SEO
        title="Subir Ejercicio | Cátedra IA"
        description="Subí la foto o PDF de tu ejercicio universitario para obtener la resolución deductiva paso a paso con fórmulas en LaTeX."
      />
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Subir Ejercicio para Resolución con IA
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Saca una foto, adjunta un PDF o pega el enunciado. La IA lo resolverá paso a paso según el método estándar de la materia.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Grid: Upload box + Chair selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Image / Photo Upload */}
          <div className="lg:col-span-1 space-y-3">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Foto o Captura del Ejercicio
            </label>

            {/* Active Dropzone with drag detection */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-colors flex flex-col items-center justify-center min-h-[220px] ${
                isDragging
                  ? 'border-blue-600 bg-blue-50/40 scale-[1.01]'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              {imagePreview ? (
                <div className="space-y-3 w-full">
                  {uploadedFileMeta?.isPdf || imagePreview.startsWith('blob:') && uploadedFileMeta?.mimeType === 'application/pdf' ? (
                    <div className="p-4 bg-red-50/90 border border-red-200 rounded-xl flex items-center gap-3 text-left shadow-xs">
                      <div className="w-12 h-12 rounded-lg bg-red-600 text-white flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <FileText className="w-5 h-5" />
                        <span className="text-[9px] uppercase tracking-wider">PDF</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {uploadedFileMeta?.name || 'Documento PDF'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {uploadedFileMeta?.size || 'Archivo adjunto'}
                        </p>
                        <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold mt-1">
                          Listo para procesar con IA
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={imagePreview}
                      alt="Preview del ejercicio"
                      className="max-h-48 mx-auto rounded-lg object-contain shadow-xs border border-slate-200"
                    />
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <label
                      htmlFor="file-upload"
                      className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline"
                    >
                      {uploadedFileMeta?.isPdf ? 'Cambiar PDF' : 'Cambiar archivo'}
                    </label>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="text-xs text-rose-500 hover:underline cursor-pointer"
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

            {/* Image inclusion checkbox */}
            {imagePreview && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={incluirImagen}
                  onChange={(e) => setIncluirImagen(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="leading-tight">
                  <strong>Incluir la imagen (útil si hay figuras, diagramas o gráficos)</strong>
                </span>
              </label>
            )}

            {isExtractingOcr && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>Extrayendo enunciado con OCR de IA...</span>
              </div>
            )}

            {fileError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{fileError}</span>
              </div>
            )}

            {ocrWarning && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{ocrWarning}</span>
              </div>
            )}
          </div>

          {/* Right: Academic selectors & Methodological alert */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Carrera Selector */}
              <div>
                <label htmlFor="select-carrera-subir" className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  1. Carrera
                </label>
                <select
                  id="select-carrera-subir"
                  value={selectedCarrera?.id || ''}
                  onChange={(e) => {
                    const car = carreras.find((c) => c.id === e.target.value);
                    if (car) setSelectedCarrera(car);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-xs focus-visible:ring-offset-2"
                >
                  {carreras.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Materia Selector */}
              <div>
                <label htmlFor="select-materia-subir" className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  2. Materia
                </label>
                <select
                  id="select-materia-subir"
                  value={selectedMateria?.id || ''}
                  onChange={(e) => {
                    const mat = materias.find((m) => m.id === e.target.value);
                    if (mat) setSelectedMateria(mat);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-xs focus-visible:ring-offset-2"
                >
                  {materiasDeCarrera.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} {m.codigo ? `(${m.codigo})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Cátedra Selector (Only if more than 1 catedra exists) */}
            {catedrasDeMateria.length > 1 && (
              <div>
                <label htmlFor="select-catedra-subir" className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  3. Cátedra / Docente
                </label>
                <select
                  id="select-catedra-subir"
                  value={activeCatedra?.id || ''}
                  onChange={(e) => {
                    const cat = catedras.find((c) => c.id === e.target.value);
                    if (cat) setSelectedCatedra(cat);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-xs focus-visible:ring-offset-2"
                >
                  {catedrasDeMateria.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Reportar problema / sugerencia</span>
              </button>
            </div>

            {/* Chair Method Rules Box */}
            {activeCatedra ? (
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <BookOpen className="w-4 h-4" />
                  <span>Criterio según el material: {activeCatedra.nombre}</span>
                </div>
                {activeCatedra.estilo_metodologico && (
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {activeCatedra.estilo_metodologico}
                  </p>
                )}
                {activeCatedra.criterios_clave && activeCatedra.criterios_clave.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-200">Requisitos indispensables:</span>
                    {activeCatedra.criterios_clave.slice(0, 2).map((ck, i) => (
                      <span key={i} className="text-blue-300">
                        • {ck}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-100 text-slate-600 text-xs border border-slate-200">
                Seleccioná una carrera y materia para cargar el criterio de cátedra.
              </div>
            )}

            {/* Title & Topic Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="input-titulo-subir" className="block text-xs font-semibold text-slate-700 mb-1">
                  Título identificador
                </label>
                <input
                  id="input-titulo-subir"
                  type="text"
                  placeholder="Ej: Límite de Taylor para 2do Parcial"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="select-tema-subir" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tema o Unidad
                </label>
                <select
                  id="select-tema-subir"
                  value={tema || activeCatedra?.temas?.[0] || ''}
                  onChange={(e) => setTema(e.target.value)}
                  disabled={!activeCatedra || !activeCatedra.temas || activeCatedra.temas.length === 0}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                >
                  {activeCatedra?.temas && activeCatedra.temas.length > 0 ? (
                    activeCatedra.temas.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  ) : (
                    <option value="General">General</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Text Area for Problem Statement (Enunciado) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="textarea-enunciado-subir" className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. Enunciado Completo del Ejercicio
            </label>
            <span className="text-[11px] text-slate-500">
              Podés editarlo o ajustar fórmulas antes de resolver
            </span>
          </div>

          <textarea
            id="textarea-enunciado-subir"
            rows={5}
            placeholder="Pega o escribe aquí el enunciado del ejercicio, incluyendo datos y consignas..."
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl p-4 text-xs sm:text-sm font-mono text-slate-800 leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-xs"
          />
        </div>

        {/* Visibilidad del Ejercicio: Checkbox (por defecto sin marcar / privado) */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={visibilidad === 'compartido'}
              onChange={(e) => setVisibilidad(e.target.checked ? 'compartido' : 'privado')}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <div className="space-y-0.5 select-none">
              <span className="text-xs font-bold text-slate-900 block">
                Publicar y compartir resolución en el banco de ejercicios comunitario
              </span>
              <span className="text-xs text-slate-500 block leading-relaxed">
                Por defecto viene sin marcar (privado solo para vos). Si marcás la casilla, otros estudiantes de la materia podrán consultar la resolución generada.
              </span>
            </div>
          </label>
        </div>

        {/* Live streaming steps rendering during resolution */}
        {(isSolving || pasosRecibidos.length > 0) && (
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Generando Resolución Paso a Paso en Tiempo Real...</span>
              </div>
              {isSolving && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
            </div>

            {streamStatusMsg && (
              <p className="text-xs text-slate-300 font-medium animate-pulse">
                {streamStatusMsg}
              </p>
            )}

            <div className="space-y-3">
              {pasosRecibidos.map((paso, idx) => (
                <PasoAPaso
                  key={`subir-paso-${idx}-${paso.titulo || 'paso'}`}
                  paso={paso}
                  totalPasos={pasosRecibidos.length}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error message & Retry Button */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">No se pudo completar la resolución:</span>
                <p>{errorMsg}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => handleSubmit(e)}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Submit Button & Solving status */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>
              Uso justo hoy: <strong>{remaining}</strong> de {limit} consultas disponibles
            </span>
          </div>

          <button
            type="submit"
            disabled={isSolving || isExtractingOcr || !activeCatedra}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              isSolving || !activeCatedra
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-500/25 hover:scale-[1.01]'
            }`}
          >
            {isSolving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando pasos en tiempo real... ({pasosRecibidos.length} pasos)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Resolver con Criterio de {activeCatedra?.nombre || 'la Cátedra'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Report Problem / Suggestion Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <AlertCircle className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Reportar Problema o Sugerencia</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">
                ¿Tenés una consulta, sugerencia o inconveniente?
              </h4>
              <p className="text-xs text-slate-500">
                Tu mensaje se guardará en nuestro sistema en Firestore para que el equipo pueda responder o ajustar las cátedras.
              </p>
            </div>

            {requestSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-950">¡Mensaje enviado!</p>
                <p className="text-[11px] text-emerald-800">
                  Gracias por tu sugerencia. Revisaremos el reporte a la brevedad.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} className="space-y-3 text-xs">
                {requestError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                    {requestError}
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mensaje / Detalle del reporte:
                  </label>
                  <textarea
                    rows={4}
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    placeholder="Contanos qué problema encontraste, qué materia falta o tu sugerencia..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRequest || !requestText.trim()}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmittingRequest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Enviar mensaje</span>
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
