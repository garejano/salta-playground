export interface BaseResponse {
  hash: string;
  descricao: string;
}

export interface TableData {
  // headers: ColunaImportacao[],
  headers: string[],
  rows: RowData[]
}

export interface RowData {
  idx: number,
  cells: CellData[]
}

export interface CellData {
  rowIdx: number,
  idx: number,
  values?: CellValue[],
  multiple: boolean,
  valid: boolean,
  type: string,
}

export interface CellValue {
  rowIdx: number,
  value?: any;
  normalized?: any;
  hash?: string;
  type: string;
  valid: boolean;
}


export interface CellCursor {
  row: number,
  col: number,
}

export interface CellError {
  idx: number;
  resolved: boolean;
  normalized: string;
  label: string
  linhas?: number[]
  proximidade?: any;
  open?: boolean;
}


export interface ColunaImportacao {
  key: string;
  label: string;
  validators: string[];
  options: BaseResponse[];
  options_record?: Record<string, string>;
  errors?: Record<string, CellError>
}

export interface RefDataImportacao {
  escolas?: { url: string, options: { hash: string, descricao: string }[] };
  turmas?: { url: string, options: { hash: string, descricao: string }[] };
  disciplinas?: { url: string, options: { hash: string, descricao: string }[] };
  professores?: { url: string, options: { hash: string, descricao: string }[] };
}

export interface EtapaImportacao {
  key: string;
  depends?: string[];
}

export interface ConfiguracaoImportacao {
  baseUrl: string;
  colunas: ColunaImportacao[];
  refData: RefDataImportacao;
  etapasDaImportacao: EtapaImportacao[];
}

export interface UpdateCell {
  original_normalized?: string;
  new_value: string;
  linhas?: number[]

}

// type ImportValidatorFn = (row: RowData,)
//

