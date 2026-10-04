// =========================================================
// IMPORTACIONES
// =========================================================
import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  FirebaseCuestionarioService,
  CuestionarioFirebase,
  PreguntaCuestionario,
  OpcionCuestionario,
} from '../../servicios/firebase-cuestionario.service';

// =========================================================
// COMPONENTE
// =========================================================
@Component({
  selector: 'app-crud-cuestionario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crud-cuestionario.component.html',
  styleUrls: ['./crud-cuestionario.component.css'],
})
export class CrudCuestionarioComponent implements OnInit {
  // =========================================================
  // FORMULARIO PRINCIPAL
  // =========================================================
  cuestionarioForm: FormGroup;

  // =========================================================
  // CUESTIONARIOS GUARDADOS
  // =========================================================
  cuestionarios: CuestionarioFirebase[] = [];

  // =========================================================
  // ESTADOS
  // =========================================================
  loading = true;

  saving = false;

  editingId: string | null = null;

  // =========================================================
  // MENSAJES
  // =========================================================
  message = '';

  messageType: 'success' | 'error' | '' = '';

  // =========================================================
  // BÚSQUEDA
  // =========================================================
  searchTerm = '';

  // =========================================================
  // PAGINACIÓN DE PREGUNTAS GUARDADAS
  // =========================================================
  readonly questionsPerPage = 10;

  /**
   * Guarda independientemente la página
   * en la que está cada cuestionario.
   *
   * Ejemplo:
   *
   * {
   *   "firebaseId1": 1,
   *   "firebaseId2": 3
   * }
   */
  questionPage: Record<string, number> = {};

  // =========================================================
  // IMAGEN AMPLIADA
  // =========================================================
  selectedImage: string | null = null;

  selectedImageQuestion = '';

  // =========================================================
  // CONSTRUCTOR
  // =========================================================
  constructor(
    private fb: FormBuilder,
    private cuestionarioService: FirebaseCuestionarioService,
  ) {
    this.cuestionarioForm = this.fb.group({
      categoria: ['', [Validators.required, Validators.minLength(2)]],
      tiempoMinutos: [10, [Validators.required, Validators.min(1)]],
      preguntas: this.fb.array([]),
    });
  }
  // =========================================================
  // INICIALIZACIÓN
  // =========================================================
  ngOnInit(): void {
    this.loadCuestionarios();
    // Crear inicialmente una pregunta
    this.addPregunta();
  }

  // =========================================================
  // GETTER DEL FORM ARRAY DE PREGUNTAS
  // =========================================================
  get preguntas(): FormArray {
    return this.cuestionarioForm.get('preguntas') as FormArray;
  }

  // =========================================================
  // OBTENER OPCIONES DE UNA PREGUNTA
  // =========================================================
  getOpciones(preguntaIndex: number): FormArray {
    return this.preguntas.at(preguntaIndex).get('opciones') as FormArray;
  }

  // =========================================================
  // CREAR ID LOCAL PARA OPCIONES
  // =========================================================
  private generarIdOpcion(): string {
    return (
      'opcion-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
    );
  }

  // =========================================================
  // CREAR ID LOCAL PARA PREGUNTAS
  // =========================================================
  private generarIdPregunta(): string {
    return (
      'pregunta-' +
      Date.now() +
      '-' +
      Math.random().toString(36).substring(2, 9)
    );
  }

  // =========================================================
  // CREAR UNA OPCIÓN
  // =========================================================
  crearOpcion(texto: string = '', id?: string): FormGroup {
    return this.fb.group({
      id: [id || this.generarIdOpcion()],
      texto: [texto, [Validators.required, Validators.minLength(1)]],
    });
  }
  // =========================================================
  // CREAR UNA PREGUNTA
  // =========================================================
  crearPregunta(pregunta?: PreguntaCuestionario): FormGroup {
    const opciones = this.fb.array<FormGroup>([]);

    // =======================================================
    // SI ESTAMOS EDITANDO UNA PREGUNTA EXISTENTE
    // =======================================================
    if (pregunta?.opciones && pregunta.opciones.length > 0) {
      pregunta.opciones.forEach((opcion) => {
        opciones.push(this.crearOpcion(opcion.texto, opcion.id));
      });
    }
    // =======================================================
    // NUEVA PREGUNTA:
    // CREAR TRES OPCIONES INICIALMENTE
    // =======================================================
    else {
      opciones.push(this.crearOpcion());
      opciones.push(this.crearOpcion());
      opciones.push(this.crearOpcion());
    }

    return this.fb.group({
      id: [pregunta?.id || this.generarIdPregunta()],
      pregunta: [
        pregunta?.pregunta || '',
        [Validators.required, Validators.minLength(2)],
      ],
      image: [pregunta?.image || ''],
      opciones,
      respuestaCorrecta: [
        pregunta?.respuestaCorrecta || '',
        Validators.required,
      ],
    });
  }

