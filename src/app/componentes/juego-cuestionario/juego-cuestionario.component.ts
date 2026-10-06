import { Router } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  FirebaseCuestionarioService,
  CuestionarioFirebase,
  PreguntaCuestionario,
  OpcionCuestionario,
} from '../../servicios/firebase-cuestionario.service';

interface ResultadoPregunta {
  pregunta: PreguntaCuestionario;
  respuestaEstudiante: string;
  respuestaCorrecta: string;
  correcta: boolean;
}

@Component({
  selector: 'app-juego-cuestionario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './juego-cuestionario.component.html',
  styleUrls: ['./juego-cuestionario.component.css'],
})
export class JuegoCuestionarioComponent implements OnInit, OnDestroy {
  [x: string]: any;
  cuestionarios: CuestionarioFirebase[] = [];

  categorias: string[] = [];
  selectedCategory = '';
  cuestionariosCategoria: CuestionarioFirebase[] = [];
  selectedQuestionnaireId = '';

  selectedQuestionCount = 12;
  questionOrder: 'random' | 'ordered' | 'ascending' | 'descending' = 'random';

  cuestionarioActual: CuestionarioFirebase | null = null;

  preguntas: PreguntaCuestionario[] = [];
  currentQuestionIndex = 0;

  respuestas: Record<string, string> = {};

  resultados: ResultadoPregunta[] = [];

  loading = true;
  loadError = '';
  selectionMessage = '';

  gameStarted = false;
  gameFinished = false;
  timeExpired = false;

  totalTimeSeconds = 0;
  remainingTimeSeconds = 0;

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  selectedImage: string | null = null;
  selectedImageQuestion = '';

  showResultsDetail = false;
  resultsView: 'all' | 'correct' | 'incorrect' = 'all';

  practicingErrors = false;
  errorPracticeQuestions: PreguntaCuestionario[] = [];
  errorPracticeIndex = 0;
  errorPracticeAnswer = '';
  errorPracticeCorrect = false;
  errorPracticeMessage = '';
  correctedErrors = 0;

