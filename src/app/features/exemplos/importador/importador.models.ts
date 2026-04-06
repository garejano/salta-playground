export interface BaseResponse {
  hash: string;
  descricao: string;
  /** Campos extras opcionais retornados pelo backend (ex: cpf do professor) */
  [key: string]: any;
}

export interface ProximidadeResult extends BaseResponse {
  proximidade: number;
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
  value: string;
  normalized: string;
  original_normalized: string;
  original: string;
  changed: boolean;
  hash?: string;
  type: string;
  valid: boolean;
}


export interface CellCursor {
  row: number,
  col: number,
}

export interface CellError {
  // Dados de domínio
  idx: number;
  normalized: string;
  label: string;
  linhas: number[];
  proximidade: ProximidadeResult[];
  original: { value: string; normalized: string };
  // Estado de UI gerenciado pelo CellInspect
  resolved: boolean;
  resolved_value?: string;
  changed: boolean;
  remove: boolean;
  open: boolean;
}


/**
 * Configuração de uma coluna/etapa de importação.
 * Cada coluna representa uma etapa de validação.
 */
export interface ColunaImportacao {
  key: string;
  label: string;
  validators: string[];
  options: BaseResponse[];
  options_record?: Record<string, string>;
  errors?: Record<string, CellError>;
  skip?: boolean;
  depends?: string[];

  /**
   * Função de atualização customizada chamada após o usuário selecionar uma opção nesta coluna.
   * Permite propagar dados para outras colunas (ex: ao selecionar professor, atualizar CPF).
   *
   * @param option - A opção selecionada pelo usuário (com todos os campos extras do backend)
   * @param rows - Todas as linhas da tabela, para edição direta dos valores das células
   * @param linhas - Índices das linhas afetadas pela seleção
   */
  updateFn?: (options: BaseResponse[], option: BaseResponse, rows: RowData[], linhas: number[]) => void;
}

export interface RefDataImportacao {
  [key: string]: { url: string; options: { hash: string; descricao: string }[] };
}

export interface ConfiguracaoImportacao {
  buildRequest?: (rows: RowData[]) => any[];
  minProx: number;
  baseUrl: string;
  colunas: ColunaImportacao[];
  refData: RefDataImportacao;
}

export interface UpdateCell {
  original_normalized?: string;
  option: { hash: string, descricao: string };
  linhas?: number[];
  restore: boolean;
}



