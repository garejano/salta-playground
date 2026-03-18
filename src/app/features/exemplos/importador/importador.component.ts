import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ImportadorService } from './importador.service';
import { ImportTableComponent } from './import-table/import-table.component';
import { CommonModule } from '@angular/common';
import { raw_data } from './raw_table_mock';
import { CellInspect } from './cell-inspect/cell-inspect';
import { BaseResponse, CellCursor, CellData, CellError, CellValue, ColunaImportacao, ConfiguracaoImportacao, EtapaImportacao, RowData, TableData, UpdateCell } from './importador.models';
import { configCargasIniciais } from './importacoes/cargas-iniciais';
import { mockData } from '../mocks';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-importador',
  templateUrl: './importador.component.html',
  styleUrls: ['./importador.component.scss'],
  imports: [ImportTableComponent, CommonModule, CellInspect]
})
export class ImportadorComponent implements OnInit {
  loading: boolean = false;
  file: File | null = null;
  isDragging = false;
  isValidFile: boolean = false;

  separator: string = ";";

  cellCursor: CellCursor = { row: 0, col: 0, }

  fileForm: FormGroup;
  tipoImportacao: string = '';
  configAtual: ConfiguracaoImportacao;
  tiposImportacao: string[] = [];
  etapas: string[] = [];

  headers: string[] = []
  parsedOriginal: any;
  tableDataParsed: any[] = [];
  errosAgrupados: any[] = [];
  etapaAtual: number = 0;

  importacaoOptions = [
    { hash: 1, descricao: "Cargas Iniciais - Alocacao de Professores" }
  ]

  linhasDoErroAtual: number[] = [];

  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

  constructor(
    private formBuilder: FormBuilder,
    private importadorService: ImportadorService,
  ) { }


  ngOnInit(): void {
    this.carregarTiposImportacao();
    this.onTipoImportacaoSelecionada("cargas-iniciais");

    this.tableDataParsed = this.buildTableData(raw_data);
    this.validarEtapa();


    this.startForms();

  }

  openFile() {
    this.fileInput.nativeElement.click();
  }

  get tableData(): TableData {

    var data = this.tableDataParsed;

    // if (this.linhasDoErroAtual.length > 0) {
    //   data = data.filter((r: RowData) => {
    //     return this.linhasDoErroAtual.includes(r.idx)
    //   })
    // }

    return {
      // headers: mock_table.headers,//this.headers,
      "headers": ["Escola", "Turma", "Disciplina", "CPF do professor", "Nome do professor"],
      rows: data
    }
  }

  get selectedCell(): CellData {
    return this.tableData.rows[this.cellCursor.row].cells[this.cellCursor.col];
  }


  startForms() {
    this.fileForm = this.formBuilder.group({
      fileName: ['', Validators.required],
      fileBytes: ['', Validators.required],
      fileSize: ['', Validators.required],
      tipoImportacao: [null, Validators.required],
    });
  }

  carregarTiposImportacao() {
    this.tiposImportacao = this.importadorService.listarTiposImportacao();
  }

  onTipoImportacaoSelecionada(tipo: string) {
    this.tipoImportacao = tipo;
    this.configAtual = configCargasIniciais;
    // this.importadorService.carregarConfiguracao(tipo);
    this.etapas = this.configAtual?.etapasDaImportacao.map(e => e.key) || [];
    this.etapaAtual = 0;
    this.tableDataParsed = [];
    this.errosAgrupados = [];
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.file = files[0];
      this.processFile(this.file);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.file = file;
    this.processFile(file);
  }

