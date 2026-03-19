# Implementação do ImportadorComponent

## Objetivo
Desenvolver o componente `ImportadorComponent` para transformar arquivos XLS/XLSX em tabelas interativas no frontend. O usuário poderá revisar, corrigir e importar dados para o backend, respeitando fluxos definidos por configuração.

---

## Fluxo do Usuário

1. **Upload de Arquivo**
   - O usuário seleciona ou arrasta um arquivo XLS/XLSX (máx. 10MB).
   - O sistema valida formato e tamanho.
   - Em caso de erro, retorna `FileError {description: string, howToSolve: string}` com mensagem clara e objetiva.

2. **Visualização e Validação Inicial**
   - O arquivo é processado, exibindo uma tabela interativa.
   - Exemplo de planilha:
     | Escola                  | Turma      | Disciplina | CPF         | Professor        |
     |------------------------|------------|------------|-------------|------------------|
     | Mascarenhas            | 5 Serie    | Matemática | 02362987043 | Gustavo Arejano  |
     | MascarenhEs            | 5 SerieA   | Motametiva | 023629870A3 | Gustavo Arejano  |
     | Mascarenhas de Moraes  | 5 Serie    | Portugal   | 02362987043 | Gustavo Arejano  |

3. **Validação por Etapa**
   - Para cada coluna a ser validada (ex: Escola), o frontend solicita opções ao backend:
     ```
     GET ConfiguracaoImportacao.baseUrl/refData.escolas.url
     ```
     Response: `result.data = [{hash:string, descricao:string}]`
   - Com as opções obtidas, valida-se cada valor, marcando inválidos (hash=null).
   - Estrutura por linha:
     ```
     {
       id: número_da_linha,
       rows: [
         { idx, value, hash }
       ]
     }
     ```
   - Renderização: células inválidas aparecem em vermelho.

4. **Correção pelo Usuário**
   - Usuário corrige as células, escolhendo valores válidos via autocomplete.
   - Quando todas as correções da etapa estão feitas, o sistema identifica e habilita a próxima etapa.

5. **Confirmação e Próxima Etapa**
   - Botão de confirmação para cada etapa permite iniciar a validação da próxima (Ex: validação de turmas depende das escolas já validadas).
   - Para etapas dependentes, o sistema apenas solicita dados válidos da etapa anterior para o backend:
     ```
     POST { escolas: [hash, hash, ...] }
     ```

6. **Repetição até Finalização**
   - O processo se repete para todas etapas configuradas.
   - Após todas etapas e correções, os dados podem ser importados.

---

## Detalhes Técnicos

- O template HTML da tabela deve usar `div` em grid (não `<table>`), preferencialmente utilizando Angular Material (mat-grid-list) e cdk-virtual-scroll-viewport.
- Referências: `form-etapa-importacao.html` e CSS correspondente.
- Valores incorretos destacados em vermelho; autocomplete mostra somente opções válidas para a etapa atual.
- Uso de `cdk-virtual-scroll-viewport` para dados volumosos (até ~15k linhas como limite prático).
- A tabela ocupa toda a altura do componente com barra de rolagem vertical.
- Erros agrupados no início; só exibe uma linha por erro. Corrigindo, atualiza todas linhas relacionadas.
- Linhas não pertencentes à etapa atual ou sem erro ficam desabilitadas.

---

## Configuração e Extensibilidade

- Tela oferece select para escolha do tipo de importação:
  - "Importar Cargas Iniciais" (cada linha é um professor/turma/escola/rede)
  - "Importar Configuração de Ano Letivo" (cada linha é um AnoLetivo)
- Configurações e validadores em arquivos `xxx_importador_config.ts` na pasta `/config`, versionados.
- Estrutura sugerida:
  ```
  ConfiguracaoImportacao {
    baseUrl: string,
    colunas: [
      { key, label, validators }
    ],
    refData: {
      escolas: { url, options: [{hash, descricao}] },
      turmas: { url, options: [...] },
      disciplinas: { url, options: [...] },
      professores: { url, options: [...] }
    },
    etapasDaImportacao: [
      { key: hashEscola },
      { key: hashTurma, depends: [hashEscola] },
      { key: hashDisciplina, depends: [hashTurma] },
      { key: hashProfessor, depends: [hashEscola] }
    ]
  }
  ```
- Validação:
  - `Required`: célula não pode ser null ou string vazia
  - `Contains`: valor precisa coincidir com opção de refData (sem acentos, minúsculo, sem espaços duplicados)
  - Validadores em classe separada, métodos padrão, dependências entre etapas via campo `depends`.

---

## Respostas e Soluções

1. **Leitura XLS/XLSX**
   - Usar SheetJS (xlsx) para parsing (mais popular). Tentar outras libs Angular-like se necessário.
   - Parsing feito em serviço Angular utilitário, conversão para typescript, compactação para backend.

2. **Validação**
   - Validadores em classe separada, métodos recebem linha, coluna, config. Gerenciamento de dependências via campo `depends` e status.

