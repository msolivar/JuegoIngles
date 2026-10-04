import { Injectable } from '@angular/core';
import { Database, get, push, ref, set } from '@angular/fire/database';

// =========================================================
// TIPOS DE JUEGO
// =========================================================
export type TipoJuego = 'unir-palabra' | 'completar-palabra' | 'cuestionario';

// =========================================================
// INTERFAZ DE PUNTUACIÓN
// =========================================================
export interface PuntuacionFirebase {
  id?: string;
  juego: TipoJuego;
  jugador: string;
  categoria: string;
  // =======================================================
  // RESULTADO
  // =======================================================
  puntuacion: number;
  correctas: number;
  total: number;
  errores: number;
  porcentaje: number;
  repaso?: string;
  // =======================================================
  // TIEMPO EMPLEADO EN EL JUEGO
  // =======================================================
  tiempoSegundos: number;
  // =======================================================
  // FECHA
  // =======================================================
  fechaYHoraDeCreacion: number;
}

// =========================================================
// SERVICIO
// =========================================================
@Injectable({
  providedIn: 'root',
})
export class FirebasePuntuacionService {
  // =========================================================
  // RUTA PRINCIPAL
  // =========================================================

  private readonly rutaPrincipal = 'puntuaciones';
  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(private database: Database) {}
  // =========================================================
  // GUARDAR PUNTUACIÓN
  // =========================================================

  async guardarPuntuacion(
    puntuacion: Omit<PuntuacionFirebase, 'id' | 'fechaYHoraDeCreacion'>,
  ): Promise<string> {
    // =======================================================
    // VALIDAR JUEGO
    // =======================================================

    if (!this.esJuegoValido(puntuacion.juego)) {
      throw new Error('El tipo de juego no es válido.');
    }

    // =======================================================
    // VALIDAR NOMBRE
    // =======================================================
    const jugador = String(puntuacion.jugador ?? '').trim();

    if (!jugador) {
      throw new Error('El nombre del jugador es obligatorio.');
    }

    // =======================================================
    // NORMALIZAR DATOS
    // =======================================================
    const correctas = this.numeroSeguro(puntuacion.correctas);
    const total = this.numeroSeguro(puntuacion.total);
    const errores = this.numeroSeguro(puntuacion.errores);
    const tiempoSegundos = this.numeroSeguro(puntuacion.tiempoSegundos);

    // =======================================================
    // VALIDACIONES
    // =======================================================

    if (correctas < 0) {
      throw new Error(
        'La cantidad de respuestas correctas no puede ser negativa.',
      );
    }

    if (total < 0) {
      throw new Error(
        'El total de preguntas o palabras no puede ser negativo.',
      );
    }

    if (errores < 0) {
      throw new Error('La cantidad de errores no puede ser negativa.');
    }

    if (tiempoSegundos < 0) {
      throw new Error('El tiempo no puede ser negativo.');
    }

    // =======================================================
    // PORCENTAJE
    //
    // Lo calculamos aquí para no depender del componente.
    // =======================================================
    const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0;

    // =======================================================
    // PUNTUACIÓN
    //
    // 1 ACIERTO = 100 PUNTOS
    //
    // La posición del ranking NO depende solamente
    // de este valor.
    // =======================================================
    const puntuacionCalculada = correctas * 100;

    // =======================================================
    // RUTA
    // =======================================================
    const ruta = `${this.rutaPrincipal}/${puntuacion.juego}`;
    console.log('🔥 Guardando puntuación en:', ruta);

    // =======================================================
    // REFERENCIA FIREBASE
    // =======================================================
    const puntuacionesRef = ref(this.database, ruta);

    // =======================================================
    // GENERAR NUEVO ID
    // =======================================================
    const nuevaPuntuacionRef = push(puntuacionesRef);
    const id = nuevaPuntuacionRef.key;

    if (!id) {
      throw new Error(
        'Firebase no pudo generar el identificador de la puntuación.',
      );
    }

    // =======================================================
    // CREAR REGISTRO
    // =======================================================
    const registro: PuntuacionFirebase = {
      id,
      juego: puntuacion.juego,
      jugador,
      categoria: String(puntuacion.categoria ?? 'General').trim() || 'General',
      // =====================================================
      // PUNTUACIÓN CALCULADA
      // =====================================================
      puntuacion: puntuacionCalculada,
      correctas,
      total,
      errores,
      porcentaje,
      repaso: String(puntuacion.repaso ?? '').trim() || '',
      // =====================================================
      // TIEMPO REAL UTILIZADO
      // =====================================================
      tiempoSegundos,
      // =====================================================
      // FECHA
      // =====================================================
      fechaYHoraDeCreacion: Date.now(),
    };
    console.log('📤 Registro que se guardará:', registro);

    // =======================================================
    // GUARDAR EN FIREBASE
    // =======================================================
    await set(nuevaPuntuacionRef, registro);
    console.log('✅ Puntuación guardada correctamente:', registro);

    // =======================================================
    // DEVOLVER ID
    // =======================================================
    return id;
  }

