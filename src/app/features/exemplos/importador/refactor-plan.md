# Plano de Refatoração — Importador

Análise do estado atual e roadmap de melhorias de legibilidade, performance e separação de responsabilidades.

---

## Diagnóstico Geral

O componente funciona corretamente, mas acumula responsabilidades que deveriam estar distribuídas em serviços e pipes especializados. Os principais vetores de problema são:

| Área | Problema Principal |
|------|--------------------|
| `importador.component.ts` | Orquestrador com lógica de domínio embutida (`normalize`, `buildErrors`, `createError`) |
| `importador.service.ts` | Dois algoritmos de proximidade quase idênticos, magic numbers soltos |
| `cargas-iniciais.ts` | Acesso a colunas por índice inteiro (`getHashes(0)`) — quebra silenciosamente se a ordem mudar |
| `cell-inspect.ts` | Getter com efeito colateral, estado de UI misturado com estado de domínio em `CellError` |
| `importador.models.ts` | `CellError` mistura dados de domínio e estado de UI; `BaseProfessor` usa `[key: string]: any` |
| `lista-importacoes.ts` | Enum `SetorImportacao` definido mas interface usa `string`; dados duplicados |
| `cell-inspect.html` | ~160 linhas de código comentado |

---

## Refatorações por Prioridade

---

### PRIORIDADE 1 — Confiabilidade (quebra silenciosa)

#### 1.1 · Acesso por índice em `cargas-iniciais.ts` → acesso por key

**Problema:** `getHashes(0)`, `getHashes(1)`, `CPF_COL_IDX = 3` acoplam a lógica à posição física da coluna. Reordenar as colunas na config quebra o payload sem erro visível.

**Solução:** Lookup por `cell.type` (key da coluna).

```typescript
// ANTES
const getHashes = (colIdx: number): string[] => {
  const values = row.cells[colIdx]?.values || [];
  return values.map(v => v.hash || v.value || '').filter(h => h);
};
return {
  hashEscola: getHashes(0),
  hashTurma: getHashes(1),
  // ...
};

// DEPOIS
const getHashesByKey = (key: string): string[] =>
  row.cells.find(c => c.type === key)?.values
    ?.map(v => v.hash || v.value || '')
    .filter(Boolean) ?? [];

return {
  hashEscola: getHashesByKey('escola'),
  hashTurma:  getHashesByKey('turma'),
  // ...
};
```

#### 1.2 · Type cast sem validação em `cargas-iniciais.ts`

**Problema:** `options.find(...) as BaseProfessor` — se `find` retornar `undefined`, o `as` não protege e a leitura de `.cpf` na linha seguinte lança exceção em runtime.

**Solução:**

```typescript
// ANTES
const professor = options.find(x => x.hash == option.hash) as BaseProfessor;
const cpf = professor.cpf;

// DEPOIS
const professor = options.find(x => x.hash === option.hash) as BaseProfessor | undefined;
if (!professor) return;
const cpf = professor.cpf;
```

Bonus: usar `===` em vez de `==` para evitar coerção de tipo.

#### 1.3 · Enum ignorado em `lista-importacoes.ts`

**Problema:** `SetorImportacao` enum é definido mas `ImportacoesPorSetor.setor` é tipado como `string`.

```typescript
// ANTES
export interface ImportacoesPorSetor {
  setor: string;  // qualquer string passa
  ...
}

// DEPOIS
export interface ImportacoesPorSetor {
  setor: SetorImportacao;
  ...
}
```

---

### PRIORIDADE 2 — Separação de Responsabilidades

#### 2.1 · Extrair `normalize` para utilitário compartilhado

**Problema:** A função `normalize` está duplicada no `importador.component.ts` e reimplementada inline no `importador.service.ts`. Qualquer mudança precisa ser feita em dois lugares.

**Solução:** Criar `src/app/features/exemplos/importador/utils/normalize.ts` e importar de lá em ambos.

```typescript
// utils/normalize.ts
export function normalize(term: string): string {
  if (!term) return '';
  return term
    .toLowerCase()
    .normalize('NFD')
    // ... (lógica atual)
}
```

#### 2.2 · Unificar os dois algoritmos de proximidade no service

**Problema:** `calcularProximidade` e `calcularProximidade_1` no service compartilham ~70% do código. O Levenshtein está implementado duas vezes.

**Solução:** Extrair os algoritmos como funções puras privadas e ter uma única função pública.

