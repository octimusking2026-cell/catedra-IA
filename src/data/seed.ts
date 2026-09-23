import { Facultad, Materia, Catedra, Ejercicio, Resolucion, Usuario } from '../types';

export const SEED_USUARIOS: Usuario[] = [
  {
    id: 'usr_free_demo',
    email: 'estudiante@uba.ar',
    nombre: 'Agustín Gómez',
    plan: 'free',
    fecha_registro: '2026-03-01T10:00:00Z',
  },
  {
    id: 'usr_premium_demo',
    email: 'lucia.facu@utn.edu.ar',
    nombre: 'Lucía Fernández',
    plan: 'premium',
    fecha_registro: '2026-02-15T14:30:00Z',
  },
];

export const SEED_FACULTADES: Facultad[] = [
  {
    id: 'fac_uba_cbc',
    nombre: 'Ciclo Básico Común (CBC)',
    universidad: 'Universidad de Buenos Aires',
    siglas: 'UBA - CBC',
    logo_color: '#0284c7',
  },
  {
    id: 'fac_uba_fiuba',
    nombre: 'Facultad de Ingeniería (FIUBA)',
    universidad: 'Universidad de Buenos Aires',
    siglas: 'UBA - FIUBA',
    logo_color: '#2563eb',
  },
  {
    id: 'fac_uba_fce',
    nombre: 'Facultad de Ciencias Económicas (FCE)',
    universidad: 'Universidad de Buenos Aires',
    siglas: 'UBA - FCE',
    logo_color: '#0d9488',
  },
  {
    id: 'fac_utn_frba',
    nombre: 'Facultad Regional Buenos Aires (FRBA)',
    universidad: 'Universidad Tecnológica Nacional',
    siglas: 'UTN - FRBA',
    logo_color: '#d97706',
  },
  {
    id: 'fac_unlp_info',
    nombre: 'Facultad de Informática',
    universidad: 'Universidad Nacional de La Plata',
    siglas: 'UNLP - Info',
    logo_color: '#7c3aed',
  },
];

export const SEED_MATERIAS: Materia[] = [
  {
    id: 'mat_am1_cbc',
    nombre: 'Análisis Matemático I (66 / 28)',
    facultad_id: 'fac_uba_cbc',
    codigo: 'AM66',
  },
  {
    id: 'mat_alg_cbc',
    nombre: 'Álgebra (27 / 62)',
    facultad_id: 'fac_uba_cbc',
    codigo: 'ALG27',
  },
  {
    id: 'mat_fis1_fiuba',
    nombre: 'Física I (82.01)',
    facultad_id: 'fac_uba_fiuba',
    codigo: '82.01',
  },
  {
    id: 'mat_algo_fiuba',
    nombre: 'Algoritmos y Programación II (75.07)',
    facultad_id: 'fac_uba_fiuba',
    codigo: '75.07',
  },
  {
    id: 'mat_fis1_utn',
    nombre: 'Física I',
    facultad_id: 'fac_utn_frba',
    codigo: 'UTN-FIS1',
  },
  {
    id: 'mat_am2_utn',
    nombre: 'Análisis Matemático II',
    facultad_id: 'fac_utn_frba',
    codigo: 'UTN-AM2',
  },
];

