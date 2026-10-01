import React from 'react';
import { BookOpen, ShieldAlert, CheckCircle2, ArrowLeft, GraduationCap, User, Scale, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { SEO } from '../components/SEO';

export const TerminosCondiciones: React.FC = () => {
  const { authUser } = useSession();
  const backTo = authUser ? "/ayuda" : "/";
  const backText = authUser ? "Volver a Ayuda y Privacidad" : "Volver al Inicio";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <SEO
        title="Términos y Condiciones"
        description="Términos de servicio, cuota de uso justo y normas de convivencia académica de Cátedra IA."
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
            <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
            <span>Condiciones de Uso del Servicio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Última actualización: 30/09/2026. Reglas para el uso de CátedraIA para el estudio independiente.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 text-xs sm:text-sm leading-relaxed">
        
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>1. Quién ofrece el servicio</span>
          </h2>
          <p>
            CátedraIA es un proyecto independiente desarrollado y gestionado de manera autónoma por <strong>Octavio Damian Delacourt</strong> (contacto: <a href="mailto:damiandelacourt@gmail.com" className="text-blue-600 underline">damiandelacourt@gmail.com</a>). Este servicio <strong>no tiene ningún tipo de afiliación, vínculo, patrocinio ni relación oficial con ninguna universidad o facultad</strong>. Es un desarrollo de carácter estrictamente personal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>2. Qué es y qué no es CátedraIA</span>
          </h2>
          <p>
            CátedraIA es un asistente de estudio orientativo basado en modelos de inteligencia artificial. Las resoluciones paso a paso que genera son guías de estudio y <strong>pueden contener errores conceptuales o de cálculo</strong>.
          </p>
          <p>
            Este servicio <strong>no reemplaza a los docentes, las clases presenciales ni la bibliografía obligatoria</strong>. Vos sos el único responsable de la verificación de los resultados y de cómo los usás. Asimismo, debés cumplir con las normas de integridad académica de tu institución educativa; está prohibido utilizar esta herramienta en evaluaciones, exámenes o donde tu universidad no lo permita.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span>3. Cuenta de usuario</span>
          </h2>
          <p>
            Para usar la aplicación debés ingresar mediante tu cuenta de Google. La edad mínima requerida para registrarse y utilizar el servicio es de <strong>17 años</strong>. Está permitido registrar únicamente una cuenta por persona.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            <span>4. Contenido que subís</span>
          </h2>
          <p>
            Al subir un ejercicio, declarás bajo tu responsabilidad que tenés derecho a usar dicho material y que no infringe derechos de propiedad intelectual de terceros. <strong>No debés subir datos personales de terceros ni material que no estés autorizado a compartir</strong>.
          </p>
          <p>
            Al cargar contenido nos otorgás una licencia gratuita, limitada y sin exclusividad para almacenarlo, procesarlo a través de la IA para generar la resolución y, <strong>únicamente si elegís explícitamente el modo "compartido"</strong>, mostrarlo a otros usuarios del sistema. Por defecto, los ejercicios que subís se configuran en modo <strong>privado</strong>.
          </p>
          <p>
            Tené en cuenta que las resoluciones generadas por la IA a partir de enunciados de ejercicios compartidos pueden ser reutilizadas para otros usuarios que consulten por el mismo enunciado exacto.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <span>5. Uso aceptable del servicio</span>
          </h2>
          <p>
            Está prohibido el uso de herramientas automatizadas, bots o técnicas de scraping para extraer resoluciones o interactuar con el sistema. Tampoco podés intentar eludir los límites de cuota diaria (por ejemplo, creando múltiples cuentas), subir contenido ilegal, ofensivo o inapropiado, ni realizar acciones destinadas a comprometer o vulnerar la seguridad del servidor o de las cuentas de otros usuarios.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            <span>6. Cuotas y disponibilidad</span>
          </h2>
          <p>
            El servicio se ofrece actualmente de forma gratuita. Para asegurar un uso equitativo, se imponen límites de consultas diarias por usuario. El acceso se ofrece "tal cual" está disponible, sin garantías de continuidad o rendimiento absoluto. Nos reservamos el derecho de modificar los límites de uso, suspender temporalmente el servicio o, en el futuro, establecer planes de pago con previo aviso.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            <span>7. Moderación, reportes y reclamos de propiedad intelectual</span>
          </h2>
          <p>
            Nos reservamos el derecho de ocultar o eliminar cualquier ejercicio o resolución, así como suspender cuentas de usuarios que infrinjan estas reglas.
          </p>
          <p>
            Si detectás contenido ofensivo, incorrecto o que considerás que infringe tus derechos de autor, podés reportarlo usando el botón correspondiente dentro de la plataforma o escribir un correo a <strong>damiandelacourt@gmail.com</strong> detallando el caso y el enlace exacto del ejercicio. Los reclamos legítimos serán atendidos y el contenido será dado de baja en un plazo razonable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            <span>8. Limitación de responsabilidad</span>
          </h2>
          <p>
            En la máxima medida permitida por las leyes de la República Argentina, Octavio Damian Delacourt no será responsable por ninguna calificación académica desfavorable, decisiones tomadas a partir de las guías de estudio, desaprobación de exámenes ni por daños directos o indirectos derivados del uso de CátedraIA.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">9. Modificación de los términos</h2>
          <p>
            Estos términos están versionados con fecha. Nos reservamos el derecho de actualizarlos. En caso de modificaciones importantes, te solicitaremos que vuelvas a leerlos y aceptarlos al ingresar nuevamente a la aplicación.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">10. Ley aplicable y jurisdicción</h2>
          <p>
            Estos términos se rigen por las leyes de la República Argentina. Cualquier conflicto o reclamo judicial derivado de su uso se someterá a la jurisdicción de los tribunales ordinarios de la <strong>Provincia de Misiones</strong>, renunciando a cualquier otro fuero.
          </p>
        </section>

        <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap justify-between items-center gap-2">
          <span>CátedraIA · Octavio Damian Delacourt</span>
          <Link to="/privacidad" className="text-blue-600 font-semibold hover:underline">
            Ver Política de Privacidad
          </Link>
        </div>
      </div>
    </div>
  );
};
