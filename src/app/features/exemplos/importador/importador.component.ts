import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ImportadorService } from './importador.service';
import { ImportTableComponent } from './import-table/import-table.component';
import { CellInspect } from './cell-inspect/cell-inspect';
import { raw_data_test } from './raw_table_mock';
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

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Normaliza uma string para comparação.
 * Remove acentos, caracteres especiais e normaliza espaços.
 * @param term - String a ser normalizada
 * @returns String normalizada em minúsculas
 */
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

// ============================================
// COMPONENTE
// ============================================

@Component({
  selector: 'app-importador',
  templateUrl: './importador.component.html',
  styleUrls: ['./importador.component.scss'],
  imports: [ImportTableComponent, CommonModule, CellInspect]
})
export class ImportadorComponent implements OnInit {

  // ============================================
  // VIEW CHILDREN
  // ============================================

  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

  // ============================================
  // ESTADO DO COMPONENTE
  // ============================================

  /** Indica se está carregando dados */
  loading = false;

  /** Arquivo selecionado pelo usuário */
  file: File | null = null;

  /** Indica se o usuário está arrastando um arquivo sobre a área de drop */
  isDragging = false;

  /** Indica se o arquivo selecionado é válido */
  isValidFile = false;

  // ============================================
  // CONFIGURAÇÃO DA IMPORTAÇÃO
  // ============================================

  /** Separador de valores nas células (ex: múltiplos professores) */
  separator = ';';

  /** Tipo de importação selecionado */
  tipoImportacao = '';

  /** Configuração atual da importação */
  configAtual: ConfiguracaoImportacao;

  /** Lista de tipos de importação disponíveis */
  tiposImportacao: string[] = [];

  /** Opções de importação para o select */
  importacaoOptions = [
    { hash: 1, descricao: 'Cargas Iniciais - Alocacao de Professores' }
  ];

  // ============================================
  // DADOS DA TABELA
  // ============================================

  /** Cabeçalhos da tabela importada */
  headers: string[] = [];

  /** Dados originais parseados do arquivo */
  parsedOriginal: string[][];

  /** Dados da tabela processados */
  tableDataParsed: RowData[] = [];

  // ============================================
  // ETAPAS DE VALIDAÇÃO
  // ============================================

  /** Lista de etapas da importação */
  etapas: string[] = [];

  /** Índice da etapa atual */
  etapaAtual = 0;

  /** Erros agrupados por etapa */
  errosAgrupados: CellError[][] = [];

  // ============================================
  // SELEÇÃO E NAVEGAÇÃO
  // ============================================

  /** Posição do cursor na tabela */
  cellCursor: CellCursor = { row: 0, col: 0 };

  /** Linhas que contêm o erro atualmente selecionado */
  linhasDoErroAtual: number[] = [];

  // ============================================
  // FORMULÁRIOS
  // ============================================

  /** Formulário de upload de arquivo */
  fileForm: FormGroup;

  // ============================================
  // CONSTRUTOR
  // ============================================

  constructor(
    private formBuilder: FormBuilder,
    private importadorService: ImportadorService
  ) {}

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================

  ngOnInit(): void {
    this.initForms();
    this.carregarTiposImportacao();
    this.selecionarTipoImportacao('cargas-iniciais');

    // TODO: Remover após implementar upload real
    this.tableDataParsed = this.buildTableData(raw_data_test);
    this.validarEtapa();
  }

  // ============================================
  // GETTERS
  // ============================================

  /**
   * Retorna os dados formatados para a tabela
   */
  get tableData(): TableData {
    return {
      headers: ['Escola', 'Turma', 'Disciplina', 'CPF do professor', 'Nome do professor'],
      rows: this.tableDataParsed
    };
  }

  /**
   * Retorna a célula atualmente selecionada
   */
  get selectedCell(): CellData {
    return this.tableData.rows[this.cellCursor.row]?.cells[this.cellCursor.col];
  }

  /**
   * Retorna a configuração da etapa atual
   */
  get etapaAtualConfig(): ColunaImportacao | undefined {
    return this.configAtual?.colunas[this.etapaAtual];
  }

  /**
   * Verifica se a etapa atual possui erros pendentes
   */
  get etapaAtualTemErros(): boolean {
    const errors = this.etapaAtualConfig?.errors;
    if (!errors) return false;
    return Object.values(errors).some(e => !e.resolved && !e.remove);
  }

  /**
   * Verifica se todas as etapas foram validadas com sucesso
   */
  get todasEtapasValidas(): boolean {
    // Verifica se estamos na última etapa
    const isUltimaEtapa = this.etapaAtual >= this.etapas.length - 1;
    // Verifica se a etapa atual não tem erros pendentes
    const etapaSemErros = !this.etapaAtualTemErros;
    return isUltimaEtapa && etapaSemErros;
  }