  // =========================================================
  // AGREGAR PREGUNTA
  // =========================================================
  addPregunta(): void {
    this.preguntas.push(this.crearPregunta());
  }

  // =========================================================
  // ELIMINAR PREGUNTA DEL FORMULARIO
  // =========================================================
  removePregunta(preguntaIndex: number): void {
    if (this.preguntas.length <= 1) {
      this.showMessage(
        'El cuestionario debe contener al menos una pregunta.',
        'error',
      );
      return;
    }

    const confirmar = window.confirm(
      '¿Deseas eliminar esta pregunta del cuestionario?',
    );

    if (!confirmar) {
      return;
    }

    this.preguntas.removeAt(preguntaIndex);
    this.actualizarRespuestaCorrectaSiEsNecesario();
  }

  // =========================================================
  // AGREGAR OPCIÓN
  // =========================================================
  addOpcion(preguntaIndex: number): void {
    const opciones = this.getOpciones(preguntaIndex);
    opciones.push(this.crearOpcion());
  }

  // =========================================================
  // ELIMINAR OPCIÓN
  // =========================================================
  removeOpcion(preguntaIndex: number, opcionIndex: number): void {
    const opciones = this.getOpciones(preguntaIndex);

    if (opciones.length <= 2) {
      this.showMessage(
        'Cada pregunta debe tener al menos dos opciones.',
        'error',
      );

      return;
    }
    const opcion = opciones.at(opcionIndex);

    const opcionId = opcion.get('id')?.value;

    const pregunta = this.preguntas.at(preguntaIndex);

    const respuestaCorrecta = pregunta.get('respuestaCorrecta')?.value;

    opciones.removeAt(opcionIndex);

    // =======================================================
    // SI ELIMINÓ LA OPCIÓN CORRECTA,
    // LIMPIAR LA RESPUESTA CORRECTA
    // =======================================================
    if (opcionId === respuestaCorrecta) {
      pregunta.get('respuestaCorrecta')?.setValue('');
    }
  }

  // =========================================================
  // MARCAR OPCIÓN COMO CORRECTA
  // =========================================================
  setRespuestaCorrecta(preguntaIndex: number, opcionId: string): void {
    this.preguntas
      .at(preguntaIndex)
      .get('respuestaCorrecta')
      ?.setValue(opcionId);
    this.preguntas.at(preguntaIndex).get('respuestaCorrecta')?.markAsTouched();
  }

  // =========================================================
  // SABER SI UNA OPCIÓN ES LA CORRECTA
  // =========================================================
  isRespuestaCorrecta(preguntaIndex: number, opcionId: string): boolean {
    return (
      this.preguntas.at(preguntaIndex).get('respuestaCorrecta')?.value ===
      opcionId
    );
  }

