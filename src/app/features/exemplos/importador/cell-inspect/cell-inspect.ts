import { Component, EventEmitter, Input, OnInit, Output, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseResponse, CellCursor, CellData, CellError, ColunaImportacao, UpdateCell } from '../importador.models';

@Component({
  selector: 'cell-inspect',
  templateUrl: './cell-inspect.html',
  styleUrl: './cell-inspect.scss',
  imports: [CommonModule]
})
export class CellInspect implements OnInit {
  @Input() cursor: CellCursor;
  @Input() etapa: ColunaImportacao;
  @Input() cell: CellData;
  @Output() update = new EventEmitter<UpdateCell>();
  @Output() selecionaErro = new EventEmitter<any>();

  error_idx: number = 0;
  erroSelecionado?: CellError | null = undefined;

  ngOnInit() {
    this.erroSelecionado = Object.values(this.etapa.errors)[0];
  }

  logError(error: { key: string, value: CellError }) {
    if (error.value.resolved) return;
    this.update.emit({
      original_normalized: error.value.normalized,
      new_value: "WoW",
      linhas: error.value.linhas
    })
    error.value.resolved = true;
  }

  get options(): BaseResponse[] {
    const set_prox = new Set(this.erroSelecionado?.proximidade.map(x => { return x.hash }))
    const options = this.etapa.options.filter((t) => {
      return !set_prox.has(t.hash)
    })

    return options;
  }

  toggleErro(error: CellError) {
    if (this.erroSelecionado == error) {
      this.erroSelecionado = null;
    } else {
      this.erroSelecionado = error;
    }
    this.selecionaErro.emit(this.erroSelecionado);
  }

  selectOption(option:BaseResponse | any){
    console.log(option)

  }

}
