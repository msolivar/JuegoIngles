import { CommonModule } from '@angular/common';

import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import {
  FirebaseWordsService,
  PairFirebase,
} from '../../servicios/firebase-words.service';

export interface PalabraOrdenar {
  id?: string;

  text: string;

  right: string;

  meaning: string;

  category: string;

  image?: string;
}

interface LetraBanco {
  id: number;

  letter: string;

  used: boolean;
}

interface Casilla {
  letter: string;

  fixed: boolean;

  isSpace: boolean;

  value: string;

  bankId: number | null;

  correct: boolean | null;
}

interface Tablero {
  original: string;

  cells: Casilla[];

  bank: LetraBanco[];

  completed: boolean;
}

interface Ejercicio {
  id: number;

  image?: string;

  meaning: string;

  left: Tablero;

  right: Tablero;

  completed: boolean;

  errors: number;

  source: PalabraOrdenar;
}

type Repaso = 'right' | 'meaning';

type Orden = 'random' | 'original' | 'ascending' | 'descending';

@Component({
  selector: 'app-ordenar-palabras',

  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './ordenar-palabras.component.html',

  styleUrl: './ordenar-palabras.component.css',
})
export class OrdenarPalabrasComponent implements OnInit, OnDestroy {
  @Output() saveScoreRequested = new EventEmitter<{
    category: string;

    review: string;

    correct: number;

    total: number;

    errors: number;
  }>();

  words: PalabraOrdenar[] = [];

  loadingWords = true;

  loadError = '';

  constructor(
    private wordsService: FirebaseWordsService,

    private router: Router,

    private cdr: ChangeDetectorRef,

    private host: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.loadingWords = true;

    this.wordsService.getPairs((pairs: PairFirebase[]) => {
      this.words = pairs.map((pair) => ({
        id: pair.id,

        text: pair.left ?? '',

        right: pair.right ?? '',

        meaning: pair.meaning ?? '',

        category: pair.categoriaPalabra ?? '',

        image: pair.image ?? '',
      }));

      this.loadingWords = false;

      this.refreshCategories();
    });
  }

  ngOnDestroy(): void {
    this.stopAudio();

    this.closeHints();
  }

  categories: string[] = [];

  selectedCategories: string[] = [];

  categoryMenuOpen = false;

  categorySelected = false;

  categoryWarning = false;

  gameStarted = false;

  gameFinished = false;

  reviewType: Repaso = 'right';

  wordOrder: Orden = 'random';

  selectedPairCount = 12;

  wordsPerPage = 6;

  voiceEnabled = false;

  voiceRate = 1;

  searchTerm = '';

  exercises: Ejercicio[] = [];

  pages: Ejercicio[][] = [];

  currentPage = 0;

  // =========================================================

  // CONTROL DEL FOCO AUTOMÁTICO

  // =========================================================

  parejaActivaId: number | null = null;

  tableroActivo: 'left' | 'right' = 'left';

  casillaActivaIndex = -1;

  errors = 0;

  maxErrors = 15;

  // =========================================================

  // CONTROL DEL TIEMPO

  // =========================================================

  tiempoInicio = 0;

  tiempoFin = 0;

  tiempoSegundos = 0;

  hintsVisible = false;

  hintsSecondsRemaining = 5;

  private hintsTimer: ReturnType<typeof setInterval> | null = null;

  selectedImage: string | null = null;

  selectedImageWord = '';

  selectedImageMeaning = '';

  message = '';

  resultModal: 'errors' | 'correct' | null = null;

  private refreshCategories(): void {
    this.categories = [
      ...new Set(
        this.words

          .map((w) => w.category?.trim())

          .filter((v): v is string => !!v),
      ),
    ].sort((a, b) => a.localeCompare(b, 'es'));

    this.selectedCategories = this.selectedCategories.filter((c) =>
      this.categories.includes(c),
    );

    this.adjustCount();
  }

  get allCategoriesSelected(): boolean {
    return (
      this.categories.length > 0 &&
      this.selectedCategories.length === this.categories.length
    );
  }

