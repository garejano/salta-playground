export interface BaseResponse {
  hash: string;
  descricao: string;
  /** Campos extras opcionais retornados pelo backend (ex: cpf do professor) */
  [key: string]: any;
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
  original_normalized?: any;

  hash?: string;
  type: string;
  valid: boolean;
}


export interface CellCursor {
  row: number,
  col: number,
}

export interface CellError {
  remove: boolean;
  idx: number;
  resolved: boolean;
  normalized: string;
  label: string
  linhas?: number[]
  proximidade?: any[];
  open?: boolean;
  original: {
    value: string,
    normalized: string,
  },
  changed: boolean;
}


/**
 * Configuração de uma coluna/etapa de importação.
 * Cada coluna representa uma etapa de validação.
 */
export interface ColunaImportacao {
  /** Identificador único da coluna */
  key: string;

  /** Label exibido na UI */
  label: string;

  /** Lista de validadores a serem aplicados */
  validators: string[];

  /** Opções válidas para esta coluna (carregadas via refData) */
  options: BaseResponse[];

  /** Mapa normalizado -> hash para busca rápida */
  options_record?: Record<string, string>;

  /** Erros encontrados na validação */
  errors?: Record<string, CellError>;

  /** Se true, pula a validação desta coluna e avança automaticamente */
  skip?: boolean;

  /** Colunas que devem ser validadas antes desta */
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

/**
 * @deprecated Use ColunaImportacao.depends e ColunaImportacao.skip
 */
export interface EtapaImportacao {
  key: string;
  depends?: string[];
  skip?: boolean;
}

export interface ConfiguracaoImportacao {
  buildRequest?: (rows: RowData[]) => any[];
  baseUrl: string;
  colunas: ColunaImportacao[];
  refData: RefDataImportacao;

  /** @deprecated Agora as etapas são as próprias colunas */
  etapasDaImportacao?: EtapaImportacao[];
}

export interface UpdateCell {
  original_normalized?: string;
  option: { hash: string, descricao: string };
  linhas?: number[];
  restore: boolean;
}

/**
 * Payload de uma linha para envio à API de importação.
 * Cada campo contém um array de hashes (suporta múltiplos valores por célula).
 */
export interface RowPayload {
  hashEscola: string[];
  hashTurma: string[];
  hashDisciplina: string[];
  hashCPF: string[];
  hashProfessor: string[];
}

