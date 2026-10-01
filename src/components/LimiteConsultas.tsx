import React, { useEffect, useRef } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { useQuota } from '../context/QuotaContext';
import type { ConsultasStatus } from '../types';

interface LimiteConsultasProps {
  consultas?: ConsultasStatus | null;
  onClose?: () => void;
  isModal?: boolean;
}

export const LimiteConsultas: React.FC<LimiteConsultasProps> = ({
  consultas: propConsultas,
  onClose,
  isModal = false,
}) => {
  const { consultas: ctxConsultas } = useQuota();
  const consultas = propConsultas || ctxConsultas;
  const limite = consultas?.limite ?? 0;
  const usadas = consultas?.usadas ?? limite;

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const okButtonRef = useRef<HTMLButtonElement | null>(null);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isModal || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModal, onClose]);

  // Focus on the OK button when modal opens
  useEffect(() => {
    if (isModal) {
      setTimeout(() => {
        if (okButtonRef.current) {
          okButtonRef.current.focus();
        } else if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);
    }
  }, [isModal]);

  const content = (
    <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-blue-500/20 relative overflow-hidden text-center sm:text-left">
      {/* Decorative light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {onClose && (
        <button
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          aria-label="Cerrar aviso"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-center justify-center sm:justify-start gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">
        <AlertCircle className="w-4 h-4" />
        <span>Aviso de Cuota Diaria</span>
      </div>

      <h3 id="quota-dialog-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-3">
        Llegaste al límite diario de uso justo, vuelve mañana
      </h3>

      <p className="text-slate-300 text-sm mb-6 max-w-xl leading-relaxed">
        Para garantizar el acceso gratuito y equitativo a toda la comunidad estudiantil, cada usuario cuenta con una cuota diaria de uso justo de <strong>{limite} consultas</strong>. Tu cuota se reinicia automáticamente a las <strong>00:00 hs</strong> (horario de Argentina).
      </p>

      {/* Progress Bar */}
      <div className="bg-slate-800 rounded-full h-2.5 mb-6 overflow-hidden max-w-md border border-slate-700 mx-auto sm:mx-0">
        <div
          className="h-full bg-rose-500 transition-all duration-500"
          style={{ width: `${Math.min(100, (usadas / limite) * 100)}%` }}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-4 h-4 text-sky-400" />
          <span>Reinicio automático a la medianoche</span>
        </div>

        {onClose && (
          <button
            type="button"
            ref={okButtonRef}
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-md shadow-blue-500/25 focus-visible:ring-2 focus-visible:ring-blue-400 outline-none"
          >
            Entendido
          </button>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quota-dialog-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div className="max-w-xl w-full max-h-[90dvh] overflow-y-auto">{content}</div>
      </div>
    );
  }

  return content;
};
