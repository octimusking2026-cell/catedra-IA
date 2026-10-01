import React from 'react';
import { ShieldCheck, Lock, Database, FileText, ArrowLeft, Eye, Server, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { SEO } from '../components/SEO';

export const PoliticaPrivacidad: React.FC = () => {
  const { authUser } = useSession();
  const backTo = authUser ? "/ayuda" : "/";
  const backText = authUser ? "Volver a Ayuda y Privacidad" : "Volver al Inicio";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <SEO
        title="Política de Privacidad"
        description="Conocé los términos de privacidad y protección de datos universitarios en Cátedra IA."
      />
      {/* Top back navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backText}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-blue-900/40 relative overflow-hidden">
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Tratamiento de Datos Personales</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Política de Privacidad
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Última actualización: 30/09/2026. Conocé de manera transparente qué datos recopilamos y cómo los procesamos.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 text-xs sm:text-sm leading-relaxed">
        
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <span>1. Responsable de tratamiento y contacto</span>
          </h2>
          <p>
            El responsable del tratamiento de tus datos personales es <strong>Octavio Damian Delacourt</strong> (contacto: <a href="mailto:damiandelacourt@gmail.com" className="text-blue-600 underline">damiandelacourt@gmail.com</a>). Este servicio se desarrolla de forma independiente y autónoma, sin relación institucional oficial con ninguna universidad.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <span>2. Datos que tratamos</span>
          </h2>
          <p>
            En CátedraIA recolectamos únicamente la información necesaria para el funcionamiento de la plataforma:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong>Cuenta de Google:</strong> Tu identificador de usuario único (UID), nombre público, dirección de correo electrónico y foto de perfil provenientes de la autenticación de Google.</li>
            <li><strong>Ejercicios:</strong> Almacenamos el enunciado en texto (`texto_ocr`), materia, cátedra, tema y visibilidad de los ejercicios que cargás. <strong>Las imágenes o archivos PDF de entrada se procesan de forma transitoria en memoria para extraer el texto mediante la API de Gemini, pero no se guardan de forma permanente en nuestra base de datos.</strong></li>
            <li><strong>Votos y comentarios:</strong> Registro de tus valoraciones positivas o negativas y el texto de las discrepancias o comentarios académicos que dejes sobre las resoluciones de la IA.</li>
            <li><strong>Reportes:</strong> Tu identificador, nombre de usuario y los detalles de las denuncias de contenido que realices.</li>
            <li><strong>Feedback:</strong> El mensaje, nombre y correo electrónico que ingreses voluntariamente para ayudarnos a mejorar.</li>
            <li><strong>Lista de espera:</strong> Correo electrónico, materia/carrera solicitada y la dirección IP del cliente al momento del registro.</li>
            <li><strong>Contadores de uso diario:</strong> La cantidad de consultas de resolución que realizás por día para aplicar el límite de uso justo.</li>
            <li><strong>Registros técnicos de llamadas a la IA (ai_log):</strong> Datos técnicos de monitoreo como tokens consumidos, latencia de la consulta y registro de errores de la API.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <span>3. Para qué usamos tus datos</span>
          </h2>
          <p>
            Toda la información recopilada se utiliza con el único fin de:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Proveer el servicio de resolución de ejercicios universitarios paso a paso.</li>
            <li>Mantener tu historial de consultas personales para tu repaso diario.</li>
            <li>Gestionar el sistema de límites de uso justo diarios para evitar la saturación del servidor.</li>
            <li>Recibir reportes, feedback y moderar el contenido para mejorar la calidad académica del catálogo.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            <span>4. Transferencia a terceros y procesamiento internacional</span>
          </h2>
          <p>
            Tus datos se procesan en la infraestructura de <strong>Google Firebase / Google Cloud</strong> (servicios de autenticación y base de datos Firestore) y en la <strong>API oficial de Google Gemini</strong> (donde enviamos los textos e imágenes transitorias de los ejercicios para que la IA genere las resoluciones). Este procesamiento ocurre en servidores ubicados fuera de la República Argentina.
          </p>
          <p>
            {/* TODO: Completar si Google puede usar estos datos para mejorar sus productos según el plan de API que usás */}
            <em>[Nota de integración: Google declara que para los servicios pagos de Gemini API empresariales o configuraciones específicas de GCP, los datos de entrada y salida no se utilizan para entrenar sus modelos. Comprobá las condiciones de tu plan de API de Google Gemini para reescribir esta sección si corresponde.]</em>
          </p>
          <p>
            <strong>Bajo ninguna circunstancia vendemos, alquilamos ni comercializamos tus datos personales con terceros.</strong>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <span>5. Qué ven otros usuarios (Contenido compartido)</span>
          </h2>
          <p>
            Por defecto, todos los ejercicios se suben como <strong>privados</strong> y solo vos podés verlos. Si decidís publicar un ejercicio en modo <strong>compartido</strong>, cualquier usuario registrado en la plataforma podrá visualizar el enunciado, el título, la materia, el tema, la resolución generada por la IA y los votos asociados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <span>6. Conservación y borrado de datos</span>
          </h2>
          <p>
            Si usás la opción **"Borrar mis datos"** desde la pestaña de ayuda, se eliminará inmediatamente de Firestore: tu perfil de usuario, tus ejercicios subidos, tus votos y comentarios, tus registros de cuotas y logs de llamadas de IA.
          </p>
          <p className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* TODO: Modificar deleteUserDataFromFirestore en el backend para borrar resoluciones huérfanas, reportes históricos, registros de lista de espera y la cuenta de Firebase Auth en el futuro */}
            <strong>Nota técnica de conservación actual:</strong> Actualmente el sistema de borrado automático limpia tu perfil y ejercicios asociados de Firestore, pero no elimina las resoluciones generadas (que quedan huérfanas o se reutilizan), reportes que hayas enviado, registros históricos de la lista de espera, ni tu credencial técnica directa en el panel de Firebase Authentication.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>7. Derechos de acceso, rectificación y supresión (Ley 25.326)</span>
          </h2>
          <p>
            De conformidad con la Ley N° 25.326 de Protección de Datos Personales de la República Argentina, tenés derecho a acceder a tus datos personales de forma gratuita en intervalos no inferiores a seis meses. También podés solicitar la rectificación, actualización o eliminación definitiva de tus datos personales enviando un correo electrónico a <strong>damiandelacourt@gmail.com</strong>.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Organismo de Control de la República Argentina:</p>
            <p>
              {/* [REDACCIÓN VIGENTE: la pego yo] */}
              La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">8. Almacenamiento local del navegador</h2>
          <p>
            Utilizamos el almacenamiento local de tu navegador (localStorage / sessionStorage) exclusivamente para mantener el token técnico de tu sesión activa provisto por Firebase Auth, permitiendo que no tengas que loguearte cada vez que ingresás. <strong>No utilizamos cookies con fines publicitarios, de rastreo de comportamiento ni de segmentación comercial.</strong>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">9. Seguridad de la información</h2>
          <p>
            Implementamos medidas técnicas y de configuración de reglas de seguridad razonables para proteger tus datos de pérdidas, accesos no autorizados o alteraciones. Sin embargo, debido a la naturaleza de internet y los sistemas informáticos, no es posible garantizar una seguridad absoluta en línea.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">10. Cambios a esta política</h2>
          <p>
            Esta política puede actualizarse para reflejar cambios en las características del sistema o nuevas exigencias normativas. Te notificaremos sobre cambios relevantes publicando la nueva versión con fecha actualizada en esta misma sección.
          </p>
        </section>

        <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap justify-between items-center gap-2">
          <span>CátedraIA · Octavio Damian Delacourt</span>
          <Link to="/terminos" className="text-blue-600 font-semibold hover:underline">
            Ver Términos y Condiciones
          </Link>
        </div>
      </div>
    </div>
  );
};
