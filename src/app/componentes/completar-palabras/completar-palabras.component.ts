import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  FirebaseWordsService,
  PairFirebase,
} from '../../servicios/firebase-words.service';

/* =========================================================
   TIPO DE PAREJA PARA EL JUEGO
\========================================================= */
type GamePair = PairFirebase & {
  id: string;
};

/* =========================================================
   CELDA DE LETRA
\========================================================= */
interface LetterCell {
  letter: string;
  hidden: boolean;
  value: string;
  correct: boolean | null;
  isSpace: boolean;
}

/* =========================================================
   EJERCICIO
\========================================================= */
interface ExercisePair {
  id: string;
  leftOriginal: string;
  rightOriginal: string;
  meaning: string;
  leftCells: LetterCell[];
  rightCells: LetterCell[];
  completed: boolean;
  errorCount: number;
}

@Component({
  selector: 'app-completar-palabras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './completar-palabras.component.html',
  styleUrls: ['./completar-palabras.component.css'],
})
export class CompletarPalabrasComponent {
  // =========================================================
  // TODAS LAS PALABRAS DE FIREBASE
  // =========================================================
  allPairs: GamePair[] = [];

  // =========================================================
  // PALABRAS DISPONIBLES SEGÚN LA CATEGORÍA
  // =========================================================
  pairs: GamePair[] = [];

  // =========================================================
  // CATEGORÍAS
  // =========================================================
  categories: string[] = [];

  selectedCategory = '';

  categorySelected = false;

  // Dashboard de configuración
  gameStarted = false;
  reviewType: 'right' | 'meaning' = 'right';
  wordOrder: 'random' | 'original' | 'ascending' | 'descending' = 'random';

  // =========================================================
  // MENSAJE DE VALIDACIÓN DE CATEGORÍA
  // =========================================================
  categoryMessage = '';

  // =========================================================
  // TODAS LAS CATEGORÍAS
  // =========================================================
  readonly ALL_CATEGORIES = '__ALL__';

  // =========================================================
  // ESTADO DE CARGA
  // =========================================================

  loadingWords = true;

  loadError = '';

  // =========================================================
  // CONFIGURACIÓN DEL JUEGO
  // =========================================================
  readonly wordsPerPage = 6;

  // =========================================================
  // MÁXIMO DE ERRORES / INTENTOS
  // =========================================================
  get maxErrors(): number {
    const cantidadParejas =
      this.exercises.length > 0
        ? this.exercises.length
        : this.selectedPairCount;

    /*
     * Se permiten aproximadamente 2 intentos
     * por cada pareja, con un mínimo de 15.
     * 6 parejas  -> 15 intentos
     * 12 parejas -> 24 intentos
     * 18 parejas -> 36 intentos
     * 24 parejas -> 48 intentos
     */
    return Math.max(15, cantidadParejas * 2);
  }

  selectedPairCount = 12;

  currentPage = 0;

  errors = 0;

  // =========================================================
  // CONTROL DEL TIEMPO
  // =========================================================
  tiempoInicio = 0;

  tiempoFin = 0;

  tiempoSegundos = 0;

  // =========================================================
  // EJERCICIOS
  // =========================================================
  exercises: ExercisePair[] = [];

  pages: ExercisePair[][] = [];

  // =========================================================
  // ESTADO DEL JUEGO
  // =========================================================
  gameFinished = false;

  gameWon = false;

  changingPage = false;

  // =========================================================
  // INDICA SI ESTAMOS PRACTICANDO SOLO LOS ERRORES
  // =========================================================
  practicingOnlyErrors = false;

  // =========================================================
  // PANTALLA DE DETALLE DE RESULTADOS
  // =========================================================
  showResultsDetail = false;

  // =========================================================
  // QUÉ DETALLE SE ESTÁ MOSTRANDO
  // =========================================================
  resultsView: 'correct' | 'errors' | null = null;

  // =========================================================
  // BUSCADOR
  // =========================================================
  searchTerm = '';

  // =========================================================
  // PISTAS
  // =========================================================
  showHints = false;

  hints: GamePair[] = [];

  private hintTimer: any;

  // =========================================================
  // IMAGEN AMPLIADA
  // =========================================================
  selectedImage: string | null = null;

