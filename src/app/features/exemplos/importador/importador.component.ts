import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ImportadorService } from './importador.service';
import { ImportTableComponent } from './import-table/import-table.component';
import { CellInspect } from './cell-inspect/cell-inspect';
import { raw_data, raw_data_test } from './raw_table_mock';
import { configCargasIniciais } from './importacoes/cargas-iniciais';
import {
  BaseResponse,
  CellCursor,
  CellData,
  CellError,
  CellValue,
  ColunaImportacao,
  ConfiguracaoImportacao,
  RowData,
  RowPayload,
  TableData,
  UpdateCell
} from './importador.models';
import { SeletorImportacoes } from './seletor-importacoes/seletor-importacoes';
import { ImportacoesPorSetor, lista_importacoes } from './importacoes/lista-importacoes';


function normalize(term: string): string {
  if (!term) return '';

  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')                            // Remove acentos
    .replace(/[ªº]/g, '')                                       // Remove indicadores ordinais
    .replace(/[°]/g, '')                                        // Remove símbolos de grau
    .replace(/[–—]/g, '-')                                      // Normaliza traços
    .replace(/['']/g, "'")                                      // Normaliza apóstrofos
    .replace(/[""]/g, '"')                                      // Normaliza aspas
    .replace(/[․]/g, '.')                                       // Normaliza pontos especiais
    .replace(/[،]/g, ',')                                       // Normaliza vírgulas especiais
    .replace(/[\u00A0\u2000-\u200B\u2028-\u2029\u3000]/g, ' ')  // Normaliza espaços especiais
    .replace(/[^\w\s\-\.]/g, '')                                // Remove caracteres especiais
    .replace(/\s+/g, ' ')                                       // Normaliza espaços múltiplos
    .trim();
}


@Component({
  selector: 'app-importador',
  templateUrl: './importador.component.html',
  styleUrls: ['./importador.component.scss'],
  imports: [ImportTableComponent, SeletorImportacoes, CommonModule, CellInspect]
})
export class ImportadorComponent implements OnInit {
  started: boolean = true;

  importacoesPorSetor: ImportacoesPorSetor[] = lista_importacoes;

  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

  loading = false;
  file: File | null = null;
  isDragging = false;
  isValidFile = false;
  separator = ';';
  tipoImportacao = '';
  configAtual: ConfiguracaoImportacao;
  tiposImportacao: string[] = [];

  importacaoOptions = [
    { hash: 1, descricao: 'Cargas Iniciais - Alocacao de Professores' }
  ];

  headers: string[] = [];
  parsedOriginal: string[][];
  tableDataParsed: RowData[] = [];
  etapaAtual = 0;
  errosAgrupados: CellError[][] = [];
  cellCursor: CellCursor = { row: 0, col: 0 };
  linhasDoErroAtual: number[] = [];

