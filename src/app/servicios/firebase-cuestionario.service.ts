import { Injectable } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
} from '@angular/fire/database';

// =========================================================
// INTERFAZ DE OPCIÓN
// =========================================================
export interface OpcionCuestionario {
  id: string;
  texto: string;
}

// =========================================================
// INTERFAZ DE PREGUNTA
// =========================================================
export interface PreguntaCuestionario {
  id?: string;
  pregunta: string;
  image?: string;
  opciones: OpcionCuestionario[];
  respuestaCorrecta: string;
}

// =========================================================
// INTERFAZ PRINCIPAL DEL CUESTIONARIO
// =========================================================
export interface CuestionarioFirebase {
  id?: string;
  categoria: string;
  tiempoMinutos: number;
  preguntas: PreguntaCuestionario[];
  fechaYHoraDeCreacion?: number;
}

// =========================================================
// SERVICIO
// =========================================================
@Injectable({
  providedIn: 'root',
})
export class FirebaseCuestionarioService {
  // =======================================================
  // CONSTRUCTOR
  // =======================================================
  constructor(private database: Database) {}

  // =======================================================
  // OBTENER TODOS LOS CUESTIONARIOS
  // =======================================================
  getCuestionarios(
    callback: (cuestionarios: CuestionarioFirebase[]) => void,
  ): void {
    const cuestionariosRef = ref(this.database, 'cuestionarios');

    onValue(cuestionariosRef, (snapshot) => {
      const data = snapshot.val();

      // =================================================
      // SI NO EXISTEN CUESTIONARIOS
      // =================================================
      if (!data) {
        callback([]);
        return;
      }

      // =================================================
      // CONVERTIR FIREBASE EN ARRAY
      // =================================================
      const cuestionarios: CuestionarioFirebase[] = Object.keys(data)
        .map((key) => ({id: key, ...data[key], }))

        // =============================================
        // ORDENAR DEL MÁS NUEVO AL MÁS ANTIGUO
        // =============================================

        .sort(
          (a, b) =>
            (b.fechaYHoraDeCreacion ?? 0) - (a.fechaYHoraDeCreacion ?? 0),
        );

      callback(cuestionarios);
    });
  }

  // =======================================================
  // AGREGAR NUEVO CUESTIONARIO
  // =======================================================
  async addCuestionario(
    cuestionario: Omit<CuestionarioFirebase, 'id'>,
  ): Promise<void> {
    // =====================================================
    // REFERENCIA A CUESTIONARIOS
    // =====================================================
    const cuestionariosRef = ref(this.database, 'cuestionarios');

    // =====================================================
    // CREAR NUEVO ID AUTOMÁTICO
    // =====================================================
    const newRef = push(cuestionariosRef);

    // =====================================================
    // PREPARAR CUESTIONARIO
    // =====================================================
    const nuevoCuestionario: CuestionarioFirebase = {
      id: newRef.key ?? undefined,
      categoria: cuestionario.categoria.trim(),
      tiempoMinutos: cuestionario.tiempoMinutos,
      preguntas: cuestionario.preguntas.map((pregunta, index) => ({
        // =========================================
        // ID INTERNO DE LA PREGUNTA
        // =========================================
        id: pregunta.id || `pregunta-${index + 1}`,
        // =========================================
        // TEXTO DE LA PREGUNTA
        // =========================================
        pregunta: pregunta.pregunta.trim(),
        // =========================================
        // IMAGEN OPCIONAL
        // =========================================
        image: pregunta.image?.trim() || '',
        // =========================================
        // OPCIONES
        // =========================================
        opciones: pregunta.opciones.map((opcion) => ({
          id: opcion.id,
          texto: opcion.texto.trim(),
        })),
        // =========================================
        // RESPUESTA CORRECTA
        // =========================================
        respuestaCorrecta: pregunta.respuestaCorrecta,
      })),
      // =================================================
      // FECHA DE CREACIÓN
      // =================================================
      fechaYHoraDeCreacion: Date.now(),
    };

    // =====================================================
    // GUARDAR EN FIREBASE
    // =====================================================
    await set(newRef, nuevoCuestionario);
  }

