import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  QueryList,
  ViewChildren,
} from '@angular/core';
import {
  FirebaseWordsService,
  PairFirebase,
} from '../../servicios/firebase-words.service';

/* =========================================================
   TIPO DE PAREJA UTILIZADA DENTRO DEL JUEGO
\========================================================= */

type GamePair = PairFirebase & {
  id: string;
};

/* =========================================================
   PALABRA QUE SE MUESTRA EN CADA COLUMNA
\========================================================= */
interface WordItem {
  id: string;
  text: string;
  image?: string;
}

/* =========================================================
   CONEXIÓN ENTRE PALABRAS
\========================================================= */
interface Connection {
  leftId: string;
  rightId: string;
  correct: boolean;
}

/* =========================================================
   LÍNEAS VISUALES
\========================================================= */
interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  correct: boolean;
}

@Component({
  selector: 'app-relation-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relation-game.component.html',
  styleUrls: ['./relation-game.component.css'],
})
export class RelationGameComponent implements AfterViewInit {
  // =========================================================
  // TODAS LAS PALABRAS CARGADAS DESDE FIREBASE
  // =========================================================
  allPairs: GamePair[] = [];

  // =========================================================
  // PALABRAS DE LA CATEGORÍA ACTUAL
  // =========================================================
  pairs: GamePair[] = [];

  // =========================================================
  // CATEGORÍAS DISPONIBLES
  // =========================================================
  categories: string[] = [];

  // =========================================================
  // CATEGORÍA SELECCIONADA
  // =========================================================
  selectedCategory = '';

  // =========================================================
  // MENSAJE DE VALIDACIÓN DE CATEGORÍA
  // =========================================================
  categoryMessage = '';

  // =========================================================
  // TODAS LAS CATEGORÍAS
  // =========================================================
  readonly ALL_CATEGORIES = '__ALL__';

  // =========================================================
  // INDICA SI YA SE ESCOGIÓ CATEGORÍA
  // =========================================================
  categorySelected = false;

  // =========================================================
  // ESTADO DE CARGA DE FIREBASE
  // =========================================================
  loadingWords = true;

  loadError = '';

  // =========================================================
  // CONFIGURACIÓN DEL JUEGO
  // =========================================================

  readonly rowsPerPage = 6;

  // =========================================================
  // MÁXIMO DE ERRORES / VIDAS
  // =========================================================

  get maxErrors(): number {
    const cantidadParejas =
      this.gamePairs.length > 0
        ? this.gamePairs.length
        : this.selectedPairCount;
    // 5 vidas por cada 6 parejas
    // con un mínimo de 6 vidas

    return Math.max(6, Math.ceil((cantidadParejas * 5) / 6),);
  }

  errors = 0;

  currentPage = 0;

  selectedPairCount = 12;

  // =========================================================
  // TIPO DE REPASO
  // =========================================================
  reviewType: 'right' | 'meaning' = 'right';

  // =========================================================
  // ORDEN DE LAS PALABRAS
  // =========================================================
  wordOrder: 'random' | 'original' = 'random';

  // =========================================================
  // CONTROL DEL TIEMPO DE LA PARTIDA
  // =========================================================
  /**
   * Momento exacto en que comenzó la partida.
   * Se almacena como timestamp en milisegundos.
   */
  private tiempoInicio = 0;

  /**
   * Tiempo final utilizado por el jugador.
   * Se almacena en segundos.
   */
  tiempoSegundos = 0;

  /**
   * Indica si actualmente se está midiendo el tiempo.
   */
  private cronometroActivo = false;

  // =========================================================
  // PAREJAS UTILIZADAS EN LA PARTIDA
  // =========================================================
  gamePairs: GamePair[] = [];

  // =========================================================
  // PÁGINAS
  // =========================================================
  pages: GamePair[][] = [];

  // =========================================================
  // COLUMNAS
  // =========================================================
  leftWords: WordItem[][] = [];
  rightWords: WordItem[][] = [];

  // =========================================================
  // CONEXIONES
  // =========================================================
  connections: Connection[] = [];

