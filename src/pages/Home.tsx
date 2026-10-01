import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EjercicioCard } from '../components/EjercicioCard';
import {
  Search,
  Filter,
  GraduationCap,
  Sparkles,
  BookOpen,
  Info,
  PlusCircle,
  CheckCircle2,
  ArrowUpDown,
  Send,
  X,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { SEO } from '../components/SEO';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { authUser } = useSession();
  const {
    carreras,
    selectedCarrera,
    setSelectedCarrera,
    selectedAnio,
    setSelectedAnio,
    materias,
    selectedMateria,
    setSelectedMateria,
    catedras,
    selectedCatedra,
    setSelectedCatedra,
    ejercicios,
    totalPages,
    currentPage,
    refreshEjercicios,
  } = useCatalog();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTema, setSelectedTema] = useState<string>('todos');
  const [ordenFecha, setOrdenFecha] = useState<'recientes' | 'antiguos'>('recientes');

  // Pagination local states
  const [page, setPage] = useState(1);
  const limit = 6; // Grid with 6 items is perfectly balanced

  // Debounced query state to avoid rapid backend queries
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [loading, setLoading] = useState(false);

  // Request modal state for missing career/subject
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Debounce search term to prevent Firestore load spam
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page to 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedCatedra?.id, selectedMateria?.id, selectedTema, debouncedSearch, ordenFecha]);

  // Reactive Effect to fetch paginated exercises from server (COMPLETELY ELIMINATES CLIENT-SIDE LOAD & RACE CONDITIONS)
  useEffect(() => {
    if (!authUser) return;

    let active = true;
    const fetchList = async () => {
      setLoading(true);
      try {
        await refreshEjercicios({
          catedra_id: selectedCatedra?.id,
          materia_id: selectedMateria?.id,
          tema: selectedTema,
          query: debouncedSearch,
          orden: ordenFecha,
          page,
          limit,
        });
      } catch (err) {
        console.error('Error loading paginated exercises:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchList();
    return () => {
      active = false;
    };
  }, [
    authUser,
    selectedCatedra?.id,
    selectedMateria?.id,
    selectedTema,
    debouncedSearch,
    ordenFecha,
    page,
    refreshEjercicios,
  ]);

  // Filtered materias according to selected carrera and selected anio
  const materiasDeCarrera = useMemo(() => {
    return materias.filter((m) => {
      const matchesCarrera =
        !selectedCarrera ||
        (m.carreras_ids && m.carreras_ids.includes(selectedCarrera.id));

      const effectiveAnio =
        selectedCarrera && m.anio_por_carrera?.[selectedCarrera.id] !== undefined
          ? m.anio_por_carrera[selectedCarrera.id]
          : m.anio;

      const matchesAnio = selectedAnio === null || effectiveAnio === selectedAnio;

      return matchesCarrera && matchesAnio;
    });
  }, [materias, selectedCarrera, selectedAnio]);

  // Adjust selected materia when filtered list changes
  useEffect(() => {
    if (materiasDeCarrera.length > 0) {
      if (!selectedMateria || !materiasDeCarrera.some((m) => m.id === selectedMateria.id)) {
        const first = materiasDeCarrera[0];
        setSelectedMateria(first);
      }
    }
  }, [materiasDeCarrera, selectedMateria, setSelectedMateria]);

  // Filtered catedras according to selected materia
  const catedrasDeMateria = useMemo(() => {
    return selectedMateria
      ? catedras.filter((c) => c.materia_id === selectedMateria.id)
      : catedras;
  }, [catedras, selectedMateria]);

  // Auto-select single catedra and hide selector if only 1 exists
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

  // Extract available themes from selected catedra
  const temasDisponibles = selectedCatedra ? selectedCatedra.temas : [];

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;
    setIsSubmittingRequest(true);
    setRequestError(null);
    try {
      await api.enviarFeedback({
        mensaje: requestText.trim(),
        pantalla: 'HomeFeed',
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

  return (
    <div className="space-y-8 pb-16">
      <SEO
        title={selectedCarrera ? `Feed de Ejercicios – ${selectedCarrera.nombre}` : 'Feed de Ejercicios Universitarios'}
        description="Explorá el banco universitario de ejercicios resueltos paso a paso por materia y cátedra con fórmulas en LaTeX."
      />
      {/* Hero & Academic Selector Banner */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Resoluciones paso a paso con IA, según el método estándar de cada materia</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
            Elegí tu carrera y materia para practicar
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Subí una foto o PDF de tus ejercicios y obtené el desarrollo deductivo paso a paso con fórmulas en LaTeX para contrastar con tu guía de estudio.
          </p>
        </div>

        {/* Academic Filters Card */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Carrera Selector */}
            <div className="space-y-1.5">
              <label htmlFor="select-carrera" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                1. Carrera
              </label>
              <select
                id="select-carrera"
                value={selectedCarrera?.id || ''}
                onChange={(e) => {
                  const car = carreras.find((c) => c.id === e.target.value);
                  if (car) setSelectedCarrera(car);
                }}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                {carreras.map((car) => (
                  <option key={car.id} value={car.id} className="bg-slate-900 text-white">
                    {car.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Año Chips */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                2. Año
              </span>
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedAnio(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${
                    selectedAnio === null
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/80'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAnio(1)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${
                    selectedAnio === 1
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/80'
                  }`}
                >
                  1° Año
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAnio(2)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${
                    selectedAnio === 2
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/80'
                  }`}
                >
                  2° Año
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAnio(3)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${
                    selectedAnio === 3
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/80'
                  }`}
                >
                  3° Año
                </button>
              </div>
            </div>

            {/* 3. Materia Selector */}
            <div className="space-y-1.5">
              <label htmlFor="select-materia" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                3. Materia
              </label>
              <select
                id="select-materia"
                value={selectedMateria?.id || ''}
                onChange={(e) => {
                  const mat = materias.find((m) => m.id === e.target.value);
                  if (mat) {
                    setSelectedMateria(mat);
                    const firstCat = catedras.find((c) => c.materia_id === mat.id);
                    if (firstCat) setSelectedCatedra(firstCat);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                {materiasDeCarrera.map((mat) => (
                  <option key={mat.id} value={mat.id} className="bg-slate-900 text-white">
                    {mat.nombre} {mat.codigo ? `(${mat.codigo})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Cátedra Selector (Only if more than 1 catedra exists) */}
            {catedrasDeMateria.length > 1 && (
              <div className="space-y-1.5 md:col-span-3">
                <label htmlFor="select-catedra" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-400" />
                  4. Cátedra / Docente
                </label>
                <select
                  id="select-catedra"
                  value={selectedCatedra?.id || ''}
                  onChange={(e) => {
                    const cat = catedras.find((c) => c.id === e.target.value);
                    if (cat) setSelectedCatedra(cat);
                  }}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 font-semibold"
                >
                  {catedrasDeMateria.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Missing Career/Subject Request Link */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="text-[11px] text-slate-400">
              {selectedCarrera?.nombre} {selectedMateria ? `· ${selectedMateria.nombre}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="text-sky-300 hover:text-white underline font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Reportar problema / sugerencia</span>
            </button>
          </div>
        </div>

        {/* Selected Catedra Highlight Box */}
        {selectedCatedra && (
          <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sky-300 uppercase tracking-wider text-[11px]">
                {selectedCatedra.nombre}
              </span>
              <span className="text-[11px] text-slate-400">{selectedCatedra.cuatrimestre}</span>
            </div>
            {selectedCatedra.criterios_clave && selectedCatedra.criterios_clave.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedCatedra.criterios_clave.slice(0, 2).map((crit, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-200 text-[11px] font-medium border border-blue-400/20"
                  >
                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                    <span>{crit}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Controls Bar: Upload Button, Search, Theme Filter, Sort */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
          {/* Upload New Exercise Button */}
          <button
            type="button"
            onClick={() => navigate('/subir')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Subir Nuevo Ejercicio</span>
          </button>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por tema, enunciado o palabra clave..."
              aria-label="Buscar ejercicios"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Theme Filter Dropdown */}
            {temasDisponibles.length > 0 && (
              <select
                value={selectedTema}
                onChange={(e) => setSelectedTema(e.target.value)}
                aria-label="Filtrar por tema o unidad"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="todos">Todos los temas</option>
                {temasDisponibles.map((t, idx) => (
                  <option key={idx} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            {/* Date Order Filter */}
            <button
              type="button"
              onClick={() =>
                setOrdenFecha((prev) => (prev === 'recientes' ? 'antiguos' : 'recientes'))
              }
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{ordenFecha === 'recientes' ? 'Más recientes' : 'Más antiguos'}</span>
            </button>
          </div>
        </div>

        {/* Exercises Grid, Loading Spinner or Empty State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold select-none">
              Buscando ejercicios en el servidor...
            </p>
          </div>
        ) : ejercicios.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ejercicios.map((ej) => (
                <EjercicioCard
                  key={ej.id}
                  ejercicio={ej}
                />
              ))}
            </div>

            {/* Pagination Controls bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold select-none">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto shadow-xs transition-colors duration-200">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Aún no hay ejercicios cargados para esta materia
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sé el primero en subir un enunciado práctico o parcial para obtener su resolución paso a paso.
              </p>
            </div>
            <button
              onClick={() => navigate('/subir')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Subir el primer ejercicio</span>
            </button>
          </div>
        )}
      </div>

      {/* Report Problem / Suggestion Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Reportar Problema o Sugerencia</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">
                ¿Tenés una consulta, sugerencia o problema?
              </h4>
              <p className="text-xs text-slate-500">
                Tu mensaje se guardará en nuestro sistema en Firestore para que el equipo pueda revisar y responder a la brevedad.
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
                    {isSubmittingRequest ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
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