  selectedImageWord = '';

  selectedImageMeaning = '';

  // =========================================================
  // PORCENTAJE DE LETRAS OCULTAS
  // =========================================================
  hiddenPercentage = 0.45;

  // =========================================================
  // CONSTRUCTOR
  // =========================================================
  constructor(
    private wordsService: FirebaseWordsService,
    private router: Router,
  ) {
    this.loadWords();
  }

  // =========================================================
  // CARGAR PALABRAS DESDE FIREBASE
  // =========================================================
  loadWords(): void {
    this.loadingWords = true;
    this.loadError = '';
    this.categoryMessage = '';

    this.wordsService.getPairs((firebasePairs: PairFirebase[]) => {
      // =====================================================
      // GUARDAR SOLO REGISTROS CON ID VÁLIDO
      // =====================================================
      this.allPairs = firebasePairs.filter(
        (pair): pair is GamePair =>
          typeof pair.id === 'string' && pair.id.length > 0,
      );

      this.loadingWords = false;

      // =====================================================
      // SI NO HAY PALABRAS
      // =====================================================
      if (this.allPairs.length === 0) {
        this.loadError = 'No hay palabras disponibles para jugar.';

        this.categories = [];

        this.pairs = [];

        this.exercises = [];

        this.pages = [];

        return;
      }

      // =====================================================
      // OBTENER CATEGORÍAS ÚNICAS
      // =====================================================
      this.categories = Array.from(
        new Set(
          this.allPairs
            .map((pair) => pair.categoriaPalabra?.trim())
            .filter((category): category is string => !!category),
        ),
      ).sort((a, b) => a.localeCompare(b));

      // =====================================================
      // REINICIAR JUEGO
      // =====================================================
      this.selectedCategory = '';

      this.categorySelected = false;

      this.gameStarted = false;

      this.categoryMessage = '';

      this.pairs = [];

      this.exercises = [];

      this.pages = [];

      this.currentPage = 0;

      this.errors = 0;

      this.gameFinished = false;

      this.gameWon = false;

      this.changingPage = false;

      this.practicingOnlyErrors = false;

      this.showResultsDetail = false;

      this.resultsView = null;

      // =====================================================
      // REINICIAR TIEMPO
      // =====================================================
      this.tiempoInicio = 0;

      this.tiempoFin = 0;

      this.tiempoSegundos = 0;

      this.selectedPairCount = Math.min(12, this.allPairs.length);
    });
  }

  // =========================================================
  // CAMBIO EN SELECTOR DE CATEGORÍA
  // =========================================================
  onCategoryChange(): void {
    this.categoryMessage = '';
    this.loadError = '';
    this.gameStarted = false;
    this.exercises = [];
    this.pages = [];
    this.currentPage = 0;
    this.errors = 0;

    if (!this.selectedCategory) {
      this.categorySelected = false;
      this.pairs = [];
      return;
    }

    this.applySelectedCategory();
  }

  private applySelectedCategory(): void {
    if (this.selectedCategory === this.ALL_CATEGORIES) {
      this.pairs = [...this.allPairs];
    } else {
      this.pairs = this.allPairs.filter(
        (pair) =>
          pair.categoriaPalabra?.trim().toLowerCase() ===
          this.selectedCategory.trim().toLowerCase(),
      );
    }

    if (this.pairs.length === 0) {
      this.loadError = 'No hay palabras disponibles en esta categoría.';
      this.categorySelected = false;
      return;
    }

    this.categorySelected = true;
    this.selectedPairCount = Math.min(12, this.pairs.length);
    this.searchTerm = '';
  }
  // =========================================================
  // SELECCIONAR CATEGORÍA E INICIAR
  // =========================================================
  selectCategoryAndStart(): void {
    if (!this.selectedCategory || this.selectedCategory.trim() === '') {
      this.categoryMessage =
        'Por favor seleccione una categoría de palabra para continuar.';
      return;
    }

    this.categoryMessage = '';
    this.applySelectedCategory();
  }

