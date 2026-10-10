import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormsModule,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  FirebaseWordsService,
  PairFirebase,
} from '../../servicios/firebase-words.service';

import { SpeechService } from '../../servicios/speech.service';

@Component({
  selector: 'app-administrar-palabras',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './administrar-palabras.component.html',
  styleUrls: ['./administrar-palabras.component.css'],
})
export class AdministrarPalabrasComponent {
  // =========================================================
  // DTO / MODELO
  // =========================================================
  palabrasDTO: PairFirebase = {
    left: '',
    right: '',
    meaning: '',
    categoriaPalabra: '',
    image: '',
  };

  // =========================================================
  // FORMULARIO REACTIVO
  // =========================================================
  registroForm: FormGroup;

  // =========================================================
  // LISTADO
  // =========================================================
  pairs: PairFirebase[] = [];

  pairsLoaded = false;

  // =========================================================
  // BUSCADOR
  // =========================================================
  searchTerm = '';

  // =========================================================
  // ORDEN DEL LISTADO
  // =========================================================
  sortOrder: 'latest' | 'alphabetical' = 'latest';

  // =========================================================
  // PAGINACIÓN
  // =========================================================
  pageSize: number | 'all' = 10;

  currentPage = 1;
  // =========================================================
  // EDICIÓN
  // =========================================================
  editingId: string | null = null;

  // =========================================================
  // ESTADO
  // =========================================================
  saving = false;

  message = '';

  messageType: 'success' | 'error' | '' = '';

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
  // CONSTRUCTOR
  // =========================================================
  constructor(
    private wordsService: FirebaseWordsService,
    private fb: FormBuilder,
    private speechService: SpeechService,
  ) {
    // =====================================================
    // CREAR FORMULARIO REACTIVO
    // =====================================================

    this.registroForm = this.fb.group({
      // =================================================
      // VERBO
      // =================================================
      left: [
        this.palabrasDTO.left,
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(20),
        ],
      ],

      // =================================================
      // PAREJA
      // =================================================
      right: [
        this.palabrasDTO.right,
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(17),
        ],
      ],

      // =================================================
      // SIGNIFICADO
      // =================================================

      meaning: [
        this.palabrasDTO.meaning,
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(17),
        ],
      ],

