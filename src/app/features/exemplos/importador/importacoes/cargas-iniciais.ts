import { ConfiguracaoImportacao } from '../importador.models';

/**
 * Configuração para importação de Cargas Iniciais - Alocação de Professores.
 *
 * Colunas/Etapas:
 * 1. Escola - valida contra lista de escolas
 * 2. Turma - valida contra lista de turmas (depende de escola)
 * 3. Disciplina - valida contra lista de disciplinas (depende de turma)
 * 4. CPF - skip (apenas formato, sem validação contra lista)
 * 5. Professor - valida contra lista de professores (depende de escola)
 */
export const configCargasIniciais: ConfiguracaoImportacao = {
  baseUrl: '/cargas-iniciais',

  colunas: [
    {
      key: 'escola',
      label: 'Escola',
      validators: ['Required', 'Contains'],
      options: [],
      // Primeira etapa, sem dependências
    },
    {
      key: 'turma',
      label: 'Turma',
      validators: ['Required', 'Contains'],
      options: [],
      depends: ['escola'],
    },
    {
      key: 'disciplina',
      label: 'Disciplina',
      validators: ['Required', 'Contains'],
      options: [],
      depends: ['turma'],
    },
    {
      key: 'cpf',
      label: 'CPF do professor',
      validators: ['Required'],
      options: [],
      skip: true, // CPF não precisa de validação contra lista, apenas formato
    },
    {
      key: 'professor',
      label: 'Nome do professor',
      validators: ['Required', 'Contains'],
      options: [],
      depends: ['escola'],
    },
  ],

  refData: {
    escola: { url: 'refData/escolas', options: [] },
    turma: { url: 'refData/turmas', options: [] },
    disciplina: { url: 'refData/disciplinas', options: [] },
    professor: { url: 'refData/professores', options: [] },
  },
};
