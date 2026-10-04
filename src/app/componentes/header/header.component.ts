import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // Importar RouterModule

@Component({
  selector: 'app-header',
  imports: [RouterModule], // Agregar RouterModule para que funcione routerLink
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  title = 'Verbos Irregulares';
}
