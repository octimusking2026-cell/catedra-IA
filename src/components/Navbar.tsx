import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  Upload,
  BookOpen,
  User as UserIcon,
  Menu,
  X,
  Zap,
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { useQuota } from '../context/QuotaContext';
import { useCatalog } from '../context/CatalogContext';
import { useTheme } from '../context/ThemeContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Feed Cátedra', icon: BookOpen, exact: true },
  { path: '/subir', label: 'Subir Ejercicio', icon: Upload },
  { path: '/perfil', label: 'Mi Perfil', icon: UserIcon },
  { path: '/ayuda', label: 'Ayuda y privacidad', icon: ShieldCheck },
];

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { usuario, logout } = useSession();
  const { consultas, openLimiteModal } = useQuota();
  const { selectedCarrera, selectedMateria } = useCatalog();
  const { isDarkMode, toggleTheme } = useTheme();

  const remaining = consultas ? consultas.restantes : 0;
  const limit = consultas?.limite ?? 0;

  const isActive = (item: NavItem) => {
    if (item.exact || item.path === '/') {
      return location.pathname === '/' || location.pathname === '';
    }
    return location.pathname.startsWith(item.path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Cátedra<span className="text-blue-600 dark:text-blue-400">IA</span>
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    100% Gratis
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Resoluciones paso a paso con IA
                </p>
              </div>
            </Link>

            {/* Selected Carrera & Materia Badge */}
            {selectedCarrera && (
              <div className="hidden lg:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCarrera.nombre} {selectedMateria ? `· ${selectedMateria.nombre}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Daily Fair Quota Indicator, Theme Toggle, User Avatar & Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Cambiar tema de color"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Daily Quota Counter button */}
            <button
              type="button"
              onClick={openLimiteModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none"
              title="Cuota diaria de uso justo"
              aria-label="Ver cuota diaria de uso justo"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                <strong className="text-slate-900 dark:text-white font-semibold">{remaining}</strong>/{limit} uso justo hoy
              </span>
            </button>
 
            {/* User Identity Chip */}
            <Link
              to="/perfil"
              className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            >
              {usuario?.foto_url ? (
                <img
                  src={usuario.foto_url}
                  alt={usuario.nombre}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {usuario?.nombre?.charAt(0) || 'E'}
                </div>
              )}
              <div className="hidden sm:block text-left max-w-[120px]">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate">
                  {usuario?.nombre || 'Estudiante'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Google Auth
                </div>
              </div>
            </Link>
 
            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
 
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
 
      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              toggleTheme();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      )}
    </header>
  );
};