export const SEED_CATEDRAS: Catedra[] = [
  {
    id: 'cat_am_gutierrez',
    materia_id: 'mat_am1_cbc',
    nombre: 'Cátedra Gutiérrez (Ejemplo)',
    profesor: 'Prof. Titular Dr. Carlos Gutiérrez (Sede Puan / Montes de Oca)',
    cuatrimestre: '1C / 2C Anual',
    es_ejemplo: true,
    estilo_metodologico: 'Enfoque riguroso en infinitésimos y desarrollos de Taylor. No se permite L\'Hôpital ciego sin justificar la indeterminación 0/0 o inf/inf y comparar con Taylor de orden 2. En estudio de funciones, es obligatorio el cuadro completo de signos de f\'(x) y f\'\'(x) justificando con el Teorema del Valor Medio.',
    criterios_clave: [
      'Prohibido aplicar L\'Hôpital en límites con cocientes polinómicos o exponenciales sin justificar exhaustivamente; priorizar Polinomio de Taylor.',
      'En optimización y extremos locales, construir siempre el cuadro de intervalos de signos para f\'(x) y f\'\'(x).',
      'En integrales definidas, citar expresamente las hipótesis del Teorema Fundamental del Cálculo (continuidad de f en [a,b]).',
      'Notación de infinitésimos con o-pequeña o resto de Lagrange explícito.'
    ],
    temas: [
      'Límites e Indeterminaciones',
      'Polinomio de Taylor y Resto',
      'Derivadas y Regla de la Cadena',
      'Estudio Completo de Funciones y Asíntotas',
      'Integrales y Teorema Fundamental'
    ],
    consejos_examen: [
      'La cátedra descuenta 1 punto entero si no aclarás el dominio natural de la función antes de calcular asíntotas.',
      'Si usás infinitésimos equivalentes, demostrá al margen el límite del cociente.'
    ]
  },
  {
    id: 'cat_alg_martinez',
    materia_id: 'mat_alg_cbc',
    nombre: 'Cátedra Martínez (Ejemplo)',
    profesor: 'Dra. Elena Martínez (Sede Ciudad Universitaria)',
    cuatrimestre: '1C / 2C Anual',
    es_ejemplo: true,
    estilo_metodologico: 'Método de eliminación de Gauss-Jordan formal. Justificación explícita de cada operación elemental de filas (Fi -> Fi + k*Fj). En subespacios vectoriales, demostrar formalmente pertenencia de 0, suma cerrada y producto por escalar. En transformaciones lineales, aplicar siempre Teorema de las Dimensiones.',
    criterios_clave: [
      'Indicar claramente el nombre de cada operación elemental sobre filas de la matriz.',
      'Para demostrar que un conjunto es subespacio, verificar los 3 axiomas: 0 en S, u+v en S, y k*u en S.',
      'En cambio de base, escribir la matriz de pasaje C(B, B\') con vectores puestos como columnas.',
      'Clasificación estricta de sistemas: SCD (determinado), SCI (indeterminado con grados de libertad expresados), SI (incompatible por fila 0=k).'
    ],
    temas: [
      'Sistemas de Ecuaciones Lineales y Matrices',
      'Espacios y Subespacios Vectoriales',
      'Bases, Dimensión e Intersección',
      'Transformaciones Lineales y Núcleo/Imagen',
      'Autovalores y Autovectores'
    ],
    consejos_examen: [
      'Nunca dejes un sistema compatible indeterminado sin dar las ecuaciones paramétricas y el vector director.',
      'Si piden intersección de subespacios S ∩ T, planteá el sistema conjunto de ecuaciones implícitas.'
    ]
  },
  {
    id: 'cat_fis_askenazi',
    materia_id: 'mat_fis1_utn',
    nombre: 'Cátedra Askenazi (Ejemplo)',
    profesor: 'Ing. Marcos Askenazi (Campus Lugano / Medrano)',
    cuatrimestre: '1C / 2C Anual',
    es_ejemplo: true,
    estilo_metodologico: 'Diagrama de Cuerpo Libre (DCL) aislado y obligatorio para cada cuerpo con sistema de referencia (SR) explícito (+x, +y). Prohibido plantear ecuaciones escalares de Newton sin haber mostrado antes los vectores en el DCL. En energía, explicitar trabajo de fuerzas no conservativas W_fnc = Delta Em.',
    criterios_clave: [
      'DCL con vectores de fuerza identificando el par de interacción (acción y reacción) si corresponde.',
      'Descomposición trigonométrica de fuerzas con seno y coseno claramente justificados según el ángulo medido.',
      'Condición de rodadura sin deslizamiento: a_cm = alpha * R y fuerza de rozamiento estática <= mu_e * N.',
      'Unidades SI en cada paso intermedio, nunca solo en el resultado final.'
    ],
    temas: [
      'Cinemática 1D y Tiro Parabólico',
      'Dinámica del Punto y Rozamiento',
      'Trabajo, Potencia y Energía Mecánica',
      'Cantidad de Movimiento y Choques',
      'Dinámica del Cuerpo Rígido y Momento de Inercia'
    ],
    consejos_examen: [
      'El DCL sin ejes coordenados se considera anulado por el cuerpo docente.',
      'Recordá que la normal N no siempre es igual al peso P: depende de las aceleraciones y componentes verticales.'
    ]
  },
  {
    id: 'cat_algo_rosita',
    materia_id: 'mat_algo_fiuba',
    nombre: 'Cátedra Méndez / Rosita (Ejemplo)',
    profesor: 'Lic. Martín Méndez & Ing. Rosa \'Rosita\' W.',
    cuatrimestre: '1C / 2C',
    es_ejemplo: true,
    estilo_metodologico: 'Análisis asintótico formal con notación O-grande, Omega y Theta. Invariantes de ciclo para demostrar corrección de algoritmos iterativos. Manejo meticuloso de memoria dinámica (malloc/free o punteros) y análisis riguroso de casos borde (árbol vacío, lista con 1 elemento).',
    criterios_clave: [
      'Planteo de recurrencias por Teorema Maestro o árbol de recursión con desglose de costos.',
      'Demostración de invariante de ciclo: inicialización, mantenimiento y terminación.',
      'Tratamiento de punteros nulos y comprobación previa antes de desreferenciar.',
      'Justificación de invariantes de estructura en ABB, AVL y Heaps.'
    ],
    temas: [
      'Complejidad Asintótica y Teorema Maestro',
      'Tipos Abstractos de Datos (TADs) y Listas',
      'Árboles Binarios de Búsqueda y AVL',
      'Heaps y Colas de Prioridad',
      'Grafos (BFS, DFS, Dijkstra)'
    ],
    consejos_examen: [
      'En el parcial te piden justificar la complejidad de cada línea o llamada recursiva en forma tabular.',
      'Si usás una función auxiliar, tenés que definir sus precondiciones y postcondiciones.'
    ]
  }
];

