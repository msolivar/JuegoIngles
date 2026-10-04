import { Component } from '@angular/core';
import { EventosService } from '../../servicios/eventos.service';
import { RouterModule } from '@angular/router';
import { EventoDTO } from '../../dto/evento-dto';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gestion-eventos',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './gestion-eventos.component.html',
  styleUrl: './gestion-eventos.component.css'
})
export class GestionEventosComponent {

  eventos: EventoDTO[];
  seleccionados: EventoDTO[];
  textoBtnEliminar: string;

  constructor(public eventosService: EventosService) {
    this.eventos = eventosService.listar();
    this.seleccionados = [];
    this.textoBtnEliminar = "Eliminar seleccionados";
  }

  public seleccionar(evento: EventoDTO, estado: boolean) {
    if (estado) {
      this.seleccionados.push(evento);
    } else {
      this.seleccionados.splice(this.seleccionados.indexOf(evento), 1);
    }
    this.actualizarMensaje();
  }

  private actualizarMensaje() {
    const tam = this.seleccionados.length;
    if (tam != 0) {
      if (tam == 1) {
        this.textoBtnEliminar = "1 elemento";
      }
      else {
        this.textoBtnEliminar = tam + " elementos";
      }
    }
    else {
      this.textoBtnEliminar = "";
    }
  }

  public confirmarEliminacion() {
    Swal.fire({
      title: "Estás seguro?", text: "Esta acción cambiará el estado de los eventos a Inactivos.",
      icon: "error", showCancelButton: true, confirmButtonText: "Confirmar", cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminarEventos();
        Swal.fire("Eliminados!", "Los eventos seleccionados han sido eliminados.", "success");
      }
    });
  }

  public eliminarEventos() {
    this.seleccionados.forEach(e1 => {
      this.eventosService.eliminar(e1.id);
      this.eventos = this.eventos.filter(e2 => e2.id !== e1.id);
    });
    this.seleccionados = []; this.actualizarMensaje();
  }
}
