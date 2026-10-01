import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import {
  MessageSquarePlus,
  Send,
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const FloatingFeedback: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const getPantallaNombre = (pathname: string) => {
    if (pathname === '/' || pathname === '') return 'Feed de Cátedra';
    if (pathname.startsWith('/subir')) return 'Subir Ejercicio';
    if (pathname.startsWith('/ejercicio')) return 'Ver Resolución';
    if (pathname.startsWith('/perfil')) return 'Mi Perfil';
    if (pathname.startsWith('/ayuda')) return 'Ayuda y Privacidad';
    return pathname;
  };

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = e.currentTarget;
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  };

  // Close modal with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) {
      setErrorMsg('Por favor ingresá un comentario o sugerencia.');
      return;
    }

    setSending(true);
    setErrorMsg(null);

    try {
      await api.enviarFeedback({
        mensaje: mensaje.trim(),
        pantalla: getPantallaNombre(location.pathname),
      });
      setSuccess(true);
      setMensaje('');
      setTimeout(() => {
        setSuccess(false);
        handleClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo enviar el comentario. Por favor intentá nuevamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={handleOpen}
          className="px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs shadow-xl shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-blue-400/30 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none"
          title="Enviar comentario o sugerencia"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <MessageSquarePlus className="w-4 h-4 text-blue-200" />
          <span className="hidden sm:inline">Enviar comentario</span>
        </button>
      </div>

      {/* Feedback Modal with Dialog semantics */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-dialog-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 relative transition-colors duration-200">
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar modal de comentarios"
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1 pr-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span id="feedback-dialog-title">Feedback de la Comunidad</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pantalla actual: <strong className="text-blue-700 dark:text-blue-400">{getPantallaNombre(location.pathname)}</strong>
              </p>
            </div>

            {success ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">¡Muchas gracias por tu comentario!</h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Tu mensaje ha sido guardado en Firestore. Nos ayuda a seguir mejorando CátedraIA para todos los estudiantes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label
                    htmlFor="feedback-message-textarea"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    ¿Qué te gustaría contarnos o sugerir?
                  </label>
                  <textarea
                    id="feedback-message-textarea"
                    ref={textareaRef}
                    rows={4}
                    placeholder="Escribí aquí tu comentario, reporte de error o sugerencia de nueva función..."
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    disabled={sending}
                    onClick={handleClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Guardar Comentario</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