      // =================================================
      // CATEGORÍA
      // =================================================
      categoriaPalabra: [
        this.palabrasDTO.categoriaPalabra,
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(20),
        ],
      ],

      // =================================================
      // IMAGEN
      // =================================================
      image: [this.palabrasDTO.image, [Validators.required]],
    });

    // =====================================================
    // CARGAR PALABRAS
    // =====================================================
    this.loadPairs();
  }

  // =========================================================
  // SABER SI ESTAMOS EDITANDO
  // =========================================================
  get isEditing(): boolean {
    return this.editingId !== null;
  }

  // =========================================================
  // CONTROL VERBO
  // =========================================================
  get leftControl() {
    return this.registroForm.get('left');
  }

  // =========================================================
  // CONTROL PAREJA
  // =========================================================
  get rightControl() {
    return this.registroForm.get('right');
  }

  // =========================================================
  // CONTROL SIGNIFICADO
  // =========================================================
  get meaningControl() {
    return this.registroForm.get('meaning');
  }

  // =========================================================
  // CONTROL CATEGORÍA
  // =========================================================
  get categoriaControl() {
    return this.registroForm.get('categoriaPalabra');
  }

  // =========================================================
  // CONTROL IMAGEN
  // =========================================================
  get imageControl() {
    return this.registroForm.get('image');
  }

  // =========================================================
  // FILTRAR PALABRAS
  // =========================================================
  get filteredPairs(): PairFirebase[] {
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
  // ORDENAR PALABRAS
  // =========================================================
  get sortedPairs(): PairFirebase[] {
    // =====================================================
    // HACER COPIA DEL ARRAY
    // =====================================================

    const result = [...this.filteredPairs];
    // =====================================================
    // ORDEN ALFABÉTICO A - Z
    // =====================================================
    if (this.sortOrder === 'alphabetical') {
      return result.sort((a, b) =>
        a.left.localeCompare(b.left, 'en', {
          sensitivity: 'base',
        }),
      );
    }

    // =====================================================
    // ÚLTIMA CREADA PRIMERO
    // =====================================================
    return result.sort((a, b) => {
      const fechaA = Number(a.fechaYHoraDeCreacion || 0);
      const fechaB = Number(b.fechaYHoraDeCreacion || 0);
      return fechaB - fechaA;
    });
  }

  // =========================================================
  // TOTAL DE PÁGINAS
  // =========================================================
  get totalPages(): number {
    if (this.pageSize === 'all') {
      return 1;
    }

    return Math.max(1, Math.ceil(this.sortedPairs.length / this.pageSize));
  }

  // =========================================================
  // PALABRAS DE LA PÁGINA ACTUAL
  // =========================================================
  get paginatedPairs(): PairFirebase[] {
    if (this.pageSize === 'all') {
      return this.sortedPairs;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.sortedPairs.slice(start, end);
  }

  // =========================================================
  // NÚMEROS DE PÁGINA
  // =========================================================
  get pageNumbers(): number[] {
    return Array.from(
      {
        length: this.totalPages,
      },
      (_, index) => index + 1,
    );
  }

  // =========================================================
  // IR A UNA PÁGINA
  // =========================================================
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
  }

  // =========================================================
  // PÁGINA ANTERIOR
  // =========================================================
  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  // =========================================================
  // PÁGINA SIGUIENTE
  // =========================================================
  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  // =========================================================
  // CAMBIAR CANTIDAD A MOSTRAR
  // =========================================================
  changePageSize(): void {
    this.currentPage = 1;
  }

  // =========================================================
  // CAMBIAR ORDEN
  // =========================================================
  changeSortOrder(): void {
    this.currentPage = 1;
  }

  // =========================================================
  // CAMBIO EN BÚSQUEDA
  // =========================================================
  onSearchChange(): void {
    this.currentPage = 1;
  }

  // =========================================================
  // COMPROBAR SI LA PALABRA BUSCADA NO EXISTE
  // =========================================================
  // =========================================================
  // VERIFICAR SI LA PALABRA NO EXISTE EN LA BASE DE DATOS
  // =========================================================
  get palabraNoExiste(): boolean {
    const term = this.searchTerm.trim().toLowerCase();

    // ---------------------------------------------------------
    // MÍNIMO 2 CARACTERES PARA VERIFICAR
    // ---------------------------------------------------------
    if (term.length < 2) {
      return false;
    }

    // ---------------------------------------------------------
    // ESPERAR CARGA DE FIREBASE
    // ---------------------------------------------------------
    if (!this.pairsLoaded) {
      return false;
    }

    // ---------------------------------------------------------
    // BUSCAR EN TODOS LOS CAMPOS
    // COINCIDENCIAS PARCIALES O EXACTAS
    // ---------------------------------------------------------
    const existe = this.pairs.some((pair) => {
      return (
        (pair.left || '').toLowerCase().includes(term) ||
        (pair.right || '').toLowerCase().includes(term) ||
        (pair.meaning || '').toLowerCase().includes(term) ||
        (pair.categoriaPalabra || '').toLowerCase().includes(term)
      );
    });

    // ---------------------------------------------------------
    // MOSTRAR BOTÓN SOLO SI NO EXISTE
    // ---------------------------------------------------------
    return !existe;
  }

  // =========================================================
  // AGREGAR PALABRA BUSCADA AL FORMULARIO
  // =========================================================
  agregarPalabraAlFormulario(): void {
    const palabra = this.searchTerm.trim();

    if (!palabra || !this.palabraNoExiste) {
      return;
    }

    // Salir del modo edición.
    this.editingId = null;

    // Preparar formulario para una palabra nueva.
    this.registroForm.reset({
      left: palabra,
      right: '',
      meaning: '',
      categoriaPalabra: 'vocabulario',
      image: '',
    });

    this.registroForm.markAsPristine();
    this.registroForm.markAsUntouched();

    this.message = '';
    this.messageType = '';

    // Subir al formulario.
    document.getElementById('left')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    // Seleccionar el siguiente campo por completar.
    setTimeout(() => {
      document.getElementById('right')?.focus();
    }, 350);
  }

  // =========================================================
  // BUSCAR Y CARGAR PALABRA
  // =========================================================
  searchAndLoad(): void {
    const term = this.searchTerm.trim().toLowerCase();
    // =====================================================
    // VALIDAR BUSCADOR
    // =====================================================
    if (!term) {
      this.showMessage('Escribe una palabra para buscar.', 'error');
      return;
    }

    // =====================================================
    // BUSCAR COINCIDENCIA EXACTA
    // =====================================================
    const pair = this.pairs.find(
      (item) =>
        item.left.toLowerCase() === term ||
        item.right.toLowerCase() === term ||
        item.meaning.toLowerCase() === term ||
        (item.categoriaPalabra || '').toLowerCase() === term,
    );

    // =====================================================
    // NO ENCONTRADA
    // =====================================================
    if (!pair) {
      this.showMessage('No se encontró una coincidencia exacta.', 'error');
      return;
    }

    // =====================================================
    // CARGAR PARA EDITAR
    // =====================================================
    this.loadForEdit(pair);
  }

  // =========================================================
  // GUARDAR O ACTUALIZAR
  // =========================================================
  async savePair(): Promise<void> {
    // =====================================================
    // MOSTRAR TODAS LAS VALIDACIONES
    // =====================================================
    this.registroForm.markAllAsTouched();

    // =====================================================
    // VALIDAR FORMULARIO
    // =====================================================
    if (this.registroForm.invalid) {
      this.showMessage('⚠️ Debes completar el formulario.', 'error');
      // ===================================================
      // LLEVAR FOCO AL PRIMER CAMPO INVÁLIDO
      // ===================================================
      setTimeout(() => {
        const firstInvalidControl = document.querySelector<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >('form.game-setup-dashboard .ng-invalid');

        if (firstInvalidControl) {
          firstInvalidControl.focus();
          firstInvalidControl.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 50);
      return;
    }

    // =====================================================
    // OBTENER DATOS DEL FORMULARIO
    // =====================================================
    const formValue = this.registroForm.getRawValue();

    // =====================================================
    // NORMALIZAR VERBO
    // =====================================================
    const left = String(formValue.left || '')
      .trim()
      .toLowerCase();

    // =====================================================
    // NORMALIZAR PAREJA
    // =====================================================
    const right = String(formValue.right || '')
      .trim()
      .toLowerCase();

    // =====================================================
    // NORMALIZAR SIGNIFICADO
    // =====================================================
    const meaning = String(formValue.meaning || '')
      .trim()
      .toLowerCase();

    // =====================================================
    // NORMALIZAR CATEGORÍA
    // =====================================================
    const categoriaPalabra = String(formValue.categoriaPalabra || '')
      .trim()
      .toLowerCase();

    // =====================================================
    // NORMALIZAR IMAGEN
    // =====================================================
    const image = String(formValue.image || '').trim();

    // =====================================================
    // VALIDACIÓN EXTRA
    // =====================================================
    if (!left || !right || !meaning || !categoriaPalabra || !image) {
      this.showMessage('⚠️ Debes completar el formulario.', 'error');
      return;
    }

    // =====================================================
    // EVITAR DUPLICADOS
    // =====================================================

    const duplicated = this.pairs.some(
      (pair) =>
        pair.id !== this.editingId &&
        pair.left.trim().toLowerCase() === left &&
        pair.right.trim().toLowerCase() === right,
    );

    if (duplicated) {
      this.showMessage('Esta pareja de palabras ya existe.', 'error');
      return;
    }

    // =====================================================
    // INICIAR GUARDADO
    // =====================================================
    this.saving = true;

    try {
      // ===================================================
      // ACTUALIZAR PALABRA EXISTENTE
      // ===================================================
      if (this.isEditing && this.editingId) {
        await this.wordsService.updatePair(this.editingId, {
          left,
          right,
          meaning,
          categoriaPalabra,
          image,
          // =================================================
          // NO MODIFICAMOS fechaYHoraDeCreacion
          // =================================================
        });

        this.showMessage('✅ Palabra actualizada correctamente.', 'success');
        this.clearForm();
        return;
      }

      // ===================================================
      // GUARDAR PALABRA NUEVA
      // ===================================================
      //
      // IMPORTANTE:
      // NO GENERAMOS LA FECHA AQUÍ.
      //
      // firebase-words.service.ts
      // debe crear fechaYHoraDeCreacion
      // exactamente cuando Firebase guarda el registro.
      // ===================================================
      await this.wordsService.addPair({
        left,
        right,
        meaning,
        categoriaPalabra,
        image,
      });

      // ===================================================
      // CAMBIAR AUTOMÁTICAMENTE A ÚLTIMA GUARDADA
      // ===================================================
      this.sortOrder = 'latest';

      // ===================================================
      // VOLVER A LA PRIMERA PÁGINA
      // ===================================================
      this.currentPage = 1;

      this.showMessage('✅ Palabra guardada correctamente.', 'success');

      this.clearForm();
    } catch (error) {
      console.error('Error Firebase:', error);

      this.showMessage('❌ Ocurrió un error al guardar la palabra.', 'error');
    } finally {
      this.saving = false;
    }
  }

  // =========================================================
  // CARGAR PALABRA PARA EDITAR
  // =========================================================
  loadForEdit(pair: PairFirebase): void {
    if (!pair.id) {
      return;
    }

    // =====================================================
    // GUARDAR ID
    // =====================================================
    this.editingId = pair.id;

    // =====================================================
    // ACTUALIZAR DTO
    // =====================================================
    this.palabrasDTO = {
      id: pair.id,
      left: pair.left,
      right: pair.right,
      meaning: pair.meaning,
      categoriaPalabra: pair.categoriaPalabra || '',
      image: pair.image || '',
      fechaYHoraDeCreacion: pair.fechaYHoraDeCreacion,
    };

    // =====================================================
    // CARGAR DATOS EN FORMULARIO
    // =====================================================
    this.registroForm.patchValue({
      left: pair.left,
      right: pair.right,
      meaning: pair.meaning,
      categoriaPalabra: pair.categoriaPalabra || '',
      image: pair.image || '',
    });

    // =====================================================
    // LIMPIAR ESTADOS VISUALES
    // =====================================================
    this.registroForm.markAsPristine();
    this.registroForm.markAsUntouched();

    // =====================================================
    // MENSAJE
    // =====================================================
    this.showMessage(`✏️ Editando: ${pair.left} → ${pair.right}`, 'success');

    // =====================================================
    // SUBIR AL FORMULARIO
    // =====================================================
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

    // =====================================================
    // FOCO EN PRIMER CAMPO
    // =====================================================
    setTimeout(() => {
      const firstInput =
        document.querySelector<HTMLInputElement>('.word-form input');
      firstInput?.focus();
    }, 300);
  }

  // =========================================================
  // CANCELAR EDICIÓN
  // =========================================================
  cancelEdit(): void {
    this.clearForm();
    this.message = '';
    this.messageType = '';
  }

  // =========================================================
  // CARGAR PALABRAS DESDE FIREBASE
  // =========================================================
  loadPairs(): void {
    this.wordsService.getPairs((pairs) => {
      // =================================================
      // CARGAR PALABRAS
      // =================================================
      this.pairs = pairs;

      this.pairsLoaded = true;
      // =================================================
      // EVITAR PÁGINA INVÁLIDA
      // =================================================
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
    });
  }

  // =========================================================
  // ELIMINAR PALABRA
  // =========================================================
  async deletePair(pair: PairFirebase): Promise<void> {
    if (!pair.id) {
      return;
    }

    // =====================================================
    // CONFIRMACIÓN
    // =====================================================
    const confirmation = confirm(
      `¿Seguro que deseas eliminar "${pair.left} → ${pair.right}"?`,
    );

    if (!confirmation) {
      return;
    }

    try {
      // ===================================================
      // ELIMINAR
      // ===================================================
      await this.wordsService.deletePair(pair.id);

      // ===================================================
      // SI ESTABA EN EDICIÓN
      // ===================================================
      if (this.editingId === pair.id) {
        this.clearForm();
      }

      this.showMessage('🗑️ Palabra eliminada correctamente.', 'success');
    } catch (error) {
      console.error('Error eliminando:', error);

      this.showMessage('❌ No fue posible eliminar la palabra.', 'error');
    }
  }

  // =========================================================
  // ABRIR IMAGEN AMPLIADA
  // =========================================================
  openImage(image: string | undefined, word: string, meaning: string): void {
    if (!image) {
      return;
    }

    // =====================================================
    // GUARDAR IMAGEN
    // =====================================================
    this.selectedImage = image;

    // =====================================================
    // GUARDAR PALABRA EN INGLÉS
    // =====================================================
    this.selectedImageWord = word;

    // =====================================================
    // GUARDAR SIGNIFICADO
    // =====================================================
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
  // LIMPIAR FORMULARIO
  // =========================================================
  clearForm(): void {
    // =====================================================
    // LIMPIAR DTO
    // =====================================================
    this.palabrasDTO = {
      left: '',
      right: '',
      meaning: '',
      categoriaPalabra: '',
      image: '',
    };

    // =====================================================
    // LIMPIAR FORMULARIO
    // =====================================================
    this.registroForm.reset({
      left: '',
      right: '',
      meaning: '',
      categoriaPalabra: '',
      image: '',
    });

    // =====================================================
    // REINICIAR ESTADOS
    // =====================================================
    this.registroForm.markAsPristine();
    this.registroForm.markAsUntouched();

    // =====================================================
    // SALIR DE EDICIÓN
    // =====================================================
    this.editingId = null;
  }

  // =========================================================
  // TRADUCTOR DE VOZ DE LA TARJETA
  // =========================================================
  playPairAudio(pair: PairFirebase): void {
    let velocidad = 1;

    this.speechService.playSequence([
      // -------------------------------------------------------
      // SIGNIFICADO - ESPAÑOL
      // -------------------------------------------------------
      {
        text: pair.meaning,
        language: 'es-ES',
        rate: velocidad,
      },

      // -------------------------------------------------------
      // VERBO - INGLÉS
      // -------------------------------------------------------
      {
        text: pair.left,
        language: 'en-US',
        rate: velocidad,
      },

      // -------------------------------------------------------
      // PAREJA - INGLÉS
      // -------------------------------------------------------
      {
        text: pair.right,
        language: 'en-US',
        rate: velocidad,
      },
    ]);
  }

  printQuestionnaire(): void {
    if (!this.pairs || this.pairs.length === 0) {
      return;
    }

    const pairsToPrint = this.sortedPairs;

    if (!pairsToPrint || pairsToPrint.length === 0) {
      this.showMessage('No hay palabras disponibles para imprimir.', 'error');
      return;
    }

    const category =
      this.searchTerm.trim().length > 0
        ? `Resultados de búsqueda: ${this.searchTerm.trim()}`
        : 'Todas las palabras';

    const vocabularyRows = pairsToPrint
      .map((pair, index) => {
        const imageHtml = pair.image
          ? `
          <img
            src="${this.escapeHtml(pair.image)}"
            alt="${this.escapeHtml(pair.left)}"
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

      <title>
        Vocabulario - ${this.escapeHtml(category)}
      </title>

      <style>

        @page {
          size: A4;
          margin: 12mm;
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

        thead {
          display: table-header-group;
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
          break-inside: avoid;
        }

        .print-footer {
          margin-top: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

      </style>

    </head>

    <body>

      <div class="print-container">
        <h1>📚 Vocabulario</h1>
        <p class="category">
          Categoría:
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
              <th>Categoría</th>
            </tr>

          </thead>

          <tbody>
            ${vocabularyRows}
          </tbody>

        </table>

        <div class="print-footer">
          Total de palabras:
          ${pairsToPrint.length}
        </div>

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

  // =========================================================
  // MENSAJES
  // =========================================================

  showMessage(text: string, type: 'success' | 'error'): void {
    this.message = text;
    this.messageType = type;
  }
}
