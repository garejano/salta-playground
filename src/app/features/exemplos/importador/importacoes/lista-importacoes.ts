import { ConfiguracaoImportacao } from "../importador.models";
import { configCargasIniciais } from "./cargas-iniciais";

export enum SetorImportacao {
  Pedagogico,
  Folha,
}

export interface Importacao {
  label: string;
  setor: SetorImportacao,
  configuracao: ConfiguracaoImportacao,
}

export interface ImportacoesPorSetor {
  setor: string;
  importacoes: Importacao[],
}

const importacoes_pedagogico: Importacao[] = [
  {
    label: "Cargas Iniciais",
    setor: SetorImportacao.Pedagogico,
    configuracao: configCargasIniciais,
  },

  {
    label: "Cargas Iniciais",
    setor: SetorImportacao.Pedagogico,
    configuracao: configCargasIniciais,
  },

  {
    label: "Cargas Iniciais",
    setor: SetorImportacao.Pedagogico,
    configuracao: configCargasIniciais,
  },

  {
    label: "Cargas Iniciais",
    setor: SetorImportacao.Pedagogico,
    configuracao: configCargasIniciais,
  },
]

const importacoes_folha: Importacao[] = [
  {
    label: "Cargas Iniciais",
    setor: SetorImportacao.Pedagogico,
    configuracao: configCargasIniciais,
  },

  {
    label: "Cargas Iniciais",
    setor: SetorImportacao.Pedagogico,
    configuracao: configCargasIniciais,
  },

  {
    label: "Cargas Iniciais",
    setor: SetorImportacao.Pedagogico,
    configuracao: configCargasIniciais,
  },
]

export const lista_importacoes: ImportacoesPorSetor[] = [
  {
    setor: "Pedagogico",
    importacoes: importacoes_pedagogico,
  },
  {
    setor: "Folha",
    importacoes: importacoes_folha,
  },
]