  // =========================================================
  // OBTENER PUNTUACIONES
  // =========================================================
  async obtenerPuntuaciones(juego: TipoJuego): Promise<PuntuacionFirebase[]> {
    // =======================================================
    // VALIDAR JUEGO
    // =======================================================
    if (!this.esJuegoValido(juego)) {
      console.error('❌ Juego no válido:', juego);
      return [];
    }
    // =======================================================
    // RUTA
    // =======================================================

    const ruta = `${this.rutaPrincipal}/${juego}`;
    console.log('🔥 Leyendo puntuaciones desde:', ruta);

    // =======================================================
    // REFERENCIA
    // =======================================================
    const puntuacionesRef = ref(this.database, ruta);

    // =======================================================
    // LEER FIREBASE
    // =======================================================
    const snapshot = await get(puntuacionesRef);
    console.log('🔥 ¿Existe snapshot?:', snapshot.exists());

    // =======================================================
    // SIN DATOS
    // =======================================================
    if (!snapshot.exists()) {
      console.log('⚠️ No existen puntuaciones para:', juego);
      return [];
    }

    // =======================================================
    // DATOS CRUDOS
    // =======================================================

    const datos = snapshot.val();
    console.log('🔥 Datos obtenidos:', datos);

    if (!datos || typeof datos !== 'object') {
      console.warn('⚠️ Los datos recibidos no tienen el formato esperado.');
      return [];
    }

    // =======================================================
    // CONVERTIR FIREBASE A ARRAY
    // =======================================================
    const puntuaciones: PuntuacionFirebase[] = Object.entries(datos).map(
      ([key, value]) => {
        const dato = value as Partial<PuntuacionFirebase>;

        // =================================================
        // CORRECTAS
        // =================================================
        const correctas = this.numeroSeguro(dato.correctas);

        // =================================================
        // TOTAL
        // =================================================
        const total = this.numeroSeguro(dato.total);

        // =================================================
        // ERRORES
        // =================================================
        const errores = this.numeroSeguro(dato.errores);

        // =================================================
        // TIEMPO
        //
        // Registros antiguos que no tengan tiempo
        // quedarán temporalmente con 0.
        // =================================================
        const tiempoSegundos = this.numeroSeguro(dato.tiempoSegundos);

        // =================================================
        // PORCENTAJE
        //
        // Si no existe en un registro antiguo,
        // lo recalculamos.
        // =================================================
        const porcentajeGuardado = Number(dato.porcentaje);
        const porcentaje = Number.isFinite(porcentajeGuardado)
          ? porcentajeGuardado
          : total > 0
            ? Math.round((correctas / total) * 100)
            : 0;

        // =================================================
        // PUNTUACIÓN
        //
        // Si no existe, usamos correctas * 100.
        // =================================================
        const puntuacionGuardada = Number(dato.puntuacion);
        const puntuacion = Number.isFinite(puntuacionGuardada)
          ? puntuacionGuardada
          : correctas * 100;

        // =================================================
        // FECHA
        // =================================================
        const fecha = this.numeroSeguro(dato.fechaYHoraDeCreacion);

        // =================================================
        // REGISTRO NORMALIZADO
        // =================================================
        return {
          id: key,
          juego,
          jugador: String(dato.jugador ?? 'Jugador'),
          categoria: String(dato.categoria ?? 'General'),
          puntuacion,
          correctas,
          total,
          errores,
          porcentaje,
          tiempoSegundos,
          fechaYHoraDeCreacion: fecha,
        };
      },
    );

    // =======================================================
    // ORDENAR TABLA DE POSICIONES
    //
    // CRITERIOS:
    //
    // 1. MAYOR NÚMERO DE ACIERTOS
    // 2. MAYOR PUNTUACIÓN
    // 3. MENOR TIEMPO EMPLEADO
    // 4. REGISTRO MÁS ANTIGUO
    //
    // IMPORTANTE:
    // tiempoSegundos = 0 se considera "sin tiempo"
    // para mantener compatibilidad con registros antiguos.
    // =======================================================
    puntuaciones.sort((a, b) => {
      // =====================================================
      // 1. MÁS ACIERTOS PRIMERO
      // =====================================================
      if (b.correctas !== a.correctas) {
        return b.correctas - a.correctas;
      }
      // =====================================================
      // 2. MENOS ERRORES PRIMERO
      // =====================================================
      if (a.errores !== b.errores) {
        return a.errores - b.errores;
      }
      // =====================================================
      // 3. MENOR TIEMPO PRIMERO
      // =====================================================
      if (a.tiempoSegundos !== b.tiempoSegundos) {
        return a.tiempoSegundos - b.tiempoSegundos;
      }
      // =====================================================
      // 4. SI TODO EMPATA, EL REGISTRO MÁS ANTIGUO
      // =====================================================
      return a.fechaYHoraDeCreacion - b.fechaYHoraDeCreacion;
    });

    console.log('🏆 Ranking recuperado:', puntuaciones);
    console.log('📊 Total de puntuaciones:', puntuaciones.length);

    // =======================================================
    // DEVOLVER RANKING
    // =======================================================
    return puntuaciones;
  }

  // =========================================================
  // CONVERTIR A NÚMERO SEGURO
  // =========================================================
  private numeroSeguro(valor: unknown): number {
    const numero = Number(valor ?? 0);
    if (!Number.isFinite(numero)) {
      return 0;
    }
    return numero;
  }

  // =========================================================
  // VALIDAR JUEGO
  // =========================================================
  private esJuegoValido(juego: string): juego is TipoJuego {
    return (
      juego === 'unir-palabra' ||
      juego === 'completar-palabra' ||
      juego === 'cuestionario'
    );
  }
}
