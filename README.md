# BI Atlas Insights

Crie um sistema web de dashboard de BI chamado "BI Suprimentos – Atlas Engenharia". O projeto é uma réplica funcional em React de um relatório Power BI com 5 páginas principais. O foco desta etapa é exclusivamente o FRONTEND: estrutura de navegação, layout, componentes visuais com dados mockados, sistema de login com níveis de acesso por cargo (molde sem backend), e comportamento de filtro macro por KPI Card.

---

## STACK TÉCNICA

- React + TypeScript

- Tailwind CSS

- Recharts para gráficos

- React Router para roteamento

- Zustand para estado global (filtros ativos + usuário logado)

- Componentes em /components, páginas em /pages, mocks em /src/mocks

---

## IDENTIDADE VISUAL

- Background geral: branco ou cinza muito claro (#F5F6FA)

- Cor primária: azul escuro (#1B2A4A)

- Cor de acento: laranja/âmbar (#F5A623) para bordas de KPI card ativo e destaques

- Tipografia: Inter ou Roboto

- Header com logo da Atlas (placeholder) à esquerda + nome do relatório ao centro + info do usuário logado à direita

---

## SISTEMA DE LOGIN (MOLDE — SEM BACKEND)

### Página de Login: /login

Layout centralizado com:

- Logo da Atlas Engenharia (placeholder)

- Campo "E-mail"

- Campo "Senha"

- Botão "Entrar"

- Mensagem de erro mockada se campos inválidos

Autenticação mockada: criar arquivo `/src/mocks/users.ts` com array de usuários fictícios, cada um com:

```ts

{ id, name, email, password, cargo, nivel }

```

Cargos e níveis mockados:

- `admin` → nível 1: acesso total a todas as páginas e todos os dados

- `gestor` → nível 2: acesso a todas as páginas, sem opção de edição futura

- `analista` → nível 3: acesso a Concorrências, Pedidos e Contratos. NÃO vê ONE Page nem G.F

- `visualizador` → nível 4: acesso apenas a ONE Page. Não vê módulos operacionais

### Proteção de rotas

- Criar componente `<ProtectedRoute>` que verifica o `nivel` do usuário no Zustand

- Se não logado → redireciona para /login

- Se logado mas sem permissão → exibe tela "Acesso não autorizado" com botão voltar

- Após login bem-sucedido → redireciona para a primeira rota permitida do cargo

### Estado global do usuário (Zustand — store `useAuthStore`):

```ts

{ user: User | null, login(email, password): void, logout(): void }

```

### Sidebar

- Exibir apenas os itens de menu que o cargo do usuário tem permissão de ver

- Exibir nome e cargo do usuário logado no rodapé da sidebar

- Botão "Sair" no rodapé da sidebar

---

## ESTRUTURA DE NAVEGAÇÃO

### Sidebar (fixa, colapsável)

- Logo Atlas no topo

- Itens de menu (visibilidade condicional por cargo):

  1. 📋 Concorrências → /concorrencias [admin, gestor, analista]

  2. 🛒 Pedidos → /pedidos [admin, gestor, analista]

  3. 📄 Contratos → /contratos [admin, gestor, analista]

  4. 📊 ONE Page → /one-page [admin, gestor, visualizador]

  5. 🏢 Gestão de Fornecedores → /gestao-fornecedores [admin, gestor]

- Toggle de colapso com ícone hambúrguer

- Rodapé: avatar + nome + cargo + botão "Sair"

---

## COMPONENTE GLOBAL: HEADER DE PÁGINA

Cada página possui no topo:

1. Logo da Atlas (placeholder)

2. Ícone/logo do módulo

3. Imagem decorativa (placeholder)

4. Barra de filtros globais com 4 slicers lado a lado:

   - "Período" (date range picker)

   - "Analista" (dropdown multi-select)

   - "Tipo" (dropdown multi-select)

   - "Obra" (dropdown multi-select)

5. Todos os slicers atualizam o estado global via Zustand (`useFilterStore`)

---

## COMPORTAMENTO DOS KPI CARDS — REGRA CENTRAL

Os KPI Cards das páginas Concorrências, Pedidos e Contratos são BOTÕES DE FILTRO MACRO que operam NA MESMA PÁGINA. Não há navegação para subpáginas.

**Comportamento ao clicar em um KPI Card:**

1. Limpa qualquer filtro macro ativo anteriormente

2. Aplica o filtro macro correspondente ao status daquele card

3. A tabela abaixo é atualizada para exibir apenas os registros com aquele status

4. Os valores de todos os KPI Cards são recalculados considerando os filtros globais (slicers) + o filtro macro ativo

5. O card clicado fica com estado `isActive=true` (borda colorida, fundo levemente destacado)

6. Clicar no mesmo card ativo novamente → REMOVE o filtro macro (toggle), voltando a exibir todos os registros

7. Um `<ActiveFilterBadge>` aparece acima da tabela indicando o filtro macro ativo, com botão X para remover

**Filtro macro = campo `status` dos registros mockados.** Cada card corresponde a um valor de status.

---

## PÁGINAS

---

### PÁGINA 1: /concorrencias

**KPI Cards (6 cards clicáveis em linha):**

| Card | Status correspondente |

|---|---|

| À Delegar | "a_delegar" |

| À Iniciar | "a_iniciar" |

| Em Cotação | "em_cotacao" |

| Req Em Aprovação | "em_aprovacao" |

| Criar Pedido | "criar_pedido" |

| Total | null (remove filtro macro) |

**Sidebar de atalhos:** 3 botões verticais à esquerda da área de conteúdo (placeholders de navegação rápida com ícone + tooltip)

**Tabela principal:**

- Colunas: Nº Processo | Descrição | Analista | Status | Tipo | Obra | Data | Valor

- Dados: filtrados pelo filtro macro ativo + filtros globais dos slicers

- Ordenação por coluna, paginação (10 por página)

---

### PÁGINA 2: /pedidos

**KPI Cards (4 cards clicáveis):**

| Card | Status correspondente |

|---|---|

| Ped Em Aprovação | "ped_em_aprovacao" |

| À Formalizar | "a_formalizar" |

| Ped Em Validação | "ped_em_validacao" |

| Total | null (remove filtro) |

**Sidebar de atalhos:** 3 botões verticais (mesmo padrão)

**Tabela principal:**

- Colunas: Nº Pedido | Descrição | Fornecedor | Analista | Status | Obra | Data | Valor

- Filtros: macro ativo + globais

---

### PÁGINA 3: /contratos

**KPI Cards (4 cards clicáveis):**

| Card | Status correspondente |

|---|---|

| Pendente Aprovação | "pendente_aprovacao" |

| Enviar D4Sign | "enviar_d4sign" |

| Em Assinatura | "em_assinatura" |

| Total | null (remove filtro) |

**Sidebar de atalhos:** 3 botões verticais (mesmo padrão)

**Tabela principal:**

- Colunas: Nº Contrato | Fornecedor | Analista | Status | Tipo | Obra | Data Início | Valor

- Filtros: macro ativo + globais

---

### PÁGINA 4: /one-page

Campo de busca livre (textFilter) no topo.

3 botões toggle: "Analista" | "Tipo" | "Obra" com slicers dropdown que abrem abaixo de cada botão.

Slicer de período separado.

**KPI Cards (5 cards não clicáveis — apenas informativos):**

1. Contratado (valor financeiro)

2. Requisições (contagem)

3. Em Andamento (contagem)

4. Nº Processos Concluídos (contagem)

5. Sub-bloco: "Em Assinatura" + "Assinados" (2 cards menores agrupados com label)

**Layout em 2 colunas:**

Coluna Esquerda (~40%):

- Tabela "Próximas Contratações (CREQ)" — 5 linhas mockadas

- Tabela "Últimas Contratações" — 5 linhas mockadas

- Tabela "Saving (CREQ)" — 5 linhas mockadas

Coluna Direita (~60%):

- Gráfico combo linha+coluna: "Requisições por Mês" — 12 meses mockados

- Gráfico barra 100% empilhada horizontal: "Percentual Contratado" — categorias mockadas

- Gráfico combo linha+coluna: "Spend Mensal x Processos Contratados" — 12 meses

- Gráfico coluna: "TOP 15 Fornecedores" — 15 fornecedores fictícios

---

### PÁGINA 5: /gestao-fornecedores

Mesmo cabeçalho de filtros do ONE Page (busca + 3 botões Analista/Tipo/Obra).

**Layout em 2 colunas iguais:**

Coluna Esquerda:

- Card informativo do fornecedor selecionado (placeholder de texto)

- Gráfico de coluna: "Avaliação" — notas por categoria (Prazo, Qualidade, Preço) — mockado

- Tabela "Contratos" do fornecedor — 5 linhas mockadas

Coluna Direita:

- Card de sumário complementar (placeholder de texto)

- Gráfico combo linha+coluna: "TOP 15 Fornecedores" — mockado

- Tabela "Contratos" consolidada — 5 linhas mockadas

---

## COMPONENTES REUTILIZÁVEIS

1. `<KpiCard>` — props: label, value, statusKey, isActive, onClick, color

   - isActive=true → borda acento + fundo destacado + cursor pointer

   - Hover → shadow leve

   - Ícone configurável acima do valor

   - statusKey=null → comportamento de "Total" (remove filtro)

2. `<DataTable>` — props: columns, data, pageSize, filterLabel?

   - Ordenação por coluna (setas no header)

   - Zebra striping

   - Paginação (prev/next + indicador)

   - Se filterLabel passado → exibe `<ActiveFilterBadge>` acima

3. `<ActiveFilterBadge>` — props: label, onRemove

   - Chip colorido com X que chama `clearMacroFilter()` do Zustand

4. `<FilterBar>` — props globais via Zustand

   - Dropdowns multi-select: Período, Analista, Tipo, Obra

   - Botão "Limpar filtros"

5. `<PageHeader>` — logos + título

6. `<QuickNavButtons>` — 3 botões verticais de atalho (ícone + tooltip)

7. `<ComboChart>` — wrapper Recharts linha+coluna

8. `<StackedBarChart>` — wrapper Recharts barras empilhadas 100%

9. `<ProtectedRoute>` — wrapper de rota com verificação de nível de acesso

---

## ESTADO GLOBAL (Zustand)

### `useFilterStore`

```ts

{

  activePeriod: [Date, Date] | null,

  activeAnalistas: string[],

  activeTipos: string[],

  activeObras: string[],

  activeMacroFilter: { page: string, statusKey: string, label: string } | null,

  setFilter(field, value): void,

  setMacroFilter(page, statusKey, label): void,

  clearMacroFilter(): void,

  clearAllFilters(): void

}

```

### `useAuthStore`

```ts

{

  user: { id, name, email, cargo, nivel } | null,

  login(email, password): boolean,

  logout(): void

}

```

---

## DADOS MOCKADOS — /src/mocks/

**users.ts** — 4 usuários (um por cargo: admin, gestor, analista, visualizador)

**concorrencias.ts** — 30 registros com campo `status` distribuído entre os 5 valores de status

**pedidos.ts** — 30 registros com `status` distribuído entre os 3 valores

**contratos.ts** — 30 registros com `status` distribuído entre os 3 valores

**fornecedores.ts** — 15 fornecedores com campos: nome, avaliacao{prazo, qualidade, preco}, nContratos, valorTotal

**charts.ts** — 12 meses de spend + processos + requisições para os gráficos do ONE Page

---

## OBSERVAÇÕES FINAIS

- NÃO conectar a nenhuma API nesta etapa. Dados 100% mockados.

- Deixar comentários `// TODO: conectar API` e `// TODO: validar com backend` nos pontos de fetch e autenticação.

- O login mockado deve funcionar apenas comparando email+password com o array de users.ts.

- Layout responsivo para desktop (mínimo 1280px). Mobile não é prioridade.

- Os KPI Cards das páginas operacionais (Concorrências, Pedidos, Contratos) são FILTROS NA MESMA PÁGINA — nunca navegam para outra rota.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://placehold.co/1200x630?text=Atlas+Engenharia

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

---

> **Nota:** projeto adaptado de um trabalho profissional para fins de portfólio. Nomes de clientes, credenciais e dados foram substituídos por valores fictícios.