  get categoryDisplayName(): string {
    return this.allCategoriesSelected
      ? 'Todas las palabras'
      : this.selectedCategories

          .slice()

          .sort((a, b) => a.localeCompare(b, 'es'))

          .join(', ');
  }

  get availableWords(): PalabraOrdenar[] {
    const query = this.normalize(this.searchTerm);

    return this.words.filter(
      (w) =>
        this.selectedCategories.includes(w.category?.trim()) &&
        !!w.text?.trim() &&
        !!(this.reviewType === 'meaning'
          ? w.meaning?.trim()
          : w.right?.trim()) &&
        (!query ||
          [w.text, w.right, w.meaning].some((s) =>
            this.normalize(s).includes(query),
          )),
    );
  }

  // ======================================================

  // FILTRAR PALABRAS PARA LA BÚSQUEDA

  // ======================================================

  get filteredSearchWords(): PalabraOrdenar[] {
    const query = this.normalize(this.searchTerm);

    if (!query) {
      return [];
    }

    return this.words.filter((word) => {
      const belongsToCategory = this.selectedCategories.includes(
        word.category?.trim(),
      );

      const matchesSearch =
        this.normalize(word.text).includes(query) ||
        this.normalize(word.right).includes(query) ||
        this.normalize(word.meaning).includes(query);

      return belongsToCategory && matchesSearch;
    });
  }

  get totalPages(): number {
    return this.pages.length;
  }

  get completedPairs(): number {
    return this.exercises.filter((e) => e.completed).length;
  }

  get currentPageCompleted(): number {
    return (this.pages[this.currentPage] || []).filter((e) => e.completed)
      .length;
  }

  get attemptsRemaining(): number {
    return Math.max(0, this.maxErrors - this.errors);
  }

  get gameWon(): boolean {
    return (
      this.gameFinished &&
      this.completedPairs === this.exercises.length &&
      this.exercises.length > 0
    );
  }

  // =========================================================

  // PERMITIR GUARDAR PUNTAJE

  // =========================================================

  get puedeGuardarPuntaje(): boolean {
    return (
      this.gameFinished &&
      this.gameWon &&
      this.exercises.length > 0 &&
      this.correctExercises.length > this.errors
    );
  }

  normalize(value: string | undefined): string {
    return (value || '')

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .toLocaleLowerCase()

      .trim();
  }

  toggleCategory(category: string, checked: boolean): void {
    this.selectedCategories = checked
      ? [...new Set([...this.selectedCategories, category])]
      : this.selectedCategories.filter((c) => c !== category);

    this.categorySelected = this.selectedCategories.length > 0;

    this.categoryWarning = false;

    this.adjustCount();
  }

  toggleAllCategories(checked: boolean): void {
    this.selectedCategories = checked ? [...this.categories] : [];

    this.categorySelected = this.selectedCategories.length > 0;

    if (checked) this.categoryMenuOpen = false;

    this.categoryWarning = false;

    this.adjustCount();
  }

  adjustCount(): void {
    const totalDisponibles = this.availableWords.length;

    // Ninguna categoría seleccionada

    if (this.selectedCategories.length === 0 || totalDisponibles === 0) {
      this.selectedPairCount = 0;

      return;
    }

    // Todas las categorías seleccionadas

    if (this.allCategoriesSelected) {
      this.selectedPairCount = totalDisponibles;

      return;
    }

    this.selectedPairCount = Math.min(12, this.availableWords.length);
  }

  // ======================================================

  // VALIDAR CATEGORÍAS Y MOSTRAR CONFIGURACIÓN

  // ======================================================

  selectCategoryAndContinue(): void {
    // Solo validar que haya categorías seleccionadas

    if (this.selectedCategories.length === 0) {
      this.categoryWarning = true;

      this.categorySelected = false;

      return;
    }

    // Ocultar advertencia

    this.categoryWarning = false;

    // Cerrar el selector desplegable

    this.categoryMenuOpen = false;

    // Mostrar el formulario de configuración

    this.categorySelected = true;

    // Actualizar cantidad de parejas disponibles

    this.adjustCount();
  }

