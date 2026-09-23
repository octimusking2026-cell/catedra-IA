import React, { useState, useEffect } from 'react';
import {
  Facultad,
  Materia,
  Catedra,
  Ejercicio,
} from '../types';
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
  AlertCircle,
} from 'lucide-react';

interface HomeProps {
  facultades: Facultad[];
  materias: Materia[];
  catedras: Catedra[];
  selectedFacultad: Facultad | null;
  setSelectedFacultad: (f: Facultad) => void;
  selectedMateria: Materia | null;
  setSelectedMateria: (m: Materia) => void;
  selectedCatedra: Catedra | null;
  setSelectedCatedra: (c: Catedra) => void;
  ejercicios: any[];
  onSelectEjercicio: (id: string) => void;
  onGoToSubir: () => void;
}

export const Home: React.FC<HomeProps> = ({
  facultades,
  materias,
  catedras,
  selectedFacultad,
  setSelectedFacultad,
  selectedMateria,
  setSelectedMateria,
  selectedCatedra,
  setSelectedCatedra,
  ejercicios,
  onSelectEjercicio,
  onGoToSubir,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTema, setSelectedTema] = useState<string>('todos');

  // Filtered materias according to selected facultad
  const materiasDeFacultad = selectedFacultad
    ? materias.filter((m) => m.facultad_id === selectedFacultad.id)
    : materias;

  // Filtered catedras according to selected materia
  const catedrasDeMateria = selectedMateria
    ? catedras.filter((c) => c.materia_id === selectedMateria.id)
    : catedras;

  // Filtered exercises
  const filteredEjercicios = ejercicios.filter((ej) => {
    const matchesCatedra = selectedCatedra ? ej.catedra_id === selectedCatedra.id : true;
    const matchesTema = selectedTema === 'todos' ? true : ej.tema === selectedTema;
    const matchesSearch =
      !searchTerm ||
      ej.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ej.texto_ocr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ej.tema && ej.tema.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCatedra && matchesTema && matchesSearch;
  });

  // Extract available themes from selected catedra
  const temasDisponibles = selectedCatedra ? selectedCatedra.temas : [];

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Header */}
      <section className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-10 shadow-lg overflow-hidden border border-blue-900/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Resolución Inteligente con el Criterio de tu Cátedra</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Cada cátedra tiene su método. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              CátedraIA te lo resuelve como te lo piden en el parcial.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            No te arriesgues a perder puntos por usar un método no aceptado por tu profesor. Seleccioná tu
            cátedra, subí la foto o PDF de tu ejercicio y obtené el desarrollo formal paso a paso.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onGoToSubir}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Subir nuevo ejercicio</span>
            </button>
          </div>
        </div>
      </section>

      {/* University & Chair Selectors */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <span>Configurá tu Cátedra Activa</span>
          </h2>
          <span className="text-xs text-slate-500 hidden sm:inline">
            El feed y la IA se adaptarán a estos criterios
          </span>
        </div>

        {/* 3 Selectors: Facultad -> Materia -> Cátedra */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Facultad */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1. Facultad / Universidad
            </label>
            <select
              value={selectedFacultad?.id || ''}
              onChange={(e) => {
                const fac = facultades.find((f) => f.id === e.target.value);
                if (fac) {
                  setSelectedFacultad(fac);
                  const firstMat = materias.find((m) => m.facultad_id === fac.id);
                  if (firstMat) {
                    setSelectedMateria(firstMat);
                    const firstCat = catedras.find((c) => c.materia_id === firstMat.id);
                    if (firstCat) setSelectedCatedra(firstCat);
                  }
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {facultades.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.siglas} — {f.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Materia */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              2. Materia
            </label>
            <select
              value={selectedMateria?.id || ''}
              onChange={(e) => {
                const mat = materias.find((m) => m.id === e.target.value);
                if (mat) {
                  setSelectedMateria(mat);
                  const firstCat = catedras.find((c) => c.materia_id === mat.id);
                  if (firstCat) setSelectedCatedra(firstCat);
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {materiasDeFacultad.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Cátedra */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              3. Cátedra / Comisión
            </label>
            <select
              value={selectedCatedra?.id || ''}
              onChange={(e) => {
                const cat = catedras.find((c) => c.id === e.target.value);
                if (cat) setSelectedCatedra(cat);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {catedrasDeMateria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.profesor.split('(')[0].trim()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chair Pedagogical Dossier / Info Box */}
        {selectedCatedra && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Criterio Metodológico: {selectedCatedra.nombre}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {selectedCatedra.profesor} · {selectedCatedra.cuatrimestre}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
              {selectedCatedra.estilo_metodologico}
            </p>

            {/* Key criteria checklist */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {selectedCatedra.criterios_clave.slice(0, 2).map((crit, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{crit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Exercises Feed Controls: Search & Topic Filter */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Banco de Ejercicios de {selectedCatedra?.nombre || 'la Cátedra'}
            </h3>
            <p className="text-xs text-slate-500">
              Mostrando {filteredEjercicios.length} ejercicios resueltos y verificados
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por tema, enunciado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Topics Filter */}
        {temasDisponibles.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedTema('todos')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                selectedTema === 'todos'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Todos los temas
            </button>
            {temasDisponibles.map((tema) => (
              <button
                key={tema}
                onClick={() => setSelectedTema(tema)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  selectedTema === tema
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tema}
              </button>
            ))}
          </div>
        )}

        {/* Feed Cards Grid */}
        {filteredEjercicios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEjercicios.map((ej) => (
              <EjercicioCard
                key={ej.id}
                ejercicio={ej}
                onSelect={(id) => onSelectEjercicio(id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-900">
              No hay ejercicios con los filtros seleccionados
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Sé el primero en subir un ejercicio de esta cátedra o probá limpiando la búsqueda.
            </p>
            <button
              onClick={onGoToSubir}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Subir ejercicio ahora
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