3. **Renderização de Erros**
   - Mostrar só uma linha por erro. Corrigir propaga atualização às demais linhas.

4. **Performance**
   - Virtual scroll é suficiente. Testar com volumes reais; limite prático de 15k linhas.

5. **Configuração**
   - Arquivos de configuração em pasta `/config` do componente. RefData sempre obtido do backend.

6. **UX**
   - Modal de ajuda para usuário. Bloco de etapas/status e feedback visual.

7. **Importação**
   - Payload final: linhas válidas, colunas de descrição e hash para cada entidade.

8. **Extensibilidade**
   - Estrutura de configuração e validadores permite fácil inclusão de novos tipos e regras.

9. **Testes**
   - inicialmente testes manuais. Testes unitários recomendados para validadores e serviços.

10. **Acessibilidade**
    - Adicionar após validação dos fluxos.

---

## Plano de Desenvolvimento

1. **Setup Inicial**
   - Criar componente `ImportadorComponent` com estrutura Angular.
   - Serviço para parsing de XLS/XLSX.
   - Pasta `/config` para configurações de importação.

2. **Validação e Renderização**
   - Renderização da tabela com Angular Material e cdk-virtual-scroll.
   - Validadores em classes separadas (services).
   - Lógica de etapas, dependências, agrupamento de erros.

3. **UX e UI**
   - UI clara, botões de confirmação, modal de documentação.
   - Autocomplete com opções válidas.
   - Barra de etapas e status.

4. **Integração Backend**
   - Chamadas HTTP para refData e envio de payload.
   - Angular HttpClient com tipagem.

5. **Extensibilidade**
   - Garantir facilidade para novos tipos de importação.

6. **Testes**
   - Testar com arquivos reais e casos de erro.
   - Refinar limites e desempenho.

7. **Acessibilidade**
   - Implementar após testes de fluxos.

---

*Revisar e aprimorar continuamente conforme desenvolvimento e feedback.*





############ 19/03/2026

Contexto: ja tenho dados mocakdo para um testes, preciso de dados novos para testar o fluxo completo.
- Criar um em @file:raw_table_mock uma nova variavel com dados para importacao, no maximo 10 linhas de dados para a tabela quando parseada
- o mock dos dados da tabela devem usar os dados do @file:mock.ts para as etapas da tabela em questao
- a nova tabela mockada deve ter dados validos condizentes com a base @file:mock.ts e tbm dados levemente errados para criar sugestoes durante o buildError
- o mock deve ter dados para concluir todas as etapas
- caso necessario crie dados condizentes com o cenario @file:mock.ts

[x] - Analise e Planeje e documente aqui abaixo o fluxo de codigo necessario para
  - ler mock ou tabela informada pelo usuario (no momento utilizamos os dados mockados)
  - ler as etapas configuradas para a importacao
  - gerar os erros para a etapa (se a etapa nao tiver erros, deve passar para a proxima)
  - se tiver erros, o usuario vai corrigir os erros, depois de todos corrigidos (exibir um botao para validar as alteracoes no componente @cell-inspect)
  - apos o usuario corrigir e clickar no botao para validar, deve passar para a proxima etapa e iniciar o fluxo de validacao
  - apos todos as etapas validas deve ter um botao "Enviar dados para importacao" que dispara um metodo em importador-compomnent que futuramente vai enviar os dados para a API
  - gerar um metodo para extrair apenas os dados hash  de cada celula de cada etapa, mantendo a estrutura exemplo:

  payload = row_payload[]

  row_payload = {
    hashEscola: string[],
    hashTurma: string[],
    hashDisciplina: string[],
    hashCPF: string[],
    hashProfessor: string[],
  }

---

## Documentação do Fluxo de Validação

### 1. Fluxo Principal

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE IMPORTAÇÃO                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ 1. Upload/   │───►│ 2. Build     │───►│ 3. Validar   │              │
│  │    Mock      │    │    TableData │    │    Etapa     │              │
│  └──────────────┘    └──────────────┘    └──────┬───────┘              │
│                                                  │                      │
│                                                  ▼                      │
│                                          ┌──────────────┐              │
│                                          │ Tem erros?   │              │
│                                          └──────┬───────┘              │
│                                                 │                       │
│                         ┌───────────────────────┴───────────────────┐  │
│                         │ SIM                                   NÃO │  │
│                         ▼                                           ▼  │
│                  ┌──────────────┐                         ┌──────────┐ │
│                  │ 4. Exibir    │                         │ Próxima  │ │
│                  │    Erros     │                         │ Etapa?   │ │
│                  └──────┬───────┘                         └────┬─────┘ │
│                         │                                      │       │
│                         ▼                                      │       │
│                  ┌──────────────┐         ┌────────────────────┘       │
│                  │ 5. Usuário   │         │ SIM              NÃO      │
│                  │    Corrige   │         ▼                    ▼       │
│                  └──────┬───────┘  ┌─────────────┐    ┌──────────────┐ │
│                         │          │ Voltar para │    │ 7. Botão     │ │
│                         ▼          │ etapa 3     │    │ "Enviar"     │ │
│                  ┌──────────────┐  └─────────────┘    └──────┬───────┘ │
│                  │ 6. Validar   │                            │         │
│                  │    Correções │                            ▼         │
│                  └──────┬───────┘                     ┌──────────────┐ │
│                         │                             │ 8. Extrair   │ │
│                         │ Todos corrigidos?           │    Payload   │ │
│                         ▼                             └──────┬───────┘ │
│                  ┌──────────────┐                            │         │
│                  │ SIM: Próxima │                            ▼         │
│                  │ NÃO: Voltar  │                     ┌──────────────┐ │
│                  │     ao 4     │                     │ 9. Enviar    │ │
│                  └──────────────┘                     │    para API  │ │
│                                                       └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|------------------|
| `importador.component.ts` | Orquestra o fluxo, gerencia estado |
| `importador.service.ts` | Busca refData, calcula proximidade |
| `cell-inspect.component.ts` | UI de correção de erros |
| `import-table.component.ts` | Renderização da tabela |
| `cargas-iniciais.ts` | Configuração das etapas |