  // =========================================================
  // PALABRA IZQUIERDA SELECCIONADA
  // =========================================================
  selectedLeft: WordItem | null = null;

  // =========================================================
  // LÍNEAS
  // =========================================================
  lines: Line[] = [];

  // =========================================================
  // ESTADO DEL JUEGO
  // =========================================================
  finished = false;

  gameWon = false;

  changingPage = false;

  // =========================================================
  // ERRORES POR CADA PAREJA
  // =========================================================
  pairErrors: Record<string, number> = {};

  // =========================================================
  // INDICA SI ESTAMOS PRACTICANDO SOLO LOS ERRORES
  // =========================================================
  practicingOnlyErrors = false;

  // =========================================================
  // DETALLE DE RESULTADOS
  // =========================================================
  showResultsDetail = false;

  // =========================================================
  // VISTA DEL RESULTADO
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

  // =========================================================
  // PALABRA EN INGLÉS DE LA IMAGEN AMPLIADA
  // =========================================================
  selectedImageWord = '';

  // =========================================================
  // SIGNIFICADO DE LA IMAGEN AMPLIADA
  // =========================================================
  selectedImageMeaning = '';

  // =========================================================
  // BOTONES IZQUIERDOS
  // =========================================================
  @ViewChildren('leftButton')
  leftButtons!: QueryList<ElementRef<HTMLElement>>;

  // =========================================================
  // BOTONES DERECHOS
  // =========================================================
  @ViewChildren('rightButton')
  rightButtons!: QueryList<ElementRef<HTMLElement>>;

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