```typescript
// importador.service.ts

// Constantes de tuning — documentadas
const JARO_WINKLER_WEIGHT = 0.6;
const LEVENSHTEIN_WEIGHT  = 0.4;
const WINKLER_MAX_PREFIX  = 4;
const WINKLER_SCALE       = 0.1;
const MIN_LENGTH_RATIO    = 0.7;

private levenshtein(a: string, b: string): number { ... }
private jaroWinkler(a: string, b: string): number { ... }

calcularProximidade(termo: string, options: BaseResponse[]): ProximidadeResult[] {
  const termNorm = normalize(termo);
  return options
    .map(opt => {
      const optNorm = normalize(opt.descricao);
      if (termNorm === optNorm || optNorm.includes(termNorm)) {
        return { ...opt, proximidade: 1 };
      }
      const lev  = this.levenshtein(termNorm, optNorm);
      const jaro = this.jaroWinkler(termNorm, optNorm);
      return { ...opt, proximidade: jaro * JARO_WINKLER_WEIGHT + lev * LEVENSHTEIN_WEIGHT };
    })
    .filter(r => r.proximidade > 0);
}
```

Tipagem do resultado (adicionar em `importador.models.ts`):
```typescript
export interface ProximidadeResult extends BaseResponse {
  proximidade: number;
}
```

#### 2.3 · Separar estado de UI de `CellError`

**Problema:** `CellError` mistura dados de domínio (`original`, `normalized`, `linhas`, `proximidade`) com estado de UI (`open`, `resolved`, `changed`, `remove`). Isso dificulta serialização, testes e raciocínio sobre o que muda quando.

**Solução:** Manter `CellError` como dado de domínio e criar wrapper de UI localmente no `cell-inspect`.

```typescript
// importador.models.ts — apenas domínio
export interface CellError {
  idx: number;
  label: string;
  normalized: string;
  original: { value: string; normalized: string };
  linhas: number[];
  proximidade: ProximidadeResult[];
}

// cell-inspect.ts — estado de UI local
interface CellErrorUIState {
  error: CellError;
  resolved: boolean;
  changed: boolean;
  remove: boolean;
  resolvedValue?: string;
  open: boolean;
}
```

O `CellInspect` gerencia o array de `CellErrorUIState` localmente e emite os eventos necessários ao componente pai.

#### 2.4 · Mover lógica de validação para fora do componente principal

**Problema:** `buildErrors`, `createError`, `markCellsAsInvalid`, `assignHashToMatchingValues` e `processarRefData` pertencem ao domínio de validação, não ao componente de UI.

**Solução:** Criar `ImportadorValidacaoService` (ou método estático utilitário):

```
importador/
  services/
    importador-validacao.service.ts   ← buildErrors, createError, assignHash
    importador-normalizacao.service.ts ← ou manter como utils/normalize.ts
```

O componente principal fica responsável apenas por:
- Gerenciar o estado de etapa (`etapaAtual`, `cellCursor`)
- Coordenar o fluxo (chamar o serviço de validação, reagir ao resultado)
- Delegar correções para o `CellInspect`

---

### PRIORIDADE 3 — Legibilidade e Manutenção

#### 3.1 · Remover código comentado de `cell-inspect.html`

~160 linhas de template antigo comentado nas linhas 96-254. Remover — o git tem o histórico.

#### 3.2 · Corrigir method name enganoso em `cell-inspect.ts`

O método `logError()` não loga nada — ele muda `error.value.resolved = true`. Renomear para `marcarComoResolvido()` ou mover a lógica para onde faz sentido.

#### 3.3 · Getter sem efeito colateral em `cell-inspect.ts`

Getters que constroem `Set` filtrado a cada chamada (`options`) são recalculados em cada ciclo de change detection. Usar `computed` (Signal) ou memoização:

```typescript
// Se migrar para Signals:
filteredOptions = computed(() => {
  const usedHashes = new Set(this.erros().flatMap(e => e.proximidade.map(p => p.hash)));
  return this.etapa()?.options?.filter(o => !usedHashes.has(o.hash)) ?? [];
});
```

#### 3.4 · Extrair estado de teclado em `import-table.component.ts`

`preventDefault()` incondicional bloqueia Tab e Enter na tabela. Restringir:

```typescript
onKeyDown(event: KeyboardEvent): void {
  const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (!navigationKeys.includes(event.key)) return;
  event.preventDefault();
  // ... lógica de movimento
}
```

#### 3.5 · Remover `extrairPayloadLinha` não usado