export const SEED_EJERCICIOS: Ejercicio[] = [
  {
    id: 'ej_001_am1_taylor',
    catedra_id: 'cat_am_gutierrez',
    usuario_id_subio: 'usr_free_demo',
    usuario_nombre: 'Agustín Gómez',
    titulo: 'Límite indeterminado 0/0 con Taylor de orden 3',
    tema: 'Polinomio de Taylor y Resto',
    texto_ocr: 'Calcular el siguiente límite sin aplicar la regla de L\'Hôpital: \n\nlim (x -> 0) [e^(x^2) - 1 - x^2] / [x^4]\n\nJustificar utilizando desarrollo de Taylor alrededor de x0 = 0 con infinitésimos de Landau.',
    imagen_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
    aprobado: true,
    fecha_subida: '2026-03-20T16:45:00Z',
  },
  {
    id: 'ej_002_alg_subespacios',
    catedra_id: 'cat_alg_martinez',
    usuario_id_subio: 'usr_premium_demo',
    usuario_nombre: 'Lucía Fernández',
    titulo: 'Intersección y dimensión de subespacios en R^4',
    tema: 'Bases, Dimensión e Intersección',
    texto_ocr: 'Sean en R^4 los subespacios:\nS = {(x,y,z,w) ∈ R^4 : x + 2y - z = 0  ∧  y - w = 0}\nT = gen{ (1, 0, 1, 0), (0, 1, 1, 1), (1, 1, 2, 1) }\n\na) Hallar una base y la dimensión de S ∩ T.\nb) Determinar si la suma S + T es directa.',
    imagen_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
    aprobado: true,
    fecha_subida: '2026-03-21T11:20:00Z',
  },
  {
    id: 'ej_003_fis_plano_inclinado',
    catedra_id: 'cat_fis_askenazi',
    usuario_id_subio: 'usr_free_demo',
    usuario_nombre: 'Agustín Gómez',
    titulo: 'Dinámica de bloque en plano inclinado con rozamiento y polea',
    tema: 'Dinámica del Punto y Rozamiento',
    texto_ocr: 'Un bloque de masa m1 = 4 kg descansa sobre un plano inclinado θ = 30° con coeficientes de rozamiento μ_e = 0.35 y μ_d = 0.20. Se conecta mediante una cuerda ideal y polea sin masa a un cuerpo colgante de masa m2 = 3.5 kg.\n\na) Realizar los DCL con ejes coordenados elegidos.\nb) Determinar si el sistema desliza o permanece en equilibrio estático.\nc) Si desliza, calcular la aceleración del sistema y la tensión de la cuerda (tomar g = 9.8 m/s²).',
    imagen_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
    aprobado: true,
    fecha_subida: '2026-03-22T09:15:00Z',
  },
];

