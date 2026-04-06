import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportadorService } from '../importador.service';
import { normalize } from '../utils/normalize';

interface ColDef { key: string; label: string; }

@Component({
  selector: 'gerador-config',
  templateUrl: './gerador-config.html',
  styleUrl: './gerador-config.scss',
  imports: [CommonModule]
})
export class GeradorConfig {
  isOpen = false;
  headers: string[] = [];
  previewRows: string[][] = [];
  generatedCode = '';
  copiado = false;
  fileError: string | null = null;

  constructor(private importadorService: ImportadorService) {}

  open(): void { this.isOpen = true; }
  close(): void { this.isOpen = false; this.reset(); }

  private reset(): void {
    this.headers = [];
    this.previewRows = [];
    this.generatedCode = '';
    this.fileError = null;
    this.copiado = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    input.value = '';

    if (!this.importadorService.validarArquivo(file)) {
      this.fileError = 'Arquivo inválido. Use .xls ou .xlsx com até 10MB.';
      return;
    }

    this.importadorService.parseArquivo(file).subscribe({
      next: (rows: any[][]) => this.processRows(rows),
      error: () => { this.fileError = 'Erro ao processar o arquivo.'; }
    });
  }

  private processRows(rows: any[][]): void {
    if (!rows.length) {
      this.fileError = 'Planilha vazia.';
      return;
    }

    this.fileError = null;
    this.headers = (rows[0] as any[]).map(h => String(h ?? '').trim()).filter(Boolean);

    if (!this.headers.length) {
      this.fileError = 'Não foi possível detectar cabeçalhos na primeira linha.';
      return;
    }

    this.previewRows = rows.slice(1, 6).map(r =>
      this.headers.map((_, i) => String(r?.[i] ?? ''))
    );

    this.generatedCode = this.generateConfig(this.headers);
  }

  private toKey(label: string): string {
    return normalize(label).replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  private generateConfig(headers: string[]): string {
    const cols: ColDef[] = headers.map(h => ({ label: h, key: this.toKey(h) }));

    const colunasCode = cols.map(c =>
`    {
      key: '${c.key}',
      label: '${c.label}',
      validators: ['Required', 'Contains'],
      options: [],
    },`
    ).join('\n');

    const refDataCode = cols
      .map(c => `    ${c.key}: { url: 'refData/${c.key}', options: [] },`)
      .join('\n');

    const buildRequestFields = cols
      .map(c => `      ${c.key}: getHashesByKey('${c.key}'),`)
      .join('\n');

    return `import { ConfiguracaoImportacao, RowData } from '../importador.models';

function buildRequest(rows: RowData[]) {
  return rows.map((row) => {
    const getHashesByKey = (key: string): string[] =>
      row.cells.find(c => c.type === key)?.values
        ?.map(v => v.hash || v.value || '')
        .filter(Boolean) ?? [];

    return {
${buildRequestFields}
    };
  });
}

export const configGerada: ConfiguracaoImportacao = {
  baseUrl: '/sua-rota-aqui',
  minProx: 90,
  buildRequest,
  colunas: [
${colunasCode}
  ],
  refData: {
${refDataCode}
  },
};`;
  }

  copiar(): void {
    navigator.clipboard.writeText(this.generatedCode).then(() => {
      this.copiado = true;
      setTimeout(() => { this.copiado = false; }, 2000);
    });
  }
}