### 3. Métodos por Etapa

#### Etapa 1-2: Carregar Dados
```typescript
// importador.component.ts
ngOnInit() {
  this.tableDataParsed = this.buildTableData(raw_data_test);
  this.validarEtapa();
}
```

#### Etapa 3: Validar Etapa
```typescript
// importador.component.ts
validarEtapa() {
  const etapa = this.etapaAtualConfig;
  this.importadorService.obterRefData(this.configAtual, etapa)
    .subscribe(result => {
      this.processarRefData(etapa, result);
      this.buildErrors(etapa);
      
      // AUTO-AVANÇAR se não houver erros
      if (Object.keys(etapa.errors).length === 0) {
        this.confirmarEtapa();
      }
    });
}
```

#### Etapa 4-5: Exibir e Corrigir Erros
```typescript
// cell-inspect.component.ts
// O componente exibe os erros agrupados
// Usuário seleciona uma opção de correção
selectOption(option, error) {
  this.onSelect.emit({ option, error });
}
```

#### Etapa 6: Validar Correções (NOVO)
```typescript
// cell-inspect.component.ts - Adicionar botão "Validar Correções"
validarCorrecoes() {
  const etapa = this.etapa;
  const todosCorrigidos = Object.values(etapa.errors)
    .every(e => e.resolved || e.remove);
  
  if (todosCorrigidos) {
    this.onValidarEtapa.emit();
  }
}
```

#### Etapa 7-8: Finalizar e Extrair Payload (NOVO)
```typescript
// importador.component.ts
get todasEtapasValidas(): boolean {
  return this.etapaAtual >= this.etapas.length - 1 &&
         this.etapaAtualConfig?.errors &&
         Object.keys(this.etapaAtualConfig.errors).length === 0;
}

extrairPayload(): RowPayload[] {
  return this.tableData.rows.map(row => ({
    hashEscola: row.cells[0].values?.map(v => v.hash) || [],
    hashTurma: row.cells[1].values?.map(v => v.hash) || [],
    hashDisciplina: row.cells[2].values?.map(v => v.hash) || [],
    hashCPF: row.cells[3].values?.map(v => v.value) || [], // CPF não tem hash
    hashProfessor: row.cells[4].values?.map(v => v.hash) || [],
  }));
}

enviarParaImportacao() {
  const payload = this.extrairPayload();
  console.log('Payload para API:', payload);
  // TODO: this.importadorService.enviar(payload).subscribe(...)
}
```

### 4. Interface do Payload

```typescript
// importador.models.ts
export interface RowPayload {
  hashEscola: string[];
  hashTurma: string[];
  hashDisciplina: string[];
  hashCPF: string[];
  hashProfessor: string[];
}
```

### 5. Alterações Necessárias

#### cell-inspect.component.ts
- [x] Adicionar botão "Validar Correções" 
- [x] Emitir evento `validarEtapa` quando clicado
- [x] Desabilitar botão se ainda houver erros não resolvidos
- [x] Adicionar getters: `todosErrosResolvidos`, `errosPendentes`, `totalErros`

#### importador.component.ts
- [x] Usar `raw_data_test` em vez de `raw_data`
- [x] Implementar `extrairPayload()`
- [x] Implementar `enviarParaImportacao()`
- [x] Adicionar getter `todasEtapasValidas`
- [x] Adicionar getter `etapaAtualTemErros`
- [x] Adicionar getter `progressoEtapas`
- [x] Auto-avançar etapa quando não houver erros (`verificarAutoAvanco()`)
- [x] Implementar `validarCorrecoesDaEtapa()`

#### importador.component.html
- [x] Adicionar botão "Enviar dados para importação"
- [x] Mostrar indicador de progresso das etapas
- [x] Conectar evento `(validarEtapa)` do cell-inspect