export const SEED_RESOLUCIONES: Resolucion[] = [
  {
    id: 'res_001_am1_taylor',
    ejercicio_id: 'ej_001_am1_taylor',
    resumen_criterio: 'Criterio Cátedra Gutiérrez: Se evita L\'Hôpital aplicando el desarrollo de Maclaurin de la función exponencial e^u = 1 + u + u^2/2! + o(u^2) con sustitución u = x^2, manteniendo estricta la notación de Landau o(x^4).',
    resultado_final: 'El límite solicitado es exactamente L = 1/2.',
    votos_positivos: 18,
    votos_negativos: 0,
    estado: 'aprobada',
    fecha_generada: '2026-03-20T16:46:12Z',
    contenido_paso_a_paso: [
      {
        numero: 1,
        titulo: 'Identificación de la indeterminación y selección de orden de Taylor',
        explicacion: 'Al evaluar en x = 0 directamente: el numerador tiende a e^0 - 1 - 0 = 0 y el denominador a 0^4 = 0. Se trata de una indeterminación del tipo [0/0]. Como el denominador tiene orden x^4, debemos desarrollar el numerador hasta orden x^4 para que los términos no se anulen mutuamente.',
        desarrollo_matematico: 'f(x) = \\frac{e^{x^2} - 1 - x^2}{x^4} \\xrightarrow{x \\to 0} \\left[\\frac{0}{0}\\right]',
        justificacion_catedra: 'La Cátedra Gutiérrez penaliza el uso sucesivo de L\'Hôpital 4 veces por riesgo de error de cálculo; la vía estándar exigida en la guía de trabajos prácticos es el Polinomio de Taylor con infinitésimo de Landau.',
        advertencia_examen: 'Nunca reemplaces sólo una parte de la expresión por Taylor y dejes otra intacta; debés expandir todo el numerador de manera coherente.'
      },
      {
        numero: 2,
        titulo: 'Desarrollo en serie de Maclaurin para la exponencial',
        explicacion: 'Recordamos el desarrollo conocido de e^u alrededor de u = 0: e^u = 1 + u + u^2 / 2! + o(u^2). Haciendo la sustitución u = x^2 (que tiende a 0 cuando x -> 0):',
        desarrollo_matematico: 'e^{x^2} = 1 + x^2 + \\frac{(x^2)^2}{2!} + o((x^2)^2) = 1 + x^2 + \\frac{1}{2} x^4 + o(x^4)',
        justificacion_catedra: 'Explicitar que cuando x -> 0, también u = x^2 -> 0, validando la composición del desarrollo con o(x^4).',
      },
      {
        numero: 3,
        titulo: 'Sustitución en el numerador y simplificación algebraica',
        explicacion: 'Reemplazamos la expresión de e^(x^2) en el numerador del límite original:',
        desarrollo_matematico: 'N(x) = \\left(1 + x^2 + \\frac{1}{2}x^4 + o(x^4)\\right) - 1 - x^2 = \\frac{1}{2}x^4 + o(x^4)',
        justificacion_catedra: 'Los términos constantes (1 - 1 = 0) y de grado 2 (x^2 - x^2 = 0) se cancelan rigurosamente, sobreviviendo el término dominante de grado 4.',
      },
      {
        numero: 4,
        titulo: 'Paso al límite y conclusión final',
        explicacion: 'Dividimos numerador y denominador por x^4 y aplicamos la definición de infinitésimo lim (x -> 0) [o(x^4) / x^4] = 0:',
        desarrollo_matematico: '\\lim_{x \\to 0} \\frac{\\frac{1}{2}x^4 + o(x^4)}{x^4} = \\lim_{x \\to 0} \\left( \\frac{1}{2} + \\frac{o(x^4)}{x^4} \\right) = \\frac{1}{2} + 0 = \\frac{1}{2}',
        justificacion_catedra: 'Resultado formalmente justificado según la notación oficial del CBC de la Cátedra Gutiérrez.',
        advertencia_examen: 'Escribí la conclusión con recuadro y explicitá el valor del límite L = 1/2.'
      }
    ]
  },
  {
    id: 'res_002_alg_subespacios',
    ejercicio_id: 'ej_002_alg_subespacios',
    resumen_criterio: 'Criterio Cátedra Martínez: Se busca primero el sistema generador de T descartando combinaciones lineales redundantes con matriz traspuesta y Gauss-Jordan. Luego se hallan las ecuaciones implícitas de T para resolver el sistema homogéneo simultáneo con las ecuaciones de S.',
    resultado_final: 'Base(S ∩ T) = {(1, 0, 1, 0)}, dim(S ∩ T) = 1. La suma S + T NO es directa porque dim(S ∩ T) ≠ 0.',
    votos_positivos: 14,
    votos_negativos: 1,
    estado: 'aprobada',
    fecha_generada: '2026-03-21T11:22:30Z',
    contenido_paso_a_paso: [
      {
        numero: 1,
        titulo: 'Análisis de independencia lineal de los generadores de T',
        explicacion: 'Armamos la matriz con los 3 vectores generadores de T como filas y triangulamos mediante operaciones elementales de Gauss:',
        desarrollo_matematico: 'M_T = \\begin{pmatrix} 1 & 0 & 1 & 0 \\\\ 0 & 1 & 1 & 1 \\\\ 1 & 1 & 2 & 1 \\end{pmatrix} \\xrightarrow{F_3 \\leftarrow F_3 - F_1 - F_2} \\begin{pmatrix} 1 & 0 & 1 & 0 \\\\ 0 & 1 & 1 & 1 \\\\ 0 & 0 & 0 & 0 \\end{pmatrix}',
        justificacion_catedra: 'La Cátedra Martínez exige explicitar cada operación de filas. La 3ra fila se anula, probando que el 3er vector es combinación lineal de los dos primeros: v3 = v1 + v2.',
        advertencia_examen: 'Dimensión de T es 2, con base B_T = {(1,0,1,0), (0,1,1,1)}.'
      },
      {
        numero: 2,
        titulo: 'Planteo de vectores generales de T en combinación lineal',
        explicacion: 'Cualquier vector v in T se escribe como v = alpha*(1,0,1,0) + beta*(0,1,1,1) = (alpha, beta, alpha+beta, beta). Por lo tanto: x = alpha, y = beta, z = alpha+beta, w = beta.',
        desarrollo_matematico: 'v = (\\alpha, \\beta, \\alpha + \\beta, \\beta) \\in T',
        justificacion_catedra: 'Estrategia paramétrica recomendada por la cátedra para intersectar con las ecuaciones implícitas de S.'
      },
      {
        numero: 3,
        titulo: 'Imposición de las restricciones de S al vector de T',
        explicacion: 'El vector v debe cumplir las dos ecuaciones que definen al subespacio S:\n1) x + 2y - z = 0  =>  alpha + 2*beta - (alpha + beta) = 0  =>  beta = 0\n2) y - w = 0  =>  beta - beta = 0 (se cumple siempre)\nPero atención: con beta = 0, v = (alpha, 0, alpha, 0). Verificando en S:\nalpha + 0 - alpha = 0 (correcto).',
        desarrollo_matematico: '\\beta = 0 \\implies v = \\alpha (1, 0, 1, 0)',
        justificacion_catedra: 'Comprobación de consistencia en ambas ecuaciones implícitas de S.'
      },
      {
        numero: 4,
        titulo: 'Conclusión y análisis de suma directa',
        explicacion: 'Todo vector en S ∩ T es múltiplo de (1,0,1,0). Por tanto:\nBase(S ∩ T) = {(1,0,1,0)} y dim(S ∩ T) = 1.\nPara que la suma S + T sea directa, la condición necesaria y suficiente es que S ∩ T = {0}, es decir dim(S ∩ T) = 0.',
        desarrollo_matematico: 'S \\cap T = \\operatorname{gen}\\{(1, 0, 1, 0)\\} \\implies \\dim(S \\cap T) = 1 > 0 \\implies S \\oplus T \\text{ NO es suma directa.}',
        justificacion_catedra: 'Citar textualmente la definición del Teorema de Suma Directa de subespacios vectoriales.',
      }
    ]
  }
];