  // =========================================================
  // CAMBIAR CATEGORÍA
  // =========================================================
  changeCategory(): void {
    this.closeHints();

    this.closeResultsDetail();

    this.gameStarted = false;

    this.categorySelected = false;

    this.selectedCategory = '';

    this.categoryMessage = '';

    this.pairs = [];

    this.exercises = [];

    this.pages = [];

    this.currentPage = 0;

    this.errors = 0;

    this.gameFinished = false;

    this.gameWon = false;

    this.changingPage = false;

    this.practicingOnlyErrors = false;

    this.searchTerm = '';

    this.loadError = '';

    // =====================================================
    // REINICIAR TIEMPO
    // =====================================================

    this.tiempoInicio = 0;

    this.tiempoFin = 0;

    this.tiempoSegundos = 0;
  }

  // =========================================================
  // INICIAR / REINICIAR JUEGO
  // =========================================================
  startGame(): void {
    if (
      this.loadingWords ||
      !this.categorySelected ||
      this.pairs.length === 0
    ) {
      return;
    }

    this.gameStarted = true;

    this.closeHints();

    this.closeResultsDetail();

    this.errors = 0;

    this.currentPage = 0;

    this.gameFinished = false;

    this.gameWon = false;

    this.changingPage = false;

    // =====================================================
    // INICIAR CRONÓMETRO
    // =====================================================
    this.tiempoInicio = Date.now();

    this.tiempoFin = 0;

    this.tiempoSegundos = 0;

    // =====================================================
    // VALIDAR CANTIDAD
    // =====================================================
    if (!this.selectedPairCount || this.selectedPairCount < 1) {
      this.selectedPairCount = 1;
    }

    if (this.selectedPairCount > this.pairs.length) {
      this.selectedPairCount = this.pairs.length;
    }

    // =====================================================
    // ORDENAR Y ELEGIR PAREJAS
    // =====================================================
    const sourcePairs = [...this.pairs];

    let orderedPairs = [...sourcePairs];

    switch (this.wordOrder) {
      // ===================================================
      // ALEATORIO
      // ===================================================
      case 'random':
        orderedPairs = this.shuffle(orderedPairs);
        break;

      // ===================================================
      // ORDEN ORIGINAL
      // ===================================================
      case 'original':
        // Conserva el orden original recibido.
        break;

      // ===================================================
      // ASCENDENTE A → Z
      // ===================================================
      case 'ascending':
        orderedPairs.sort((a, b) =>
          a.left.localeCompare(b.left, undefined, {
            sensitivity: 'base',
          }),
        );
        break;

      // ===================================================
      // DESCENDENTE Z → A
      // ===================================================
      case 'descending':
        orderedPairs.sort((a, b) =>
          b.left.localeCompare(a.left, undefined, {
            sensitivity: 'base',
          }),
        );
        break;
    }

    // =====================================================
    // ELEGIR LA CANTIDAD SOLICITADA
    // =====================================================
    const selectedPairs = orderedPairs.slice(0, this.selectedPairCount);

    // =====================================================
    // CREAR EJERCICIOS
    // =====================================================
    this.exercises = selectedPairs.map((pair) => ({
      id: pair.id,

      leftOriginal: pair.left,

      rightOriginal: this.reviewType === 'meaning' ? pair.meaning : pair.right,

      meaning: pair.meaning,

      leftCells: this.createWordCells(pair.left),

      rightCells: this.createWordCells(
        this.reviewType === 'meaning' ? pair.meaning : pair.right,
      ),

      completed: false,

      errorCount: 0,
    }));

    // =====================================================
    // DIVIDIR EN PÁGINAS
    // =====================================================
    this.pages = this.chunk(this.exercises, this.wordsPerPage);

    // =====================================================

    // FOCO AUTOMÁTICO
    // =====================================================
    setTimeout(() => {
      const firstInput = document.querySelector<HTMLInputElement>(
        '.letter-input:not(:disabled)',
      );

      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 150);
  }

  // =========================================================
  // CREAR CELDAS
  // =========================================================
  createWordCells(word: string): LetterCell[] {
    const characters = word.split('');

    const validIndexes = characters

      .map((character, index) => ({
        character,
        index,
      }))

      .filter((item) => !/\s/.test(item.character))

      .map((item) => item.index);

    let numberToHide = Math.round(validIndexes.length * this.hiddenPercentage);

    if (numberToHide < 1 && validIndexes.length > 0) {
      numberToHide = 1;
    }

    if (numberToHide >= validIndexes.length && validIndexes.length > 1) {
      numberToHide = validIndexes.length - 1;
    }

    if (validIndexes.length === 1) {
      numberToHide = 1;
    }

    const shuffledIndexes = this.shuffle(validIndexes);

    const hiddenIndexes = new Set(
      shuffledIndexes.slice(
        0,

        numberToHide,
      ),
    );

    return characters.map((character, index) => {
      if (/\s/.test(character)) {
        return {
          letter: character,
          hidden: false,
          value: '',
          correct: null,
          isSpace: true,
        };
      }

      return {
        letter: character,
        hidden: hiddenIndexes.has(index),
        value: '',
        correct: null,
        isSpace: false,
      };
    });
  }

  // =========================================================
  // CUANDO EL ESTUDIANTE ESCRIBE
  // =========================================================
  onLetterInput(
    cell: LetterCell,

    event: Event,

    exercise: ExercisePair,
  ): void {
    if (
      this.gameFinished ||
      exercise.completed ||
      this.changingPage ||
      this.showHints ||
      cell.isSpace
    ) {
      return;
    }

    const input = event.target as HTMLInputElement;

    let value = input.value

      .slice(-1)

      .toLowerCase();

    value = value.replace(
      /[^a-záéíóúüñ]/gi,

      '',
    );

    cell.value = value;

    input.value = value;

    if (!value) {
      cell.correct = null;
      return;
    }

    // =====================================================
    // CORRECTA
    // =====================================================
    if (value === cell.letter.toLowerCase()) {
      cell.correct = true;

      this.checkExerciseComplete(exercise);

      setTimeout(() => {
        this.focusNextLetter(input);
      }, 50);

      return;
    }

    // =====================================================
    // INCORRECTA
    // =====================================================
    cell.correct = false;

    this.errors++;

    exercise.errorCount++;

    setTimeout(() => {
      if (cell.correct === false) {
        cell.value = '';
        cell.correct = null;
        input.value = '';
        input.focus();
        input.select();
      }
    }, 500);

    // =====================================================
    // PERDIÓ POR ERRORES
    // =====================================================

    if (this.errors >= this.maxErrors) {
      setTimeout(() => {
        this.gameFinished = true;

        this.gameWon = false;

        // ===============================================
        // DETENER TIEMPO
        // ===============================================

        this.finalizarTiempo();
      }, 500);
    }
  }

  // =========================================================
  // SIGUIENTE CASILLA
  // =========================================================
  focusNextLetter(currentInput: HTMLInputElement): void {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        '.letter-input:not(:disabled)',
      ),
    );

