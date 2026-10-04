import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ServicioCrudFirebaseService,
  Usuario,
} from '../../servicios/crud-firebase.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})

export class UsuariosComponent implements OnInit {
  formularioUsuario: FormGroup;
  usuarios: Usuario[] = [];
  editando: boolean = false;
  idUsuarioEditar: string | null = null;
  mensaje: string = '';

  constructor(
    private fb: FormBuilder,
    private crudFirebase: ServicioCrudFirebaseService,
  ) {
    this.formularioUsuario = this.fb.group({
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      correo: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.minLength(7)]],
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.crudFirebase.obtenerUsuarios((usuarios: Usuario[]) => {
      this.usuarios = usuarios;
    });
  }

  async guardarUsuario(): Promise<void> {
    // Si el formulario no es válido
    if (this.formularioUsuario.invalid) {
      this.formularioUsuario.markAllAsTouched();
      this.mensaje = 'Por favor complete correctamente todos los campos.';
      return;
    }

    const usuario: Usuario = {
      nombre: this.formularioUsuario.value.nombre,
      apellido: this.formularioUsuario.value.apellido,
      correo: this.formularioUsuario.value.correo,
      telefono: this.formularioUsuario.value.telefono,
    };

    try {
      // ACTUALIZAR
      if (this.editando && this.idUsuarioEditar) {
        await this.crudFirebase.actualizarUsuario(
          this.idUsuarioEditar,
          usuario,
        );

        this.mensaje = 'Usuario actualizado correctamente.';
      }

      // REGISTRAR
      else {
        await this.crudFirebase.registrarUsuario(usuario);

        this.mensaje = 'Usuario registrado correctamente.';
      }

      this.limpiarFormulario();
    } catch (error) {
      console.error('Error al guardar usuario:', error);

      this.mensaje = 'Ocurrió un error al guardar el usuario.';
    }
  }

  editarUsuario(usuario: Usuario): void {
    if (!usuario.id) {
      return;
    }

    this.idUsuarioEditar = usuario.id;
    this.editando = true;

    this.formularioUsuario.patchValue({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      telefono: usuario.telefono,
    });
    this.mensaje = '';
  }

  async eliminarUsuario(usuario: Usuario): Promise<void> {
    if (!usuario.id) {
      return;
    }

    const confirmar = confirm(`¿Está seguro de eliminar a ${usuario.nombre} ${usuario.apellido}?`,);

    if (!confirmar) {
      return;
    }

    try {
      await this.crudFirebase.eliminarUsuario(usuario.id);

      this.mensaje = 'Usuario eliminado correctamente.';

      // Si está editando justamente el usuario eliminado
      if (this.idUsuarioEditar === usuario.id) {
        this.limpiarFormulario();
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);

      this.mensaje = 'Ocurrió un error al eliminar el usuario.';
    }
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
    this.mensaje = '';
  }

  limpiarFormulario(): void {
    this.formularioUsuario.reset();
    this.editando = false;
    this.idUsuarioEditar = null;
  }

  // GETTERS PARA VALIDACIONES
  get nombre() {
    return this.formularioUsuario.get('nombre');
  }

  get apellido() {
    return this.formularioUsuario.get('apellido');
  }

  get correo() {
    return this.formularioUsuario.get('correo');
  }

  get telefono() {
    return this.formularioUsuario.get('telefono');
  }
}