  /**
   * Retorna o progresso atual das etapas (para UI)
   */
  get progressoEtapas(): { atual: number; total: number; porcentagem: number } {
    const total = this.etapas.length;
    const atual = this.etapaAtual + 1;
    const porcentagem = Math.round((atual / total) * 100);
    return { atual, total, porcentagem };
  }

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  /**
   * Inicializa os formulários do componente
   */
  private initForms(): void {
    this.fileForm = this.formBuilder.group({
      fileName: ['', Validators.required],
      fileBytes: ['', Validators.required],
      fileSize: ['', Validators.required],
      tipoImportacao: [null, Validators.required]
    });
  }

  /**
   * Carrega os tipos de importação disponíveis
   */
  private carregarTiposImportacao(): void {
    this.tiposImportacao = this.importadorService.listarTiposImportacao();
  }

  /**
   * Seleciona um tipo de importação e carrega sua configuração
   * @param tipo - Identificador do tipo de importação
   */
  selecionarTipoImportacao(tipo: string): void {
    this.tipoImportacao = tipo;
    this.configAtual = configCargasIniciais;
    this.etapas = this.configAtual?.etapasDaImportacao.map(e => e.key) || [];

    // Reset do estado
    this.etapaAtual = 0;
    this.tableDataParsed = [];
    this.errosAgrupados = [];
  }

  // ============================================
  // UPLOAD DE ARQUIVO
  // ============================================

  /**
   * Abre o seletor de arquivos
   */
  openFile(): void {
    this.fileInput.nativeElement.click();
  }

  /**
   * Handler para evento de arrastar sobre a área de drop
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  /**
   * Handler para evento de sair da área de drop
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  /**
   * Handler para evento de soltar arquivo na área de drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files?.length > 0) {
      this.file = files[0];
      this.processFile(this.file);
    }
  }

  /**
   * Handler para seleção de arquivo via input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.file = input.files[0];
    this.processFile(this.file);
  }

  /**
   * Processa o arquivo selecionado
   * @param file - Arquivo a ser processado
   */
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

  /**
   * Processa o resultado do parse do arquivo
   * @param result - Linhas parseadas do arquivo
   */
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

  // ============================================
  // CONSTRUÇÃO DOS DADOS DA TABELA
  // ============================================

  /**
   * Constrói a estrutura de dados da tabela a partir do CSV parseado
   * @param parsed - Array de linhas parseadas do arquivo
   * @returns Array de RowData formatado para a tabela
   */
  private buildTableData(parsed: (string | number)[][]): RowData[] {
    return parsed.map((row, rowIdx) => this.buildRowData(row, rowIdx));
  }

  /**
   * Constrói os dados de uma linha da tabela
   * @param row - Array de valores da linha
   * @param rowIdx - Índice da linha
   */
  private buildRowData(row: (string | number)[], rowIdx: number): RowData {
    const cells = row.map((cellValue, colIdx) => this.buildCellData(cellValue, rowIdx, colIdx));
    return { idx: rowIdx, cells };
  }

  /**
   * Constrói os dados de uma célula
   * @param cellValue - Valor da célula (pode conter múltiplos valores separados)
   * @param rowIdx - Índice da linha
   * @param colIdx - Índice da coluna
   */
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

  /**
   * Parseia os valores de uma célula (suporta múltiplos valores separados)
   * @param cellValue - Valor bruto da célula
   * @param rowIdx - Índice da linha
   */
  private parseCellValues(cellValue: string | number, rowIdx: number): CellValue[] {
    if (typeof cellValue !== 'string' && typeof cellValue !== 'number') {
      return [];
    }

    const uniqueValues = [...new Set(cellValue.toString().split(this.separator))];

    return uniqueValues.map(value => ({
      rowIdx,
      value,
      type: 'string',
      valid: false,
      normalized: normalize(value),
      original_normalized: normalize(value)
    }));
  }

  // ============================================
  // VALIDAÇÃO E ERROS
  // ============================================

  /**
   * Valida a etapa atual da importação.
   * Se não houver erros, avança automaticamente para a próxima etapa.
   */
  validarEtapa(): void {
    if (!this.configAtual) return;

    const etapa = this.etapaAtualConfig;
    if (!etapa) return;

    this.importadorService.obterRefData(this.configAtual, etapa).subscribe(result => {
      this.processarRefData(etapa, result);
      this.buildErrors(etapa);

      // Auto-avançar se não houver erros
      this.verificarAutoAvanco(etapa);
    });
  }

  /**
   * Verifica se a etapa pode avançar automaticamente (sem erros)
   * @param etapa - Configuração da etapa validada
   */
  private verificarAutoAvanco(etapa: ColunaImportacao): void {
    const temErros = etapa.errors && Object.keys(etapa.errors).length > 0;

    if (!temErros && this.etapaAtual < this.etapas.length - 1) {
      console.log(`Etapa "${etapa.label}" sem erros. Avançando automaticamente...`);
      this.etapaAtual++;
      this.validarEtapa();
    } else if (!temErros) {
      console.log('Todas as etapas validadas com sucesso!');
    }
  }

