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
