import { Component, Input } from '@angular/core';
import { ImportacoesPorSetor } from '../importacoes/lista-importacoes';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'seletor-importacoes',
  templateUrl: './seletor-importacoes.html',
  styleUrl: './seletor-importacoes.scss',
  imports: [CommonModule]
})
export class SeletorImportacoes {
  @Input() importacoes: ImportacoesPorSetor[];
}