  // =======================================================
  // ACTUALIZAR CUESTIONARIO
  // =======================================================
  async updateCuestionario(
    id: string,
    cuestionario: Partial<CuestionarioFirebase>,
  ): Promise<void> {
    if (!id) {
      throw new Error('El ID del cuestionario es obligatorio.');
    }

    // =====================================================
    // REFERENCIA DEL CUESTIONARIO
    // =====================================================
    const cuestionarioRef = ref(this.database, `cuestionarios/${id}`);

    // =====================================================
    // DATOS QUE SE ACTUALIZARÁN
    // =====================================================
    const datosActualizados: Partial<CuestionarioFirebase> = {};

    // =====================================================
    // CATEGORÍA
    // =====================================================
    if (cuestionario.categoria !== undefined) {
      datosActualizados.categoria = cuestionario.categoria.trim();
    }

    // =====================================================
    // TIEMPO
    // =====================================================
    if (cuestionario.tiempoMinutos !== undefined) {
      datosActualizados.tiempoMinutos = cuestionario.tiempoMinutos;
    }

    // =====================================================
    // PREGUNTAS
    // =====================================================
    if (cuestionario.preguntas !== undefined) {
      datosActualizados.preguntas = cuestionario.preguntas.map(
        (pregunta, index) => ({
          id: pregunta.id || `pregunta-${index + 1}`,
          pregunta: pregunta.pregunta.trim(),
          image: pregunta.image?.trim() || '',
          opciones: pregunta.opciones.map((opcion) => ({
            id: opcion.id,
            texto: opcion.texto.trim(),
          })),
          respuestaCorrecta: pregunta.respuestaCorrecta,
        }),
      );
    }
    // =====================================================
    // ACTUALIZAR FIREBASE
    // =====================================================
    await update(cuestionarioRef, datosActualizados);
  }

  // =======================================================
  // ELIMINAR CUESTIONARIO
  // =======================================================
  async deleteCuestionario(id: string): Promise<void> {
    if (!id) {
      throw new Error('El ID del cuestionario es obligatorio.');
    }

    // =====================================================
    // REFERENCIA DEL CUESTIONARIO
    // =====================================================
    const cuestionarioRef = ref(this.database, `cuestionarios/${id}`);

    // =====================================================
    // ELIMINAR DE FIREBASE
    // =====================================================
    await remove(cuestionarioRef);
  }

  // =======================================================
  // ELIMINAR UNA PREGUNTA DE UN CUESTIONARIO
  // =======================================================
  async deletePregunta(
    cuestionarioId: string,
    preguntaId: string,
  ): Promise<void> {
    if (!cuestionarioId || !preguntaId) {
      throw new Error('El cuestionario y la pregunta son obligatorios.');
    }

    // =====================================================
    // BUSCAR LOS CUESTIONARIOS
    // =====================================================
    return new Promise((resolve, reject) => {
      const cuestionarioRef = ref(
        this.database,
        `cuestionarios/${cuestionarioId}`,
      );

      // =================================================
      // ESCUCHAR EL CUESTIONARIO
      // =================================================
      const unsubscribe = onValue(
        cuestionarioRef,
        async (snapshot) => {
          try {
            const data = snapshot.val();
            if (!data) {
              unsubscribe();
              reject(new Error('El cuestionario no existe.'));
              return;
            }
            // =========================================
            // OBTENER PREGUNTAS
            // =========================================
            const preguntas: PreguntaCuestionario[] = data.preguntas || [];
            // =========================================
            // QUITAR LA PREGUNTA
            // =========================================
            const nuevasPreguntas = preguntas.filter(
              (pregunta) => pregunta.id !== preguntaId,
            );
            // =========================================
            // ACTUALIZAR FIREBASE
            // =========================================
            await update(cuestionarioRef, {
              preguntas: nuevasPreguntas,
            });
            unsubscribe();
            resolve();
          } catch (error) {
            unsubscribe();
            reject(error);
          }
        },
        {
          onlyOnce: true,
        },
      );
    });
  }

  // =======================================================
  // OBTENER CATEGORÍAS DISPONIBLES
  // =======================================================
  getCategorias(callback: (categorias: string[]) => void): void {
    this.getCuestionarios((cuestionarios) => {
      const categorias = Array.from(
        new Set(
          cuestionarios
            .map((cuestionario) => cuestionario.categoria?.trim())
            .filter((categoria): categoria is string => !!categoria),
        ),
      )
        // =============================================
        // ORDEN ALFABÉTICO
        // =============================================
        .sort((a, b) => a.localeCompare(b));
      callback(categorias);
    });
  }
}
