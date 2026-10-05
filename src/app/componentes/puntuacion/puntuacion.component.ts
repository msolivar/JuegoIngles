import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { FirebasePuntuacionService } from '../../servicios/firebase-puntuacion.service';

import type { TipoJuego } from '../../servicios/firebase-puntuacion.service';

import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface JugadorRanking {
  id: string;
  posicion: number;
  jugador: string;
  puntuacion: number;
  categoria: string;
  repaso: string;
  correctas: number;
  total: number;
  errores: number;
  porcentaje: number;
  tiempoSegundos: number;
  fecha?: string;
}

interface PuntoFrecuencia {
  puntuacion: number;
  cantidadJugadores: number;
}

@Component({
  selector: 'app-puntuacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './puntuacion.component.html',
  styleUrl: './puntuacion.component.css',
})
export class PuntuacionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('graficaProgreso')
  graficaProgreso?: ElementRef<HTMLCanvasElement>;

  @ViewChild('playerNameInput')
  playerNameInput?: ElementRef<HTMLInputElement>;

  @ViewChild('rankingTable')
  rankingTable?: ElementRef<HTMLDivElement>;

  private grafica?: Chart;

  private vistaInicializada = false;

  juego: TipoJuego | '' = '';

  juegoPartidaActual: TipoJuego | '' = '';

  categoria = '';

  repaso = '';

  categoriaRanking = '';

  correctas = 0;

  total = 0;

  errores = 0;

  tiempoSegundos = 0;

  nombreJugador = '';

  errorNombre = '';

  mensaje = '';

  puntajeGuardado = false;

  guardando = false;

  cargandoRanking = false;

  ultimoPuntajeId = '';

  paginaActual = 1;

  readonly jugadoresPorPagina = 15;

  jugadores: JugadorRanking[] = [];

  constructor(
    private router: Router,
    private puntuacionService: FirebasePuntuacionService,
  ) {
    const navigation = this.router.getCurrentNavigation();

    const state = navigation?.extras?.state ?? window.history.state;

    console.log('Datos recibidos en puntuación:', state);

    if (state) {
      const juegoRecibido = state['juego'] ?? '';

      if (
        juegoRecibido === 'unir-palabra' ||
        juegoRecibido === 'completar-palabra' ||
        juegoRecibido === 'cuestionario'
      ) {
        this.juego = juegoRecibido;

        // Guardamos cuál fue realmente el juego que terminó
        this.juegoPartidaActual = juegoRecibido;
      }

      this.categoria = String(state['categoria'] ?? '');

      this.repaso = String(state['repaso'] ?? '');

      this.categoriaRanking = this.categoria;

      this.correctas = Number(state['correctas'] ?? 0);

      this.total = Number(state['total'] ?? 0);

      this.errores = Number(state['errores'] ?? 0);

      this.tiempoSegundos = Number(state['tiempoSegundos'] ?? 0);
    }

    if (!Number.isFinite(this.correctas)) {
      this.correctas = 0;
    }

    if (!Number.isFinite(this.total)) {
      this.total = 0;
    }

    if (!Number.isFinite(this.errores)) {
      this.errores = 0;
    }

    if (!Number.isFinite(this.tiempoSegundos) || this.tiempoSegundos < 0) {
      this.tiempoSegundos = 0;
    }
  }

  async ngOnInit(): Promise<void> {
    if (!this.juego) {
      this.juego = 'cuestionario';
    }

    await this.cargarRanking();
  }

  ngAfterViewInit(): void {
    this.vistaInicializada = true;

    this.actualizarGrafica();

    setTimeout(() => {
      if (this.playerNameInput) {
        this.playerNameInput.nativeElement.focus();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destruirGrafica();
  }

  get nombreJuego(): string {
    switch (this.juego) {
      case 'unir-palabra':
        return 'Unir palabra';

      case 'completar-palabra':
        return 'Completar palabra';

      case 'cuestionario':
        return 'Cuestionario';

      default:
        return 'Puntuación';
    }
  }

  get porcentaje(): number {
    if (this.total <= 0) {
      return 0;
    }

    return Math.round((this.correctas / this.total) * 100);
  }

  get puntuacion(): number {
    return this.correctas * 100;
  }

  get tiempoFormateado(): string {
    return this.formatearTiempo(this.tiempoSegundos);
  }

  get tieneResultado(): boolean {
    return this.total > 0;
  }

  get puedeGuardarPuntuacion(): boolean {
    return (
      this.tieneResultado &&
      !this.puntajeGuardado &&
      this.juego === this.juegoPartidaActual
    );
  }

  get totalPaginas(): number {
    return Math.max(
      1,
      Math.ceil(this.jugadores.length / this.jugadoresPorPagina),
    );
  }

  get jugadoresPagina(): JugadorRanking[] {
    const inicio = (this.paginaActual - 1) * this.jugadoresPorPagina;

    const fin = inicio + this.jugadoresPorPagina;

    return this.jugadores.slice(inicio, fin);
  }

  get cantidadJugadoresGrafica(): number {
    return Math.min(this.jugadores.length, 30);
  }

  get puntosPoligonoFrecuencia(): PuntoFrecuencia[] {
    const mejores30 = this.jugadores.slice(0, 30);

    const frecuencias = new Map<number, number>();

    mejores30.forEach((jugador) => {
      const puntuacion = Number(jugador.puntuacion ?? 0);

      const cantidadActual = frecuencias.get(puntuacion) ?? 0;

      frecuencias.set(puntuacion, cantidadActual + 1);
    });

    const puntos: PuntoFrecuencia[] = Array.from(frecuencias.entries()).map(
      ([puntuacion, cantidadJugadores]) => ({
        puntuacion,
        cantidadJugadores,
      }),
    );

    puntos.sort((a, b) => a.puntuacion - b.puntuacion);

    return puntos;
  }

  get cantidadPuntuacionesDiferentes(): number {
    return this.puntosPoligonoFrecuencia.length;
  }

  limpiarErrorNombre(): void {
    if (this.nombreJugador.trim()) {
      this.errorNombre = '';
    }
  }

  async guardarJugador(): Promise<void> {
    if (this.guardando) {
      return;
    }

    if (this.juego !== this.juegoPartidaActual) {
      this.mensaje =
        'Solo puedes guardar la puntuación en el juego que acabas de completar.';
      return;
    }

    this.mensaje = '';

    this.errorNombre = '';

    const nombre = this.nombreJugador.trim();

    if (!nombre) {
      this.errorNombre = 'El nombre del jugador es obligatorio.';

      setTimeout(() => {
        this.playerNameInput?.nativeElement.focus();
      });

      return;
    }

    if (!this.esJuegoValido(this.juego)) {
      this.mensaje = 'No fue posible identificar el juego.';

      return;
    }

    if (this.total <= 0) {
      this.mensaje = 'No existe una partida para guardar.';

      return;
    }

    try {
      this.guardando = true;

      const id = await this.puntuacionService.guardarPuntuacion({
        juego: this.juego,

        jugador: nombre,

        categoria: this.categoria || 'General',

        repaso: this.repaso || '',

        puntuacion: this.puntuacion,

        correctas: this.correctas,

        total: this.total,

        errores: this.errores,

        porcentaje: this.porcentaje,

        tiempoSegundos: this.tiempoSegundos,
      });

      this.ultimoPuntajeId = id;

      this.categoriaRanking = this.categoria || 'General';

      this.puntajeGuardado = true;

      this.mensaje = 'Puntaje guardado correctamente.';

      await this.cargarRanking();
    } catch (error) {
      console.error('Error guardando puntuación:', error);

      this.puntajeGuardado = false;

      this.mensaje = 'No fue posible guardar el puntaje.';
    } finally {
      this.guardando = false;
    }
  }

  async cargarRanking(): Promise<void> {
    if (!this.esJuegoValido(this.juego)) {
      this.jugadores = [];

      this.actualizarGrafica();

      return;
    }

    try {
      this.cargandoRanking = true;

      const registros = await this.puntuacionService.obtenerPuntuaciones(
        this.juego,
      );

      console.log('Ranking completo recibido:', registros);

      const categoriaActual = (
        this.categoriaRanking ||
        this.categoria ||
        'General'
      )
        .trim()
        .toLowerCase();

      const registrosCategoria = registros.filter((registro) => {
        const categoriaRegistro = (registro.categoria || 'General')
          .trim()
          .toLowerCase();

        return categoriaRegistro === categoriaActual;
      });

      console.log('Categoría del ranking:', categoriaActual);

      console.log('Ranking filtrado por categoría:', registrosCategoria);

      this.jugadores = registrosCategoria.map((registro, index) => ({
        id: registro.id ?? '',

        posicion: index + 1,

        jugador: registro.jugador,

        puntuacion: Number(registro.puntuacion ?? 0),

        categoria: registro.categoria ?? 'General',

        repaso: registro.repaso ?? '',

        correctas: Number(registro.correctas ?? 0),

        total: Number(registro.total ?? 0),

        errores: Number(registro.errores ?? 0),

        porcentaje: Number(registro.porcentaje ?? 0),

        tiempoSegundos: Number(registro.tiempoSegundos ?? 0),

        fecha: this.formatearFecha(registro.fechaYHoraDeCreacion),
      }));

      if (this.ultimoPuntajeId) {
        const indice = this.jugadores.findIndex(
          (jugador) => jugador.id === this.ultimoPuntajeId,
        );

        if (indice >= 0) {
          this.paginaActual = Math.floor(indice / this.jugadoresPorPagina) + 1;
        }
      }

      if (this.paginaActual > this.totalPaginas) {
        this.paginaActual = this.totalPaginas;
      }
    } catch (error) {
      console.error('Error cargando ranking:', error);

      this.jugadores = [];

      if (!this.mensaje) {
        this.mensaje = 'No fue posible cargar la tabla de posiciones.';
      }
    } finally {
      this.cargandoRanking = false;

      this.actualizarGrafica();
    }
  }

  private enfocarTabla(): void {
    setTimeout(() => {
      this.rankingTable?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }

  private actualizarGrafica(): void {
    setTimeout(() => {
      this.crearGrafica();
    }, 0);
  }

  private crearGrafica(): void {
    this.destruirGrafica();

    if (!this.vistaInicializada) {
      return;
    }

    if (this.jugadores.length === 0) {
      return;
    }

    const canvas = this.graficaProgreso?.nativeElement;

    if (!canvas) {
      return;
    }

    const puntos = this.puntosPoligonoFrecuencia;

    if (puntos.length === 0) {
      return;
    }

    const datosGrafica = puntos.map((punto) => ({
      x: punto.cantidadJugadores,
      y: punto.puntuacion,
    }));

    const configuracion: ChartConfiguration<'line'> = {
      type: 'line',

      data: {
        datasets: [
          {
            label:
              `Puntuación - ${this.nombreJuego} - ` +
              `${this.categoriaRanking || 'General'}`,

            data: datosGrafica,

            tension: 0,

            fill: false,

            showLine: true,

            borderWidth: 3,

            pointRadius: 6,

            pointHoverRadius: 8,

            pointBorderWidth: 2,
          },
        ],
      },

      options: {
        responsive: true,

        maintainAspectRatio: false,

        interaction: {
          mode: 'nearest',
          intersect: false,
        },

        plugins: {
          legend: {
            display: true,
            position: 'top',
          },

          tooltip: {
            callbacks: {
              title: (elementos) => {
                if (elementos.length === 0) {
                  return '';
                }

                const indice = elementos[0].dataIndex;

                const punto = puntos[indice];

                return `${punto.puntuacion} puntos`;
              },

              label: (contexto) => {
                const indice = contexto.dataIndex;

                const punto = puntos[indice];

                if (punto.cantidadJugadores === 1) {
                  return '1 jugador';
                }

                return `${punto.cantidadJugadores} jugadores`;
              },

              afterLabel: (contexto) => {
                const indice = contexto.dataIndex;

                const punto = puntos[indice];

                if (punto.cantidadJugadores === 1) {
                  return `1 jugador obtuvo ` + `${punto.puntuacion} puntos`;
                }

                return (
                  `${punto.cantidadJugadores} jugadores ` +
                  `obtuvieron ${punto.puntuacion} puntos`
                );
              },
            },
          },
        },

        scales: {
          x: {
            type: 'linear',

            beginAtZero: true,

            title: {
              display: true,
              text: 'Cantidad de jugadores',
            },

            ticks: {
              precision: 0,
              stepSize: 1,
            },
          },

          y: {
            type: 'linear',

            beginAtZero: true,

            title: {
              display: true,
              text: 'Puntuación',
            },

            ticks: {
              precision: 0,
            },
          },
        },
      },
    };

    this.grafica = new Chart(canvas, configuracion);
  }

  private destruirGrafica(): void {
    if (this.grafica) {
      this.grafica.destroy();

      this.grafica = undefined;
    }
  }

  formatearTiempo(segundos: number): string {
    const totalSegundos = Math.max(0, Math.floor(Number(segundos) || 0));

    const minutos = Math.floor(totalSegundos / 60);

    const segundosRestantes = totalSegundos % 60;

    return (
      `${minutos.toString().padStart(2, '0')}:` +
      `${segundosRestantes.toString().padStart(2, '0')}`
    );
  }

  private formatearFecha(timestamp: number): string {
    if (!timestamp) {
      return '';
    }

    return new Date(timestamp).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private esJuegoValido(juego: string): juego is TipoJuego {
    return (
      juego === 'unir-palabra' ||
      juego === 'completar-palabra' ||
      juego === 'cuestionario'
    );
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.enfocarTabla();
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
      this.enfocarTabla();
    }
  }

  async seleccionarJuego(juego: TipoJuego): Promise<void> {
    this.juego = juego;

    this.paginaActual = 1;

    this.mensaje = '';

    this.errorNombre = '';

    this.ultimoPuntajeId = '';

    this.destruirGrafica();

    if (juego !== this.obtenerJuegoPartidaActual()) {
      this.categoriaRanking = '';
    } else {
      this.categoriaRanking = this.categoria;
    }

    await this.cargarRanking();
  }

  private obtenerJuegoPartidaActual(): TipoJuego | '' {
    const state = window.history.state;

    const juego = state?.['juego'] ?? '';

    if (
      juego === 'unir-palabra' ||
      juego === 'completar-palabra' ||
      juego === 'cuestionario'
    ) {
      return juego;
    }

    return '';
  }

  volver(): void {
    this.destruirGrafica();

    switch (this.juego) {
      case 'unir-palabra':
        this.router.navigate(['/relation-game']);
        break;

      case 'completar-palabra':
        this.router.navigate(['/completar-palabras']);
        break;

      case 'cuestionario':
        this.router.navigate(['/cuestionario-game']);
        break;

      default:
        this.router.navigate(['/']);
    }
  }
}
