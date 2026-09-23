import React, { useState, useEffect } from 'react';
import {
  Usuario,
  Facultad,
  Materia,
  Catedra,
  ConsultasStatus,
} from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { SubirEjercicio } from './pages/SubirEjercicio';
import { VerResolucion } from './pages/VerResolucion';
import { Suscripcion } from './pages/Suscripcion';
import { Perfil } from './pages/Perfil';
import { LimiteConsultas } from './components/LimiteConsultas';

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'subir' | 'resolucion' | 'suscripcion' | 'perfil'>('feed');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [consultas, setConsultas] = useState<ConsultasStatus | null>(null);
  const [facultades, setFacultades] = useState<Facultad[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [catedras, setCatedras] = useState<Catedra[]>([]);
  const [selectedFacultad, setSelectedFacultad] = useState<Facultad | null>(null);
  const [selectedMateria, setSelectedMateria] = useState<Materia | null>(null);
  const [selectedCatedra, setSelectedCatedra] = useState<Catedra | null>(null);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [selectedEjercicioId, setSelectedEjercicioId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Load initial data
  const loadInitialData = async () => {
    try {
      const [perfilRes, facs, mats, cats, ejs] = await Promise.all([
        api.getPerfil(),
        api.getFacultades(),
        api.getMaterias(),
        api.getCatedras(),
        api.getEjercicios(),
      ]);

      setUsuario(perfilRes.usuario);
      setConsultas(perfilRes.consultas);
      setFacultades(facs);
      setMaterias(mats);
      setCatedras(cats);
      setEjercicios(ejs);

      if (facs.length > 0) {
        setSelectedFacultad(facs[0]);
        const firstMat = mats.find((m) => m.facultad_id === facs[0].id) || mats[0];
        if (firstMat) {
          setSelectedMateria(firstMat);
          const firstCat = cats.find((c) => c.materia_id === firstMat.id) || cats[0];
          if (firstCat) setSelectedCatedra(firstCat);
        }
      }
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Refresh exercises feed
  const refreshEjercicios = async () => {
    try {
      const ejs = await api.getEjercicios();
      setEjercicios(ejs);
      const perfilRes = await api.getPerfil();
      setUsuario(perfilRes.usuario);
      setConsultas(perfilRes.consultas);
    } catch (err) {
      console.error('Error refrescando ejercicios:', err);
    }
  };

  // Switch between demo users (Free vs Premium)
  const handleSwitchUser = async (userId: string) => {
    try {
      await api.switchUser(userId);
      const perfilRes = await api.getPerfil();
      setUsuario(perfilRes.usuario);
      setConsultas(perfilRes.consultas);
      refreshEjercicios();
    } catch (err) {
      console.error('Error al cambiar usuario:', err);
    }
  };

  // When a new resolution is generated
  const handleEjercicioGenerado = (ejercicioId: string) => {
    setSelectedEjercicioId(ejercicioId);
    setActiveTab('resolucion');
    refreshEjercicios();
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <div className="text-xl font-bold tracking-tight">CátedraIA</div>
          <p className="text-xs text-slate-400">Cargando cátedras universitarias y criterios de examen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Global Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab as any);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        usuario={usuario}
        consultas={consultas}
        selectedCatedra={selectedCatedra}
        onSwitchUser={handleSwitchUser}
        onOpenUpgradeModal={() => setShowUpgradeModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'feed' && (
          <Home
            facultades={facultades}
            materias={materias}
            catedras={catedras}
            selectedFacultad={selectedFacultad}
            setSelectedFacultad={setSelectedFacultad}
            selectedMateria={selectedMateria}
            setSelectedMateria={setSelectedMateria}
            selectedCatedra={selectedCatedra}
            setSelectedCatedra={setSelectedCatedra}
            ejercicios={ejercicios}
            onSelectEjercicio={(id) => {
              setSelectedEjercicioId(id);
              setActiveTab('resolucion');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToSubir={() => {
              setActiveTab('subir');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'subir' && (
          <SubirEjercicio
            catedras={catedras}
            selectedCatedra={selectedCatedra}
            setSelectedCatedra={setSelectedCatedra}
            usuario={usuario}
            consultas={consultas}
            onEjercicioGenerado={handleEjercicioGenerado}
            onOpenUpgradeModal={() => setShowUpgradeModal(true)}
          />
        )}

        {activeTab === 'resolucion' && (
          <VerResolucion
            ejercicioId={selectedEjercicioId || ejercicios[0]?.id || ''}
            onBack={() => {
              setActiveTab('feed');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToSubir={() => {
              setActiveTab('subir');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'suscripcion' && (
          <Suscripcion
            usuario={usuario}
            consultas={consultas}
            onPlanUpdated={() => {
              refreshEjercicios();
            }}
          />
        )}

        {activeTab === 'perfil' && (
          <Perfil
            usuario={usuario}
            consultas={consultas}
            misEjercicios={ejercicios.filter((e) => e.usuario_id_subio === usuario?.id)}
            onSelectEjercicio={(id) => {
              setSelectedEjercicioId(id);
              setActiveTab('resolucion');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToUpgrade={() => {
              setActiveTab('suscripcion');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSwitchUser={handleSwitchUser}
          />
        )}
      </main>

      {/* Upgrade / Limit Reached Modal */}
      {showUpgradeModal && (
        <LimiteConsultas
          isModal={true}
          consultas={consultas}
          onOpenUpgrade={() => {
            setShowUpgradeModal(false);
            setActiveTab('suscripcion');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSwitchToPremiumDemo={() => {
            handleSwitchUser('usr_premium_demo');
            setShowUpgradeModal(false);
          }}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">CátedraIA</span>
            <span>—</span>
            <span>Resoluciones según el criterio docente de cada cátedra universitaria</span>
          </div>
          <div>
            UBA · UTN · UNLP · Modelo Freemium con Checkout de Mercado Pago
          </div>
        </div>
      </footer>
    </div>
  );
}
