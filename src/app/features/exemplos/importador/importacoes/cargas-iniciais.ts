import { BaseResponse, ConfiguracaoImportacao, RowData } from '../importador.models';

/**
 * Configuração para importação de Cargas Iniciais - Alocação de Professores.
 *
 * Colunas/Etapas:
 * 1. Escola - valida contra lista de escolas
 * 2. Turma - valida contra lista de turmas (depende de escola)
 * 3. Disciplina - valida contra lista de disciplinas (depende de turma)
 * 4. CPF - skip (apenas formato, sem validação contra lista)
 * 5. Professor - valida contra lista de professores (depende de escola)
 *               updateFn: ao selecionar professor, atualiza automaticamente a coluna CPF
 */

/**
 * Atualiza a coluna CPF quando um professor é selecionado.
 * O CPF real vem do campo `cpf` da opção do professor (retornado pelo backend).
 * O hash do CPF é o mesmo hash do professor (dado duplicado intencional para manter padrão).
 */
const CPF_COL_IDX = 3;

interface BaseProfessor { hash: string; descricao: string; cpf: string }

function atualizarCpfDoProfessor(options: BaseResponse[], option: BaseResponse, rows: RowData[], linhas: number[]): void {
  const professor: { hash: string, descricao: string, cpf: string } = options.find(x => x.hash == option.hash) as BaseProfessor;

  linhas.forEach(rowIdx => {
    const row = rows[rowIdx];
    if (!row) return;

    const cpfCell = row.cells[CPF_COL_IDX];
    if (!cpfCell) return;

    if (cpfCell.values && cpfCell.values.length > 0) {
      cpfCell.values.forEach(v => {
        v.value = professor.cpf;
        v.normalized = professor.cpf;
        v.hash = professor.hash;
        v.valid = true;
        v.changed = true;
      });
    } else {
      cpfCell.values = [{
        original: professor.cpf,
        changed: true,
        rowIdx,
        value: professor.cpf,
        normalized: professor.cpf,
        original_normalized: professor.cpf,
        hash: professor.hash,
        type: 'string',
        valid: true,
      }];
    }

    cpfCell.valid = true;
  });
}

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

export const configCargasIniciais: ConfiguracaoImportacao = {
  baseUrl: '/cargas-iniciais',
  minProx: 90,
  buildRequest: buildRequest,
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
      updateFn: atualizarCpfDoProfessor,
    },
  ],
  refData: {
    escola: { url: 'refData/escolas', options: [] },
    turma: { url: 'refData/turmas', options: [] },
    disciplina: { url: 'refData/disciplinas', options: [] },
    professor: { url: 'refData/professores', options: [] },
  },
};
