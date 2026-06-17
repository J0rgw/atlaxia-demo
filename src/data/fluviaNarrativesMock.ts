/**
 * Narrativas FluvIA curadas a mano (demo del futuro asistente LLM).
 *
 * ── Contrato de contexto del FluvIA real ─────────────────────────────────
 * Estas narrativas emulan lo que un LLM produciría recibiendo este paquete:
 *  1. La fila completa de anomaly_events (rango, duración, n_detecciones,
 *     nivel_pico, posible, closed_reason, sensores_involucrados en orden de
 *     aparición, inference_refs).
 *  2. Scores por sensor del episodio (todos los sensores, no solo los
 *     involucrados) para distinguir foco de fondo.
 *  3. El diccionario físico SWAT (sensorMeta): magnitud, unidad, rango
 *     normal, equipo observado (ontología sensor→equipo, XAI-graph.md §11).
 *  4. La topología de procesos (P1 captación → P2 dosificación química →
 *     P3 ultrafiltración → P4 decloración/UV) y la red física.
 *  5. El historial del periodo: episodios previos, sus veredictos humanos
 *     y patrones recurrentes (mismo sensor/ruta en varios episodios).
 *
 * ── Reglas de redacción (decisión de seguridad, XAI-graph.md §10) ────────
 *  - VOZ: técnico de planta explicando a su supervisor, lenguaje humano.
 *  - DESCRIBE física y secuencia ("el pH salió de su banda 6.5 a 7.5, después
 *    reaccionó el nivel del T-301"). Puede dar contexto de dominio con
 *    cobertura ("este transitorio es típico de X") y citar veredictos del
 *    OPERADOR, pero NUNCA concluye la causa de ESTE evento ni prescribe
 *    actuaciones sobre el proceso.
 *  - El estado de revisión es DINÁMICO (cambia con el PATCH): las narrativas
 *    no lo incluyen; la UI lo añade aparte.
 *
 * **negrita** → la UI lo renderiza con <b> (FluviaProse).
 */

import type { AnomalyEventRange } from '@/types';

/** Narrativa por episodio (id de fixture → párrafos). */
export const EVENT_NARRATIVES: Record<number, string[]> = {
  18: [
    'Tenemos un **episodio activo** en la ruta químico→ultrafiltración. La primera señal fue el **pH de la dosificación de HCl (AIT202)**, que está leyendo fuera de su banda normal de 6.5 a 7.5; poco después empezó a desviarse el **nivel del tanque T-301 (LIT301)** y ahora la **presión diferencial de la membrana (DPIT301)** trabaja por encima de su referencia de 0.4 bar.',
    'La perturbación entró por la etapa química y se está arrastrando aguas abajo, con criticidad máxima sostenida. Es la **misma firma del episodio #16** de hace unas horas: misma entrada por pH, misma propagación. El registro se actualizará al cierre de la racha.',
  ],
  17: [
    'Pico **breve y aislado** en la presión diferencial de la membrana UF (**DPIT301**): 12 segundos por encima del umbral y vuelta a régimen, sin arrastrar a ninguna otra señal. Por duración no constituye episodio, queda como candidata.',
    'Este tipo de transitorio suele acompañar a maniobras de retrolavado; en esta ocasión la válvula **MV301 no registró movimiento**, así que merece el minuto que cuesta revisarla.',
  ],
  16: [
    'Minuto y medio con la **etapa química desviada y arrastre hacia ultrafiltración**: el pH de la dosificación de HCl (**AIT202**) salió de banda, el **cloro libre (AIT203)** reaccionó a continuación, y el **nivel del T-301** con la **válvula MV201** acompañaron el movimiento. Pico de severidad HIGH.',
    'Es la pieza clave para juzgar el episodio en curso: **misma entrada, misma propagación**. Si este se confirma como real, lo de ahora probablemente no sea un caso aislado.',
  ],
  15: [
    'Blip de **8 segundos** en el caudal hacia la unidad UV/RO (**FIT401**), sin acompañamiento de ninguna otra señal de la planta. El propio aislamiento de la señal es lo que lo hace poco creíble como evento de proceso.',
  ],
  14: [
    '**Tres minutos y medio con la captación completa fuera de régimen**: el nivel del tanque T-101 fuera de su banda de 500 a 820 mm, el **caudal de entrada (FIT101) sin correspondencia con la posición de la válvula MV101**, y la bomba P101 con un estado incoherente con la demanda.',
    'Lo que disparó la severidad es justo esa **incoherencia entre lo que ordena el control y lo que miden los sensores**, el patrón que más nos interesa vigilar en la etapa de entrada.',
  ],
  13: [
    'Quince segundos con **conductividad (AIT201) y pH (AIT202) moviéndose a la par** en la etapa química. No llegó a episodio por duración.',
    'Comparte firma con los episodios de la etapa química de esta semana: ese par de señales ha sido el **preludio habitual** antes de los eventos largos.',
  ],
  12: [
    'Un minuto de **presión de membrana alta (DPIT301) coincidiendo con la apertura de la válvula de retrolavado (MV301)**. El operador lo revisó y lo descartó: maniobra de retrolavado esperada que el modelo aún no contextualiza.',
    'Caso útil para la calibración: enseña al sistema a convivir con las maniobras programadas de la etapa de ultrafiltración.',
  ],
  11: [
    'El **episodio más severo de la semana**: cinco minutos con la cadena dosificación→ultrafiltración entera fuera de régimen. Empezó por el **pH (AIT202)** (lectura compatible con exceso de dosificación ácida), siguió por el **nivel del T-301** y la válvula MV201, y terminó arrastrando el caudal tras dosificación y la **presión de la membrana**.',
    'Nivel **CRITICAL sostenido** durante toda la racha y cinco puntos de medida implicados. Es la misma ruta pH→T-301 que reaparece en episodios posteriores, el patrón de referencia de esta semana.',
  ],
  10: [
    'Marca de **6 segundos** en la bomba de ultrafiltración (**P301**), sin reflejo en presión ni caudal. Una señal de estado aislada, sin efecto hidráulico medible.',
  ],
  9: [
    'Dos minutos con el **caudal de ultrafiltración (FIT301)** fuera de su banda de 1.5 a 2.5 m³/h y el **nivel del T-301 reaccionando a continuación**, coherencia hidráulica entre ambas señales, que es lo que da credibilidad al evento.',
  ],
  8: [
    'Episodio en **decloración/UV** (dureza AIT401 y caudal de salida FIT401) con un cierre atípico: el servicio se **reinició a mitad de racha** y el barrido de arranque lo selló administrativamente.',
    'Ojo al interpretarlo: los **45 segundos registrados son un mínimo**, no la duración real, no sabemos cuánto se extendió tras el reinicio.',
  ],
  7: [
    'Tres minutos con la **etapa de ultrafiltración completa desviada**: nivel del T-301, presión de membrana y el conjunto bomba y válvula de retrolavado. La secuencia arrancó por el nivel y acabó afectando a los **cuatro puntos de medida de la etapa**.',
  ],
  6: [
    'Cambio de estado **breve (10 s)** de la válvula de entrada (**MV101**) que el modelo marcó de forma aislada, sin efecto en caudal ni nivel de la captación.',
  ],
  5: [
    'Dos analizadores de la etapa química, **cloro libre (AIT203) y conductividad (AIT201)**, se desviaron a la vez durante dos minutos y medio **sin que ninguna señal hidráulica acompañara** el movimiento.',
    'El operador lo descartó como falso positivo; al quedar etiquetado, este patrón "solo-analizadores" alimenta directamente la recalibración del modelo.',
  ],
  4: [
    'Minuto y medio en la **captación**: el caudal de entrada (**FIT101**) cayó por debajo de su banda de 2 a 3 m³/h mientras el **nivel del T-101 subía en respuesta**, física coherente entre ambas señales.',
    'Quedó como referencia del comportamiento de la etapa de entrada ante perturbaciones de caudal.',
  ],
};

export interface RangeNarrative {
  paragraphs: string[];
  /**
   * Triage de relevo ("dónde mirar primero"): guía INVESTIGATIVA, qué
   * revisar/veredictar, nunca actuación sobre el proceso.
   */
  lookFirst: string;
}

/**
 * Narrativa por ventana preset (resumen del periodo, voz de relevo de turno).
 * 'custom' no tiene narrativa curada → la UI cae al resumen estructurado.
 * Nota demo: los fixtures son relativos a "ahora", así que la pertenencia de
 * los episodios límite a "ayer" puede variar con la hora del día.
 */
export const RANGE_NARRATIVES: Partial<Record<AnomalyEventRange, RangeNarrative>> = {
  '24h': {
    paragraphs: [
      'Resumen del día: **dos frentes y un episodio abierto ahora mismo**. El más serio fue el de la **captación (#14)**: tres minutos y medio con nivel del T-101, caudal de entrada, válvula y bomba desviados a la vez, con incoherencia entre orden de control y medida. El operador lo **confirmó como real**.',
      'El segundo frente es la **ruta químico→ultrafiltración**: el episodio **#16** (pH de HCl fuera de banda, cloro reaccionando, T-301 y MV201 arrastrados) y, ahora mismo, el **#18 EN CURSO con la misma firma**: misma entrada por pH, misma propagación aguas abajo.',
      'El resto fueron **tres transitorios breves** (presión de membrana, caudal a UV/RO y el par conductividad y pH) sin continuidad: dos ya descartados, uno pendiente.',
    ],
    lookFirst:
      'Dar veredicto al **#16**: comparte firma con el episodio activo #18 y decide cómo tratarlo.',
  },
  yesterday: {
    paragraphs: [
      'Jornada **tranquila**: un único episodio confirmado por duración en **ultrafiltración (#12)**: un minuto de presión de membrana alta coincidiendo con la apertura de la válvula de retrolavado, que el operador revisó y **descartó como falso positivo** por tratarse de una maniobra esperada.',
      'A última hora pudo registrarse además un transitorio breve del par **conductividad y pH (#13)** en la etapa química; esa firma reaparece en los episodios largos de la semana.',
    ],
    lookFirst: 'Nada urgente; el transitorio **#13** sigue sin veredicto.',
  },
  '7d': {
    paragraphs: [
      'La semana deja **once registros** y una historia clara: la **ruta químico→ultrafiltración es el foco dominante**. El episodio de referencia es el **#11** (cinco minutos con la cadena completa fuera de régimen, desde el pH de la dosificación hasta la presión de membrana, confirmado como real), y su firma (entrada por **AIT202**, arrastre hacia **T-301**) reaparece en el #16 y en el episodio activo #18.',
      'Fuera de esa ruta: un episodio serio y confirmado en la **captación (#14)**, otro real en el **caudal de UF (#9)**, y el **#8 en decloración quedó cerrado administrativamente** por un reinicio del servicio: su duración real es desconocida y sigue sin veredicto.',
      'Las candidatas breves se están gestionando bien: los falsos positivos etiquetados (retrolavados, señales de analizador aisladas) están **alimentando la recalibración** del modelo.',
    ],
    lookFirst:
      'Pendientes con más valor: **#16** (firma del episodio activo) y **#8** (cierre administrativo, duración real desconocida).',
  },
};
