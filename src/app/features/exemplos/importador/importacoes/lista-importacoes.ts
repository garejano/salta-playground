import { ConfiguracaoImportacao } from "../importador.models";
import { configCargasIniciais } from "./cargas-iniciais";

export enum SetorImportacao {
  Pedagogico = 'Pedagogico',
  Folha = 'Folha',
}

export interface Importacao {
  label: string;
  setor: SetorImportacao,
  configuracao: ConfiguracaoImportacao,
}

export interface ImportacoesPorSetor {
  setor: SetorImportacao;
  importacoes: Importacao[],
}

const importacoes_pedagogico: Importacao[] = [
  {
    label: "Cargas Iniciais",
    setor: SetorImportacao.Pedagogico,
    configuracao: configCargasIniciais,
  },
]

const importacoes_folha: Importacao[] = [
  {
    label: "Cargas Iniciais",
    setor: SetorImportacao.Folha,
    configuracao: configCargasIniciais,
  },
]

export const lista_importacoes: ImportacoesPorSetor[] = [
  {
    setor: SetorImportacao.Pedagogico,
    importacoes: importacoes_pedagogico,
  },
  {
    setor: SetorImportacao.Folha,
    importacoes: importacoes_folha,
  },
]