    const currentIndex = inputs.indexOf(currentInput);

    if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
      const nextInput = inputs[currentIndex + 1];

      nextInput.focus();

      nextInput.select();

      return;
    }

    currentInput.blur();
  }

  // =========================================================
  // COMPROBAR EJERCICIO
  // =========================================================
  checkExerciseComplete(exercise: ExercisePair): void {
    const leftComplete = exercise.leftCells.every(
      (cell) => cell.isSpace || !cell.hidden || cell.correct === true,
    );

    const rightComplete = exercise.rightCells.every(
      (cell) => cell.isSpace || !cell.hidden || cell.correct === true,
    );

    exercise.completed = leftComplete && rightComplete;

    if (exercise.completed) {
      this.checkPageComplete();
    }
  }

  // =========================================================
  // PALABRAS COMPLETADAS SIN ERRORES
  // =========================================================
  get correctWords(): ExercisePair[] {
    return this.exercises.filter(
      (exercise) => exercise.completed && exercise.errorCount === 0,
    );
  }

  // =========================================================
  // PALABRAS CON ERRORES
  // =========================================================
  get wordsWithErrors(): ExercisePair[] {
    return this.exercises.filter((exercise) => exercise.errorCount > 0);
  }

  // =========================================================
  // TOTAL CORRECTAS
  // =========================================================
  get totalCorrectWords(): number {
    return this.correctWords.length;
  }

  // =========================================================
  // PERMITIR GUARDAR PUNTAJE
  // El botón solamente se mostrará cuando:
  // - El juego haya terminado.
  // - El jugador haya ganado.
  // - Existan ejercicios.
  // - Las palabras correctas sean MAYORES que los errores.
  // =========================================================

  get puedeGuardarPuntaje(): boolean {
    return (
      this.gameFinished &&
      this.gameWon &&
      this.exercises.length > 0 &&
      this.totalCorrectWords > this.errors
    );
  }

  // =========================================================
  // TOTAL CON ERRORES
  // =========================================================
  get totalWordsWithErrors(): number {
    return this.wordsWithErrors.length;
  }

  // =========================================================
  // MOSTRAR CORRECTAS
  // =========================================================
  showCorrectWords(): void {
    this.resultsView = 'correct';
    this.showResultsDetail = true;
  }

  // =========================================================
  // MOSTRAR ERRORES
  // =========================================================
  showErrorWords(): void {
    this.resultsView = 'errors';
    this.showResultsDetail = true;
  }

  // =========================================================
  // CERRAR RESULTADOS
  // =========================================================
  closeResultsDetail(): void {
    this.showResultsDetail = false;
    this.resultsView = null;
  }

  get showingCorrectWords(): boolean {
    return this.resultsView === 'correct';
  }

  get showingErrorWords(): boolean {
    return this.resultsView === 'errors';
  }

  // =========================================================
  // PRACTICAR ERRORES
  // =========================================================
  practiceErrorWords(): void {
    if (this.wordsWithErrors.length === 0) {
      return;
    }

    const errorIds = new Set(
      this.wordsWithErrors.map((exercise) => exercise.id),
    );

    this.practicingOnlyErrors = true;

    this.pairs = this.allPairs.filter((pair) => errorIds.has(pair.id));

    this.selectedPairCount = this.pairs.length;

    this.closeResultsDetail();

    this.categorySelected = true;

    this.startGame();
  }

  // =========================================================
  // RESTAURAR JUEGO NORMAL
  // =========================================================
  restoreNormalGame(): void {
    if (this.selectedCategory === this.ALL_CATEGORIES) {
      this.pairs = [...this.allPairs];
    } else {
      this.pairs = this.allPairs.filter(
        (pair) =>
          pair.categoriaPalabra?.trim().toLowerCase() ===
          this.selectedCategory.trim().toLowerCase(),
      );
    }

    this.selectedPairCount = this.pairs.length;

    this.practicingOnlyErrors = false;
  }

  // =========================================================
  // MOSTRAR PISTAS
  // =========================================================
  showHintsPanel(): void {
    if (this.gameFinished || this.changingPage) {
      return;
    }

    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
    }

    const currentExercises = this.pages[this.currentPage] ?? [];

    const pendingExercises = currentExercises.filter(
      (exercise) => !exercise.completed,
    );

    this.hints = pendingExercises

      .map((exercise) => {
        const pair = this.pairs.find((pair) => pair.id === exercise.id);

        if (!pair) {
          return null;
        }

        return {
          ...pair,
          id: exercise.id,
          left: exercise.leftOriginal,
          right: exercise.rightOriginal,
        };
      })

      .filter((pair): pair is GamePair => pair !== null)
      .slice(0, 6);

    if (this.hints.length === 0) {
      return;
    }

    this.showHints = true;

    this.hintTimer = setTimeout(() => {
      this.showHints = false;

      this.hints = [];

      this.hintTimer = null;
    }, 5000);
  }

  // =========================================================
  // CERRAR PISTAS
  // =========================================================
  closeHints(): void {
    this.showHints = false;

    this.hints = [];

    if (this.hintTimer) {
      clearTimeout(this.hintTimer);

      this.hintTimer = null;
    }
  }

  // =========================================================
  // COMPROBAR PÁGINA
  // =========================================================
  checkPageComplete(): void {
    const page = this.pages[this.currentPage];

    if (!page) {
      return;
    }

    const complete = page.every((exercise) => exercise.completed);

    if (!complete) {
      return;
    }

    // =====================================================
    // ÚLTIMA PÁGINA
    // =====================================================
    if (this.currentPage === this.pages.length - 1) {
      this.gameFinished = true;

      this.gameWon = true;

      // ===================================================
      // DETENER CRONÓMETRO
      // ===================================================
      this.finalizarTiempo();

      if (this.practicingOnlyErrors && this.errors === 0) {
        this.restoreNormalGame();
      }

      return;
    }

    // =====================================================
    // SIGUIENTE PÁGINA
    // =====================================================
    this.changingPage = true;

    setTimeout(() => {
      this.currentPage++;

      this.changingPage = false;

      setTimeout(() => {
        const firstInput = document.querySelector<HTMLInputElement>(
          '.letter-input:not(:disabled)',
        );

        if (firstInput) {
          firstInput.focus();
          firstInput.select();
        }
      }, 150);
    }, 800);
  }

  // =========================================================
  // TOTAL PÁGINAS
  // =========================================================
  get totalPages(): number {
    return this.pages.length;
  }

  // =========================================================
  // INTENTOS RESTANTES
  // =========================================================
  get remainingAttempts(): number {
    return Math.max(this.maxErrors - this.errors, 0);
  }

  // =========================================================
  // PAREJAS COMPLETADAS
  // =========================================================
  get completedPairs(): number {
    return this.exercises.filter((exercise) => exercise.completed).length;
  }

  // =========================================================
  // COMPLETADAS PÁGINA ACTUAL
  // =========================================================
  get currentPageCompleted(): number {
    const page = this.pages[this.currentPage];

    if (!page) {
      return 0;
    }

    return page.filter((exercise) => exercise.completed).length;
  }

  // =========================================================
  // BUSCADOR
  // =========================================================
  get filteredPairs(): GamePair[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.pairs;
    }

    return this.pairs.filter(
      (pair) =>
        pair.left.toLowerCase().includes(term) ||
        pair.right.toLowerCase().includes(term) ||
        pair.meaning.toLowerCase().includes(term) ||
        (pair.categoriaPalabra || '').toLowerCase().includes(term),
    );
  }

  // =========================================================
  // MEZCLAR ARRAY
  // =========================================================
  shuffle<T>(array: T[]): T[] {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  // =========================================================
  // DIVIDIR EN PÁGINAS
  // =========================================================
  chunk<T>(
    array: T[],

    size: number,
  ): T[][] {
    const result: T[][] = [];

    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }

    return result;
  }

  // =========================================================
  // FINALIZAR TIEMPO
  // =========================================================
  private finalizarTiempo(): void {
    if (this.tiempoInicio <= 0) {
      this.tiempoSegundos = 0;

      return;
    }

    // Evitar recalcular el tiempo si ya terminó
    if (this.tiempoFin > 0) {
      return;
    }

    this.tiempoFin = Date.now();

    this.tiempoSegundos = Math.max(
      0,
      Math.floor((this.tiempoFin - this.tiempoInicio) / 1000),
    );
  }

  // =========================================================
  // GUARDAR PUNTAJE
  // =========================================================

  guardarPuntaje(): void {
    // =====================================================
    // SOLO PERMITIR GUARDAR CUANDO:
    // - EL JUEGO TERMINÓ
    // - EL JUGADOR GANÓ
    // - EXISTEN EJERCICIOS
    // - CORRECTAS > ERRORES
    // =====================================================
    if (!this.puedeGuardarPuntaje) {
      console.warn('No se puede guardar el puntaje.', {
        correctas: this.totalCorrectWords,
        errores: this.errors,
      });

      return;
    }

    // =====================================================
    // ASEGURAR TIEMPO FINAL
    // =====================================================
    if (this.tiempoFin === 0 && this.tiempoInicio > 0) {
      this.finalizarTiempo();
    }

    // =====================================================
    // CATEGORÍA
    // =====================================================
    const categoria =
      this.selectedCategory === this.ALL_CATEGORIES
        ? 'Todas las palabras'
        : this.selectedCategory;

    const repasoParaPuntuacion =
      this.reviewType === 'meaning' ? 'Verbo → Significado' : 'Verbo → Pareja';

    // =====================================================
    // IR A PUNTUACIÓN
    // =====================================================
    this.router.navigate(
      ['/puntuacion'],

      {
        state: {
          juego: 'completar-palabra',
          categoria: categoria,
          // ===============================================
          // ACIERTOS SIN ERRORES
          // ===============================================
          correctas: this.totalCorrectWords,
          // ===============================================
          // TOTAL JUGADO
          // ===============================================
          total: this.exercises.length,
          // ===============================================
          // ERRORES TOTALES
          // ===============================================
          errores: this.errors,
          // ===============================================
          // REPASO
          // ===============================================
          repaso: repasoParaPuntuacion,
          // ===============================================
          // TIEMPO EMPLEADO
          // ===============================================
          tiempoSegundos: this.tiempoSegundos,
        },
      },
    );
  }

  printVocabulary(): void {
    if (!this.pairs || this.pairs.length === 0) {
      return;
    }

    const category =
      this.selectedCategory === this.ALL_CATEGORIES
        ? 'Todas las palabras'
        : this.selectedCategory;

    const vocabularyRows = this.pairs
      .map((pair, index) => {
        const imageHtml = pair.image
          ? `
          <img
            src="${pair.image}"
            alt="${pair.left}"
            class="vocabulary-image"
          >
        `
          : '';

        return `
        <tr>
          <td>${index + 1}</td>

          <td class="image-cell">
            ${imageHtml}
          </td>

          <td class="english-word">
            ${this.escapeHtml(pair.left)}
          </td>

          <td>
            ${this.escapeHtml(pair.right)}
          </td>

          <td>
            ${this.escapeHtml(pair.meaning)}
          </td>

          <td>
            ${this.escapeHtml(pair.categoriaPalabra)}
          </td>
        </tr>
      `;
      })
      .join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=800');

    if (!printWindow) {
      alert(
        'El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e inténtalo nuevamente.',
      );
      return;
    }

    printWindow.document.open();

    printWindow.document.write(`
    <!DOCTYPE html>

    <html lang="es">

    <head>

      <meta charset="UTF-8">

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      >

      <title>Vocabulario - ${this.escapeHtml(category)}</title>

      <style>

        @page {
          size: A4;
          margin: 15mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, sans-serif;
          color: #222;
          background: white;
        }

        .print-container {
          width: 100%;
        }

        h1 {
          margin: 0 0 8px;
          text-align: center;
          font-size: 26px;
        }

        .category {
          margin: 0 0 22px;
          text-align: center;
          font-size: 18px;
        }

        .category strong {
          color: #2f8f00;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        th {
          background: #4f72b8;
          color: black;
          font-size: 15px;
          padding: 10px 6px;
          border: 1px solid #d5d5d5;
        }

        td {
          padding: 8px 6px;
          border: 1px solid #d5d5d5;
          text-align: center;
          vertical-align: middle;
          font-size: 15px;
          text-transform: capitalize;
        }

        th:nth-child(1),
        td:nth-child(1) {
          width: 6%;
        }

        th:nth-child(2),
        td:nth-child(2) {
          width: 12%;
        }

        th:nth-child(3),
        td:nth-child(3) {
          width: 20%;
        }

        th:nth-child(4),
        td:nth-child(4) {
          width: 20%;
        }

        th:nth-child(5),
        td:nth-child(5) {
          width: 24%;
        }

        th:nth-child(6),
        td:nth-child(6) {
          width: 18%;
        }

        .vocabulary-image {
          width: 55px;
          height: 55px;
          object-fit: contain;
          display: block;
          margin: auto;
        }

        .english-word {
          font-weight: bold;
        }

        tr {
          page-break-inside: avoid;
        }

        .print-footer {
          margin-top: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }

      </style>

    </head>

    <body>

      <div class="print-container">

        <h1>📚 Vocabulario</h1>

        <p class="category">
          Categoria Palabra:
          <strong>
            ${this.escapeHtml(category)}
          </strong>
        </p>

        <table>

          <thead>
            <tr>
              <th>N.º</th>
              <th>Imagen</th>
              <th>Palabra</th>
              <th>Pareja</th>
              <th>Significado</th>
              <th>Categoria</th>
            </tr>
          </thead>

          <tbody>
            ${vocabularyRows}
          </tbody>

        </table>

      </div>

      <script>

        window.addEventListener('load', function () {

          const images = Array.from(
            document.querySelectorAll('img')
          );

          if (images.length === 0) {
            window.print();
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

    printWindow.document.close();
  }

  private escapeHtml(value: string | null | undefined): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
