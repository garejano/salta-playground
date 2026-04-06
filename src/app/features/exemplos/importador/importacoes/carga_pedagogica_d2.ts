import { ConfiguracaoImportacao, RowData } from '../importador.models';

function buildRequest(rows: RowData[]) {
  return rows.map((row) => {
    const getHashesByKey = (key: string): string[] =>
      row.cells.find(c => c.type === key)?.values
        ?.map(v => v.hash || v.value || '')
        .filter(Boolean) ?? [];

    return {
      marca: getHashesByKey('marca'),
      unidade: getHashesByKey('unidade'),
      turma_intel: getHashesByKey('turma_intel'),
      disciplina: getHashesByKey('disciplina'),
      dia_da_semana: getHashesByKey('dia_da_semana'),
      tempo: getHashesByKey('tempo'),
      horario_de_inicio: getHashesByKey('horario_de_inicio'),
      horario_de_fim: getHashesByKey('horario_de_fim'),
    };
  });
}

export const cargaPedagogicaD2: ConfiguracaoImportacao = {
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
      label: 'Disciplina',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'dia_da_semana',
      label: 'Dia da semana',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'tempo',
      label: 'Tempo',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'horario_de_inicio',
      label: 'Horário de início',
      validators: ['Required', 'Contains'],
      options: [],
    },
    {
      key: 'horario_de_fim',
      label: 'Horário de fim',
      validators: ['Required', 'Contains'],
      options: [],
    },
  ],
  refData: {
    marca: { url: 'refData/marca', options: [] },
    unidade: { url: 'refData/unidade', options: [] },
    turma_intel: { url: 'refData/turma_intel', options: [] },
    disciplina: { url: 'refData/disciplina', options: [] },
    dia_da_semana: { url: 'refData/dia_da_semana', options: [] },
    tempo: { url: 'refData/tempo', options: [] },
    horario_de_inicio: { url: 'refData/horario_de_inicio', options: [] },
    horario_de_fim: { url: 'refData/horario_de_fim', options: [] },
  },
};
