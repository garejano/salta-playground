import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import * as XLSX from 'xlsx';
import { mockData } from '../mocks';
import { BaseResponse, ColunaImportacao, ConfiguracaoImportacao, EtapaImportacao } from './importador.models';
import { normalize } from './utils/normalize';


@Injectable({ providedIn: 'root' })
export class ImportadorService {
  constructor() { }

  listarTiposImportacao(): string[] {
    return ['cargas-iniciais'];
  }

  validarArquivo(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xls', 'xlsx'].includes(ext || '')) return false;
    if (file.size > 10 * 1024 * 1024) return false;
    return true;
  }

  parseArquivo(file: File): Observable<any[]> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const dataRows = rawRows.filter(row =>
          Array.isArray(row)
            ? row.some(cell => cell !== null && cell !== undefined && cell !== '')
            : Object.values(row).some(cell => cell !== null && cell !== undefined)
        );
        observer.next(dataRows);
        observer.complete();
      };
      reader.onerror = (err) => observer.error(err);
      reader.readAsArrayBuffer(file);
    });
  }


  obterRefData(config: ConfiguracaoImportacao, etapa: EtapaImportacao): Observable<any> {
    if (!etapa || !config) {
      console.error("configuracao ou etapa null|undefined");
      return of({ options: [] })
    };

    switch (etapa.key) {
      case 'escola': return of({ options: mockData.escolas });
      case 'professor': return of({ options: mockData.professores });
      case 'turma': return of({ options: mockData.turmas });
      case 'disciplina': return of({ options: mockData.disciplinas });
      default: return of({ options: [] });
    }
  }


  // Pesos empíricos da combinação de algoritmos — não alterar sem validação
  private readonly JARO_WEIGHT = 0.6;
  private readonly LEV_WEIGHT  = 0.4;
  // Tolerância de comprimento: pares com diferença maior que 70% do comprimento maior são descartados
  private readonly LENGTH_RATIO_THRESHOLD = 0.7;
  // Parâmetros do Winkler
  private readonly WINKLER_MAX_PREFIX = 4;
  private readonly WINKLER_SCALE      = 0.1;

  private levenshteinScore(a: string, b: string): number {
    const lenA = a.length;
    const lenB = b.length;

    if (Math.abs(lenA - lenB) > Math.max(lenA, lenB) * this.LENGTH_RATIO_THRESHOLD) {
      return 0;
    }

    const matrix: number[][] = Array.from({ length: lenB + 1 }, () => new Array(lenA + 1));
    for (let i = 0; i <= lenB; i++) matrix[i][0] = i;
    for (let j = 0; j <= lenA; j++) matrix[0][j] = j;

    for (let i = 1; i <= lenB; i++) {
      for (let j = 1; j <= lenA; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substituição
            matrix[i][j - 1]     + 1, // inserção
            matrix[i - 1][j]     + 1  // remoção
          );
        }
      }
    }

    const maxLen = Math.max(lenA, lenB);
    return maxLen === 0 ? 1 : 1 - matrix[lenB][lenA] / maxLen;
  }

  private jaroWinklerScore(a: string, b: string): number {
    if (a === b) return 1;

    const lenA = a.length;
    const lenB = b.length;
    const matchDistance = Math.floor(Math.max(lenA, lenB) / 2) - 1;

    const aMatches = new Array(lenA).fill(false);
    const bMatches = new Array(lenB).fill(false);
    let matches = 0;

    for (let i = 0; i < lenA; i++) {
      const start = Math.max(0, i - matchDistance);
      const end   = Math.min(i + matchDistance + 1, lenB);
      for (let j = start; j < end; j++) {
        if (bMatches[j] || a[i] !== b[j]) continue;
        aMatches[i] = bMatches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < lenA; i++) {
      if (!aMatches[i]) continue;
      while (!bMatches[k]) k++;
      if (a[i] !== b[k]) transpositions++;
      k++;
    }

    const jaro = (matches / lenA + matches / lenB + (matches - transpositions / 2) / matches) / 3;

    let prefix = 0;
    for (let i = 0; i < Math.min(this.WINKLER_MAX_PREFIX, lenA, lenB); i++) {
      if (a[i] === b[i]) prefix++;
      else break;
    }

    return jaro + prefix * this.WINKLER_SCALE * (1 - jaro);
  }

  calcularProximidade(
    busca: string,
    lista: { hash: string; descricao: string }[]
  ): { hash?: string; descricao: string; proximidade: number }[] {
    const buscaNorm = normalize(busca);

    return lista.map(item => {
      const descNorm = normalize(item.descricao);

      if (descNorm.includes(buscaNorm)) {
        return { hash: item.hash, descricao: item.descricao, proximidade: 100 };
      }

      if (buscaNorm.length === 0 && descNorm.length === 0) {
        return { hash: item.hash, descricao: item.descricao, proximidade: 100 };
      }

      const lev  = this.levenshteinScore(buscaNorm, descNorm);
      const jaro = this.jaroWinklerScore(buscaNorm, descNorm);
      const score = jaro * this.JARO_WEIGHT + lev * this.LEV_WEIGHT;

      return {
        hash: item.hash,
        descricao: item.descricao,
        proximidade: Math.round(score * 100),
      };
    });
  }
}
