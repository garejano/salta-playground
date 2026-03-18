import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ImportadorComponent } from './features/exemplos/importador/importador.component';

const routes: Routes = [

  { path: 'importador', component: ImportadorComponent, },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
