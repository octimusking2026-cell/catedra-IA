import { describe, it, expect } from 'vitest';
import { normalizarPasos } from '../server/utils/stepNormalizer';

describe('normalizarPasos', () => {
  it('debe lanzar un error si el objeto de entrada está vacío o no contiene pasos', () => {
    expect(() => normalizarPasos({} as any)).toThrow('La IA no generó pasos de resolución válidos.');
    expect(() => normalizarPasos({ pasos: [] })).toThrow('La IA no generó pasos de resolución válidos.');
  });

  it('debe lanzar un error si falta el resultado final', () => {
    const input = {
      resumen_criterio: 'Criterio estándar',
      resultado_final: '',
      pasos: [
        {
          numero: 1,
          titulo: 'Paso 1: Planteo',
          explicacion: 'Definimos variables',
          desarrollo_matematico: 'x = 5',
        },
      ],
    };
    expect(() => normalizarPasos(input)).toThrow('La IA no devolvió un resultado final concluyente.');
  });

  it('debe normalizar correctamente un payload completo de solución', () => {
    const input = {
      resumen_criterio: ' Método de Gauss-Jordan ',
      resultado_final: 'x = 3, y = 2',
      entendimiento: ' Sistema de 2x2 ',
      estrategia: ' Eliminación directa ',
      confianza: 'ALTA',
      motivo_confianza: ' Verificado por sustitución ',
      supuestos: [' Matriz no singular '],
      errores_comunes: [' Olvidar cambiar signo '],
      pasos: [
        {
          numero: 1,
          titulo: ' Paso 1: Matriz Aumentada ',
          explicacion: ' Escribimos la matriz ',
          desarrollo_matematico: ' [1 2 | 7] ',
          justificacion_catedra: ' Representación canónica ',
          chequeo: ' Det != 0 ',
        },
      ],
    };

    const result = normalizarPasos(input);

    expect(result.validSteps.length).toBe(1);
    expect(result.validSteps[0].titulo).toBe('Paso 1: Matriz Aumentada');
    expect(result.validSteps[0].desarrollo_matematico).toBe('[1 2 | 7]');
    expect(result.validSteps[0].justificacion_catedra).toBe('Representación canónica');
    expect(result.cleanedSummary).toBe('Método de Gauss-Jordan');
    expect(result.cleanedResult).toBe('x = 3, y = 2');
    expect(result.confianza).toBe('alta');
    expect(result.supuestos).toEqual(['Matriz no singular']);
    expect(result.erroresComunes).toEqual(['Olvidar cambiar signo']);
  });

  it('debe agregar supuesto automático cuando fallbackSinImagen es verdadero', () => {
    const input = {
      resumen_criterio: 'Criterio analítico',
      resultado_final: '10 N',
      pasos: [
        {
          titulo: 'Paso 1',
          explicacion: 'Calculamos fuerza',
        },
      ],
    };

    const result = normalizarPasos(input, true);
    expect(result.supuestos).toContain('La resolución no consideró la figura.');
  });

  it('debe asignar confianza "alta" por defecto si el valor recibido no es válido', () => {
    const input = {
      resultado_final: 'Res = 42',
      confianza: 'desconocida',
      pasos: [
        {
          titulo: 'Paso 1',
          explicacion: 'Explicación válida',
        },
      ],
    };

    const result = normalizarPasos(input as any);
    expect(result.confianza).toBe('alta');
  });

  it('debe descartar pasos que no tengan ni explicación ni desarrollo matemático', () => {
    const input = {
      resultado_final: 'Res = 10',
      pasos: [
        {
          titulo: 'Paso Válido',
          explicacion: 'Tiene explicación',
        },
        {
          titulo: 'Paso Inválido Vacío',
          explicacion: '   ',
          desarrollo_matematico: '',
        },
      ],
    };

    const result = normalizarPasos(input);
    expect(result.validSteps.length).toBe(1);
    expect(result.validSteps[0].titulo).toBe('Paso Válido');
  });
});