  processFile(file: File) {
    this.loading = true;
    if (!this.importadorService.validarArquivo(file)) {
      this.loading = false;
      return;
    }
    this.importadorService.parseArquivo(file)
      .subscribe({

        next: (result: string[][]) => {
          this.headers = result.shift();

          if (this.headers.length != this.configAtual.colunas.length) {
            console.log("Tabela nao possui a quantidade de colunas informadas na configuracao")
          }

          this.parsedOriginal = result;
          this.tableDataParsed = this.buildTableData(result);
          this.validarEtapa();
        },
        error: (error) => {
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }


  buildTableData(parsed: (string | number)[][]): RowData[] {
    const tableData = parsed.map((row: (string | number)[], rowIdx: number) => {
      const cells = Array.from(row).map((cell_string, idx) => {

        var values: CellValue[] = [];

        if (typeof (cell_string) == "string" || typeof (cell_string) == "number") {
          const unicos = [... new Set(cell_string.toString().split(this.separator))]
          values = unicos.map((i) => {
            return {
              rowIdx: rowIdx,
              value: i,
              type: 'string',
              valid: false,
              normalized: normalize(i),
              original_normalized: normalize(i),
            }
          })
        }

        const v: CellData = {
          rowIdx: rowIdx,
          idx: idx,
          values: values,
          multiple: values.length > 1,
          valid: true,
          type: this.configAtual.colunas[idx].key
        }
        return v;
      })

      const row_data: RowData = {
        idx: rowIdx,
        cells: cells
      };

      return row_data
    })


    return tableData
  }

  validarEtapa() {
    if (!this.configAtual) return;

    const etapa = this.getEtapaAtual() as ColunaImportacao;

    this.importadorService.obterRefData(this.configAtual, etapa)
      .subscribe(result => {

        etapa.options = result.options
        etapa.options_record = Object.fromEntries(
          result.options.map((x: BaseResponse) => [normalize(x.descricao), x.hash])
        )
        this.buildErrors(etapa);
      });
  }

  buildErrors(etapa: ColunaImportacao) {
    etapa.errors = {};

    const cells = this.getColumn(this.tableData.rows, etapa.key)

    const values = cells.flatMap(x => {
      return x.values?.map(x => { return x.value })
    })

    const set = new Set(values);

    var error_count = 0;
    Array.from(set).forEach((string: string) => {
      const normalized = normalize(string);

      const result: CellData[] = cells.filter((cell: CellData) => {
        return cell.values?.some((value: CellValue) => normalized == value.normalized)
      });

      const existe = etapa.options_record?.hasOwnProperty(normalized) ?? false;
      const proximidade = this.importadorService.calcularProximidade(normalized, etapa.options)
        .filter(x => x.proximidade > 80)


      if (!existe) {
        etapa.errors![normalized] = {
          remove: false,
          changed: false,
          idx: error_count,
          resolved: false,
          label: string.length ? string : "campo_vazio",
          normalized: normalized,
          original: {
            value: string.length ? string : "campo_vazio",
            normalized: normalized
          },
          linhas: [...new Set(result.map(x => { return x.rowIdx }))],
          proximidade: normalized.length > 1 ? proximidade : [],
          open: false,
        }
        error_count += 1;
        result.forEach((x) => {
          x.valid = false;
        })
      } {
        result.forEach((x) => {
          x.values?.forEach((v) => {
            v.hash = etapa.options_record?.[v.normalized]
          })
        })
      }
    })

  }

  getColumn(rows: RowData[], type: string) {
    return rows
      .flatMap(r => r.cells)
      .filter(c => c.type === type);
  }


  confirmarEtapa() {
    if (this.etapaAtual < this.etapas.length - 1) {
      this.etapaAtual += 1;
      this.validarEtapa();
    }
  }

  abrirAjuda() {
    // Abrir modal de documentação/técnica
  }

  getEtapaAtual(): ColunaImportacao | undefined {
    return this.configAtual?.colunas[this.etapaAtual];
  }

  updateCell(update: UpdateCell, restore: boolean = false): void {
    update.linhas?.forEach((n) => {
      const cell = this.tableData.rows[n].cells[this.etapaAtual];
      const cellValues = cell.values;

      const values_to_change = cellValues?.filter((x) => x.normalized == update.original_normalized || x.original_normalized == update.original_normalized)

      values_to_change?.forEach((x) => {
        x.value = update.option.descricao;
        x.normalized = normalize(update.option.descricao);
        x.hash = update.option.hash;
        x.valid = update.restore ? false : true;
      })

      const anyInvalid = cellValues?.some(x => !x.valid) ?? false;
      cell.valid = !anyInvalid;

    })
  }

  selecionaErro(erro: CellError) {
    if (erro) {
      this.linhasDoErroAtual = erro.linhas;
    } else {
      this.linhasDoErroAtual = [];
    }
  }
}


function normalize(term: string): string {
  if (!term) return "";
  return term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[ªº]/g, "") // Remove indicadores ordinais (1ª, 2º)
    .replace(/[°]/g, "") // Remove símbolos de grau
    .replace(/[–—]/g, "-") // Normaliza diferentes tipos de traço
    .replace(/['']/g, "'") // Normaliza apostrofes
    .replace(/[""]/g, '"') // Normaliza aspas
    .replace(/[․]/g, ".") // Normaliza pontos especiais
    .replace(/[،]/g, ",") // Normaliza vírgulas especiais
    .replace(/[\u00A0\u2000-\u200B\u2028-\u2029\u3000]/g, " ") // Normaliza espaços especiais
    .replace(/[^\w\s\-\.]/g, "") // Remove caracteres especiais exceto espaços, letras, números, hífens e pontos
    .replace(/\s+/g, " ") // Normaliza espaços múltiplos
    .trim();
}
