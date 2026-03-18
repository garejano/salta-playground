import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
// import { FormulariosComponent } from './formularios/formularios.component';
// import { FiltrosComponent } from './filtros/filtros.component';
// import { environment } from "src/environments/environment";
// import { TelaBaseComponent } from './tela-base/tela-base.component';
// import { InfoBaseComponent } from './info-base/info-base.component';
import { ImportadorComponent } from './importador/importador.component';

const routes: Routes = [
  {
    path: "",
    children: [
    ]
  }
]

// if (environment.useExempleModule) {
routes.push(
  // {
  // path: 'base',
  // component: TelaBaseComponent,
  // },
  // { path: 'info', component: InfoBaseComponent, },
  // { path: 'formularios', component: FormulariosComponent, },
  // { path: 'filtros', component: FiltrosComponent, },
  { path: 'importador', component: ImportadorComponent, },
)
// }




@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExemplosRoutingModule { }
