import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import * as XLSX from 'xlsx';
import { mockData } from '../mocks';
import { BaseResponse, CellData, CellValue, ColunaImportacao, ConfiguracaoImportacao, EtapaImportacao, RowData } from './importador.models';


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


  calcularProximidade(
    busca: string,
    lista: { hash: string; descricao: string }[]
  ): { hash?: string; descricao: string; proximidade: number }[] {

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const buscaNorm = normalize(busca);

    return lista.map(item => {
      const descNorm = normalize(item.descricao);

      // match direto (curto-circuito)
      if (descNorm.includes(buscaNorm)) {
        return {
          descricao: item.descricao,
          proximidade: 100,
          hash: item.hash,
        };
      }

      const a = buscaNorm;
      const b = descNorm;

      const lenA = a.length;
      const lenB = b.length;

      if (lenA === 0 && lenB === 0) {
        return { descricao: item.descricao, proximidade: 100 };
      }

      // =========================
      // 🔹 LEVENSHTEIN
      // =========================
      let levScore = 0;

      if (Math.abs(lenA - lenB) <= Math.max(lenA, lenB) * 0.7) {
        const matrix: number[][] = Array.from({ length: lenB + 1 }, () =>
          new Array(lenA + 1)
        );

        for (let i = 0; i <= lenB; i++) matrix[i][0] = i;
        for (let j = 0; j <= lenA; j++) matrix[0][j] = j;

        for (let i = 1; i <= lenB; i++) {
          const charB = b[i - 1];

          for (let j = 1; j <= lenA; j++) {
            if (charB === a[j - 1]) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              const replace = matrix[i - 1][j - 1] + 1;
              const insert = matrix[i][j - 1] + 1;
              const remove = matrix[i - 1][j] + 1;

              matrix[i][j] = replace < insert
                ? (replace < remove ? replace : remove)
                : (insert < remove ? insert : remove);
            }
          }
        }

        const distancia = matrix[lenB][lenA];
        const maxLen = Math.max(lenA, lenB);

        levScore = maxLen === 0
          ? 1
          : (1 - distancia / maxLen);
      }

      // =========================
      // 🔹 JARO-WINKLER
      // =========================
      const jaroWinkler = (() => {
        if (a === b) return 1;

        const matchDistance = Math.floor(Math.max(lenA, lenB) / 2) - 1;

        const aMatches = new Array(lenA).fill(false);
        const bMatches = new Array(lenB).fill(false);

        let matches = 0;

        for (let i = 0; i < lenA; i++) {
          const start = Math.max(0, i - matchDistance);
          const end = Math.min(i + matchDistance + 1, lenB);

          for (let j = start; j < end; j++) {
            if (bMatches[j]) continue;
            if (a[i] !== b[j]) continue;

            aMatches[i] = true;
            bMatches[j] = true;
            matches++;
            break;
          }
        }

        if (matches === 0) return 0;

        let t = 0;
        let k = 0;

        for (let i = 0; i < lenA; i++) {
          if (!aMatches[i]) continue;

          while (!bMatches[k]) k++;

          if (a[i] !== b[k]) t++;
          k++;
        }

        t = t / 2;

        const jaro =
          (matches / lenA +
            matches / lenB +
            (matches - t) / matches) / 3;

        // Winkler boost (prefixo)
        let prefix = 0;
        const maxPrefix = 4;

        for (let i = 0; i < Math.min(maxPrefix, lenA, lenB); i++) {
          if (a[i] === b[i]) prefix++;
          else break;
        }

        const p = 0.1;

        return jaro + prefix * p * (1 - jaro);
      })();

      // =========================
      // 🔹 COMBINAÇÃO FINAL
      // =========================
      const finalScore = (jaroWinkler * 0.6) + (levScore * 0.4);

      return {
        hash: item.hash,
        descricao: item.descricao,
        proximidade: Math.round(finalScore * 100)
      };
    });
  }

  calcularProximidade_1(
    busca: string,
    lista: { hash: string; descricao: string }[]
  ): { descricao: string; proximidade: number }[] {

    const buscaNorm = busca;

    return lista.map(item => {
      const descNorm = item.descricao
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      if (descNorm.includes(buscaNorm)) {
        return {
          descricao: item.descricao,
          proximidade: 100
        };
      }

      // Levenshtein otimizado (inline)
      const a = buscaNorm;
      const b = descNorm;

      const lenA = a.length;
      const lenB = b.length;

      // early exit para casos muito diferentes
      if (Math.abs(lenA - lenB) > Math.max(lenA, lenB) * 0.7) {
        return {
          descricao: item.descricao,
          proximidade: 0
        };
      }

      const matrix: number[][] = Array.from({ length: lenB + 1 }, () =>
        new Array(lenA + 1)
      );

      for (let i = 0; i <= lenB; i++) matrix[i][0] = i;
      for (let j = 0; j <= lenA; j++) matrix[0][j] = j;

      for (let i = 1; i <= lenB; i++) {
        const charB = b[i - 1];

        for (let j = 1; j <= lenA; j++) {
          if (charB === a[j - 1]) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            const replace = matrix[i - 1][j - 1] + 1;
            const insert = matrix[i][j - 1] + 1;
            const remove = matrix[i - 1][j] + 1;

            matrix[i][j] = replace < insert
              ? (replace < remove ? replace : remove)
              : (insert < remove ? insert : remove);
          }
        }
      }

      const distancia = matrix[lenB][lenA];
      const maxLen = lenA > lenB ? lenA : lenB;

      const proximidade = maxLen === 0
        ? 100
        : Math.max(0, Math.round((1 - distancia / maxLen) * 100));

      return {
        descricao: item.descricao,
        proximidade
      };
    });
  }
}
