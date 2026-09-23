import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  Crown,
  Upload,
  BookOpen,
  User as UserIcon,
  ChevronDown,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { Usuario, ConsultasStatus, Catedra } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  usuario: Usuario | null;
  consultas: ConsultasStatus | null;
  selectedCatedra: Catedra | null;
  onSwitchUser: (userId: string) => void;
  onOpenUpgradeModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  usuario,
  consultas,
  selectedCatedra,
  onSwitchUser,
  onOpenUpgradeModal,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPremium = usuario?.plan === 'premium';
  const remaining = consultas ? consultas.restantes : 0;
  const used = consultas ? consultas.usadas : 0;
  const limit = consultas ? consultas.limite : 3;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('feed')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-slate-900">
                    Cátedra<span className="text-blue-600">IA</span>
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Facu
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Resoluciones al criterio de tu cátedra
                </p>
              </div>
            </button>

            {/* Selected Catedra Badge */}
            {selectedCatedra && (
              <div className="hidden lg:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-slate-800">{selectedCatedra.nombre}</span>
              </div>
            )}
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'feed'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Feed Cátedra
            </button>

            <button
              onClick={() => setActiveTab('subir')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'subir'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Upload className="w-4 h-4" />
              Subir Ejercicio
            </button>

            <button
              onClick={() => setActiveTab('suscripcion')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'suscripcion'
                  ? 'bg-amber-50 text-amber-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              Planes
            </button>

            <button
              onClick={() => setActiveTab('perfil')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'perfil'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Mi Perfil
            </button>
          </nav>

          {/* Right Action: Quota Indicator & User Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Daily Quota Counter */}
            {isPremium ? (
              <div
                onClick={onOpenUpgradeModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300 text-amber-900 text-xs font-semibold cursor-pointer hover:bg-amber-100 transition-colors"
                title="Tenés consultas ilimitadas activas"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Premium Ilimitado</span>
              </div>
            ) : (
              <div
                onClick={onOpenUpgradeModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 cursor-pointer transition-colors"
                title="Hacé clic para ver el plan Premium"
              >
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  <strong className="text-slate-900 font-semibold">{remaining}</strong>/{limit} gratis hoy
                </span>
                {remaining === 0 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                    Mejorar
                  </span>
                )}
              </div>
            )}

            {/* User Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {usuario?.nombre?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {usuario?.nombre || 'Estudiante'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isPremium ? 'Plan Premium' : 'Plan Free'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100 text-xs text-slate-500">
                    Cambiar usuario de prueba:
                  </div>

                  <button
                    onClick={() => {
                      onSwitchUser('usr_free_demo');
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      usuario?.id === 'usr_free_demo'
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium">Agustín Gómez</div>
                      <div className="text-[10px] text-slate-500">Plan Free (con límite 3/día)</div>
                    </div>
                    {usuario?.id === 'usr_free_demo' && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onSwitchUser('usr_premium_demo');
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      usuario?.id === 'usr_premium_demo'
                        ? 'bg-amber-50 text-amber-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        Lucía Fernández
                        <Crown className="w-3 h-3 text-amber-500" />
                      </div>
                      <div className="text-[10px] text-slate-500">Plan Premium (Ilimitado)</div>
                    </div>
                    {usuario?.id === 'usr_premium_demo' && (
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                    )}
                  </button>

                  <div className="mt-1 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveTab('suscripcion');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left p-2 text-xs font-semibold text-blue-600 hover:text-blue-800 rounded-md hover:bg-blue-50 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Ver planes y Mercado Pago
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          <button
            onClick={() => {
              setActiveTab('feed');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
              activeTab === 'feed' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Feed de la Cátedra
          </button>
          <button
            onClick={() => {
              setActiveTab('subir');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
              activeTab === 'subir' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            Subir Ejercicio (Foto / PDF)
          </button>
          <button
            onClick={() => {
              setActiveTab('suscripcion');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
              activeTab === 'suscripcion' ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-slate-700'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-500" />
            Suscripción Premium
          </button>
          <button
            onClick={() => {
              setActiveTab('perfil');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
              activeTab === 'perfil' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Mi Perfil y Consultas
          </button>
        </div>
      )}
    </header>
  );
};