  /** Formulário de upload de arquivo */
  fileForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private importadorService: ImportadorService
  ) { }


  ngOnInit(): void {
    this.initForms();
    this.carregarTiposImportacao();
    this.selecionarTipoImportacao('cargas-iniciais');

    this.starImportacao();

  }

  starImportacao() {
    this.started = true;
    // TODO: Remover após implementar upload real
    this.tableDataParsed = this.buildTableData(raw_data_test);
    // this.tableDataParsed = this.buildTableData(raw_data);
    this.validarEtapa();

  }

  get tableData(): TableData {
    return {
      headers: ['Escola', 'Turma', 'Disciplina', 'CPF do professor', 'Nome do professor'],
      rows: this.tableDataParsed
    };
  }

  get selectedCell(): CellData {
    return this.tableData.rows[this.cellCursor.row]?.cells[this.cellCursor.col];
  }

  get etapaAtualConfig(): ColunaImportacao | undefined {
    return this.configAtual?.colunas[this.etapaAtual];
  }

  get etapaAtualTemErros(): boolean {
    const errors = this.etapaAtualConfig?.errors;
    if (!errors) return false;
    return Object.values(errors).some(e => !e.resolved && !e.remove);
  }

  get totalEtapas(): number {
    return this.configAtual?.colunas?.length || 0;
  }

  get todasEtapasValidas(): boolean {
    // Verifica se estamos na última etapa
    const isUltimaEtapa = this.etapaAtual >= this.totalEtapas - 1;
    // Verifica se a etapa atual não tem erros pendentes
    const etapaSemErros = !this.etapaAtualTemErros;
    return isUltimaEtapa && etapaSemErros;
  }

  get progressoEtapas(): { atual: number; total: number; porcentagem: number } {
    const total = this.totalEtapas;
    const atual = this.etapaAtual + 1;
    const porcentagem = total > 0 ? Math.round((atual / total) * 100) : 0;
    return { atual, total, porcentagem };
  }

  get etapaAtualDeveSerPulada(): boolean {
    return this.etapaAtualConfig?.skip === true;
  }

  private initForms(): void {
    this.fileForm = this.formBuilder.group({
      fileName: ['', Validators.required],
      fileBytes: ['', Validators.required],
      fileSize: ['', Validators.required],
      tipoImportacao: [null, Validators.required]
    });
  }

  private carregarTiposImportacao(): void {
    this.tiposImportacao = this.importadorService.listarTiposImportacao();
  }

  selecionarTipoImportacao(tipo: string): void {
    this.tipoImportacao = tipo;
    this.configAtual = configCargasIniciais;

    // Reset do estado
    this.etapaAtual = 0;
    this.tableDataParsed = [];
    this.errosAgrupados = [];
  }
  openFile(): void {
    this.fileInput.nativeElement.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files?.length > 0) {
      this.file = files[0];
      this.processFile(this.file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.file = input.files[0];
    this.processFile(this.file);
  }

  private processFile(file: File): void {
    this.loading = true;

    // Validação do arquivo
    if (!this.importadorService.validarArquivo(file)) {
      this.loading = false;
      return;
    }

    // Parse do arquivo
    this.importadorService.parseArquivo(file).subscribe({
      next: (result: string[][]) => this.handleParseSuccess(result),
      error: () => this.loading = false,
      complete: () => this.loading = false
    });
  }
  private handleParseSuccess(result: string[][]): void {
    this.headers = result.shift() || [];

    // Validação de colunas
    if (this.headers.length !== this.configAtual.colunas.length) {
      console.warn('Tabela não possui a quantidade de colunas esperada pela configuração');
    }

    this.parsedOriginal = result;
    this.tableDataParsed = this.buildTableData(result);
    this.validarEtapa();
  }

  private buildTableData(parsed: (string | number)[][]): RowData[] {
    return parsed.map((row, rowIdx) => this.buildRowData(row, rowIdx));
  }

  private buildRowData(row: (string | number)[], rowIdx: number): RowData {
    //Valores podem vir em "branco/empty" na cell,substitui por string vazia
    const no_empty = Array.from(row, v => v ?? '');
    const cells = no_empty.map((cellValue, colIdx) => this.buildCellData(cellValue, rowIdx, colIdx));
    return { idx: rowIdx, cells };
  }

  private buildCellData(cellValue: string | number, rowIdx: number, colIdx: number): CellData {
    const values = this.parseCellValues(cellValue, rowIdx);

    return {
      rowIdx,
      idx: colIdx,
      values,
      multiple: values.length > 1,
      valid: true,
      type: this.configAtual.colunas[colIdx].key
    };
  }

  private parseCellValues(cellValue: string | number, rowIdx: number): CellValue[] {

    if (typeof cellValue !== 'string' && typeof cellValue !== 'number') {
      return [];
    }

    const uniqueValues = [...new Set(cellValue.toString().split(this.separator))];

    return uniqueValues.map(value => ({
      original: value,
      changed: false,
      rowIdx,
      value,
      type: 'string',
      valid: false,
      normalized: normalize(value),
      original_normalized: normalize(value)
    }));
  }

  validarEtapa(): void {
    if (!this.configAtual) return;

    const etapa = this.etapaAtualConfig;
    if (!etapa) return;

    // Se a coluna deve ser pulada, marca células como válidas e avança
    if (etapa.skip) {
      console.log(`Etapa "${etapa.label}" marcada como skip. Pulando validação...`);
      this.marcarColunaComoValida(etapa);
      this.verificarAutoAvanco(etapa);
      return;
    }

    this.importadorService.obterRefData(this.configAtual, etapa).subscribe(result => {
      this.processarRefData(etapa, result);
      this.buildErrors(etapa);

      // Auto-avançar se não houver erros
      this.verificarAutoAvanco(etapa);
    });
  }

  private marcarColunaComoValida(etapa: ColunaImportacao): void {
    const cells = this.getColumnCells(etapa.key);
    cells.forEach(cell => {
      cell.valid = true;
      cell.values?.forEach(v => {
        v.valid = true;
        // Para colunas skip, o hash é o próprio valor normalizado
        v.hash = v.hash || v.value;
      });
    });
    etapa.errors = {};
  }
  private verificarAutoAvanco(etapa: ColunaImportacao): void {
    const temErros = etapa.errors && Object.keys(etapa.errors).length > 0;
    const deveSkip = etapa.skip === true;

    // Se skip ou sem erros, avança automaticamente
    if ((deveSkip || !temErros) && this.etapaAtual < this.totalEtapas - 1) {
      const motivo = deveSkip ? 'marcada como skip' : 'sem erros';
      console.log(`Etapa "${etapa.label}" ${motivo}. Avançando automaticamente...`);
      this.etapaAtual++;
      this.validarEtapa();
    } else if (!temErros) {
      console.log('Todas as etapas validadas com sucesso!');
    }
  }

  private processarRefData(etapa: ColunaImportacao, result: { options: BaseResponse[] }): void {
    etapa.options = result.options;
    etapa.options_record = Object.fromEntries(
      result.options.map((option: BaseResponse) => [normalize(option.descricao), option.hash])
    );
  }
  private buildErrors(etapa: ColunaImportacao): void {
    etapa.errors = {};

    const cells = this.getColumnCells(etapa.key);
    const uniqueValues = this.getUniqueValuesFromCells(cells);

    let errorCount = 0;

    uniqueValues.forEach(value => {
      const normalized = normalize(value);
      const matchingCells = this.findCellsWithValue(cells, normalized);
      const existsInOptions = etapa.options_record?.hasOwnProperty(normalized) ?? false;

      if (!existsInOptions) {
        etapa.errors![normalized] = this.createError(value, normalized, matchingCells, etapa, errorCount);
        errorCount++;
        this.markCellsAsInvalid(matchingCells);
      } else {
        this.assignHashToMatchingValues(matchingCells, etapa);
      }
    });
  }

  private createError(
    value: string,
    normalized: string,
    cells: CellData[],
    etapa: ColunaImportacao,
    index: number
  ): CellError {
    const label = value.length ? value : 'campo_vazio';
    const proximidade = this.importadorService
      .calcularProximidade(normalized, etapa.options)
      .filter(x => x.proximidade > this.configAtual.minProx);

    return {
      remove: false,
      changed: false,
      idx: index,
      resolved: false,
      label,
      normalized,
      original: { value: label, normalized },
      linhas: [...new Set(cells.map(c => c.rowIdx))],
      proximidade: normalized.length > 1 ? proximidade : [],
      open: false
    };
  }

  private markCellsAsInvalid(cells: CellData[]): void {
    cells.forEach(cell => cell.valid = false);
  }

  private assignHashToMatchingValues(cells: CellData[], etapa: ColunaImportacao): void {
    cells.forEach(cell => {
      cell.values?.forEach(v => {
        v.hash = etapa.options_record?.[v.normalized];
        v.valid = etapa.options_record?.[v.normalized] !== undefined;
      });
    });
  }

  private getColumnCells(columnKey: string): CellData[] {
    return this.tableData.rows
      .flatMap(r => r.cells)
      .filter(c => c.type === columnKey);
  }

  private getUniqueValuesFromCells(cells: CellData[]): Set<string> {
    const values = cells.flatMap(c => c.values?.map(v => v.value) || []);
    return new Set(values);
  }

  private findCellsWithValue(cells: CellData[], normalizedValue: string): CellData[] {
    return cells.filter(cell =>
      cell.values?.some(v => normalizedValue === v.normalized)
    );
  }
  confirmarEtapa(): void {
    if (this.etapaAtual >= this.totalEtapas - 1) return;

    this.etapaAtual++;
    this.validarEtapa();
  }

  getEtapaAtual(): ColunaImportacao | undefined {
    return this.etapaAtualConfig;
  }

  updateCell(update: UpdateCell): void {
    update.linhas?.forEach(rowIdx => {
      const cell = this.tableData.rows[rowIdx]?.cells[this.etapaAtual];
      if (!cell) return;

      this.updateCellValues(cell, update);
    });

    // Chama a função de update customizada da etapa, se configurada
    const etapa = this.etapaAtualConfig;
    if (etapa?.updateFn && !update.restore && update.linhas?.length) {
      etapa.updateFn(etapa.options, update.option, this.tableData.rows, update.linhas);
    }
  }

  private updateCellValues(cell: CellData, update: UpdateCell): void {
    const valuesToChange = cell.values?.filter(v =>
      v.normalized === update.original_normalized ||
      v.original_normalized === update.original_normalized
    );

    valuesToChange?.forEach(v => {
      v.value = update.option.descricao;
      v.normalized = normalize(update.option.descricao);
      v.hash = update.option.hash;
      v.valid = !update.restore;
      v.changed = !update.restore;
    });

    // Atualiza status de validação da célula
    const hasInvalidValue = cell.values?.some(v => !v.valid) ?? false;
    cell.valid = !hasInvalidValue;
  }
  selecionaErro(erro: CellError | null): void {
    this.linhasDoErroAtual = erro?.linhas || [];
  }

  abrirAjuda(): void {
    // Abrir modal de documentação/técnica
  }

  extrairPayload<T>(): T[] {
    return this.configAtual.buildRequest(this.tableData.rows);
  }


  private extrairPayloadLinha(row: RowData): RowPayload {
    const getHashes = (colIdx: number): string[] => {
      const values = row.cells[colIdx]?.values || [];
      return values.map(v => v.hash || v.value || '').filter(h => h);
    };

    return {
      hashEscola: getHashes(0),
      hashTurma: getHashes(1),
      hashDisciplina: getHashes(2),
      hashCPF: getHashes(3),      // CPF usa o próprio valor, não tem hash
      hashProfessor: getHashes(4),
    };
  }

  enviarParaImportacao(): void {
    if (!this.todasEtapasValidas) {
      console.warn('Não é possível enviar: ainda existem etapas com erros');
      return;
    }

    const payload = this.extrairPayload();

    console.log('='.repeat(50));
    console.log('PAYLOAD PARA IMPORTAÇÃO');
    console.log('='.repeat(50));
    console.log(`Total de linhas: ${payload.length}`);
    console.log('Estrutura:', payload);
    console.log('='.repeat(50));

    // TODO: Implementar chamada à API
    // this.importadorService.enviarImportacao(payload).subscribe({
    //   next: (response) => console.log('Importação realizada com sucesso', response),
    //   error: (error) => console.error('Erro na importação', error)
    // });
  }

  validarCorrecoesDaEtapa(): void {
    if (this.etapaAtualTemErros) {
      console.warn('Ainda existem erros pendentes nesta etapa');
      return;
    }
    if (this.etapaAtual < this.totalEtapas - 1) {
      this.confirmarEtapa();
    }
  }
}
