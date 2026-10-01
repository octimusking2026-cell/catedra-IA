import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useCatalog } from '../context/CatalogContext';
import { Facultad, Materia, Catedra } from '../types';
import {
  ShieldAlert,
  EyeOff,
  MessageSquare,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  School,
  GraduationCap,
  Layers,
  X,
  Save,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

type AdminTab = 'facultades' | 'materias' | 'catedras' | 'reportes' | 'discrepancias';

export const Admin: React.FC = () => {
  const { facultades, materias, catedras, refreshCatalog } = useCatalog();
  const [activeTab, setActiveTab] = useState<AdminTab>('facultades');
  const [reportes, setReportes] = useState<any[]>([]);
  const [votosNegativos, setVotosNegativos] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal States
  const [showFacultadModal, setShowFacultadModal] = useState(false);
  const [editingFacultad, setEditingFacultad] = useState<Facultad | null>(null);
  const [facNombre, setFacNombre] = useState('');
  const [facUniversidad, setFacUniversidad] = useState('');
  const [facSiglas, setFacSiglas] = useState('');

  const [showMateriaModal, setShowMateriaModal] = useState(false);
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null);
  const [matNombre, setMatNombre] = useState('');
  const [matFacultadId, setMatFacultadId] = useState('');
  const [matCodigo, setMatCodigo] = useState('');
  const [matAnio, setMatAnio] = useState<number>(1);
  const [matCuatrimestre, setMatCuatrimestre] = useState('1');

  const [showCatedraModal, setShowCatedraModal] = useState(false);
  const [editingCatedra, setEditingCatedra] = useState<Catedra | null>(null);
  const [catNombre, setCatNombre] = useState('');
  const [catMateriaId, setCatMateriaId] = useState('');
  const [catCuatrimestre, setCatCuatrimestre] = useState('1° Cuatrimestre');
  const [catEstilo, setCatEstilo] = useState('');
  const [catTemas, setCatTemas] = useState('');
  const [catCriterios, setCatCriterios] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReportsAndVotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminReportes();
      setReportes(data.reportes || []);
      setVotosNegativos(data.votosNegativos || []);
    } catch (err: any) {
      console.error('Error cargando reportes admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportsAndVotes();
  }, [loadReportsAndVotes]);

  const showNotification = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3500);
  };

  const showErr = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // --- Facultad Handlers ---
  const handleOpenCreateFacultad = () => {
    setEditingFacultad(null);
    setFacNombre('');
    setFacUniversidad('Universidad Nacional de Misiones (UNaM)');
    setFacSiglas('');
    setShowFacultadModal(true);
  };

  const handleOpenEditFacultad = (fac: Facultad) => {
    setEditingFacultad(fac);
    setFacNombre(fac.nombre);
    setFacUniversidad(fac.universidad);
    setFacSiglas(fac.siglas);
    setShowFacultadModal(true);
  };

  const handleSaveFacultad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facNombre.trim() || !facUniversidad.trim() || !facSiglas.trim()) {
      showErr('Completá todos los campos de la facultad.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingFacultad) {
        await api.updateFacultad(editingFacultad.id, {
          nombre: facNombre.trim(),
          universidad: facUniversidad.trim(),
          siglas: facSiglas.trim(),
        });
        showNotification('Facultad actualizada correctamente');
      } else {
        await api.createFacultad({
          nombre: facNombre.trim(),
          universidad: facUniversidad.trim(),
          siglas: facSiglas.trim(),
          logo_color: '#15803d',
        });
        showNotification('Facultad creada en Firestore');
      }
      await refreshCatalog();
      setShowFacultadModal(false);
    } catch (err: any) {
      showErr(err.message || 'Error al guardar facultad');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFacultad = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que querés eliminar la facultad "${nombre}"?`)) return;
    try {
      await api.deleteFacultad(id);
      showNotification('Facultad eliminada');
      await refreshCatalog();
    } catch (err: any) {
      showErr(err.message || 'Error al eliminar facultad');
    }
  };

  // --- Materia Handlers ---
  const handleOpenCreateMateria = () => {
    setEditingMateria(null);
    setMatNombre('');
    setMatFacultadId(facultades[0]?.id || '');
    setMatCodigo('');
    setMatAnio(1);
    setMatCuatrimestre('1');
    setShowMateriaModal(true);
  };

  const handleOpenEditMateria = (mat: Materia) => {
    setEditingMateria(mat);
    setMatNombre(mat.nombre);
    setMatFacultadId(mat.facultad_id);
    setMatCodigo(mat.codigo || '');
    setMatAnio(mat.anio ?? 1);
    setMatCuatrimestre(mat.cuatrimestre ?? '1');
    setShowMateriaModal(true);
  };

  const handleSaveMateria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matNombre.trim() || !matFacultadId) {
      showErr('Completá el nombre de la materia y seleccioná la facultad.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingMateria) {
        await api.updateMateria(editingMateria.id, {
          nombre: matNombre.trim(),
          facultad_id: matFacultadId,
          codigo: matCodigo.trim() || undefined,
          anio: Number(matAnio),
          cuatrimestre: matCuatrimestre,
        });
        showNotification('Materia actualizada correctamente');
      } else {
        await api.createMateria({
          nombre: matNombre.trim(),
          facultad_id: matFacultadId,
          codigo: matCodigo.trim() || undefined,
          anio: Number(matAnio),
          cuatrimestre: matCuatrimestre,
          carreras_ids: ['car_ing_forestal'],
        });
        showNotification('Materia creada en Firestore');
      }
      await refreshCatalog();
      setShowMateriaModal(false);
    } catch (err: any) {
      showErr(err.message || 'Error al guardar materia');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMateria = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que querés eliminar la materia "${nombre}"?`)) return;
    try {
      await api.deleteMateria(id);
      showNotification('Materia eliminada');
      await refreshCatalog();
    } catch (err: any) {
      showErr(err.message || 'Error al eliminar materia');
    }
  };

  // --- Catedra Handlers ---
  const handleOpenCreateCatedra = () => {
    setEditingCatedra(null);
    setCatNombre('');
    setCatMateriaId(materias[0]?.id || '');
    setCatCuatrimestre('1° Cuatrimestre');
    setCatEstilo('Criterio metodológico y formal de la cátedra.');
    setCatTemas('');
    setCatCriterios('');
    setShowCatedraModal(true);
  };

  const handleOpenEditCatedra = (cat: Catedra) => {
    setEditingCatedra(cat);
    setCatNombre(cat.nombre);
    setCatMateriaId(cat.materia_id);
    setCatCuatrimestre(cat.cuatrimestre || '1° Cuatrimestre');
    setCatEstilo(cat.estilo_metodologico || '');
    setCatTemas(cat.temas ? cat.temas.join(', ') : '');
    setCatCriterios(cat.criterios_clave ? cat.criterios_clave.join('\n') : '');
    setShowCatedraModal(true);
  };

  const handleSaveCatedra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNombre.trim() || !catMateriaId) {
      showErr('Completá el nombre de la cátedra y seleccioná la materia.');
      return;
    }
    const parsedTemas = catTemas
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const parsedCriterios = catCriterios
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      if (editingCatedra) {
        await api.updateCatedra(editingCatedra.id, {
          nombre: catNombre.trim(),
          materia_id: catMateriaId,
          cuatrimestre: catCuatrimestre,
          estilo_metodologico: catEstilo.trim(),
          temas: parsedTemas.length > 0 ? parsedTemas : ['General'],
          criterios_clave: parsedCriterios,
        });
        showNotification('Cátedra actualizada correctamente');
      } else {
        await api.createCatedra({
          nombre: catNombre.trim(),
          materia_id: catMateriaId,
          cuatrimestre: catCuatrimestre,
          estilo_metodologico: catEstilo.trim(),
          temas: parsedTemas.length > 0 ? parsedTemas : ['General'],
          criterios_clave: parsedCriterios,
          consejos_examen: [],
        });
        showNotification('Cátedra creada en Firestore');
      }
      await refreshCatalog();
      setShowCatedraModal(false);
    } catch (err: any) {
      showErr(err.message || 'Error al guardar cátedra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCatedra = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que querés eliminar la cátedra "${nombre}"?`)) return;
    try {
      await api.deleteCatedra(id);
      showNotification('Cátedra eliminada');
      await refreshCatalog();
    } catch (err: any) {
      showErr(err.message || 'Error al eliminar cátedra');
    }
  };

  // --- Reportes Handlers ---
  const handleToggleVisibilidad = async (ejercicioId: string, actualAprobado: boolean) => {
    try {
      const res = await api.setEjercicioVisibilidad(ejercicioId, !actualAprobado);
      showNotification(res.mensaje);
      loadReportsAndVotes();
    } catch (err: any) {
      showErr(err.message || 'Error al cambiar visibilidad del ejercicio');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <SEO
        title="Panel de Administración"
        description="Gestión académica de facultades, materias, cátedras y moderación de ejercicios reportados."
      />
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-blue-900/40 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
            <span>Panel de Administración</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Gestión Académica y Moderación
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Administrá facultades, materias y cátedras universitarias en Firestore, revisá reportes de la comunidad y moderá el banco de ejercicios.
          </p>
        </div>

        <button
          onClick={() => {
            loadReportsAndVotes();
            refreshCatalog();
          }}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Notifications */}
      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('facultades')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'facultades'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Facultades ({facultades.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('materias')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'materias'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Materias ({materias.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catedras')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'catedras'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Cátedras ({catedras.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reportes')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'reportes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Reportes ({reportes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('discrepancias')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'discrepancias'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Discrepancias ({votosNegativos.length})</span>
        </button>
      </div>

      {/* Tab 1: Facultades */}
      {activeTab === 'facultades' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Facultades Registradas en Firestore</h2>
              <p className="text-xs text-slate-500">Unidades académicas disponibles para los estudiantes.</p>
            </div>
            <button
              onClick={handleOpenCreateFacultad}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Facultad</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facultades.map((fac) => (
              <div key={fac.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                    {fac.siglas}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{fac.nombre}</h3>
                  <p className="text-xs text-slate-500">{fac.universidad}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditFacultad(fac)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    title="Editar facultad"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFacultad(fac.id, fac.nombre)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar facultad"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Materias */}
      {activeTab === 'materias' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Materias del Plan de Estudios</h2>
              <p className="text-xs text-slate-500">Asignaturas de Ingeniería Forestal y carreras de la UNaM.</p>
            </div>
            <button
              onClick={handleOpenCreateMateria}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Materia</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materias.map((mat) => {
              const fac = facultades.find((f) => f.id === mat.facultad_id);
              const matCats = catedras.filter((c) => c.materia_id === mat.id);
              return (
                <div key={mat.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {mat.anio}° Año · {mat.cuatrimestre === 'anual' ? 'Anual' : `${mat.cuatrimestre}° Cuat.`}
                      </span>
                      {mat.codigo && (
                        <span className="text-[10px] font-mono text-slate-400">{mat.codigo}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{mat.nombre}</h3>
                    <p className="text-xs text-slate-500">{fac?.nombre || 'Facultad'}</p>
                    <div className="text-[11px] text-slate-400">
                      {matCats.length} {matCats.length === 1 ? 'cátedra asociada' : 'cátedras asociadas'}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleOpenEditMateria(mat)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar materia"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMateria(mat.id, mat.nombre)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar materia"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Cátedras */}
      {activeTab === 'catedras' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cátedras y Criterios Metodológicos</h2>
              <p className="text-xs text-slate-500">Configuración de pautas pedagógicas, temas y directivas para la IA.</p>
            </div>
            <button
              onClick={handleOpenCreateCatedra}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Cátedra</span>
            </button>
          </div>

          <div className="space-y-4">
            {catedras.map((cat) => {
              const mat = materias.find((m) => m.id === cat.materia_id);
              return (
                <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {mat?.nombre || 'Materia'}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{cat.cuatrimestre}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{cat.nombre}</h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditCatedra(cat)}
                        className="px-3 py-1.5 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCatedra(cat.id, cat.nombre)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar cátedra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Methodology */}
                  {cat.estilo_metodologico && (
                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
                      <span className="font-bold text-slate-900">Enfoque metodológico: </span>
                      <span>{cat.estilo_metodologico}</span>
                    </div>
                  )}

                  {/* Topics and Criteria */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {cat.temas && cat.temas.map((tema, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {tema}
                      </span>
                    ))}
                  </div>

                  {cat.criterios_clave && cat.criterios_clave.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1.5 text-[11px] text-blue-700">
                      {cat.criterios_clave.map((crit, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                          ✓ {crit}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Reportes */}
      {activeTab === 'reportes' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Reportes de Ejercicios ({reportes.length})</span>
            </h2>
          </div>

          {reportes.length > 0 ? (
            <div className="space-y-3">
              {reportes.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Motivo: {rep.motivo}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 font-medium">Por: {rep.usuario_nombre || 'Estudiante'}</span>
                    </div>

                    {rep.detalle && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono">
                        "{rep.detalle}"
                      </p>
                    )}

                    <div className="text-xs font-medium text-blue-600">
                      <Link to={`/ejercicio/${rep.ejercicio_id}`} className="hover:underline flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Ver ejercicio #{rep.ejercicio_id.slice(0, 8)}</span>
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleVisibilidad(rep.ejercicio_id, true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4 text-rose-600" />
                      <span>Ocultar Ejercicio</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
              No hay reportes pendientes de moderación.
            </div>
          )}
        </section>
      )}

      {/* Tab 5: Discrepancias */}
      {activeTab === 'discrepancias' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Comentarios de Discrepancia Metodológica ({votosNegativos.length})</span>
            </h2>
          </div>

          {votosNegativos.length > 0 ? (
            <div className="space-y-3">
              {votosNegativos.map((v, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700">
                      Estudiante / Usuario #{v.user_id?.slice(0, 8)}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(v.fecha).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 bg-blue-50/60 p-3 rounded-xl border border-blue-100 font-sans leading-relaxed">
                    "{v.comentario}"
                  </p>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <Link
                      to={`/ejercicio/${v.resolucion_id}`}
                      className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Ver resolución observada</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
              No hay comentarios de discrepancia registrados aún.
            </div>
          )}
        </section>
      )}

      {/* --- Modal Facultad --- */}
      {showFacultadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingFacultad ? 'Editar Facultad' : 'Nueva Facultad'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFacultadModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFacultad} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre de la Facultad:</label>
                <input
                  type="text"
                  value={facNombre}
                  onChange={(e) => setFacNombre(e.target.value)}
                  placeholder="Ej: Facultad de Ciencias Forestales (Eldorado)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Universidad:</label>
                <input
                  type="text"
                  value={facUniversidad}
                  onChange={(e) => setFacUniversidad(e.target.value)}
                  placeholder="Ej: Universidad Nacional de Misiones (UNaM)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Siglas / Abreviatura:</label>
                <input
                  type="text"
                  value={facSiglas}
                  onChange={(e) => setFacSiglas(e.target.value)}
                  placeholder="Ej: UNaM - FCF"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFacultadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingFacultad ? 'Guardar Cambios' : 'Crear Facultad'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal Materia --- */}
      {showMateriaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingMateria ? 'Editar Materia' : 'Nueva Materia'}
              </h3>
              <button
                type="button"
                onClick={() => setShowMateriaModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMateria} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre de la Materia:</label>
                <input
                  type="text"
                  value={matNombre}
                  onChange={(e) => setMatNombre(e.target.value)}
                  placeholder="Ej: Matemática I (Álgebra y Geometría)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facultad:</label>
                <select
                  value={matFacultadId}
                  onChange={(e) => setMatFacultadId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {facultades.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} ({f.siglas})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Año de cursada:</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={matAnio}
                    onChange={(e) => setMatAnio(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cuatrimestre:</label>
                  <select
                    value={matCuatrimestre}
                    onChange={(e) => setMatCuatrimestre(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="1">1° Cuatrimestre</option>
                    <option value="2">2° Cuatrimestre</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Código de Materia (Opcional):</label>
                <input
                  type="text"
                  value={matCodigo}
                  onChange={(e) => setMatCodigo(e.target.value)}
                  placeholder="Ej: FCF-101"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMateriaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingMateria ? 'Guardar Cambios' : 'Crear Materia'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal Cátedra --- */}
      {showCatedraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCatedra ? 'Editar Cátedra' : 'Nueva Cátedra'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCatedraModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCatedra} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre de la Cátedra:</label>
                <input
                  type="text"
                  value={catNombre}
                  onChange={(e) => setCatNombre(e.target.value)}
                  placeholder="Ej: Cátedra de Álgebra y Geometría - FCF UNaM"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Materia a la que pertenece:</label>
                <select
                  value={catMateriaId}
                  onChange={(e) => setCatMateriaId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} ({m.anio}° Año)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cuatrimestre / Período:</label>
                <input
                  type="text"
                  value={catCuatrimestre}
                  onChange={(e) => setCatCuatrimestre(e.target.value)}
                  placeholder="Ej: 1° Cuatrimestre"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Enfoque y Criterio Metodológico:</label>
                <textarea
                  rows={3}
                  value={catEstilo}
                  onChange={(e) => setCatEstilo(e.target.value)}
                  placeholder="Ej: Exige desarrollo paso a paso explícito con planteo de ecuaciones y unidades..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temas (separados por coma):</label>
                <input
                  type="text"
                  value={catTemas}
                  onChange={(e) => setCatTemas(e.target.value)}
                  placeholder="Vectores, Matrices, Sistemas Lineales, Planos"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Criterios Clave (uno por línea):</label>
                <textarea
                  rows={3}
                  value={catCriterios}
                  onChange={(e) => setCatCriterios(e.target.value)}
                  placeholder="Justificar cada operación por Gauss&#10;Incluir siempre unidades del sistema métrico"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCatedraModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingCatedra ? 'Guardar Cambios' : 'Crear Cátedra'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
