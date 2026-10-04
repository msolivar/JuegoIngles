import { Injectable } from '@angular/core';

import {
  Database, ref, push, set, update, remove, onValue,
} from '@angular/fire/database';

export interface Usuario {
  id?: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
}

@Injectable({
  providedIn: 'root',
})
export class ServicioCrudFirebaseService {
  private rutaUsuarios = 'usuarios';

  constructor(private database: Database) {}

  // REGISTRAR USUARIO
  async registrarUsuario(usuario: Usuario): Promise<void> {
    const usuariosRef = ref(this.database, this.rutaUsuarios);

    const nuevoUsuarioRef = push(usuariosRef);

    const usuarioGuardar = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      telefono: usuario.telefono,
    };

    await set(nuevoUsuarioRef, usuarioGuardar);
  }

  // OBTENER TODOS LOS USUARIOS
  obtenerUsuarios(callback: (usuarios: Usuario[]) => void): void {
    const usuariosRef = ref(this.database, this.rutaUsuarios);

    onValue(usuariosRef, (snapshot) => {
      const usuarios: Usuario[] = [];

      snapshot.forEach((childSnapshot) => {
        const usuario = childSnapshot.val();

        usuarios.push({
          id: childSnapshot.key!,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          correo: usuario.correo,
          telefono: usuario.telefono,
        });
      });

      callback(usuarios);
    });
  }

  // ACTUALIZAR USUARIO
  async actualizarUsuario(id: string, usuario: Usuario): Promise<void> {
    const usuarioRef = ref(this.database, `${this.rutaUsuarios}/${id}`);

    await update(usuarioRef, {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      telefono: usuario.telefono,
    });
  }

  // ELIMINAR USUARIO
  async eliminarUsuario(id: string): Promise<void> {
    const usuarioRef = ref(this.database, `${this.rutaUsuarios}/${id}`);

    await remove(usuarioRef);
  }
}