    this.wordsService.getPairs((firebasePairs: PairFirebase[]) => {
      this.allPairs = firebasePairs.filter(
        (pair): pair is GamePair =>
          typeof pair.id === 'string' && pair.id.length > 0,
      );

      this.loadingWords = false;

      this.categories = Array.from(
        new Set(
          this.allPairs
            .map((pair) => pair.categoriaPalabra?.trim())
            .filter((category): category is string => !!category),
        ),
      )

        .sort(
          (
            a,
            b,
          ) => a.localeCompare(b),
        );

      this.pairs = [];

      this.gamePairs = [];

      this.pages = [];

      this.leftWords = [];

      this.rightWords = [];

      this.connections = [];

      this.lines = [];

      this.selectedLeft = null;

      this.selectedImage = null;

      this.selectedImageWord = '';

      this.selectedImageMeaning = '';

      this.categorySelected = false;

      this.selectedCategory = '';

      this.categoryMessage = '';

      this.pairErrors = {};

      this.practicingOnlyErrors = false;

      this.showResultsDetail = false;

      this.resultsView = null;

      // =====================================================
      // REINICIAR CRONÓMETRO
      // =====================================================
      this.reiniciarCronometro();
    });
  }

  // =========================================================
  // DESPUÉS DE CARGAR LA VISTA
  // =========================================================
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.drawLines();
    });
  }

  // =========================================================
  // CAMBIO EN EL SELECTOR DE CATEGORÍA
  // =========================================================
  onCategoryChange(): void {
    this.categoryMessage = '';
    this.loadError = '';

    // =========================================================
    // NO HAY CATEGORÍA SELECCIONADA
    // =========================================================
    if (!this.selectedCategory || this.selectedCategory.trim() === '') {
      this.categorySelected = false;
      this.pairs = [];
      return;
    }

    // =========================================================
    // TODAS LAS PALABRAS
    // =========================================================
    if (this.selectedCategory === this.ALL_CATEGORIES) {
      this.pairs = [...this.allPairs];
    } else {
      // =======================================================
      // UNA CATEGORÍA ESPECÍFICA
      // =======================================================
      this.pairs = this.allPairs.filter(
        (pair) =>
          pair.categoriaPalabra?.trim().toLowerCase() ===
          this.selectedCategory.trim().toLowerCase(),
      );
    }

    // =========================================================
    // VALIDAR QUE EXISTAN PALABRAS
    // =========================================================
    if (this.pairs.length === 0) {
      this.categorySelected = false;
      this.loadError = 'No hay palabras disponibles en esta categoría.';
      return;
    }

    // =========================================================
    // PREPARAR CONFIGURACIÓN
    // =========================================================
    this.categorySelected = true;

    this.selectedPairCount = Math.min(6, this.pairs.length);

    this.reviewType = 'right';

    this.wordOrder = 'original';

    this.searchTerm = '';

    this.practicingOnlyErrors = false;

    // =========================================================
    // REINICIAR ESTADO DEL JUEGO
    // =========================================================
    this.gamePairs = [];

    this.pages = [];

    this.leftWords = [];

    this.rightWords = [];

    this.connections = [];

    this.lines = [];

    this.selectedLeft = null;

    this.errors = 0;

    this.currentPage = 0;

    this.finished = false;

    this.gameWon = false;

    this.changingPage = false;

    this.pairErrors = {};

    this.reiniciarCronometro();
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
    this.selectedPairCount = Math.min(6, this.pairs.length);
    this.searchTerm = '';
  }

  // =========================================================
  // CAMBIAR CATEGORÍA
  // =========================================================
  changeCategory(): void {
    this.closeHints();
    this.closeImage();
    this.closeResultsDetail();
    this.categorySelected = false;
    this.selectedCategory = '';
    this.categoryMessage = '';
    this.pairs = [];
    this.gamePairs = [];
    this.pages = [];
    this.leftWords = [];
    this.rightWords = [];
    this.connections = [];
    this.lines = [];
    this.selectedLeft = null;
    this.finished = false;
    this.gameWon = false;
    this.changingPage = false;
    this.errors = 0;
    this.currentPage = 0;
    this.searchTerm = '';
    this.reviewType = 'right';
    this.wordOrder = 'random';
    this.loadError = '';
    this.pairErrors = {};
    this.practicingOnlyErrors = false;
    // =========================================================
    // REINICIAR TIEMPO
    // =========================================================
    this.reiniciarCronometro();
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
  // INICIAR CRONÓMETRO
  // =========================================================
  private iniciarCronometro(): void {
    this.tiempoInicio = Date.now();

    this.tiempoSegundos = 0;

    this.cronometroActivo = true;

    console.log('⏱️ Cronómetro iniciado.');
  }

  // =========================================================
  // DETENER CRONÓMETRO
  // =========================================================
  private detenerCronometro(): void {
    if (!this.cronometroActivo || this.tiempoInicio <= 0) {
      return;
    }

    const tiempoFinal = Date.now();

    this.tiempoSegundos = Math.max(
      1,
      Math.floor((tiempoFinal - this.tiempoInicio) / 1000),
    );

    this.cronometroActivo = false;

    console.log('⏱️ Tiempo final:', this.tiempoSegundos, 'segundos',);
  }

  // =========================================================
  // REINICIAR CRONÓMETRO
  // =========================================================
  private reiniciarCronometro(): void {
    this.tiempoInicio = 0;

    this.tiempoSegundos = 0;

    this.cronometroActivo = false;
  }

  // =========================================================
  // OBTENER TIEMPO ACTUAL
  // =========================================================
  private obtenerTiempoActual(): number {
    if (!this.cronometroActivo || this.tiempoInicio <= 0) {
      return this.tiempoSegundos;
    }

    return Math.max(
      0,

      Math.floor((Date.now() - this.tiempoInicio) / 1000),
    );
  }

  // =========================================================
  // TIEMPO FORMATEADO
  // =========================================================
  get tiempoFormateado(): string {
    const segundos = this.obtenerTiempoActual();

    const minutos = Math.floor(segundos / 60);

    const segundosRestantes = segundos % 60;

    return (
      `${minutos

        .toString()

        .padStart(2, '0')}:` +
      `${segundosRestantes

        .toString()

        .padStart(2, '0')}`
    );
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

    this.closeHints();
    this.closeImage();
    this.closeResultsDetail();
    this.errors = 0;
    this.currentPage = 0;
    this.connections = [];
    this.selectedLeft = null;
    this.finished = false;
    this.gameWon = false;
    this.changingPage = false;
    this.lines = [];
    this.pairErrors = {};

    this.reiniciarCronometro();

    if (!this.selectedPairCount || this.selectedPairCount < 1) {
      this.selectedPairCount = 1;
    }

    if (this.selectedPairCount > this.pairs.length) {
      this.selectedPairCount = this.pairs.length;
    }

    let preparedPairs: GamePair[] = [...this.pairs];

    if (this.wordOrder === 'random') {
      preparedPairs = this.shuffle(preparedPairs);
    }

    this.gamePairs = preparedPairs.slice(0, this.selectedPairCount);
    this.iniciarCronometro();
    this.pages = this.chunk(this.gamePairs, this.rowsPerPage);
    this.leftWords = [];
    this.rightWords = [];

    this.pages.forEach((page) => {
      const left: WordItem[] = page.map((pair) => ({
        id: pair.id,
        text: pair.left,
        image: pair.image,
      }));

      const right: WordItem[] = page.map((pair) => ({
        id: pair.id,
        text: this.reviewType === 'meaning' ? pair.meaning : pair.right,
      }));

      if (this.wordOrder === 'random') {
        this.leftWords.push(this.shuffle(left));
      } else {
        this.leftWords.push(left);
      }

      this.rightWords.push(this.shuffle(right));
    });

    setTimeout(() => {
      this.drawLines();
    });
  }

  // =========================================================
  // SELECCIONAR PALABRA IZQUIERDA
  // =========================================================
  selectLeft(word: WordItem): void {
    if (
      this.finished ||
      this.changingPage ||
      this.showHints ||
      this.selectedImage
    ) {
      return;
    }

    if (this.isLeftConnected(word.id)) {
      return;
    }

    this.selectedLeft = word;
  }

  // =========================================================
  // SELECCIONAR PALABRA DERECHA
  // =========================================================
  selectRight(word: WordItem): void {
    if (
      this.finished ||
      this.changingPage ||
      this.showHints ||
      this.selectedImage ||
      !this.selectedLeft
    ) {
      return;
    }

    if (this.isRightConnected(word.id)) {
      return;
    }

    const left = this.selectedLeft;

    const correct = left.id === word.id;

    // =========================================================
    // RESPUESTA CORRECTA
    // =========================================================
    if (correct) {
      this.connections.push({
        leftId: left.id,
        rightId: word.id,
        correct: true,
      });

      this.selectedLeft = null;

      setTimeout(() => {this.drawLines(); this.checkCurrentPageComplete();}, 100);

      return;
    }

    // =========================================================
    // RESPUESTA INCORRECTA
    // =========================================================
    this.errors++;

    // =========================================================
    // ERROR DE ESTA PAREJA
    // =========================================================
    this.pairErrors[left.id] = (this.pairErrors[left.id] ?? 0) + 1;

    this.connections.push({
      leftId: left.id,
      rightId: word.id,
      correct: false,
    });

    this.selectedLeft = null;

    setTimeout(() => {
      this.drawLines();
    });

    // =========================================================
    // QUITAR LÍNEA INCORRECTA
    // =========================================================
    setTimeout(() => {
      this.connections = this.connections.filter(
        (connection) =>
          !(
            connection.leftId === left.id &&
            connection.rightId === word.id &&
            connection.correct === false
          ),
      );

      this.drawLines();
    }, 700);

    // =========================================================
    // PERDER AL LLEGAR A 10 ERRORES
    // =========================================================
    if (this.errors >= this.maxErrors) {
      setTimeout(() => {
        this.finished = true;
        this.gameWon = false;
        // =====================================================
        // DETENER CRONÓMETRO
        // =====================================================
        this.detenerCronometro();
      }, 750);
    }
  }

  // =========================================================
  // COMPROBAR SI LA PÁGINA ESTÁ COMPLETA
  // =========================================================
  checkCurrentPageComplete(): void {
    if (this.finished || this.changingPage) {
      return;
    }

    const currentPairs = this.pages[this.currentPage];

    if (!currentPairs) {
      return;
    }

    const pageComplete = currentPairs.every((pair) =>
      this.connections.some(
        (connection) =>
          connection.correct &&
          connection.leftId === pair.id &&
          connection.rightId === pair.id,
      ),
    );

    if (!pageComplete) {
      return;
    }

    // =========================================================
    // SI ES LA ÚLTIMA PÁGINA
    // =========================================================
    if (this.currentPage === this.pages.length - 1) {
      this.finished = true;

      this.gameWon = true;

      // =======================================================
      // DETENER CRONÓMETRO
      // =======================================================
      this.detenerCronometro();

      // =======================================================
      // SI ESTABA PRACTICANDO LOS ERRORES
      // Y LOS SUPERÓ SIN NUEVOS ERRORES,
      // RESTAURAR TODA LA CATEGORÍA
      // =======================================================
      if (this.practicingOnlyErrors && this.errors === 0) {
        this.restoreNormalGame();
      }

      return;
    }

    // =========================================================
    // PASAR A SIGUIENTE PÁGINA
    // =========================================================
    this.changingPage = true;

    setTimeout(() => {
      this.currentPage++;

      this.selectedLeft = null;

      this.lines = [];

      this.changingPage = false;

      setTimeout(() => {
        this.drawLines();
      });
    }, 700);
  }

  // =========================================================
  // MOSTRAR PISTAS
  // =========================================================
  showHintsPanel(): void {
    if (this.finished || this.changingPage || this.selectedImage) {
      return;
    }

    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
    }

    const currentPairs = this.pages[this.currentPage] ?? [];

    const pendingPairs = currentPairs.filter(
      (pair) =>
        !this.connections.some(
          (connection) =>
            connection.correct &&
            connection.leftId === pair.id &&
            connection.rightId === pair.id,
        ),
    );

    if (pendingPairs.length === 0) {
      return;
    }

    this.hints = this.shuffle([...pendingPairs]).slice(0,6,);

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
  // ABRIR IMAGEN AMPLIADA
  // =========================================================
  openImage(
    image: string | undefined,
    word: string,
    meaning: string,
  ): void {
    if (!image) {
      return;
    }

    this.selectedImage = image;

    this.selectedImageWord = word;

    this.selectedImageMeaning = meaning;
  }

  // =========================================================
  // CERRAR IMAGEN AMPLIADA
  // =========================================================
  closeImage(): void {
    this.selectedImage = null;
    this.selectedImageWord = '';
    this.selectedImageMeaning = '';
  }

  // =========================================================
  // OBTENER SIGNIFICADO DE UNA PALABRA POR SU ID
  // =========================================================
  getMeaningById(id: string): string {
    const pair = this.allPairs.find((item) => item.id === id);

    return pair?.meaning || '';
  }

  // =========================================================
  // SABER SI UNA PALABRA IZQUIERDA YA ESTÁ CONECTADA
  // =========================================================
  isLeftConnected(id: string): boolean {
    return this.connections.some(
      (connection) => connection.leftId === id && connection.correct,
    );
  }

  // =========================================================
  // SABER SI UNA PALABRA DERECHA YA ESTÁ CONECTADA
  // =========================================================
  isRightConnected(id: string): boolean {
    return this.connections.some(
      (connection) => connection.rightId === id && connection.correct,
    );
  }

  // =========================================================
  // SABER SI ESTÁ SELECCIONADA
  // =========================================================
  isSelected(id: string): boolean {
    return this.selectedLeft?.id === id;
  }

  // =========================================================
  // TOTAL RESPUESTAS CORRECTAS
  // =========================================================
  get correctAnswers(): number {
    return this.connections.filter((connection) => connection.correct).length;
  }

  // =========================================================
  // INTENTOS RESTANTES
  // Se conserva porque puede utilizarse en la interfaz
  // del juego, pero YA NO se envía a puntuación.
  // =========================================================
  get remainingAttempts(): number {
    return Math.max(
      this.maxErrors - this.errors,

      0,
    );
  }

  // =========================================================
  // CANTIDAD DE ERRORES DE UNA PAREJA
  // =========================================================
  getPairErrorCount(id: string): number {
    return this.pairErrors[id] ?? 0;
  }

  // =========================================================
  // SABER SI UNA PAREJA FUE COMPLETADA
  // =========================================================
  isPairCompleted(id: string): boolean {
    return this.connections.some(
      (connection) =>
        connection.correct &&
        connection.leftId === id &&
        connection.rightId === id,
    );
  }

  // =========================================================
  // PALABRAS CORRECTAS SIN NINGÚN ERROR
  // =========================================================
  get correctWords(): GamePair[] {
    return this.gamePairs.filter(
      (pair) =>
        this.isPairCompleted(pair.id) && this.getPairErrorCount(pair.id) === 0,
    );
  }

  // =========================================================
  // PALABRAS EN LAS QUE HUBO ERRORES
  // =========================================================
  get wordsWithErrors(): GamePair[] {
    return this.gamePairs.filter((pair) => this.getPairErrorCount(pair.id) > 0);
  }

  // =========================================================
  // TOTAL DE PALABRAS CORRECTAS SIN ERROR
  // =========================================================
  get totalCorrectWords(): number {
    return this.correctWords.length;
  }

  // =========================================================
  // PERMITIR GUARDAR PUNTAJE
  // El botón Guardar puntaje solamente debe aparecer cuando:
  // 1. El jugador haya ganado.
  // 2. Existan palabras en la partida.
  // 3. Las palabras correctas SIN ERROR sean mayores
  //    que la cantidad total de errores cometidos.
  // Ejemplos:
  // 4 correctas y 2 errores  -> SÍ puede guardar
  // 4 correctas y 4 errores  -> NO puede guardar
  // 4 correctas y 6 errores  -> NO puede guardar
  // 6 correctas y 0 errores  -> SÍ puede guardar
  // =========================================================
  get puedeGuardarPuntaje(): boolean {
    return (
      this.gameWon &&
      this.gamePairs.length > 0 &&
      this.totalCorrectWords > this.errors
    );
  }

  // =========================================================
  // TOTAL DE PALABRAS EN LAS QUE HUBO ERRORES
  // =========================================================
  get totalWordsWithErrors(): number {
    return this.wordsWithErrors.length;
  }

  // =========================================================
  // MOSTRAR PALABRAS CORRECTAS
  // =========================================================
  showCorrectWords(): void {
    this.resultsView = 'correct';

    this.showResultsDetail = true;
  }

  // =========================================================
  // MOSTRAR PALABRAS CON ERRORES
  // =========================================================
  showErrorWords(): void {
    this.resultsView = 'errors';

    this.showResultsDetail = true;
  }

  // =========================================================
  // PRACTICAR SOLO LAS PALABRAS CON ERRORES
  // =========================================================
  practiceErrorWords(): void {
    if (this.wordsWithErrors.length === 0) {
      return;
    }

    const errorIds = new Set(this.wordsWithErrors.map((pair) => pair.id));

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
    this.pairs = this.allPairs.filter(
      (pair) =>
        pair.categoriaPalabra

          ?.trim()

          .toLowerCase() ===
        this.selectedCategory

          .trim()

          .toLowerCase(),
    );

    this.selectedPairCount = this.pairs.length;

    this.practicingOnlyErrors = false;
  }

  // =========================================================
  // CERRAR DETALLE DE RESULTADOS
  // =========================================================
  closeResultsDetail(): void {
    this.showResultsDetail = false;

    this.resultsView = null;
  }

  // =========================================================
  // ESTAMOS VIENDO PALABRAS CORRECTAS
  // =========================================================
  get showingCorrectWords(): boolean {
    return this.resultsView === 'correct';
  }

  // =========================================================
  // ESTAMOS VIENDO PALABRAS CON ERRORES
  // =========================================================
  get showingErrorWords(): boolean {
    return this.resultsView === 'errors';
  }

  // =========================================================
  // TOTAL PÁGINAS
  // =========================================================
  get totalPages(): number {
    return this.pages.length;
  }

  // =========================================================
  // CORRECTAS EN LA PÁGINA ACTUAL
  // =========================================================
  get currentPageCorrectAnswers(): number {
    const page = this.pages[this.currentPage];

    if (!page) {
      return 0;
    }

    return page.filter((pair) =>
      this.connections.some(
        (connection) =>
          connection.correct &&
          connection.leftId === pair.id &&
          connection.rightId === pair.id,
      ),
    ).length;
  }

  // =========================================================
  // DIBUJAR LÍNEAS
  // =========================================================
  drawLines(): void {
    if (!this.leftButtons || !this.rightButtons) {
      return;
    }

    const newLines: Line[] = [];

    const currentIds =
      this.pages[this.currentPage]?.map((pair) => pair.id) ?? [];

    const visibleConnections = this.connections.filter((connection) =>
      currentIds.includes(connection.leftId),
    );

    const boardElement = document.querySelector('.game-board');

    if (!boardElement) {
      return;
    }

    const board = boardElement.getBoundingClientRect();

    visibleConnections.forEach((connection) => {
      const leftElement = this.leftButtons.find(
        (button) => button.nativeElement.dataset['id'] === connection.leftId,
      );

      const rightElement = this.rightButtons.find(
        (button) => button.nativeElement.dataset['id'] === connection.rightId,
      );

      if (!leftElement || !rightElement) {
        return;
      }

      const leftRect = leftElement.nativeElement.getBoundingClientRect();

      const rightRect = rightElement.nativeElement.getBoundingClientRect();

      newLines.push({
        x1: leftRect.right - board.left,
        y1: leftRect.top - board.top + leftRect.height / 2,
        x2: rightRect.left - board.left,
        y2: rightRect.top - board.top + rightRect.height / 2,
        correct: connection.correct,
      });
    });

    this.lines = newLines;
  }

  // =========================================================
  // REDIBUJAR AL CAMBIAR EL TAMAÑO DE PANTALLA
  // =========================================================
  @HostListener('window:resize')
  onResize(): void {
    setTimeout(() => {
      this.drawLines();
    });
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
      result.push(array.slice(i, i + size,),);
    }

    return result;
  }

  // =========================================================
  // GUARDAR PUNTAJE
  // =========================================================
  guardarPuntaje(): void {
    // =======================================================
    // SOLO PERMITIR GUARDAR SI:
    //
    // - GANÓ LA PARTIDA
    // - HAY UNA PARTIDA VÁLIDA
    // - CORRECTAS > ERRORES
    // =======================================================
    if (!this.puedeGuardarPuntaje) {
      console.warn('No se puede guardar el puntaje.', { correctas: this.totalCorrectWords, errores: this.errors, },);
      return;
    }

    // =======================================================
    // ASEGURAR QUE EL CRONÓMETRO ESTÉ DETENIDO
    // =======================================================
    if (this.cronometroActivo) {
      this.detenerCronometro();
    }

    // =======================================================
    // TIEMPO FINAL
    // =======================================================
    const tiempoFinal = Math.max(0, this.tiempoSegundos);

    // =======================================================
    // INFORMACIÓN DE DEPURACIÓN
    // =======================================================

    console.log('🏆 Enviando resultado a puntuación:', {
      juego: 'unir-palabra',
      categoria: this.selectedCategory,
      correctas: this.totalCorrectWords,
      total: this.gamePairs.length,
      errores: this.errors,
      tiempoSegundos: tiempoFinal,
    });

    const repasoParaPuntuacion =
    this.reviewType === 'meaning'
      ? 'Verbo → Significado'
      : 'Verbo → Pareja';

    // =======================================================
    // IR AL COMPONENTE PUNTUACIÓN
    // =======================================================
    this.router.navigate(
      ['/puntuacion'],

      {
        state: {
          juego: 'unir-palabra',

          categoria:
            this.selectedCategory === this.ALL_CATEGORIES
              ? 'Todas las categorías'
              : this.selectedCategory,

          repaso: repasoParaPuntuacion,

          correctas: this.totalCorrectWords,

          total: this.gamePairs.length,

          errores: this.errors,

          tiempoSegundos: tiempoFinal,
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
          CategoriaPalabra:
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
              <th>CategoriaPalabra</th>
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