  changeCategory(): void {
    this.stopAudio();

    this.gameStarted = false;

    this.gameFinished = false;

    this.categorySelected = false;

    this.categoryWarning = false;

    this.closeHints();

    this.message = '';
  }

  private shuffle<T>(items: T[]): T[] {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  private hiddenCount(length: number): number {
    if (length <= 1) return length;

    if (length <= 3) return Math.min(length - 1, 2);

    const maximum = length <= 5 ? 3 : length <= 8 ? 4 : length <= 10 ? 5 : 6;

    const minimum = Math.min(3, maximum, length - 1);

    return Math.min(
      length - 1,

      minimum + Math.floor(Math.random() * (maximum - minimum + 1)),
    );
  }

  private makeBoard(word: string): Tablero {
    const chars = Array.from(word);

    const eligible = chars

      .map((char, i) => (/\p{L}/u.test(char) ? i : -1))

      .filter((i) => i >= 0);

    const count = this.hiddenCount(eligible.length);

    const hidden = new Set(this.shuffle(eligible).slice(0, count));

    const cells: Casilla[] = chars.map((letter, i) => {
      const isSpace = /\s/.test(letter);

      const fixed = !hidden.has(i);

      return {
        letter,

        fixed,

        isSpace,

        value: fixed ? letter : '',

        bankId: null,

        correct: null,
      };
    });

    const bank = this.shuffle(
      cells

        .filter((c) => !c.fixed)

        .map((c, i) => ({ id: i, letter: c.letter, used: false })),
    );

    return { original: word, cells, bank, completed: bank.length === 0 };
  }

  startGame(): void {
    const available = [...this.availableWords];

    if (!available.length) {
      this.message = 'No hay palabras disponibles para esta configuración.';

      return;
    }

    const count = Math.min(
      Math.max(1, Math.floor(Number(this.selectedPairCount) || 1)),

      available.length,
    );

    const ordered =
      this.wordOrder === 'random'
        ? this.shuffle(available)
        : available.sort((a, b) =>
            this.wordOrder === 'ascending'
              ? a.text.localeCompare(b.text)
              : b.text.localeCompare(a.text),
          );

    this.startWithWords(ordered.slice(0, count));
  }

  private startWithWords(words: PalabraOrdenar[]): void {
    // Reiniciar el control de pronunciación en cada partida.
    this.tablerosPronunciados = new WeakSet<Tablero>();

    this.closeHints();

    this.resultModal = null;

    this.exercises = words.map((word, id) => {
      const left = this.makeBoard(word.text);

      const right = this.makeBoard(
        this.reviewType === 'meaning' ? word.meaning : word.right,
      );

      return {
        id,

        image: word.image,

        meaning: word.meaning,

        left,

        right,

        completed: left.completed && right.completed,

        errors: 0,

        source: word,
      };
    });

    this.pages = [];

    for (let i = 0; i < this.exercises.length; i += this.wordsPerPage) {
      this.pages.push(this.exercises.slice(i, i + this.wordsPerPage));
    }

    this.currentPage = 0;

    this.errors = 0;

    this.message = '';

    this.closeHints();

    this.gameFinished = false;

    this.gameStarted = true;

    // =========================================================

    // INICIAR TIEMPO

    // =========================================================

    this.tiempoInicio = Date.now();

    this.tiempoFin = 0;

    this.tiempoSegundos = 0;

    this.checkGameEnd();

    // Enfocar la primera casilla al comenzar

    this.enfocarSiguientePareja();
  }

  nextEmptyIndex(board: Tablero): number {
    return board.cells.findIndex((cell) => !cell.fixed && !cell.value);
  }

  placeLetter(board: Tablero, letter: LetraBanco, exercise: Ejercicio): void {
    if (
      this.gameFinished ||
      exercise.completed ||
      board.completed ||
      letter.used
    )
      return;

    // Un error se muestra en rojo hasta que el alumno vuelve a elegir.

    const wrong = board.cells.find((c) => !c.fixed && c.correct === false);

    if (wrong) {
      wrong.value = '';

      wrong.correct = null;
    }

    const index = this.nextEmptyIndex(board);

    if (index < 0) return;

    const target = board.cells[index];

    if (this.normalize(letter.letter) !== this.normalize(target.letter)) {
      this.errors++;

      exercise.errors++;

      target.value = letter.letter;

      target.correct = false;

      this.message = 'Letra incorrecta. Inténtalo de nuevo.';

      this.checkGameEnd();

      if (!this.gameFinished) {
        this.enfocarSiguientePareja();
      }

      return;
    }

    target.value = letter.letter;

    target.correct = true;

    target.bankId = letter.id;

    letter.used = true;

    this.message = '';

    board.completed = this.nextEmptyIndex(board) === -1;

    if (exercise.left.completed && exercise.right.completed) {
      exercise.completed = true;

      this.message = '¡Pareja completada correctamente!';
    }

    this.checkGameEnd();

    // =========================================================

    // AVANCE AUTOMÁTICO DE PANTALLA

    // =========================================================

    if (
      !this.gameFinished &&
      this.currentPage < this.totalPages - 1 &&
      this.currentPageCompleted === this.pages[this.currentPage].length
    ) {
      this.currentPage++;

      this.message = '';
    }

    // =========================================================

    // ENFOCAR LA SIGUIENTE CASILLA O PAREJA

    // =========================================================

    this.enfocarSiguientePareja();
  }

  removeLetter(board: Tablero, cell: Casilla, exercise: Ejercicio): void {
    if (this.gameFinished || exercise.completed || cell.fixed || !cell.value)
      return;

    const letter = board.bank.find((l) => l.id === cell.bankId);

    if (letter) letter.used = false;

    cell.value = '';

    cell.bankId = null;

    cell.correct = null;

    board.completed = false;
  }

  private languageFor(board: Tablero, exercise: Ejercicio): 'en-US' | 'es-ES' {
    return board === exercise.right && this.reviewType === 'meaning'
      ? 'es-ES'
      : 'en-US';
  }

  // Cada tablero pronuncia una sola vez su palabra durante la partida.
  private tablerosPronunciados = new WeakSet<Tablero>();

  activateSlot(board: Tablero, cell: Casilla, exercise: Ejercicio): void {
    if (!this.voiceEnabled || exercise.completed || this.gameFinished) return;

    // Solo la primera casilla oculta de la palabra puede activar la voz.
    const primeraCasilla = board.cells.find((c) => !c.isSpace && !c.fixed);
    if (primeraCasilla !== cell) return;

    // El foco automático puede regresar a la misma casilla: no repetir audio.
    if (this.tablerosPronunciados.has(board)) return;

    this.tablerosPronunciados.add(board);
    this.playAudio(board.original, this.languageFor(board, exercise));
  }

  // =========================================================
  // REPRODUCIR AUDIO AL HACER CLIC
  // SOLO EN LA PRIMERA CASILLA OCULTA DE CADA PALABRA
  // =========================================================

  activarAudioPrimerCampo(
    board: Tablero,
    cell: Casilla,
    exercise: Ejercicio,
  ): void {
    if (!this.voiceEnabled || exercise.completed || this.gameFinished) {
      return;
    }

    const primerIndice = board.cells.findIndex((c) => !c.isSpace && !c.fixed);

    if (primerIndice === -1 || board.cells[primerIndice] !== cell) {
      return;
    }

    this.playAudio(board.original, this.languageFor(board, exercise));
  }

  speakBoard(board: Tablero, exercise: Ejercicio): void {
    this.playAudio(board.original, this.languageFor(board, exercise));
  }

  playAudio(text: string, language: 'en-US' | 'es-ES' = 'en-US'): void {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;

    const clean = text.trim();

    if (!clean) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);

    utterance.lang = language;

    utterance.rate = Number(this.voiceRate) || 1;

    window.speechSynthesis.speak(utterance);
  }