export const EJERCICIOS_DEMO_PRECARGADOS = [
  {
    titulo: 'CBC Álgebra - Teorema de las dimensiones y Núcleo/Imagen',
    catedra_id: 'cat_alg_martinez',
    tema: 'Transformaciones Lineales y Núcleo/Imagen',
    enunciado: 'Sea T: R^3 -> R^3 la transformación lineal dada por T(x,y,z) = (x - 2y + z, 2x - 4y + 2z, -x + 2y - z).\na) Hallar una base y la dimensión de Nu(T).\nb) Hallar una base y la dimensión de Im(T).\nc) Verificar el Teorema de las Dimensiones para T.',
  },
  {
    titulo: 'CBC Análisis Matemático - Estudio de concavidad y puntos de inflexión',
    catedra_id: 'cat_am_gutierrez',
    tema: 'Estudio Completo de Funciones y Asíntotas',
    enunciado: 'Dada la función f(x) = (x^2 - 1) * e^(-x):\na) Determinar el dominio natural y las asíntotas horizontales y verticales.\nb) Construir el cuadro de signos de f\'(x) indicando extremos locales.\nc) Construir el cuadro de signos de f\'\'(x) e indicar puntos de inflexión con justificación del Teorema del Valor Medio.',
  },
  {
    titulo: 'UTN Física I - Trabajo y energía con resorte y rozamiento',
    catedra_id: 'cat_fis_askenazi',
    tema: 'Trabajo, Potencia y Energía Mecánica',
    enunciado: 'Un bloque de masa m = 2 kg se comprime Delta x = 0.4 m contra un resorte de constante k = 500 N/m en una superficie horizontal sin rozamiento. Al liberarse, recorre una pista con rozamiento de longitud d = 3 m y coeficiente mu_d = 0.25, antes de subir por una rampa de 30° sin rozamiento.\na) DCL en cada tramo con ejes coordenados.\nb) Calcular la velocidad del bloque al finalizar el tramo con rozamiento usando el teorema W_fnc = Delta Em.\nc) Hallar la altura máxima h alcanzada en la rampa.',
  }
];
