import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExemplosRoutingModule } from './exemplos-routing.module';
// import { FormulariosComponent } from './formularios/formularios.component';
// import { FiltrosComponent } from './filtros/filtros.component';
// import { FormularioModule } from 'src/shared/formulario/formulario.module';
// import { SharedModule } from 'src/shared/shared.module';
// import { FiltroModule } from 'src/shared/filtro/filtro.module';
// import { TelaBaseComponent } from './tela-base/tela-base.component';
import { FormsModule } from '@angular/forms';
// import { InfoBaseComponent } from './info-base/info-base.component';
import { ImportadorComponent } from './importador/importador.component';
import { ImportTableComponent } from './importador/import-table/import-table.component';
// import { CellInspect } from './importador/cell-inspect/cell-inspect';
// import { Spreadsheet } from './importador/spreadsheet/spreadsheet';


@NgModule({
  declarations: [
    // FormulariosComponent,
    // FiltrosComponent,
    // TelaBaseComponent,
    // InfoBaseComponent,
    // Spreadsheet

    // CellInspect
  ],
  imports: [
    CommonModule,
    ExemplosRoutingModule,
    // FormularioModule,
    // FiltroModule,
    // SharedModule,
    FormsModule,
    ImportadorComponent,
    ImportTableComponent
  ]
})
export class ExemplosModule { }