O método `extrairPayloadLinha` em `importador.component.ts` (linha 477) não é chamado em lugar nenhum. `buildRequest` da config é quem gera o payload. Remover.

#### 3.6 · Remover `importacaoOptions` hardcoded

`importacaoOptions = [{ hash: 1, descricao: 'Cargas Iniciais...' }]` (linha 71) não é usado — a lista real vem de `lista_importacoes`. Remover.

#### 3.7 · `selecionarTipoImportacao` ignora o argumento

```typescript
selecionarTipoImportacao(tipo: string): void {
  this.tipoImportacao = tipo;
  this.configAtual = configCargasIniciais; // sempre o mesmo, ignora `tipo`
}
```

Criar lookup por chave (quando houver mais de um tipo real):

```typescript
private readonly configPorTipo: Record<string, ConfiguracaoImportacao> = {
  'cargas-iniciais': configCargasIniciais,
  'carga-pedagogica': carga_pedagogica,
};

selecionarTipoImportacao(tipo: string): void {
  const config = this.configPorTipo[tipo];
  if (!config) return;
  this.tipoImportacao = tipo;
  this.configAtual = config;
  this.etapaAtual = 0;
  this.tableDataParsed = [];
  this.errosAgrupados = [];
}
```

---

### PRIORIDADE 4 — Performance (somente se necessário)

#### 4.1 · Cache do `tableData` getter

O getter `tableData` reconstrói o objeto a cada acesso. Com `OnPush` change detection e Signals, isso deixa de ser problema. Com detecção padrão, considerar memoizar manualmente ou migrar para Signal.

#### 4.2 · `getColumnCells` percorre todas as linhas a cada chamada

Durante `buildErrors`, `getColumnCells` faz `flatMap` + `filter` sobre todas as células. Com 15k linhas × 5 colunas = 75k iterações por etapa. Pré-indexar células por tipo na construção:

```typescript
// Em buildTableData, construir índice
private cellsByType: Map<string, CellData[]> = new Map();

private buildTableData(parsed): RowData[] {
  const rows = parsed.map(...);
  this.cellsByType.clear();
  rows.forEach(r => r.cells.forEach(c => {
    if (!this.cellsByType.has(c.type)) this.cellsByType.set(c.type, []);
    this.cellsByType.get(c.type)!.push(c);
  }));
  return rows;
}

private getColumnCells(key: string): CellData[] {
  return this.cellsByType.get(key) ?? [];
}
```

#### 4.3 · Limitar cálculo de proximidade a candidatos viáveis

Antes de calcular Levenshtein/Jaro-Winkler para todas as opções, filtrar por diferença de comprimento:

```typescript
// Já há um comentário sobre isso no service, mas não está aplicado consistentemente
const candidates = options.filter(opt => {
  const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return ratio >= MIN_LENGTH_RATIO;
});
```

---

## Ordem de Execução Sugerida

```
Fase 1 — Não quebra nada, puramente aditiva
  [1.1] Lookup por key em cargas-iniciais.ts
  [1.2] Guard no type cast de BaseProfessor
  [1.3] Enum na interface ImportacoesPorSetor
  [3.5] Remover extrairPayloadLinha não usado
  [3.6] Remover importacaoOptions hardcoded
  [3.1] Remover código comentado em cell-inspect.html

Fase 2 — Refatora internos sem mudar interface pública
  [2.1] Extrair normalize para utils/
  [2.2] Unificar algoritmos de proximidade no service
  [3.2] Renomear logError()
  [3.4] Restringir preventDefault no teclado
  [3.7] Lookup por chave em selecionarTipoImportacao

Fase 3 — Mudanças de interface, requer atualizar consumidores
  [2.3] Separar CellError domínio vs UI state
  [2.4] Extrair lógica de validação para serviço separado

Fase 4 — Performance, somente se houver evidência de lentidão
  [4.1] Cache do tableData getter / migrar para Signals
  [4.2] Índice cellsByType
  [4.3] Filtro de comprimento antes do fuzzy match
```

---

## O que NÃO mudar agora

- A arquitetura de etapas sequenciais — funciona e está bem testada manualmente
- A interface `UpdateCell` e o mecanismo de `updateFn` — é extensível e correto
- O algoritmo de proximidade em si (pesos 60/40) — resultado empírico, não mudar sem dados
- Virtual scroll — não implementado ainda, adicionar apenas quando houver problema real de performance com dados reais
