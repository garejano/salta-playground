import { Injectable } from '@angular/core';
import { BaseResponse, CellData, CellError, ColunaImportacao, RowData } from './importador.models';
import { ImportadorService } from './importador.service';
import { normalize } from './utils/normalize';

/**
 * Responsável pela lógica de validação das etapas de importação:
 * comparação contra dados de referência, construção de erros e
 * atribuição de hashes às células válidas.
 */
@Injectable({ providedIn: 'root' })
export class ImportadorValidacaoService {

  constructor(private importadorService: ImportadorService) {}

  /**
   * Popula `etapa.options` e `etapa.options_record` com os dados de referência recebidos.
   */
  processarRefData(etapa: ColunaImportacao, result: { options: BaseResponse[] }): void {
    etapa.options = result.options;
    etapa.options_record = Object.fromEntries(
      result.options.map(opt => [normalize(opt.descricao), opt.hash])
    );
  }

  /**
   * Percorre as células da coluna da etapa, detecta valores sem match nas opções de referência
   * e cria registros de erro com sugestões por proximidade.
   */
  buildErrors(etapa: ColunaImportacao, rows: RowData[], minProx: number): void {
    etapa.errors = {};

    const cells = this.getColumnCells(etapa.key, rows);
    const uniqueValues = this.getUniqueValuesFromCells(cells);
    let errorCount = 0;

    uniqueValues.forEach(value => {
      const norm = normalize(value);
      const matchingCells = this.findCellsWithValue(cells, norm);
      const existsInOptions = Object.prototype.hasOwnProperty.call(etapa.options_record ?? {}, norm);

      if (!existsInOptions) {
        etapa.errors![norm] = this.createError(value, norm, matchingCells, etapa, errorCount, minProx);
        errorCount++;
        matchingCells.forEach(cell => cell.valid = false);
      } else {
        this.assignHashToMatchingValues(matchingCells, etapa);
      }
    });
  }

  /**
   * Marca todas as células da coluna como válidas sem validação contra lista.
   * Usado para etapas com `skip: true` (ex: CPF).
   */
  marcarColunaComoValida(etapa: ColunaImportacao, rows: RowData[]): void {
    const cells = this.getColumnCells(etapa.key, rows);
    cells.forEach(cell => {
      cell.valid = true;
      cell.values?.forEach(v => {
        v.valid = true;
        v.hash = v.hash || v.value;
      });
    });
    etapa.errors = {};
  }

  // ---------------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------------

  private createError(
    value: string,
    norm: string,
    cells: CellData[],
    etapa: ColunaImportacao,
    index: number,
    minProx: number
  ): CellError {
    const label = value.length ? value : 'campo_vazio';
    const proximidade = this.importadorService
      .calcularProximidade(norm, etapa.options)
      .filter(x => x.proximidade > minProx);

    return {
      remove: false,
      changed: false,
      idx: index,
      resolved: false,
      label,
      normalized: norm,
      original: { value: label, normalized: norm },
      linhas: [...new Set(cells.map(c => c.rowIdx))],
      proximidade: norm.length > 1 ? proximidade : [],
      open: false,
    };
  }

  private assignHashToMatchingValues(cells: CellData[], etapa: ColunaImportacao): void {
    cells.forEach(cell =>
      cell.values?.forEach(v => {
        v.hash  = etapa.options_record?.[v.normalized];
        v.valid = etapa.options_record?.[v.normalized] !== undefined;
      })
    );
  }

  private getColumnCells(columnKey: string, rows: RowData[]): CellData[] {
    return rows.flatMap(r => r.cells).filter(c => c.type === columnKey);
  }

  private getUniqueValuesFromCells(cells: CellData[]): Set<string> {
    return new Set(cells.flatMap(c => c.values?.map(v => v.value) ?? []));
  }

  private findCellsWithValue(cells: CellData[], normalizedValue: string): CellData[] {
    return cells.filter(cell => cell.values?.some(v => normalizedValue === v.normalized));
  }
}