  // =========================================================
  // ACTUALIZAR RESPUESTAS CORRECTAS
  // =========================================================
  private actualizarRespuestaCorrectaSiEsNecesario(): void {
    this.preguntas.controls.forEach((preguntaControl) => {
      const opciones = preguntaControl.get('opciones') as FormArray;

      const respuestaCorrecta = preguntaControl.get('respuestaCorrecta')?.value;

      if (
        respuestaCorrecta &&
        !opciones.controls.some(
          (opcion) => opcion.get('id')?.value === respuestaCorrecta,
        )
      ) {
        preguntaControl.get('respuestaCorrecta')?.setValue('');
      }
    });
  }
  // =========================================================
  // CARGAR CUESTIONARIOS DESDE FIREBASE
  // =========================================================
  loadCuestionarios(): void {
    this.loading = true;

    this.cuestionarioService.getCuestionarios((cuestionarios) => {
      this.cuestionarios = cuestionarios;

      // =================================================
      // ASEGURAR PÁGINA VÁLIDA EN CADA CUESTIONARIO
      // =================================================
      this.cuestionarios.forEach((cuestionario) => {
        if (!cuestionario.id) {
          return;
        }
        if (!this.questionPage[cuestionario.id]) {
          this.questionPage[cuestionario.id] = 1;
        }
        this.validateQuestionPage(cuestionario);
      });

      this.loading = false;
    });
  }
  // =========================================================
  // GUARDAR CUESTIONARIO
  // =========================================================
  async saveCuestionario(): Promise<void> {
    this.message = '';

    this.messageType = '';

    // =======================================================
    // VALIDAR FORMULARIO
    // =======================================================
    if (this.cuestionarioForm.invalid) {
      this.cuestionarioForm.markAllAsTouched();

      this.showMessage(
        'Por favor completa todos los campos obligatorios y selecciona la respuesta correcta de cada pregunta.',
        'error',
      );

      return;
    }
    // =======================================================
    // VALIDAR QUE HAYA PREGUNTAS
    // =======================================================
    if (this.preguntas.length === 0) {
      this.showMessage('Debes agregar al menos una pregunta.', 'error');

      return;
    }
    // =======================================================
    // VALIDAR OPCIONES
    // =======================================================
    for (let i = 0; i < this.preguntas.length; i++) {
      const pregunta = this.preguntas.at(i);

      const opciones = pregunta.get('opciones') as FormArray;

      if (opciones.length < 2) {
        this.showMessage(
          `La pregunta ${i + 1} debe tener al menos dos opciones.`,
          'error',
        );
        return;
      }

      const respuestaCorrecta = pregunta.get('respuestaCorrecta')?.value;

      if (!respuestaCorrecta) {
        this.showMessage(
          `Selecciona la respuesta correcta de la pregunta ${i + 1}.`,
          'error',
        );

        return;
      }
    }
    // =======================================================
    // CREAR OBJETO PARA FIREBASE
    // =======================================================
    const formValue = this.cuestionarioForm.getRawValue();

    const preguntasFirebase: PreguntaCuestionario[] = formValue.preguntas.map(
      (pregunta: any) => ({
        id: pregunta.id,
        pregunta: pregunta.pregunta.trim(),
        image: pregunta.image?.trim() || '',
        opciones: pregunta.opciones.map((opcion: any) => ({
          id: opcion.id,
          texto: opcion.texto.trim(),
        })),
        respuestaCorrecta: pregunta.respuestaCorrecta,
      }),
    );

    const cuestionario: Omit<CuestionarioFirebase, 'id'> = {
      categoria: formValue.categoria.trim(),
      tiempoMinutos: Number(formValue.tiempoMinutos),
      preguntas: preguntasFirebase,
      fechaYHoraDeCreacion: Date.now(),
    };

    // =======================================================
    // GUARDAR
    // =======================================================
    try {
      this.saving = true;

      // =====================================================
      // EDITAR
      // =====================================================
      if (this.editingId) {
        await this.cuestionarioService.updateCuestionario(
          this.editingId,
          cuestionario,
        );

        this.showMessage('Cuestionario actualizado correctamente.', 'success');
      }
      // =====================================================
      // NUEVO
      // =====================================================
      else {
        await this.cuestionarioService.addCuestionario(cuestionario);

        this.showMessage('Cuestionario guardado correctamente.', 'success');
      }
      // =====================================================
      // LIMPIAR FORMULARIO
      // =====================================================
      this.resetForm();
    } catch (error) {
      console.error('Error guardando cuestionario:', error);

      this.showMessage('No fue posible guardar el cuestionario.', 'error');
    } finally {
      this.saving = false;
    }
  }
  // =========================================================
  // EDITAR CUESTIONARIO
  // =========================================================
  editCuestionario(cuestionario: CuestionarioFirebase): void {
    if (!cuestionario.id) {
      return;
    }
    this.editingId = cuestionario.id;

    // =======================================================
    // LIMPIAR PREGUNTAS ACTUALES
    // =======================================================
    this.preguntas.clear();

    // =======================================================
    // CARGAR DATOS GENERALES
    // =======================================================
    this.cuestionarioForm.patchValue({
      categoria: cuestionario.categoria,
      tiempoMinutos: cuestionario.tiempoMinutos,
    });

    // =======================================================
    // CARGAR PREGUNTAS
    // =======================================================
    if (cuestionario.preguntas && cuestionario.preguntas.length > 0) {
      cuestionario.preguntas.forEach((pregunta) => {
        this.preguntas.push(this.crearPregunta(pregunta));
      });
    } else {
      this.addPregunta();
    }
    this.cuestionarioForm.markAsPristine();

    this.cuestionarioForm.markAsUntouched();

    this.message = '';

    this.messageType = '';

    // =======================================================
    // SUBIR AL FORMULARIO
    // =======================================================
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
  // =========================================================
  // CANCELAR EDICIÓN
  // =========================================================
  cancelEdit(): void {
    this.resetForm();
  }
  // =========================================================
  // ELIMINAR CUESTIONARIO
  // =========================================================
  async deleteCuestionario(cuestionario: CuestionarioFirebase): Promise<void> {
    if (!cuestionario.id) {
      return;
    }
    const confirmar = window.confirm(
      `¿Deseas eliminar el cuestionario de la categoría "${cuestionario.categoria}"?`,
    );

    if (!confirmar) {
      return;
    }
    try {
      await this.cuestionarioService.deleteCuestionario(cuestionario.id);

      // =====================================================
      // ELIMINAR ESTADO DE PAGINACIÓN
      // =====================================================
      delete this.questionPage[cuestionario.id];

      if (this.editingId === cuestionario.id) {
        this.resetForm();
      }
      this.showMessage('Cuestionario eliminado correctamente.', 'success');
    } catch (error) {
      console.error('Error eliminando cuestionario:', error);

      this.showMessage('No fue posible eliminar el cuestionario.', 'error');
    }
  }
  // =========================================================
  // REINICIAR FORMULARIO
  // =========================================================
  resetForm(): void {
    this.editingId = null;

    this.cuestionarioForm.reset({
      categoria: '',
      tiempoMinutos: 10,
    });

    this.preguntas.clear();

    this.addPregunta();

    this.cuestionarioForm.markAsPristine();

    this.cuestionarioForm.markAsUntouched();
  }
  // =========================================================
  // MOSTRAR MENSAJE
  // =========================================================
  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;

    this.messageType = type;
  }
  // =========================================================
  // CAMBIO DE BÚSQUEDA
  // =========================================================
  onSearchChange(value: string): void {
    this.searchTerm = value;

    // =======================================================
    // AL BUSCAR, VOLVER TODOS LOS CUESTIONARIOS
    // A SU PRIMERA PÁGINA
    // =======================================================
    Object.keys(this.questionPage).forEach((id) => {
      this.questionPage[id] = 1;
    });
  }
  // =========================================================
  // CUESTIONARIOS FILTRADOS
  // =========================================================
  get filteredCuestionarios(): CuestionarioFirebase[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.cuestionarios;
    }
    return this.cuestionarios.filter((cuestionario) => {
      // ===================================================
      // BUSCAR EN CATEGORÍA
      // ===================================================
      const categoriaCoincide = cuestionario.categoria
        ?.toLowerCase()
        .includes(term);

      // ===================================================
      // BUSCAR EN TODAS LAS PREGUNTAS
      // ===================================================
      const preguntaCoincide = cuestionario.preguntas?.some((pregunta) => {
        const textoPregunta = pregunta.pregunta?.toLowerCase().includes(term);

        // ===========================================
        // BUSCAR EN OPCIONES
        // ===========================================
        const opcionCoincide = pregunta.opciones?.some((opcion) =>
          opcion.texto?.toLowerCase().includes(term),
        );

        return textoPregunta || opcionCoincide;
      });

      return categoriaCoincide || preguntaCoincide;
    });
  }
  // =========================================================
  // TOTAL DE PREGUNTAS DE TODOS LOS CUESTIONARIOS
  // =========================================================
  get totalPreguntas(): number {
    return this.cuestionarios.reduce((total, cuestionario) => {
      return total + (cuestionario.preguntas?.length || 0);
    }, 0);
  }

  // =========================================================
  // PAGINACIÓN:
  // OBTENER PÁGINA ACTUAL DE UN CUESTIONARIO
  // =========================================================
  getQuestionPage(cuestionarioId: string | undefined): number {
    if (!cuestionarioId) {
      return 1;
    }
    return this.questionPage[cuestionarioId] || 1;
  }
  // =========================================================
  // PAGINACIÓN:
  // TOTAL DE PÁGINAS DE UN CUESTIONARIO
  // =========================================================
  getTotalQuestionPages(cuestionario: CuestionarioFirebase): number {
    const cantidad = cuestionario.preguntas?.length || 0;

    if (cantidad === 0) {
      return 1;
    }
    return Math.ceil(cantidad / this.questionsPerPage);
  }
  // =========================================================
  // PAGINACIÓN:
  // PREGUNTAS QUE SE DEBEN MOSTRAR
  // =========================================================
  getPaginatedQuestions(
    cuestionario: CuestionarioFirebase,
  ): PreguntaCuestionario[] {
    if (!cuestionario.preguntas) {
      return [];
    }
    const page = this.getQuestionPage(cuestionario.id);

    const start = (page - 1) * this.questionsPerPage;

    const end = start + this.questionsPerPage;

    // =======================================================
    // MUY IMPORTANTE:
    // SOLO DEVOLVEMOS LAS 10 PREGUNTAS DE ESTA PÁGINA
    // =======================================================
    return cuestionario.preguntas.slice(start, end);
  }
  // =========================================================
  // PAGINACIÓN:
  // CAMBIAR A UNA PÁGINA
  // =========================================================
  goToQuestionPage(cuestionario: CuestionarioFirebase, page: number): void {
    if (!cuestionario.id) {
      return;
    }
    const totalPages = this.getTotalQuestionPages(cuestionario);

    if (page < 1 || page > totalPages) {
      return;
    }
    this.questionPage[cuestionario.id] = page;
  }
  // =========================================================
  // PAGINACIÓN:
  // PÁGINA ANTERIOR
  // =========================================================
  previousQuestionPage(cuestionario: CuestionarioFirebase): void {
    const currentPage = this.getQuestionPage(cuestionario.id);

    if (currentPage <= 1) {
      return;
    }
    this.goToQuestionPage(cuestionario, currentPage - 1);
  }
  // =========================================================
  // PAGINACIÓN:
  // PÁGINA SIGUIENTE
  // =========================================================
  nextQuestionPage(cuestionario: CuestionarioFirebase): void {
    const currentPage = this.getQuestionPage(cuestionario.id);

    const totalPages = this.getTotalQuestionPages(cuestionario);

    if (currentPage >= totalPages) {
      return;
    }
    this.goToQuestionPage(cuestionario, currentPage + 1);
  }
  // =========================================================
  // PAGINACIÓN:
  // SABER SI ES LA PRIMERA PÁGINA
  // =========================================================
  isFirstQuestionPage(cuestionario: CuestionarioFirebase): boolean {
    return this.getQuestionPage(cuestionario.id) === 1;
  }
  // =========================================================
  // PAGINACIÓN:
  // SABER SI ES LA ÚLTIMA PÁGINA
  // =========================================================
  isLastQuestionPage(cuestionario: CuestionarioFirebase): boolean {
    return (
      this.getQuestionPage(cuestionario.id) >=
      this.getTotalQuestionPages(cuestionario)
    );
  }
  // =========================================================
  // PAGINACIÓN:
  // CREAR NÚMEROS DE PÁGINA
  // =========================================================
  getQuestionPageNumbers(cuestionario: CuestionarioFirebase): number[] {
    const totalPages = this.getTotalQuestionPages(cuestionario);
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  // =========================================================
  // PAGINACIÓN:
  // NÚMERO REAL DE LA PREGUNTA
  // =========================================================
  getRealQuestionNumber(
    cuestionario: CuestionarioFirebase,
    index: number,
  ): number {
    const page = this.getQuestionPage(cuestionario.id);

    return (page - 1) * this.questionsPerPage + index + 1;
  }
  // =========================================================
  // PAGINACIÓN:
  // PRIMERA PREGUNTA VISIBLE
  // =========================================================
  getFirstVisibleQuestionNumber(cuestionario: CuestionarioFirebase): number {
    const total = cuestionario.preguntas?.length || 0;

    if (total === 0) {
      return 0;
    }
    const page = this.getQuestionPage(cuestionario.id);

    return (page - 1) * this.questionsPerPage + 1;
  }
  // =========================================================
  // PAGINACIÓN:
  // ÚLTIMA PREGUNTA VISIBLE
  // =========================================================
  getLastVisibleQuestionNumber(cuestionario: CuestionarioFirebase): number {
    const total = cuestionario.preguntas?.length || 0;

    if (total === 0) {
      return 0;
    }

    const page = this.getQuestionPage(cuestionario.id);

    return Math.min(page * this.questionsPerPage, total);
  }
  // =========================================================
  // PAGINACIÓN:
  // VALIDAR QUE LA PÁGINA ACTUAL SIGA EXISTIENDO
  // =========================================================
  private validateQuestionPage(cuestionario: CuestionarioFirebase): void {
    if (!cuestionario.id) {
      return;
    }

    const totalPages = this.getTotalQuestionPages(cuestionario);

    const currentPage = this.getQuestionPage(cuestionario.id);

    if (currentPage > totalPages) {
      this.questionPage[cuestionario.id] = totalPages;
    }

    if (currentPage < 1) {
      this.questionPage[cuestionario.id] = 1;
    }
  }

  // =========================================================
  // PAGINACIÓN:
  // TEXTO INFORMATIVO
  //
  // EJEMPLO:
  // "Mostrando preguntas 11 - 20 de 34"
  // =========================================================
  getQuestionPaginationText(cuestionario: CuestionarioFirebase): string {
    const total = cuestionario.preguntas?.length || 0;

    if (total === 0) {
      return 'No hay preguntas';
    }
    return (
      'Mostrando preguntas ' +
      this.getFirstVisibleQuestionNumber(cuestionario) +
      ' - ' +
      this.getLastVisibleQuestionNumber(cuestionario) +
      ' de ' +
      total
    );
  }
  // =========================================================
  // OBTENER LETRA DE LA OPCIÓN
  //
  // 0 = A
  // 1 = B
  // 2 = C
  // 3 = D
  // =========================================================
  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // =========================================================
  // OBTENER TEXTO DE LA RESPUESTA CORRECTA
  // =========================================================
  getCorrectAnswerText(pregunta: PreguntaCuestionario): string {
    const opcion = pregunta.opciones?.find(
      (item) => item.id === pregunta.respuestaCorrecta,
    );

    return opcion?.texto || '';
  }

  // =========================================================
  // OBTENER LETRA DE LA RESPUESTA CORRECTA
  // =========================================================
  getCorrectAnswerLetter(pregunta: PreguntaCuestionario): string {
    const index = pregunta.opciones?.findIndex(
      (item) => item.id === pregunta.respuestaCorrecta,
    );

    if (index === undefined || index < 0) {
      return '';
    }
    return this.getOptionLetter(index);
  }

  // =========================================================
  // ABRIR IMAGEN
  // =========================================================
  openImage(image: string | undefined, pregunta: string): void {
    if (!image) {
      return;
    }
    this.selectedImage = image;
    this.selectedImageQuestion = pregunta;
  }

  // =========================================================
  // CERRAR IMAGEN
  // =========================================================
  closeImage(): void {
    this.selectedImage = null;
    this.selectedImageQuestion = '';
  }

  // =========================================================
  // IMPRIMIR CUESTIONARIO
  // =========================================================
  printQuestionnaire(cuestionario?: CuestionarioFirebase): void {
    // Si se recibe un cuestionario guardado, imprime ESE cuestionario.
    // Si no se recibe, imprime lo que actualmente está en el formulario.
    const source: any = cuestionario ?? this.cuestionarioForm.getRawValue();

    const categoria = String(source?.categoria ?? '').trim() || 'Cuestionario';

    const tiempo = Number(source?.tiempoMinutos ?? 0);

    const preguntas: PreguntaCuestionario[] = Array.isArray(source?.preguntas)
      ? source.preguntas
      : [];

    if (preguntas.length === 0) {
      this.showMessage('No hay preguntas para imprimir.', 'error');

      return;
    }

    const escapeHtml = (value: unknown): string => {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const contenidoPreguntas = preguntas
      .map((pregunta: PreguntaCuestionario, preguntaIndex: number) => {
        const textoPregunta = String(pregunta?.pregunta ?? '').trim();

        const respuestaCorrecta = String(
          pregunta?.respuestaCorrecta ?? '',
        ).trim();

        const imagen = String(pregunta?.image ?? '').trim()
          ? `
            <div class="question-image">
              <img
                src="${escapeHtml(String(pregunta.image).trim())}"
                alt="Imagen de la pregunta ${preguntaIndex + 1}"
              >
            </div>
          `
          : '';

        const opciones = Array.isArray(pregunta?.opciones)
          ? pregunta.opciones
              .map((opcion: OpcionCuestionario, opcionIndex: number) => {
                const letra = this.getOptionLetter(opcionIndex);

                const textoOpcion = String(opcion?.texto ?? '').trim();

                const esCorrecta = opcion?.id === respuestaCorrecta;

                return `
                  <div class="option ${esCorrecta ? 'correct-option' : ''}">
                    <span class="option-letter">${letra}.</span>
                    <span class="option-text">
                      ${escapeHtml(textoOpcion)}
                    </span>
                    ${
                      esCorrecta
                        ? '<span class="correct-badge">✓ Correcta</span>'
                        : ''
                    }
                  </div>
                `;
              })
              .join('')
          : '';

        const indiceCorrecto = pregunta.opciones?.findIndex(
          (opcion) => opcion.id === respuestaCorrecta,
        );

        const letraCorrecta =
          indiceCorrecto !== undefined && indiceCorrecto >= 0
            ? this.getOptionLetter(indiceCorrecto)
            : '';

        const textoCorrecto =
          pregunta.opciones?.find((opcion) => opcion.id === respuestaCorrecta)
            ?.texto ?? '';

        const resumenRespuesta =
          letraCorrecta && textoCorrecto
            ? `
              <div class="correct-answer-summary">
                <strong>Respuesta correcta:</strong>
                <span>
                  ${escapeHtml(letraCorrecta)}.
                  ${escapeHtml(textoCorrecto)}
                </span>
              </div>
            `
            : '';

        return `
          <section class="question">
            <div class="question-heading">
              <div class="question-number">
                ${preguntaIndex + 1}
              </div>
              <div class="question-body">
                <div class="question-text">
                  ${escapeHtml(textoPregunta)}
                </div>
                ${imagen}
                <div class="options">
                  ${opciones}
                </div>
                ${resumenRespuesta}
              </div>
            </div>
          </section>
        `;
      })
      .join('');

    const printWindow = window.open('', '_blank', 'width=1200,height=900');

    if (!printWindow) {
      this.showMessage(
        'El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo nuevamente.',
        'error',
      );

      return;
    }
    const documentHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >
        <title>${escapeHtml(categoria)}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm;
          }
          * {
            box-sizing: border-box;
          }
          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #102231;
            font-size: 13px;
            line-height: 1.5;
          }
          .print-page {
            width: 100%;
          }
          .header {
            margin-bottom: 22px;
            padding-bottom: 12px;
            border-bottom: 2px solid #d8e0e5;
          }
          .header h1 {
            margin: 0 0 4px;
            font-size: 22px;
          }
          .header p {
            margin: 2px 0;
          }
          .student-information {
            display: grid;
            grid-template-columns: 1fr 160px;
            gap: 10px 18px;
            margin-bottom: 24px;
          }
          .student-field {
            display: flex;
            gap: 8px;
            align-items: flex-end;
          }
          .student-field:first-child {
            grid-column: 1 / -1;
          }
          .student-label {
            font-weight: 700;
          }
          .student-line {
            flex: 1;
            min-width: 120px;
            height: 18px;
            border-bottom: 1px solid #263746;
          }
          .question {
            margin-bottom: 24px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .question-heading {
            display: flex;
            gap: 18px;
            align-items: flex-start;
          }
          .question-number {
            width: 38px;
            height: 38px;
            min-width: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #557585;
            color: #ffffff;
            font-size: 18px;
            font-weight: 700;
          }
          .question-body {
            flex: 1;
            min-width: 0;
          }
          .question-text {
            margin: 0 0 14px;
            font-size: 14px;
            font-weight: 700;
            white-space: pre-wrap;
          }
          .question-image {
            margin: 10px 0 18px;
          }
          .question-image img {
            display: block;
            max-width: 350px;
            max-height: 240px;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 8px;
          }
          .options {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .option {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #dfe5e8;
            border-radius: 8px;
            background: #f7f8f9;
          }
          .option-letter {
            min-width: 28px;
            font-weight: 700;
          }
          .option-text {
            flex: 1;
            white-space: pre-wrap;
          }
          .correct-option {
            border-color: #86c98d;
            background: #e9f6ea;
            color: #075d18;
          }
          .correct-badge {
            margin-left: auto;
            padding: 3px 10px;
            border-radius: 999px;
            background: #c8e9c9;
            color: #075d18;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
          }
          .correct-answer-summary {
            display: inline-flex;
            gap: 7px;
            margin-top: 12px;
            padding: 8px 12px;
            border-radius: 8px;
            background: #eff7e8;
            color: #075d18;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .question {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <main class="print-page">
          <header class="header">
            <h1>${escapeHtml(categoria)}</h1>
            <p>
              <strong>Cuestionario</strong>
            </p>
            <p>
              Tiempo: ${escapeHtml(tiempo)} minutos
              &nbsp;
              &nbsp;
              Preguntas: ${preguntas.length}
            </p>
          </header>
          <section class="student-information">
            <div class="student-field">
              <span class="student-label">Nombre:</span>
              <span class="student-line"></span>
            </div>
            <div class="student-field">
              <span class="student-label">Grado:</span>
              <span class="student-line"></span>
            </div>
            <div class="student-field">
              <span class="student-label">Fecha:</span>
              <span class="student-line"></span>
            </div>
          </section>
          ${contenidoPreguntas}
        </main>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(documentHtml);
    printWindow.document.close();

    const imprimir = (): void => {
      printWindow.focus();
      printWindow.print();
    };

    const esperarImagenesEImprimir = (): void => {
      const images = Array.from(
        printWindow.document.images,
      ) as HTMLImageElement[];

      if (images.length === 0) {
        setTimeout(imprimir, 200);
        return;
      }

      let pendientes = images.filter((image) => !image.complete).length;

      if (pendientes === 0) {
        setTimeout(imprimir, 300);

        return;
      }

      let impreso = false;

      const finalizarImagen = (): void => {
        pendientes -= 1;

        if (pendientes <= 0 && !impreso) {
          impreso = true;
          setTimeout(imprimir, 300);
        }
      };

      images.forEach((image) => {
        if (!image.complete) {
          image.addEventListener('load', finalizarImagen, { once: true });
          image.addEventListener('error', finalizarImagen, { once: true });
        }
      });

      // Respaldo para no dejar la ventana esperando indefinidamente
      setTimeout(() => {
        if (!impreso) {
          impreso = true;
          imprimir();
        }
      }, 8000);
    };

    if (printWindow.document.readyState === 'complete') {
      esperarImagenesEImprimir();
    } else {
      printWindow.addEventListener('load', esperarImagenesEImprimir, {
        once: true,
      });
    }
  }

  // =========================================================
  // TOTAL DE CUESTIONARIOS
  // =========================================================
  get totalCuestionarios(): number {
    return this.cuestionarios.length;
  }

  // =========================================================
  // SABER SI ESTAMOS EDITANDO
  // =========================================================
  get isEditing(): boolean {
    return this.editingId !== null;
  }

  // =========================================================
  // VALIDACIÓN DE CAMPO
  // =========================================================
  isFieldInvalid(fieldName: string): boolean {
    const control = this.cuestionarioForm.get(fieldName);

    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  // =========================================================
  // VALIDACIÓN DE CAMPO DE PREGUNTA
  // =========================================================
  isPreguntaFieldInvalid(preguntaIndex: number, fieldName: string): boolean {
    const control = this.preguntas.at(preguntaIndex).get(fieldName);

    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  // =========================================================
  // VALIDACIÓN DE OPCIÓN
  // =========================================================
  isOpcionInvalid(preguntaIndex: number, opcionIndex: number): boolean {
    const control = this.getOpciones(preguntaIndex)
      .at(opcionIndex)
      .get('texto');

    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  // =========================================================
  // TRACK BY CUESTIONARIO
  // =========================================================
  trackByCuestionario(
    index: number,
    cuestionario: CuestionarioFirebase,
  ): string {
    return cuestionario.id || index.toString();
  }

  // =========================================================
  // TRACK BY PREGUNTA
  // =========================================================
  trackByPregunta(index: number, pregunta: PreguntaCuestionario): string {
    return pregunta.id || index.toString();
  }

  // =========================================================
  // TRACK BY OPCIÓN
  // =========================================================
  trackByOpcion(index: number, opcion: OpcionCuestionario): string {
    return opcion.id || index.toString();
  }
}