  stopAudio(): void {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  // =========================================================

  // COMPROBAR FINALIZACIÓN DEL JUEGO

  // =========================================================

  private checkGameEnd(): void {
    if (
      this.errors >= this.maxErrors ||
      (this.exercises.length > 0 &&
        this.completedPairs === this.exercises.length)
    ) {
      this.gameFinished = true;

      this.finalizarTiempo();

      this.closeHints();

      this.stopAudio();
    }
  }

  // =========================================================

  // PRACTICAR EXCLUSIVAMENTE LAS PAREJAS CON ERRORES

  // =========================================================

  practiceErrors(): void {
    const words = this.errorExercises.map((exercise) => exercise.source);

    if (!words.length) return;

    this.startWithWords(words);
  }

  get pendingHintExercises(): Ejercicio[] {
    return (this.pages[this.currentPage] || []).filter(
      (exercise) => !exercise.completed,
    );
  }

  // =========================================================

  // PISTAS: MODAL DE SOLO LECTURA DURANTE 5 SEGUNDOS

  // =========================================================

  openHints(): void {
    if (!this.gameStarted || this.gameFinished) return;

    this.closeHints();

    this.hintsSecondsRemaining = 5;

    this.hintsVisible = true;

    this.hintsTimer = setInterval(() => {
      this.hintsSecondsRemaining--;

      if (this.hintsSecondsRemaining <= 0) this.closeHints();
    }, 1000);
  }

  closeHints(): void {
    if (this.hintsTimer !== null) {
      clearInterval(this.hintsTimer);

      this.hintsTimer = null;
    }

    this.hintsVisible = false;
  }

  get correctExercises(): Ejercicio[] {
    return this.exercises.filter((e) => e.completed && e.errors === 0);
  }

  get errorExercises(): Ejercicio[] {
    return this.exercises.filter((e) => e.errors > 0);
  }

  openResultsModal(kind: 'errors' | 'correct'): void {
    this.resultModal = kind;
  }

  closeResultsModal(): void {
    this.resultModal = null;
  }

  // =========================================================

  // GUARDAR PUNTAJE

  // =========================================================

  guardarPuntaje(): void {
    // =====================================================

    // VALIDAR SI SE PUEDE GUARDAR

    // =====================================================

    if (!this.puedeGuardarPuntaje) {
      console.warn('No se puede guardar el puntaje.', {
        correctas: this.correctExercises.length,

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

    // CATEGORÍAS ORDENADAS

    // =====================================================

    const categoriasOrdenadas = this.categoryDisplayName;

    // =====================================================

    // TIPO DE REPASO

    // =====================================================

    const repasoParaPuntuacion =
      this.reviewType === 'meaning' ? 'Verbo → Significado' : 'Verbo → Pareja';

    // =====================================================

    // NAVEGAR AL COMPONENTE PUNTUACIÓN

    // =====================================================

    this.router.navigate(['/puntuacion'], {
      state: {
        juego: 'completar-palabra',

        categoria: categoriasOrdenadas,

        correctas: this.correctExercises.length,

        total: this.exercises.length,

        errores: this.errors,

        repaso: repasoParaPuntuacion,

        tiempoSegundos: this.tiempoSegundos,
      },
    });
  }

  openImage(image: string, word: string, meaning: string): void {
    this.selectedImage = image;

    this.selectedImageWord = word;

    this.selectedImageMeaning = meaning;
  }

  closeImage(): void {
    this.selectedImage = null;
  }

  // =========================================================

  // FINALIZAR TIEMPO

  // =========================================================

  finalizarTiempo(): void {
    if (this.tiempoInicio === 0 || this.tiempoFin !== 0) {
      return;
    }

    this.tiempoFin = Date.now();

    this.tiempoSegundos = Math.floor(
      (this.tiempoFin - this.tiempoInicio) / 1000,
    );
  }

  esCasillaActiva(exercise: Ejercicio, board: Tablero, cell: Casilla): boolean {
    if (this.gameFinished || exercise.completed) return false;

    const lado = board === exercise.left ? 'left' : 'right';

    return (
      exercise.id === this.parejaActivaId &&
      lado === this.tableroActivo &&
      board.cells.indexOf(cell) === this.casillaActivaIndex
    );
  }

  // =========================================================

  // BUSCAR Y ENFOCAR LA SIGUIENTE CASILLA PENDIENTE

  // =========================================================

  // =========================================================

  // FOCO REAL EN LA PRIMERA CASILLA PENDIENTE

  // - Al iniciar la partida

  // - Después de colocar cada letra

  // - Al completar una pareja o cambiar de pantalla

  // =========================================================

  private focusRequestId = 0;

  enfocarSiguientePareja(): void {
    const requestId = ++this.focusRequestId;

    if (!this.gameStarted || this.gameFinished) {
      this.parejaActivaId = null;

      this.casillaActivaIndex = -1;

      return;
    }

    const pendientes = this.pages[this.currentPage] || [];

    for (const exercise of pendientes) {
      if (exercise.completed) continue;

      for (const lado of ['left', 'right'] as const) {
        const board = exercise[lado];

        const index = this.nextEmptyIndex(board);

        if (index < 0) continue;

        this.parejaActivaId = exercise.id;

        this.tableroActivo = lado;

        this.casillaActivaIndex = index;

        // Actualiza las clases dinámicas antes de buscar el botón.

        this.cdr.detectChanges();

        // El DOM debe existir después de *ngIf / *ngFor.

        setTimeout(() => {
          if (requestId !== this.focusRequestId || this.gameFinished) return;

          const boton =
            this.host.nativeElement.querySelector<HTMLButtonElement>(
              '.exercise-pair.pareja-activa .letter-slot.casilla-activa',
            );

          if (!boton || boton.disabled) return;

          boton.focus({ preventScroll: true });

          boton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 0);

        return;
      }
    }

    this.parejaActivaId = null;

    this.casillaActivaIndex = -1;
  }

  printVocabulary(): void {
    const escapeHtml = (value: string): string =>
      String(value ?? '')
        .replace(/&/g, '&amp;')

        .replace(/</g, '&lt;')

        .replace(/>/g, '&gt;')

        .replace(/"/g, '&quot;')

        .replace(/'/g, '&#39;');

    let words = [...this.availableWords];

    if (this.wordOrder === 'random') words = this.shuffle(words);

    if (this.wordOrder === 'ascending')
      words.sort((a, b) => a.text.localeCompare(b.text, 'es'));

    if (this.wordOrder === 'descending')
      words.sort((a, b) => b.text.localeCompare(a.text, 'es'));

    const count = Math.min(
      Math.max(1, Math.floor(Number(this.selectedPairCount) || 1)),

      words.length,
    );

    const selected = words.slice(0, count);

    if (!selected.length) {
      this.message = 'No hay palabras para imprimir.';

      return;
    }

    const rows = selected

      .map((word, index) => {
        const safeImage =
          /^https?:\/\//i.test(word.image || '') ||
          /^data:image\/(png|jpeg|gif|webp);base64,/i.test(word.image || '')
            ? `<img src="${escapeHtml(word.image || '')}" alt="Imagen" />`
            : '';

        return `<tr><td>${index + 1}</td><td>${safeImage}</td><td>${escapeHtml(word.text)}</td><td>${escapeHtml(word.right)}</td><td>${escapeHtml(word.meaning)}</td><td>${escapeHtml(word.category)}</td></tr>`;
      })

      .join('');

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      this.message =
        'Permite las ventanas emergentes para imprimir el vocabulario.';

      return;
    }

    printWindow.document.open();

    printWindow.document
      .write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Vocabulario</title>

      <style>body{font-family:Arial,sans-serif;margin:20px}h1{text-align:center;font-size:24px}

      p{text-align:center}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #bbb;padding:9px;text-align:center}

      th{background:#5076ba;color:white}td img{max-width:65px;max-height:65px;object-fit:contain}

      @media print{@page{size:A4 landscape;margin:12mm}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body>

      <h1>📚 Vocabulario</h1><p>Categoría Palabra: ${escapeHtml(this.categoryDisplayName)}</p>

      <table><thead><tr><th>N.º</th><th>Imagen</th><th>Palabra</th><th>Pareja</th><th>Significado</th><th>Categoría</th></tr></thead><tbody>${rows}</tbody></table>

      </body></html>`);

    printWindow.document.close();

    printWindow.focus();

    printWindow.addEventListener('load', () => printWindow.print(), {
      once: true,
    });
  }
}