  /**
   * Processa os dados de referência retornados pelo serviço
   * @param etapa - Configuração da etapa
   * @param result - Dados de referência
   */
  private processarRefData(etapa: ColunaImportacao, result: { options: BaseResponse[] }): void {
    etapa.options = result.options;
    etapa.options_record = Object.fromEntries(
      result.options.map((option: BaseResponse) => [normalize(option.descricao), option.hash])
    );
  }

  /**
   * Constrói os erros de validação para uma etapa
   * @param etapa - Configuração da etapa a ser validada
   */
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

  /**
   * Cria um objeto de erro para um valor inválido
   */
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
      .filter(x => x.proximidade > 80);

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

  /**
   * Marca as células como inválidas
   */
  private markCellsAsInvalid(cells: CellData[]): void {
    cells.forEach(cell => cell.valid = false);
  }

  /**
   * Atribui o hash às células que possuem valores válidos
   */
  private assignHashToMatchingValues(cells: CellData[], etapa: ColunaImportacao): void {
    cells.forEach(cell => {
      cell.values?.forEach(v => {
        v.hash = etapa.options_record?.[v.normalized];
      });
    });
  }

  /**
   * Retorna as células de uma coluna específica
   * @param columnKey - Identificador da coluna
   */
  private getColumnCells(columnKey: string): CellData[] {
    return this.tableData.rows
      .flatMap(r => r.cells)
      .filter(c => c.type === columnKey);
  }

  /**
   * Extrai valores únicos das células
   */
  private getUniqueValuesFromCells(cells: CellData[]): Set<string> {
    const values = cells.flatMap(c => c.values?.map(v => v.value) || []);
    return new Set(values);
  }

  /**
   * Encontra células que contêm um valor específico (normalizado)
   */
  private findCellsWithValue(cells: CellData[], normalizedValue: string): CellData[] {
    return cells.filter(cell =>
      cell.values?.some(v => normalizedValue === v.normalized)
    );
  }

  // ============================================
  // NAVEGAÇÃO DE ETAPAS
  // ============================================

  /**
   * Confirma a etapa atual e avança para a próxima
   */
  confirmarEtapa(): void {
    if (this.etapaAtual >= this.etapas.length - 1) return;

    this.etapaAtual++;
    this.validarEtapa();
  }

  /**
   * Retorna a configuração da etapa atual
   * @deprecated Use o getter etapaAtualConfig
   */
  getEtapaAtual(): ColunaImportacao | undefined {
    return this.etapaAtualConfig;
  }

  // ============================================
  // ATUALIZAÇÃO DE CÉLULAS
  // ============================================

  /**
   * Atualiza o valor de células baseado em uma correção
   * @param update - Dados da atualização
   * @param restore - Se deve restaurar o valor original
   */
  updateCell(update: UpdateCell, restore = false): void {
    update.linhas?.forEach(rowIdx => {
      const cell = this.tableData.rows[rowIdx]?.cells[this.etapaAtual];
      if (!cell) return;

      this.updateCellValues(cell, update);
    });
  }

  /**
   * Atualiza os valores de uma célula específica
   */
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
    });

    // Atualiza status de validação da célula
    const hasInvalidValue = cell.values?.some(v => !v.valid) ?? false;
    cell.valid = !hasInvalidValue;
  }

  // ============================================
  // SELEÇÃO DE ERROS
  // ============================================

  /**
   * Seleciona um erro e filtra as linhas da tabela
   * @param erro - Erro selecionado (ou null para limpar seleção)
   */
  selecionaErro(erro: CellError | null): void {
    this.linhasDoErroAtual = erro?.linhas || [];
  }

  // ============================================
  // AÇÕES
  // ============================================

  /**
   * Abre o modal de ajuda/documentação
   * TODO: Implementar
   */
  abrirAjuda(): void {
    // Abrir modal de documentação/técnica
  }

  // ============================================
  // EXTRAÇÃO DE PAYLOAD
  // ============================================

  /**
   * Extrai o payload de hashes de todas as linhas para envio à API.
   * Cada célula pode conter múltiplos valores (separados por ;), 
   * por isso cada campo é um array.
   * @returns Array de RowPayload com os hashes de cada linha
   */
  extrairPayload(): RowPayload[] {
    return this.tableData.rows.map(row => this.extrairPayloadLinha(row));
  }

  /**
   * Extrai o payload de uma única linha
   * @param row - Dados da linha
   */
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

  /**
   * Envia os dados validados para importação.
   * Este método será chamado após todas as etapas serem validadas.
   */
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

  /**
   * Valida as correções da etapa atual e avança se não houver mais erros.
   * Este método é chamado pelo componente cell-inspect quando o usuário
   * clica no botão de validar correções.
   */
  validarCorrecoesDaEtapa(): void {
    if (this.etapaAtualTemErros) {
      console.warn('Ainda existem erros pendentes nesta etapa');
      return;
    }

    // Se não há mais erros, avança para próxima etapa
    if (this.etapaAtual < this.etapas.length - 1) {
      this.confirmarEtapa();
    }
  }
}
