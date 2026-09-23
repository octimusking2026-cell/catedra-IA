import React, { useState } from 'react';
import { Usuario, ConsultasStatus } from '../types';
import { api } from '../services/api';
import {
  Crown,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Wallet,
  ArrowRight,
  Lock,
  Loader2,
  CheckCircle2,
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
  const [selectedPlan, setSelectedPlan] = useState<'mensual' | 'cuatrimestral'>('cuatrimestral');
  const [showMpModal, setShowMpModal] = useState(false);
  const [mpPreference, setMpPreference] = useState<any>(null);
  const [mpMethod, setMpMethod] = useState<'wallet' | 'card' | 'transfer'>('wallet');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const isPremium = usuario?.plan === 'premium';

  const handleStartCheckout = async (planKey: 'mensual' | 'cuatrimestral') => {
    setSelectedPlan(planKey);
    try {
      const pref = await api.crearPagoMercadoPago(planKey);
      setMpPreference(pref);
      setShowMpModal(true);
      setPaymentSuccess(false);
    } catch (err) {
      console.error('Error al iniciar Mercado Pago:', err);
    }
  };

  const handleConfirmMpPayment = async () => {
    if (!mpPreference) return;
    setIsProcessingPayment(true);

    try {
      // Simulate webhook event sent by Mercado Pago to backend
      const res = await api.webhookMercadoPago({
        usuario_id: usuario?.id,
        plan: selectedPlan,
        payment_id: `mp_${Date.now()}`,
        status: 'approved',
      });

      if (res.success) {
        setPaymentSuccess(true);
        setTimeout(() => {
          setIsProcessingPayment(false);
          setShowMpModal(false);
          onPlanUpdated();
        }, 1800);
      }
    } catch (err) {
      console.error('Error al confirmar pago:', err);
      setIsProcessingPayment(false);
    }
  };

  const handleCancelSub = async () => {
    if (!confirm('¿Deseas volver al plan gratuito para volver a probar el límite de 3 consultas/día?')) return;
    try {
      await api.cancelarSuscripcion();
      onPlanUpdated();
    } catch (err) {
      console.error('Error al cancelar:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5 text-amber-600" />
          <span>Planes CátedraIA para Universitarios</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Aprobá tus materias con el criterio exacto de tu cátedra
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Elegí el plan que mejor se adapte a tu ritmo de cursada. Pagá seguro en pesos argentinos mediante
          Mercado Pago.
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
                <span><strong>3 consultas gratuitas por día</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Extracción de enunciados con OCR de fotos</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Acceso al banco de parciales resueltos</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Votación comunitaria de resoluciones</span>
              </div>
            </div>
          </div>

          <div>
            {!isPremium ? (
              <div className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-center text-xs font-bold">
                Tu plan actual ({consultas?.restantes || 0} consultas restantes hoy)
              </div>
            ) : (
              <button
                onClick={handleCancelSub}
                className="w-full py-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-center text-xs font-semibold transition-colors"
              >
                Volver a Free (para probar límites)
              </button>
            )}
          </div>
        </div>

        {/* Plan Pro Cuatrimestral (Featured) */}
        <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-7 shadow-xl border-2 border-blue-500/50 flex flex-col justify-between overflow-hidden">
          {/* Badge */}
          <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
            Recomendado para la Cursada
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
                Equivale a sólo $3.725 ARS por mes (Ahorrás 25%)
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
                <span>Alertas y advertencias específicas para el parcial</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Soporte prioritario y banco de finales resueltos</span>
              </div>
            </div>
          </div>

          <div>
            {isPremium ? (
              <div className="w-full py-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-center text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tenés el Plan Premium Activo</span>
              </div>
            ) : (
              <button
                onClick={() => handleStartCheckout('cuatrimestral')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              >
                <span>Suscribirme con Mercado Pago</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <div className="text-[10px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Pago protegido por Mercado Pago Argentina
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Monthly Plan banner */}
      <div className="max-w-4xl mx-auto p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-slate-900">¿Preferís pagar mes a mes?</div>
          <p className="text-xs text-slate-500">Plan Pro Mensual a <strong>$4.990 ARS / mes</strong>. Cancelás cuando quieras.</p>
        </div>
        {!isPremium && (
          <button
            onClick={() => handleStartCheckout('mensual')}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            Elegir Plan Mensual ($4.990 ARS)
          </button>
        )}
      </div>

      {/* Mercado Pago Checkout Modal (Simulated realistic gateway) */}
      {showMpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            {/* MP Blue Top Header */}
            <div className="bg-[#009ee3] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-base">
                  MP
                </div>
                <div>
                  <div className="text-xs font-medium text-white/80">Mercado Pago Checkout</div>
                  <div className="text-sm font-bold">CátedraIA · {selectedPlan === 'cuatrimestral' ? 'Plan Cuatrimestral' : 'Plan Mensual'}</div>
                </div>
              </div>
              <button
                onClick={() => setShowMpModal(false)}
                className="text-white/80 hover:text-white text-xs font-bold"
              >
                Cerrar
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {paymentSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">¡Pago Aprobado!</h4>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto">
                    El webhook de Mercado Pago confirmó tu suscripción. Tu cuenta ahora tiene consultas ilimitadas.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-sm">
                    <span className="text-slate-600">Total a abonar:</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      ${mpPreference?.monto_ars?.toLocaleString('es-AR') || '14.900'} ARS
                    </span>
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Seleccioná el medio de pago:
                    </label>

                    <button
                      type="button"
                      onClick={() => setMpMethod('wallet')}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        mpMethod === 'wallet'
                          ? 'border-[#009ee3] bg-blue-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="w-5 h-5 text-[#009ee3]" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Dinero en cuenta Mercado Pago</div>
                          <div className="text-[11px] text-slate-500">Acreditación instantánea</div>
                        </div>
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border-2 ${mpMethod === 'wallet' ? 'border-[#009ee3] bg-[#009ee3]' : 'border-slate-300'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMpMethod('card')}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        mpMethod === 'card'
                          ? 'border-[#009ee3] bg-blue-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Tarjeta de Débito o Crédito</div>
                          <div className="text-[11px] text-slate-500">Visa, Mastercard, Cabal</div>
                        </div>
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border-2 ${mpMethod === 'card' ? 'border-[#009ee3] bg-[#009ee3]' : 'border-slate-300'}`} />
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Transacción simulada segura en sandbox con notificación inmediata por Webhook.</span>
                  </div>

                  <button
                    onClick={handleConfirmMpPayment}
                    disabled={isProcessingPayment}
                    className="w-full py-3.5 rounded-xl bg-[#009ee3] hover:bg-[#0089c7] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirmando pago en Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pagar ${mpPreference?.monto_ars?.toLocaleString('es-AR')} ARS</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
