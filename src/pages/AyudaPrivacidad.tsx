import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import { SEO } from '../components/SEO';
import {
  ShieldCheck,
  Database,
  BrainCircuit,
  AlertTriangle,
  Trash2,
  Lock,
  UserCheck,
  FileText,
  Loader2,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export const AyudaPrivacidad: React.FC = () => {
  const navigate = useNavigate();
  const { usuario, logout } = useSession();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const handleDeleteData = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.borrarMisDatos();
      setDeleteSuccessMsg(res.mensaje || 'Tus datos han sido eliminados correctamente de Firestore.');
      setTimeout(async () => {
        await logout();
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setDeleteError(err.message || 'No se pudo completar el borrado de datos. Por favor intentá nuevamente.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <SEO
        title="Ayuda y Privacidad"
        description="Preguntas frecuentes, pautas de uso responsable de la IA y políticas de protección de datos en Cátedra IA."
      />
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-blue-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Transparencia y Uso Justo</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Ayuda, Privacidad y Tratamiento de Datos
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Última actualización: 30/09/2026. Conocé de manera sencilla qué información tratamos en la plataforma, las pautas de uso de la IA y cómo administrar o eliminar tus datos.
          </p>
        </div>
      </div>

      {/* 1. Qué datos guardamos */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-lg border-b border-slate-100 pb-3">
          <Database className="w-5 h-5 text-blue-600" />
          <span>1. ¿Qué datos guardamos en la base de datos?</span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          CátedraIA almacena únicamente la información indispensable para brindarte el servicio de resolución universitaria y personalizar las pautas de estudio:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Item 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Cuenta de Google</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Guardamos tu dirección de correo electrónico, tu nombre público y tu foto de perfil recibidos a través del inicio de sesión con Google. No guardamos contraseñas.
            </p>
          </div>

          {/* Item 2 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Ejercicios y Resoluciones</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Guardamos los títulos, enunciados textuales, materia, tema y las secuencias de pasos generadas. Las imágenes o PDF cargados solo se procesan transitoriamente en memoria para extraer el texto mediante la IA, pero no se guardan de forma permanente.
            </p>
          </div>

          {/* Item 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Registros de Uso Justo</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Registramos de forma diaria la cantidad de consultas de resolución que realizás por usuario e IP, con el único fin de garantizar una cuota de uso continuo y equitativo para todos.
            </p>
          </div>

          {/* Item 4 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Votos y Comentarios</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Almacenamos las calificaciones de conformidad metodológica, discrepancias y comentarios que emitís para recalibrar y ajustar el criterio de la inteligencia artificial.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Advertencia de IA y Deslinde Docente */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-amber-950 font-bold text-lg border-b border-amber-200/80 pb-3">
          <BrainCircuit className="w-5 h-5 text-amber-700" />
          <span>2. Generación por IA e Integridad Académica</span>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-amber-900 leading-relaxed">
          <p>
            Las resoluciones paso a paso publicadas en la plataforma son generadas automáticamente por modelos de <strong>Inteligencia Artificial (Google Gemini)</strong> guiados con las pautas específicas de cada cátedra.
          </p>

          <div className="p-4 rounded-2xl bg-amber-100/70 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Aviso Importante</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-amber-900 font-medium">
              <li>
                <strong>Posibilidad de Errores:</strong> Al ser un sistema automatizado, las resoluciones pueden contener imprecisiones, desvíos algebraicos o errores conceptuales.
              </li>
              <li>
                <strong>Carácter Orientativo:</strong> El contenido provisto es una herramienta de apoyo al estudio y contraste metodológico. <strong>No reemplaza las clases docentes, los trabajos prácticos ni el material oficial aprobado por tu cátedra</strong>.
              </li>
              <li>
                <strong>Integridad Académica:</strong> Vos sos responsable del uso ético que hagas de la herramienta. Cumplí las reglas de tu institución y no la utilices en exámenes o actividades donde esté prohibida.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Borrado de datos */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-lg border-b border-slate-100 pb-3">
          <Trash2 className="w-5 h-5 text-rose-600" />
          <span>3. Eliminación de Datos</span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Tenés derecho a solicitar la eliminación de tu información personal y ejercicios guardados en Firestore en cualquier momento, de forma directa.
        </p>

        <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
              Derecho de Supresión (Borrado de Datos)
            </h4>
            <p className="text-xs text-rose-800 leading-relaxed">
              Esta acción borrará de Firestore tu perfil, todos tus ejercicios subidos, tus votos, comentarios y registros asociados de cuotas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer shrink-0 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Borrar mis datos</span>
          </button>
        </div>
      </div>

      {/* Links a Términos y Política de Privacidad */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Información Adicional</h3>
        <p className="text-xs text-slate-600">
          Podés consultar los términos completos del servicio y nuestra política de datos personales en los siguientes enlaces:
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <Link
            to="/privacidad"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Política de Privacidad</span>
          </Link>

          <Link
            to="/terminos"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Términos y Condiciones</span>
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">¿Eliminar todos tus datos de Firestore?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono">
              Se eliminarán de Firestore:
              <br />• Tu perfil de usuario ({usuario?.email})
              <br />• Todos tus ejercicios subidos
              <br />• Tus votos y comentarios registrados
              <br />• Tus contadores de uso diario
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {deleteError}
              </div>
            )}

            {deleteSuccessMsg ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{deleteSuccessMsg}</span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteData}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Sí, borrar todos mis datos</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
