import { Routes } from '@angular/router';
import { InicioComponent } from './componentes/inicio/inicio.component';
import { LoginComponent } from './componentes/login/login.component';
import { RegistroComponent } from './componentes/registro/registro.component';
import { GestionEventosComponent } from './componentes/gestion-eventos/gestion-eventos.component';
import { DetalleEventoComponent } from './componentes/detalle-evento/detalle-evento.component';
import { RelationGameComponent } from './componentes/relation-game/relation-game.component';
import { CompletarPalabrasComponent } from './componentes/completar-palabras/completar-palabras.component';
import { AdministrarPalabrasComponent } from './componentes/administrar-palabras/administrar-palabras.component';
import { UsuariosComponent } from './componentes/usuarios/usuarios.component'; 
import { CrudCuestionarioComponent } from './componentes/crud-cuestionario/crud-cuestionario.component'; 
import { JuegoCuestionarioComponent } from './componentes/juego-cuestionario/juego-cuestionario.component';
import { PuntuacionComponent } from './componentes/puntuacion/puntuacion.component' 

import { ItilDashboardComponent } from './componentes/itil-dashboard/itil-dashboard.component' 

export const routes: Routes = [
    { path: '', component: RelationGameComponent }, //Se carga el componente de inicio al entrar a la aplicación
    // { path: 'login', component: LoginComponent }, 
    { path: 'login', component: ItilDashboardComponent }, 
    { path: 'registro', component: UsuariosComponent },
    // { path: 'registro', component: RegistroComponent },
    { path: "gestion-eventos", component: GestionEventosComponent },
    { path: 'detalle-evento/:id', component: DetalleEventoComponent },
    { path: 'relation-game', component: RelationGameComponent},
    { path: 'completar-palabras', component: CompletarPalabrasComponent },
    { path: 'administrar-palabras', component: AdministrarPalabrasComponent },
    { path: 'administrar-cuestionario', component: CrudCuestionarioComponent },
    { path: 'cuestionario-game', component: JuegoCuestionarioComponent },
    { path: 'puntuacion', component: PuntuacionComponent },
    { path: "**", pathMatch: "full", redirectTo: "" }
];
