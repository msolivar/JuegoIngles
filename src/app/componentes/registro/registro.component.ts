import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
// Habilitar ngModel
import { FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';

import { RegistroClienteDTO } from '../../dto/registro-cliente-dto';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule], // Habilitar ngModel
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {
  // Instanciar Clase
  registroClienteDTO: RegistroClienteDTO;
  tiposDeEvento: string[];
  registroForm!: FormGroup;

  mostrarPassword: boolean = false; // Para alternar visibilidad

  constructor(private fb: FormBuilder) {
    this.registroClienteDTO = new RegistroClienteDTO();
    this.tiposDeEvento = ["Basico", "Medio", "Plus"];

    //this.registroClienteDTO.confirmaPassword
    this.registroForm = this.fb.group({
      cedula: [this.registroClienteDTO.cedula, Validators.required],
      nombre: [this.registroClienteDTO.nombre, Validators.required],
      password: [this.registroClienteDTO.password, [Validators.required, Validators.maxLength(10), Validators.minLength(7)]],
      confirmaPassword: [this.registroClienteDTO.confirmaPassword, [Validators.required, Validators.maxLength(10), Validators.minLength(7)]],
      telefono: [this.registroClienteDTO.telefono, [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.minLength(7)]],
      email: [this.registroClienteDTO.email, [Validators.required, Validators.email]],
      tipo: [this.registroClienteDTO.tipo, Validators.required]
    }, { validators: this.passwordsIgualesValidator });
  }

  // Validación personalizada a nivel de formulario
  passwordsIgualesValidator(group: FormGroup): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmaPassword')?.value;
    return pass === confirm ? null : { passwordsMismatch: true };
  }

  public registrar() {
    if (this.registroForm.valid) {
      // Copia los valores capturados en el formulario hacia tu objeto DTO
      this.registroClienteDTO = this.registroForm.value as RegistroClienteDTO;

      console.log(this.registroClienteDTO);
    }
  }

  public sonIguales(): boolean {
    return this.registroClienteDTO.password == this.registroClienteDTO.confirmaPassword;
  }
}
