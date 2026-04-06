import { ConfiguracaoImportacao, RowData } from '../importador.models';

function buildRequest(rows: RowData[]) {
  return rows.map((row) => {
    const getHashesByKey = (key: string): string[] =>
      row.cells.find(c => c.type === key)?.values
        ?.map(v => v.hash || v.value || '')
        .filter(Boolean) ?? [];

    return {
      marca: getHashesByKey('marca'),
      escola: getHashesByKey('escola'),
      turma: getHashesByKey('turma'),
      disciplina: getHashesByKey('disciplina'),
      cpf_do_professor: getHashesByKey('cpf_do_professor'),
      nome_do_professor: getHashesByKey('nome_do_professor'),
    };
  });
}

export const alocacaoPedagogicaD10: ConfiguracaoImportacao = {
  baseUrl: '/sua-rota-aqui',
  minProx: 90,
  buildRequest,
  colunas: [
    {
      key: 'marca',
      label: 'Marca',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'escola',
      label: 'Escola',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'turma',
      label: 'Turma',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'disciplina',
      label: 'Disciplina',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'cpf_do_professor',
      label: 'CPF do professor',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'nome_do_professor',
      label: 'Nome do professor',
      validators: ['Required', 'Contains'],
      options: [],
    },
  ],
  refData: {
    marca: { url: 'refData/marca', options: [] },
    escola: { url: 'refData/escola', options: [] },
    turma: { url: 'refData/turma', options: [] },
    disciplina: { url: 'refData/disciplina', options: [] },
    cpf_do_professor: { url: 'refData/cpf_do_professor', options: [] },
    nome_do_professor: { url: 'refData/nome_do_professor', options: [] },
  },
};
