import React from 'react';
import { Crown, Sparkles, X, Check, Zap, ArrowRight } from 'lucide-react';
import { ConsultasStatus } from '../types';

interface LimiteConsultasProps {
  consultas: ConsultasStatus | null;
  onOpenUpgrade: () => void;
  onSwitchToPremiumDemo: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const LimiteConsultas: React.FC<LimiteConsultasProps> = ({
  consultas,
  onOpenUpgrade,
  onSwitchToPremiumDemo,
  onClose,
  isModal = false,
}) => {
  const restantes = consultas?.restantes ?? 0;
  const limite = consultas?.limite ?? 3;
  const usadas = consultas?.usadas ?? 0;

  const content = (
    <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-blue-500/20 relative overflow-hidden">
      {/* Decorative light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
        <Crown className="w-4 h-4" />
        Límite de Consultas Gratuitas
      </div>

      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
        {restantes === 0
          ? '¡Alcanzaste tu límite diario gratuito!'
          : `Te queda ${restantes} consulta${restantes === 1 ? '' : 's'} gratis hoy`}
      </h3>

      <p className="text-slate-300 text-sm mb-6 max-w-xl leading-relaxed">
        El plan gratuito te permite resolver hasta <strong>{limite} ejercicios por día</strong>. Con el plan
        <strong> Premium</strong>, accedés a consultas ilimitadas con la metodología de tu cátedra, paso a paso
        profundo y soporte en exámenes.
      </p>

      {/* Progress Bar */}
      <div className="bg-slate-800 rounded-full h-2.5 mb-6 overflow-hidden max-w-md border border-slate-700">
        <div
          className={`h-full transition-all duration-500 ${
            restantes === 0 ? 'bg-rose-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(100, (usadas / limite) * 100)}%` }}
        />
      </div>

      {/* Perks List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-xs text-slate-200">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Consultas ilimitadas 24/7</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Todas las cátedras UBA/UTN</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Pago seguro en Mercado Pago</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onOpenUpgrade}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>Obtener Premium con Mercado Pago</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onSwitchToPremiumDemo}
          className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Probar modo Premium (Demo)</span>
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="max-w-2xl w-full">{content}</div>
      </div>
    );
  }

  return content;
};