  private errorPracticeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private cuestionarioService: FirebaseCuestionarioService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadCuestionarios();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.clearErrorPracticeTimeout();
  }

  loadCuestionarios(): void {
    this.loading = true;
    this.loadError = '';

    this.cuestionarioService.getCuestionarios((cuestionarios) => {
      this.cuestionarios = cuestionarios.filter(
        (cuestionario) =>
          cuestionario.preguntas && cuestionario.preguntas.length > 0,
      );

      this.categorias = Array.from(
        new Set(
          this.cuestionarios
            .map((cuestionario) => cuestionario.categoria?.trim())
            .filter((categoria): categoria is string => !!categoria),
        ),
      ).sort((a, b) => a.localeCompare(b));

      if (this.cuestionarios.length === 0) {
        this.loadError = 'No hay cuestionarios disponibles para jugar.';
      }

      this.loading = false;
    });
  }

  onCategoryChange(): void {
    this.selectionMessage = '';
    this.loadError = '';
    this.selectedQuestionnaireId = '';
    this.cuestionarioActual = null;
    this.selectedQuestionCount = 12;

    this.cuestionariosCategoria = this.cuestionarios.filter(
      (cuestionario) =>
        cuestionario.categoria?.trim().toLowerCase() ===
        this.selectedCategory.trim().toLowerCase(),
    );

    if (this.cuestionariosCategoria.length === 1) {
      this.selectedQuestionnaireId = this.cuestionariosCategoria[0].id || '';

      this.onQuestionnaireChange();
    }
  }

  onQuestionnaireChange(): void {
    this.selectionMessage = '';

    const cuestionario = this.cuestionarios.find(
      (item) => item.id === this.selectedQuestionnaireId,
    );

    if (!cuestionario) {
      this.cuestionarioActual = null;
      this.selectedQuestionCount = 12;
      return;
    }

    this.cuestionarioActual = cuestionario;

    const totalPreguntas = cuestionario.preguntas?.length ?? 0;

    this.selectedQuestionCount = Math.min(12, totalPreguntas);
  }

  // =========================================================
  // MOSTRAR EL CUESTIONARIO SELECCIONADO EN REPASO
  // =========================================================
  getCurrentQuestionnaireLabel(): string {
    if (!this.cuestionarioActual) {
      return '';
    }

    return this.getQuestionnaireLabel(this.cuestionarioActual);
  }

  imprimirPreguntas(): void {
    if (!this.selectedQuestionnaireId) {
      this.selectionMessage =
        'Por favor seleccione un cuestionario para imprimir.';
      return;
    }

    const cuestionario = this.cuestionarios.find(
      (item) => item.id === this.selectedQuestionnaireId,
    );

    if (
      !cuestionario ||
      !cuestionario.preguntas ||
      cuestionario.preguntas.length === 0
    ) {
      this.selectionMessage = 'No hay preguntas disponibles para imprimir.';
      return;
    }

    this.validateQuestionCount();

    let preguntasImprimir = cuestionario.preguntas.map((pregunta) => ({
      ...pregunta,
      opciones: pregunta.opciones
        ? pregunta.opciones.map((opcion) => ({ ...opcion }))
        : [],
    }));

    // =====================================================
    // ORDEN DE LAS PREGUNTAS PARA IMPRIMIR
    // =====================================================
    switch (this.questionOrder) {
      case 'random':
        preguntasImprimir = this.shuffleArray(preguntasImprimir);
        break;

      case 'ordered':
        // Conserva el orden original.
        break;

      case 'ascending':
        preguntasImprimir.sort((a, b) =>
          (a.pregunta || '').localeCompare(b.pregunta || '', 'es', {
            sensitivity: 'base',
            numeric: true,
          }),
        );
        break;

      case 'descending':
        preguntasImprimir.sort((a, b) =>
          (b.pregunta || '').localeCompare(a.pregunta || '', 'es', {
            sensitivity: 'base',
            numeric: true,
          }),
        );
        break;
    }

    // =====================================================
    // CANTIDAD DE PREGUNTAS A IMPRIMIR
    // =====================================================
    preguntasImprimir = preguntasImprimir.slice(0, this.selectedQuestionCount);

    const contenidoPreguntas = preguntasImprimir
      .map((pregunta, index) => {
        const imagen = pregunta.image
          ? `
            <div class="question-image">
              <img
                src="${this.escapeHtmlPrint(pregunta.image)}"
                alt="Imagen pregunta ${index + 1}">
            </div>
          `
          : '';

        const opciones = (pregunta.opciones || [])
          .map(
            (opcion, opcionIndex) => `
              <div class="option">
                <span class="option-letter">
                  ${String.fromCharCode(65 + opcionIndex)}.
                </span>
                <span>
                  ${this.escapeHtmlPrint(opcion.texto || '')}
                </span>
              </div>
            `,
          )
          .join('');

        return `
          <section class="question">
            <h3>
              ${index + 1}.
              ${this.escapeHtmlPrint(pregunta.pregunta || '')}
            </h3>

            ${imagen}

            <div class="options">
              ${opciones}
            </div>
          </section>
        `;
      })
      .join('');

    const ventana = window.open('', '_blank', 'width=1000,height=800');

    if (!ventana) {
      window.alert(
        'El navegador bloqueó la ventana de impresión. Permita las ventanas emergentes para continuar.',
      );
      return;
    }

    ventana.document.open();

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          ${this.escapeHtmlPrint(this.selectedCategory)} - Cuestionario
        </title>

        <style>
          @page {
            size: A4;
            margin: 18mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            color: #1f2937;
            line-height: 1.5;
            font-size: 14px;
            margin: 0;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 12px;
            margin-bottom: 25px;
          }

          .header h1 {
            margin: 0 0 8px;
            font-size: 22px;
          }

          .header p {
            margin: 4px 0;
          }

          .student-data {
            margin: 20px 0 25px;
          }

          .student-data div {
            margin-bottom: 12px;
          }

          .line {
            display: inline-block;
            width: 280px;
            border-bottom: 1px solid #333;
          }

          .question {
            margin-bottom: 28px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .question h3 {
            font-size: 15px;
            margin: 0 0 12px;
          }

          .question-image {
            text-align: center;
            margin: 12px 0;
          }

          .question-image img {
            max-width: 350px;
            max-height: 230px;
            object-fit: contain;
          }

          .options {
            margin-left: 18px;
          }

          .option {
            margin: 8px 0;
          }

          .option-letter {
            display: inline-block;
            width: 25px;
            font-weight: bold;
          }

          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #666;
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h1>
            ${this.escapeHtmlPrint(this.selectedCategory)}
          </h1>

          <p>
            <strong>Cuestionario</strong>
          </p>

          <p>
            ${preguntasImprimir.length} pregunta(s)
          </p>
        </div>

        <div class="student-data">
          <div>
            Nombre:
            <span class="line"></span>
          </div>

          <div>
            Grado:
            <span class="line"></span>
          </div>

          <div>
            Fecha:
            <span class="line"></span>
          </div>
        </div>

        ${contenidoPreguntas}

        <div class="footer">
          Cuestionario generado para impresión
        </div>

        <script>
          window.addEventListener('load', function () {
            const images = Array.from(
              document.querySelectorAll('img')
            );

            if (images.length === 0) {
              setTimeout(function () {
                window.print();
              }, 300);

              return;
            }

            Promise.all(
              images.map(function (img) {
                if (img.complete) {
                  return Promise.resolve();
                }

                return new Promise(function (resolve) {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              })
            ).then(function () {
              setTimeout(function () {
                window.print();
              }, 300);
            });
          });
        <\/script>
      </body>
      </html>
    `);

    ventana.document.close();
  }

  private escapeHtmlPrint(value: string | null | undefined): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  startGame(): void {
    if (!this.selectedCategory || this.selectedCategory.trim() === '') {
      this.selectionMessage =
        'Por favor seleccione una categoría para empezar el cuestionario.';
      return;
    }

    if (!this.selectedQuestionnaireId) {
      this.selectionMessage = 'Por favor seleccione un cuestionario.';
      return;
    }

    const cuestionario = this.cuestionarios.find(
      (item) => item.id === this.selectedQuestionnaireId,
    );

    if (!cuestionario) {
      this.selectionMessage =
        'No fue posible encontrar el cuestionario seleccionado.';
      return;
    }

    if (!cuestionario.preguntas || cuestionario.preguntas.length === 0) {
      this.selectionMessage = 'Este cuestionario no contiene preguntas.';
      return;
    }

    this.cuestionarioActual = cuestionario;

    this.validateQuestionCount();

    let preguntasDisponibles: PreguntaCuestionario[] =
      cuestionario.preguntas.map((pregunta, index) => ({
        ...pregunta,

        id: pregunta.id || `pregunta-${index + 1}`,

        opciones: pregunta.opciones
          ? pregunta.opciones.map((opcion) => ({
              ...opcion,
            }))
          : [],
      }));

    // =====================================================
    // ORDEN DE LAS PREGUNTAS
    // =====================================================
    switch (this.questionOrder) {
      // ---------------------------------------------------
      // ALEATORIO
      // ---------------------------------------------------
      case 'random':
        preguntasDisponibles = this.shuffleArray(preguntasDisponibles);
        break;

      // ---------------------------------------------------
      // ORDEN ORIGINAL
      // ---------------------------------------------------
      case 'ordered':
        // No hacemos nada.
        // Conserva el orden original de Firebase.
        break;

      // ---------------------------------------------------
      // ASCENDENTE A → Z
      // ---------------------------------------------------
      case 'ascending':
        preguntasDisponibles.sort((a, b) =>
          (a.pregunta || '').localeCompare(b.pregunta || '', 'es', {
            sensitivity: 'base',
            numeric: true,
          }),
        );
        break;

      // ---------------------------------------------------
      // DESCENDENTE Z → A
      // ---------------------------------------------------
      case 'descending':
        preguntasDisponibles.sort((a, b) =>
          (b.pregunta || '').localeCompare(a.pregunta || '', 'es', {
            sensitivity: 'base',
            numeric: true,
          }),
        );
        break;
    }

    // =====================================================
    // TOMAR LA CANTIDAD DE PREGUNTAS SELECCIONADA
    // =====================================================
    this.preguntas = preguntasDisponibles.slice(0, this.selectedQuestionCount);

    this.currentQuestionIndex = 0;
    this.respuestas = {};
    this.resultados = [];

    this.gameStarted = true;
    this.gameFinished = false;
    this.timeExpired = false;

    this.showResultsDetail = false;
    this.resultsView = 'all';

    this.selectionMessage = '';

    this.resetErrorPractice();

    this.calculateGameTime();
    this.startTimer();
  }

  private calculateGameTime(): void {
    if (
      !this.cuestionarioActual ||
      !this.cuestionarioActual.preguntas ||
      this.cuestionarioActual.preguntas.length === 0
    ) {
      this.totalTimeSeconds = 0;
      this.remainingTimeSeconds = 0;
      return;
    }

    const totalPreguntasBase = this.cuestionarioActual.preguntas.length;

    const tiempoTotalBaseSegundos =
      Math.max(1, Number(this.cuestionarioActual.tiempoMinutos)) * 60;

    this.totalTimeSeconds = Math.max(
      1,
      Math.round(
        tiempoTotalBaseSegundos * (this.preguntas.length / totalPreguntasBase),
      ),
    );

    this.remainingTimeSeconds = this.totalTimeSeconds;
  }

  startTimer(): void {
    this.stopTimer();

    this.timerInterval = setInterval(() => {
      if (this.remainingTimeSeconds > 0) {
        this.remainingTimeSeconds--;
      }

      if (this.remainingTimeSeconds <= 0) {
        this.remainingTimeSeconds = 0;
        this.timeExpired = true;

        this.stopTimer();
        this.finishGame(true);
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  get tiempoSegundos(): number {
    if (this.totalTimeSeconds <= 0) {
      return 0;
    }

    return Math.max(0, this.totalTimeSeconds - this.remainingTimeSeconds);
  }

  get puedeGuardarPuntaje(): boolean {
    if (!this.gameFinished || this.totalQuestions <= 0) {
      return false;
    }

    return this.totalCorrectAnswers > this.totalIncorrectAnswers;
  }

  guardarPuntaje(): void {
    if (!this.gameFinished) {
      return;
    }

    if (!this.puedeGuardarPuntaje) {
      return;
    }

    if (this.totalQuestions <= 0) {
      return;
    }

    const categoria =
      this.cuestionarioActual?.categoria?.trim() ||
      this.selectedCategory?.trim() ||
      'General';

    const repaso = 'Cuestionario';

    const tiempoFinal = Math.max(0, this.tiempoSegundos);

    this.router.navigate(['/puntuacion'], {
      state: {
        juego: 'cuestionario',
        categoria: categoria,
        repaso: repaso,
        correctas: this.totalCorrectAnswers,
        total: this.totalQuestions,
        errores: this.totalIncorrectAnswers,
        porcentaje: this.scorePercentage,
        tiempoSegundos: tiempoFinal,
      },
    });
  }

  get currentQuestion(): PreguntaCuestionario | null {
    if (this.preguntas.length === 0) {
      return null;
    }

    return this.preguntas[this.currentQuestionIndex] || null;
  }

  get currentQuestionId(): string {
    return (
      this.currentQuestion?.id || `pregunta-${this.currentQuestionIndex + 1}`
    );
  }

  selectAnswer(opcionId: string): void {
    if (!this.currentQuestion || this.gameFinished) {
      return;
    }

    this.respuestas[this.currentQuestionId] = opcionId;
  }

  isOptionSelected(opcionId: string): boolean {
    return this.respuestas[this.currentQuestionId] === opcionId;
  }

  get currentAnswer(): string {
    return this.respuestas[this.currentQuestionId] || '';
  }

  get currentQuestionAnswered(): boolean {
    return this.currentAnswer !== '';
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex <= 0) {
      return;
    }

    this.currentQuestionIndex--;
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex >= this.preguntas.length - 1) {
      return;
    }

    this.currentQuestionIndex++;
  }

  goToQuestion(index: number): void {
    if (index < 0 || index >= this.preguntas.length || this.gameFinished) {
      return;
    }

    this.currentQuestionIndex = index;
  }

  isQuestionAnswered(index: number): boolean {
    const pregunta = this.preguntas[index];

    if (!pregunta) {
      return false;
    }

    const id = pregunta.id || `pregunta-${index + 1}`;

    return !!this.respuestas[id];
  }

  get answeredQuestions(): number {
    return this.preguntas.reduce((total, pregunta, index) => {
      const id = pregunta.id || `pregunta-${index + 1}`;

      return total + (this.respuestas[id] ? 1 : 0);
    }, 0);
  }

  get unansweredQuestions(): number {
    return this.preguntas.length - this.answeredQuestions;
  }

  submitQuestionnaire(): void {
    if (this.gameFinished) {
      return;
    }

    if (this.unansweredQuestions > 0) {
      window.alert(
        `Debes responder todas las preguntas antes de entregar el cuestionario. ` +
          `Te faltan ${this.unansweredQuestions} pregunta(s).`,
      );

      const primeraSinResponder = this.preguntas.findIndex(
        (pregunta, index) => {
          const id = pregunta.id || `pregunta-${index + 1}`;

          return !this.respuestas[id];
        },
      );

      if (primeraSinResponder !== -1) {
        this.currentQuestionIndex = primeraSinResponder;
      }

      return;
    }

    const confirmar = window.confirm(
      'Has respondido todas las preguntas. ¿Deseas entregar el cuestionario y ver tu resultado?',
    );

    if (!confirmar) {
      return;
    }

    this.finishGame(false);
  }

  finishGame(porTiempo: boolean = false): void {
    if (this.gameFinished) {
      return;
    }

    this.stopTimer();

    if (porTiempo) {
      this.timeExpired = true;
    }

    this.calcularResultados();

    this.gameFinished = true;
    this.gameStarted = false;
    this.currentQuestionIndex = 0;
  }

  calcularResultados(): void {
    this.resultados = this.preguntas.map((pregunta, index) => {
      const preguntaId = pregunta.id || `pregunta-${index + 1}`;

      const respuestaEstudiante = this.respuestas[preguntaId] || '';

      const respuestaCorrecta = pregunta.respuestaCorrecta;

      return {
        pregunta,
        respuestaEstudiante,
        respuestaCorrecta,
        correcta:
          respuestaEstudiante !== '' &&
          respuestaEstudiante === respuestaCorrecta,
      };
    });
  }

  get totalCorrectAnswers(): number {
    return this.resultados.filter((resultado) => resultado.correcta).length;
  }

  get totalIncorrectAnswers(): number {
    return this.resultados.length - this.totalCorrectAnswers;
  }

  get totalUnansweredAnswers(): number {
    return this.resultados.filter((resultado) => !resultado.respuestaEstudiante)
      .length;
  }

  get scorePercentage(): number {
    if (this.resultados.length === 0) {
      return 0;
    }

    return Math.round(
      (this.totalCorrectAnswers / this.resultados.length) * 100,
    );
  }

  getOptionText(pregunta: PreguntaCuestionario, opcionId: string): string {
    if (!opcionId) {
      return 'Sin responder';
    }

    const opcion = pregunta.opciones.find((item) => item.id === opcionId);

    return opcion?.texto || 'Sin responder';
  }

  getOptionLetter(opcionId: string): string {
    if (!opcionId) {
      return '-';
    }

    return opcionId.toUpperCase();
  }

  getCorrectAnswerText(pregunta: PreguntaCuestionario): string {
    return this.getOptionText(pregunta, pregunta.respuestaCorrecta);
  }

  getStudentAnswerText(resultado: ResultadoPregunta): string {
    return this.getOptionText(
      resultado.pregunta,
      resultado.respuestaEstudiante,
    );
  }

  get filteredResults(): ResultadoPregunta[] {
    if (this.resultsView === 'correct') {
      return this.resultados.filter((resultado) => resultado.correcta);
    }

    if (this.resultsView === 'incorrect') {
      return this.resultados.filter((resultado) => !resultado.correcta);
    }

    return this.resultados;
  }

  showAllResults(): void {
    this.resultsView = 'all';
    this.showResultsDetail = true;
  }

  showCorrectResults(): void {
    this.resultsView = 'correct';
    this.showResultsDetail = true;
  }

  showIncorrectResults(): void {
    this.resultsView = 'incorrect';
    this.showResultsDetail = true;
  }

  closeResultsDetail(): void {
    this.showResultsDetail = false;
    this.resultsView = 'all';
  }

  startErrorPractice(): void {
    this.clearErrorPracticeTimeout();

    this.errorPracticeQuestions = this.resultados
      .filter((resultado) => !resultado.correcta)
      .map((resultado) => resultado.pregunta);

    if (this.errorPracticeQuestions.length === 0) {
      return;
    }

    this.showResultsDetail = false;
    this.practicingErrors = true;
    this.errorPracticeIndex = 0;
    this.errorPracticeAnswer = '';
    this.errorPracticeCorrect = false;
    this.errorPracticeMessage = '';
    this.correctedErrors = 0;
  }

  get currentErrorPracticeQuestion(): PreguntaCuestionario | null {
    if (
      this.errorPracticeQuestions.length === 0 ||
      this.errorPracticeIndex >= this.errorPracticeQuestions.length
    ) {
      return null;
    }

    return this.errorPracticeQuestions[this.errorPracticeIndex] || null;
  }

  selectErrorPracticeAnswer(opcionId: string): void {
    const pregunta = this.currentErrorPracticeQuestion;

    if (!pregunta) {
      return;
    }

    if (this.errorPracticeCorrect) {
      return;
    }

    this.errorPracticeAnswer = opcionId;

    if (opcionId !== pregunta.respuestaCorrecta) {
      this.errorPracticeCorrect = false;

      this.errorPracticeMessage =
        '✕ Esa respuesta todavía no es correcta. Inténtalo nuevamente.';

      return;
    }

    this.errorPracticeCorrect = true;

    this.errorPracticeMessage = '✓ ¡Correcto! Has corregido este error.';

    this.correctedErrors++;

    this.clearErrorPracticeTimeout();

    this.errorPracticeTimeout = setTimeout(() => {
      if (this.errorPracticeIndex < this.errorPracticeQuestions.length - 1) {
        this.errorPracticeIndex++;
        this.errorPracticeAnswer = '';
        this.errorPracticeCorrect = false;
        this.errorPracticeMessage = '';
        this.errorPracticeTimeout = null;
        return;
      }

      this.errorPracticeIndex = this.errorPracticeQuestions.length;

      this.errorPracticeAnswer = '';
      this.errorPracticeCorrect = false;
      this.errorPracticeMessage = '';
      this.errorPracticeTimeout = null;
    }, 700);
  }

  isErrorPracticeOptionSelected(opcionId: string): boolean {
    return this.errorPracticeAnswer === opcionId;
  }

  nextErrorPractice(): void {
    if (!this.errorPracticeCorrect) {
      return;
    }

    this.clearErrorPracticeTimeout();

    if (this.errorPracticeIndex < this.errorPracticeQuestions.length - 1) {
      this.errorPracticeIndex++;
      this.errorPracticeAnswer = '';
      this.errorPracticeCorrect = false;
      this.errorPracticeMessage = '';
      return;
    }

    this.errorPracticeIndex = this.errorPracticeQuestions.length;

    this.errorPracticeAnswer = '';
    this.errorPracticeCorrect = false;
    this.errorPracticeMessage = '';
  }

  get errorPracticeFinished(): boolean {
    return (
      this.errorPracticeQuestions.length > 0 &&
      this.errorPracticeIndex >= this.errorPracticeQuestions.length
    );
  }

  get errorPracticeProgress(): number {
    if (this.errorPracticeQuestions.length === 0) {
      return 0;
    }

    return Math.round(
      (this.correctedErrors / this.errorPracticeQuestions.length) * 100,
    );
  }

  restartErrorPractice(): void {
    if (this.errorPracticeQuestions.length === 0) {
      return;
    }

    this.clearErrorPracticeTimeout();

    this.errorPracticeIndex = 0;
    this.errorPracticeAnswer = '';
    this.errorPracticeCorrect = false;
    this.errorPracticeMessage = '';
    this.correctedErrors = 0;
    this.practicingErrors = true;
  }

  closeErrorPractice(): void {
    this.clearErrorPracticeTimeout();

    this.practicingErrors = false;
    this.errorPracticeQuestions = [];
    this.errorPracticeIndex = 0;
    this.errorPracticeAnswer = '';
    this.errorPracticeCorrect = false;
    this.errorPracticeMessage = '';
    this.correctedErrors = 0;
  }

  private resetErrorPractice(): void {
    this.clearErrorPracticeTimeout();

    this.practicingErrors = false;
    this.errorPracticeQuestions = [];
    this.errorPracticeIndex = 0;
    this.errorPracticeAnswer = '';
    this.errorPracticeCorrect = false;
    this.errorPracticeMessage = '';
    this.correctedErrors = 0;
  }

  private clearErrorPracticeTimeout(): void {
    if (this.errorPracticeTimeout !== null) {
      clearTimeout(this.errorPracticeTimeout);
      this.errorPracticeTimeout = null;
    }
  }

  retryQuestionnaire(): void {
    if (!this.cuestionarioActual) {
      return;
    }

    this.currentQuestionIndex = 0;
    this.respuestas = {};
    this.resultados = [];

    this.gameStarted = true;
    this.gameFinished = false;
    this.timeExpired = false;

    this.showResultsDetail = false;
    this.resultsView = 'all';

    this.resetErrorPractice();

    this.calculateGameTime();
    this.startTimer();
  }

  changeQuestionnaire(): void {
    this.stopTimer();
    this.resetErrorPractice();

    this.gameStarted = false;
    this.gameFinished = false;
    this.timeExpired = false;

    this.cuestionarioActual = null;

    this.preguntas = [];
    this.respuestas = {};
    this.resultados = [];

    this.currentQuestionIndex = 0;

    this.remainingTimeSeconds = 0;
    this.totalTimeSeconds = 0;

    this.showResultsDetail = false;
    this.resultsView = 'all';

    this.selectedQuestionnaireId = '';
    this.selectedQuestionCount = 12;

    this.onCategoryChange();
  }

  changeCategory(): void {
    this.stopTimer();
    this.resetErrorPractice();

    this.gameStarted = false;
    this.gameFinished = false;
    this.timeExpired = false;

    this.cuestionarioActual = null;

    this.preguntas = [];
    this.respuestas = {};
    this.resultados = [];

    this.currentQuestionIndex = 0;

    this.selectedCategory = '';
    this.selectedQuestionnaireId = '';
    this.cuestionariosCategoria = [];

    this.selectionMessage = '';

    this.remainingTimeSeconds = 0;
    this.totalTimeSeconds = 0;

    this.showResultsDetail = false;
    this.resultsView = 'all';

    this.selectedQuestionCount = 12;
  }

  get formattedTime(): string {
    const total = Math.max(0, this.remainingTimeSeconds);

    const hours = Math.floor(total / 3600);

    const minutes = Math.floor((total % 3600) / 60);

    const seconds = total % 60;

    return (
      this.padNumber(hours) +
      ':' +
      this.padNumber(minutes) +
      ':' +
      this.padNumber(seconds)
    );
  }

  private padNumber(value: number): string {
    return value.toString().padStart(2, '0');
  }

  get remainingTimePercentage(): number {
    if (this.totalTimeSeconds <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, (this.remainingTimeSeconds / this.totalTimeSeconds) * 100),
    );
  }

  get lowTime(): boolean {
    if (this.totalTimeSeconds <= 0) {
      return false;
    }

    return this.remainingTimeSeconds <= this.totalTimeSeconds * 0.2;
  }

  get progressPercentage(): number {
    if (this.preguntas.length === 0) {
      return 0;
    }

    return (this.answeredQuestions / this.preguntas.length) * 100;
  }

  get isFirstQuestion(): boolean {
    return this.currentQuestionIndex === 0;
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.preguntas.length - 1;
  }

  get currentQuestionNumber(): number {
    return this.currentQuestionIndex + 1;
  }

  get totalQuestions(): number {
    return this.preguntas.length;
  }

  openImage(image: string | undefined, pregunta: string): void {
    if (!image) {
      return;
    }

    this.selectedImage = image;
    this.selectedImageQuestion = pregunta;
  }

  closeImage(): void {
    this.selectedImage = null;
    this.selectedImageQuestion = '';
  }

  get resultsDetailTitle(): string {
    switch (this.resultsView) {
      case 'correct':
        return '✅ Respuestas correctas';

      case 'incorrect':
        return '❌ Respuestas incorrectas';

      default:
        return 'Detalle del cuestionario';
    }
  }

  getQuestionnaireLabel(cuestionario: CuestionarioFirebase): string {
    const cantidad = cuestionario.preguntas?.length || 0;

    return `${cantidad} pregunta(s) - ` + `${cuestionario.tiempoMinutos} min`;
  }

  get currentOptions(): OpcionCuestionario[] {
    return this.currentQuestion?.opciones || [];
  }

  get maxQuestionCount(): number {
    return this.cuestionarioActual?.preguntas?.length ?? 0;
  }

  validateQuestionCount(): void {
    const max = this.maxQuestionCount;

    if (max <= 0) {
      this.selectedQuestionCount = 1;
      return;
    }

    if (!this.selectedQuestionCount || this.selectedQuestionCount < 1) {
      this.selectedQuestionCount = 1;
    }

    if (this.selectedQuestionCount > max) {
      this.selectedQuestionCount = max;
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }
}
