import { ConfiguracaoImportacao } from "../importador.models";

export const configCargasIniciais: ConfiguracaoImportacao = {
  baseUrl: '/cargas-iniciais',
  colunas: [
    { key: 'escola', label: 'Escola', validators: ['Required', 'Contains'], options: [] },
    { key: 'turma', label: 'Turma', validators: ['Required', 'Contains'], options: [] },
    { key: 'disciplina', label: 'Disciplina', validators: ['Required', 'Contains'], options: [] },
    { key: 'cpf', label: 'CPF do professor', validators: ['Required'], options: [] },
    { key: 'professor', label: 'Nome do professor', validators: ['Required', 'Contains'], options: [] },
  ],
  refData: {
    escolas: { url: 'refData/escolas', options: [] },
    turmas: { url: 'refData/turmas', options: [] },
    disciplinas: { url: 'refData/disciplinas', options: [] },
    professores: { url: 'refData/professores', options: [] }
  },
  etapasDaImportacao: [
    { key: 'escolas' },
    { key: 'turmas', depends: ['escolas'] },
    { key: 'disciplinas', depends: ['turmas'] },
    { key: 'professores', depends: ['escolas'] },
  ]
};
