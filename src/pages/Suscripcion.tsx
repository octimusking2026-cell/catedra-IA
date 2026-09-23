import React, { useState } from 'react';
import { Usuario, ConsultasStatus } from '../types';
import { api } from '../services/api';
import {
  Crown,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';

interface SuscripcionProps {
  usuario: Usuario | null;
  consultas: ConsultasStatus | null;
  onPlanUpdated: () => void;
}

export const Suscripcion: React.FC<SuscripcionProps> = ({
  usuario,
  consultas,
  onPlanUpdated,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'mensual' | 'cuatrimestral' | 'anual'>('cuatrimestral');
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [catedraInput, setCatedraInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState<string | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const isPremium = usuario?.plan === 'premium';

  const handleOpenWaitlist = (plan: 'mensual' | 'cuatrimestral' | 'anual') => {
    setSelectedPlan(plan);
    setWaitlistSuccess(null);
    setWaitlistError(null);
    setShowWaitlistModal(true);
  };

  const handleSubmitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setWaitlistError('Ingresá un correo electrónico válido');
      return;
    }

    setIsSubmitting(true);
    setWaitlistError(null);

    try {
      const res = await api.unirseListaEspera({
        email: emailInput,
        plan_interes: selectedPlan,
        catedra_nombre: catedraInput || undefined,
      });

      setWaitlistSuccess(res.mensaje || '¡Registrado con éxito!');
      setTimeout(() => {
        // keep modal open for a few seconds to let student read the confirmation
      }, 1000);
    } catch (err: any) {
      setWaitlistError(err.message || 'Error al anotar en la lista de espera');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDemoPremium = async () => {
    try {
      // Toggle demo role purely for tester validation of unlimited vs 3-limit queries
      const target = isPremium ? 'free' : 'premium';
      await api.switchUser(target);
      onPlanUpdated();
    } catch (err) {
      console.error('Error toggling demo state:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Honest Pilot Stage Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-950 text-sm">
                  Piloto Universitario en Validación
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-200/70 text-amber-900 rounded-md">
                  Sin cobros reales
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed max-w-2xl">
                CátedraIA está en fase de prueba activa con cátedras reales. <strong>No procesamos cobros en tarjeta</strong> ni simulamos pagos falsos. Medimos el interés real mediante una <strong>lista de espera prioritaria</strong> para coordinar el lanzamiento formal de Mercado Pago.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleDemoPremium}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-amber-300 text-amber-950 hover:bg-amber-100/60 transition-colors shrink-0 shadow-xs"
          >
            {isPremium ? 'Probar Modo Free (3 consultas/día)' : 'Probar Modo Premium (Ilimitado)'}
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5 text-blue-600" />
          <span>Validación de Disposición a Suscribirse</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Aprobá tus parciales con el criterio exacto de tu docente
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Compará los planes que ofreceremos en el lanzamiento oficial y anotate con tu email para asegurar tu cupo con tarifa bonificada.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Plan Free */}
        <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Plan Estudiante Free</h3>
                <p className="text-xs text-slate-500">Para consultas puntuales y repaso semanal</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                Gratis
              </span>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900">$0</span>
              <span className="text-xs text-slate-500 ml-1">/ para siempre</span>
            </div>

            <div className="space-y-3 text-xs text-slate-700 mb-8">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>3 consultas gratuitas por día</strong> (hora de Argentina)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Extracción de enunciados con OCR de fotos</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Acceso al banco de parciales y ejercicios resueltos</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Votación comunitaria de coincidencia de cátedra</span>
              </div>
            </div>
          </div>

          <div>
            <div className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-center text-xs font-bold">
              {isPremium
                ? 'Modo Demo Premium activo para pruebas'
                : `Plan actual: ${consultas?.restantes || 0} consultas restantes hoy`}
            </div>
          </div>
        </div>

        {/* Plan Pro Cuatrimestral (Featured) */}
        <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-7 shadow-xl border-2 border-blue-500/50 flex flex-col justify-between overflow-hidden">
          {/* Badge */}
          <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
            Tarifa de Cursada
          </div>

          <div>
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                <Crown className="w-4 h-4" />
                <span>Plan Pro Universitario</span>
              </div>
              <h3 className="text-xl font-bold text-white">Cuatrimestre Completo</h3>
              <p className="text-xs text-slate-300">Consultas ilimitadas hasta rendir el final</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$14.900</span>
                <span className="text-xs text-slate-300">ARS / 4 meses</span>
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">
                Equivale a $3.725 ARS / mes en lanzamiento oficial
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-200 mb-8">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong className="text-white">Consultas ilimitadas 24/7</strong> sin topes diarios</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Resolución profunda según la cátedra y profesor</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Alertas y advertencias metodológicas de parcial</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Prioridad en la cola de procesamiento</span>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => handleOpenWaitlist('cuatrimestral')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <span>Anotarme a la Lista de Espera</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-[10px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Sin cobro anticipado ni solicitud de tarjeta</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Monthly Plan banner */}
      <div className="max-w-4xl mx-auto p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-slate-900">¿Preferís suscripción mes a mes?</div>
          <p className="text-xs text-slate-500">
            Plan Pro Mensual a <strong>$4.990 ARS / mes</strong> con cancelación libre cuando termine tu examen.
          </p>
        </div>
        <button
          onClick={() => handleOpenWaitlist('mensual')}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shrink-0"
        >
          Anotarme para Plan Mensual ($4.990)
        </button>
      </div>

      {/* Waitlist Modal (Transparent Willingness-to-pay capture) */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-bold text-white">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">
                    Lista de Espera Oficial
                  </div>
                  <div className="text-base font-bold">
                    Plan {selectedPlan === 'cuatrimestral' ? 'Cuatrimestral ($14.900)' : selectedPlan === 'anual' ? 'Anual ($39.900)' : 'Mensual ($4.990)'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowWaitlistModal(false)}
                className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {waitlistSuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-lg font-bold text-slate-900">¡Lugar Reservado!</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                      {waitlistSuccess}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
                    Tu interés nos permite priorizar la digitalización de parciales de tu cátedra.
                  </div>
                  <button
                    onClick={() => setShowWaitlistModal(false)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                  >
                    Volver a CátedraIA
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitWaitlist} className="space-y-4">
                  <div className="text-xs text-slate-600 leading-relaxed">
                    Estamos calibrando la demanda con estudiantes de ingeniería y ciencias exactas. No te cobraremos nada hoy: te contactaremos apenas activemos las cuentas Premium.
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Tu correo universitario o personal
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="nombre@estudiante.edu.ar"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Cátedra o Materia que cursás (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Análisis Matemático II (Gutiérrez) - FIUBA"
                      value={catedraInput}
                      onChange={(e) => setCatedraInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>No guardamos datos financieros ni cobramos nada sin tu confirmación previa por Mercado Pago.</span>
                  </div>

                  {waitlistError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{waitlistError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Anotando en la lista...</span>
                      </>
                    ) : (
                      <>
                        <span>Anotarme a la Lista de Espera</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
