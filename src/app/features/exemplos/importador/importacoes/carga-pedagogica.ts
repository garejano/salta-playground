import { ConfiguracaoImportacao, RowData } from '../importador.models';


function buildRequest(rows: RowData[]) {
  const request = rows.map((row) => {
    const getHashes = (colIdx: number): string[] => {
      const values = row.cells[colIdx]?.values || [];
      return values.map(v => v.hash || v.value || '').filter(h => h);
    };

    return {
      hashEscola: getHashes(0),
      hashTurma: getHashes(1),
      hashDisciplina: getHashes(2),
      hashCPF: getHashes(3),      // CPF usa o próprio valor, não tem hash
      hashProfessor: getHashes(4),
    };
  })
  return request;
}

export const carga_pedagogica: ConfiguracaoImportacao = {
  baseUrl: '/cargas-pedagogica',
  minProx: 90,
  buildRequest: buildRequest,
  colunas: [
    {
      key: 'marca',
      label: 'Marca',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'unidade',
      label: 'Unidade',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'turma_intel',
      label: 'Turma Intel',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'disciplina',
      label: 'disciplina',
      validators: ['Required'],
      options: [],
    },
    {
      key: 'dia_semana',
      label: 'Dia da semana',
      validators: ['Required', 'Contains'],
      options: [],
      skip: true,
    },
    {
      key: 'tempo',
      label: 'Tempo',
      validators: ['Required', 'Contains'],
      options: [],
      skip: true,
    }
  ],
  refData: {
    marca: { url: 'refData/marca', options: [] },
    unidade: { url: 'refData/unidade', options: [] },
    turma_intel: { url: 'refData/turma_intel', options: [] },
    disciplina: { url: 'refData/disciplina', options: [] },
    dia_semana: { url: 'refData/dia_semana', options: [] },
    tempo: { url: 'refData/tempo', options: [] },
  },
};
