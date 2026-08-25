# Task Manager

Aplicativo **desktop para Windows** de gerenciamento de tarefas, com sincronização
no **Neon (Postgres)** e funcionamento completo **offline**.

Criar, editar e remover tarefas; categorias; tarefas importantes; tarefas recorrentes;
calendário mensal; alarme com notificação nativa do Windows; ícone na bandeja; e
inicialização automática junto com o login do sistema.

---

## Sumário

- [Como abrir o sistema](#como-abrir-o-sistema)
- [Como usar](#como-usar)
- [Stack usada e o porquê de cada escolha](#stack-usada-e-o-porquê-de-cada-escolha)
- [Arquitetura](#arquitetura)
- [Configurando o Neon](#configurando-o-neon)
- [Gerando o instalador](#gerando-o-instalador)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Scripts disponíveis](#scripts-disponíveis)

---

## Como abrir o sistema

### Pré-requisitos

- **Node.js 22 ou superior** (o projeto foi desenvolvido no Node 24)
- **Windows 10/11**

Não é necessário Visual Studio Build Tools nem Python — o projeto **não tem nenhuma
dependência nativa** que precise ser compilada.

### Rodando em desenvolvimento

```bash
npm install
npm run dev
```

A janela abre na tela de login. Na primeira execução, use a aba **Criar conta**.

> Se você ainda não configurou o Neon, tudo funciona normalmente — as tarefas ficam
> salvas apenas neste computador e o indicador no topo mostra “Somente local”.

### Rodando o app instalado

```bash
npm run build:win
```

O instalador sai em `dist/Task Manager Setup 1.0.0.exe`. Execute-o, escolha a pasta
e o app é instalado com atalhos no Menu Iniciar e na Área de Trabalho.

> O instalador **não é assinado digitalmente**. Na primeira execução o Windows
> SmartScreen vai exibir um aviso — clique em “Mais informações” → “Executar assim
> mesmo”. Para eliminar o aviso é preciso um certificado de assinatura de código
> (configurável em `win.certificateFile` no `electron-builder.yml`).

---

## Como usar

### Criar conta e entrar

O cadastro e o login acontecem **dentro do próprio app**, sem serviço externo.

- **Criar conta** — nome, e-mail e senha (mínimo 6 caracteres). Se o Neon estiver
  configurado, é preciso estar conectado à internet, para o e-mail ser reservado no
  banco e você não acabar com duas contas iguais em máquinas diferentes.
- **Entrar** — funciona **offline** em qualquer computador onde você já entrou antes,
  porque o hash da senha fica no cache local.
- A sessão dura 30 dias; ao reabrir o app você cai direto no dashboard.

### Aparência

Em **Configurações → Aparência** você ajusta três coisas:

- **Tema** — claro, escuro ou acompanhando o Windows
- **Densidade** — *Compacto* (linhas de 8px, texto 13,5px) ou *Espaçoso* (13px e 14,5px). Muda altura das linhas e tamanho do texto de uma vez
- **Cor de destaque** — nove opções. Ela vale para botões, item ativo do menu, seleção e foco

As três sincronizam entre máquinas, porque ficam nas configurações do usuário.

### Sidebar retrátil e redimensionamento

O botão de painel no canto superior esquerdo **recolhe e expande** a sidebar. Recolhida,
ela vira uma barra de ícones com dica ao passar o mouse. Atalho: **Ctrl+B**. A escolha
fica salva entre as sessões.

A janela **se adapta ao tamanho**: os cards do dashboard e as categorias reorganizam as
colunas, e o painel do calendário desce para baixo da grade quando o espaço aperta.

O redimensionamento tem um **piso de 900 × 640**. Abaixo disso a grade do calendário e os
filtros começariam a se sobrepor, então é melhor o Windows impedir de encolher do que
entregar um layout quebrado. Recolher a sidebar devolve espaço e o conteúdo reage na hora
— o layout observa o espaço real disponível, não o tamanho da janela.

### As telas

| Tela | Para quê |
|---|---|
| **Dashboard** | Resumo do dia: para hoje, atrasadas, importantes e concluídas no mês, mais a lista do dia e a distribuição por categoria. Os cards são clicáveis. |
| **Tarefas** | Lista completa com busca por título/descrição e filtros por categoria, situação e prioridade. |
| **Tarefas de Hoje** | O que merece atenção agora, em três blocos: **atrasadas**, **para hoje** e **sem prazo**. |
| **Importantes** | Só o que você marcou com a estrela. |
| **Diariamente / Semanalmente / Mensalmente** | As repetições, separadas por periodicidade. |
| **Calendário** | Grade do mês com as tarefas que têm prazo. |
| **Categorias** | Criar, renomear, recolorir, trocar o ícone e excluir categorias. |
| **Configurações** | Inicialização com o Windows, alarmes, repetições, tema e sincronização. |

> **Tarefas sem prazo não somem.** Elas aparecem no bloco “Sem prazo” do dashboard
> e da tela Tarefas de Hoje. Só não entram no calendário — que, por definição,
> mostra o que tem data.

### Criar, editar e remover tarefas

Clique em **Nova tarefa** (topo da janela ou dentro de cada tela). No formulário você define:

- **Título** e **descrição**
- **Categoria** e **prioridade** (baixa, média, alta)
- **Importante** — destaca a tarefa na aba Importantes e no dashboard
- **Prazo** — data + horário. Necessário para o alarme e para aparecer no calendário
- **Lembrete** — de “na hora” até “1 dia antes”
- **Repetição** — diária, semanal, mensal ou anual, com intervalo (“a cada 2 semanas”)

Para **editar**, clique na tarefa (ou no menu `⋯` → Editar).
Para **remover**, use o menu `⋯` → Excluir. Há uma confirmação.
Para **concluir**, marque a caixinha à esquerda. Para **favoritar**, clique na estrela.

### Categorias

A conta já nasce com seis categorias: **Educação, Financeiro, Cuidado Pessoal,
Trabalho, Casa e Lazer**. Você pode renomear, trocar a cor, escolher o **ícone**,
criar novas e excluir.

O seletor de ícone traz ~80 opções agrupadas por tema (educação, financeiro, saúde,
casa, trabalho, lazer, viagem…) e tem **busca em português** — digite “academia”,
“dinheiro” ou “remédio” e ele encontra, sem você precisar saber o nome em inglês.
A prévia no topo do formulário mostra na hora como a categoria vai aparecer nas listas.

O ícone escolhido aparece na tela de Categorias, no seletor do formulário de tarefa,
na etiqueta de cada tarefa e no resumo por categoria do dashboard.

Excluir uma categoria **não apaga as tarefas dela** — elas apenas ficam sem categoria.

### Tarefas recorrentes

Ao **concluir** uma tarefa recorrente, a próxima ocorrência é criada automaticamente
com o prazo avançado pela regra escolhida. A tarefa concluída permanece no histórico.

Se o prazo original já passou há várias repetições, o app pula direto para a próxima
data futura, em vez de criar uma pilha de tarefas atrasadas.

**Só dá para concluir a repetição do dia dela.** A ocorrência de amanhã aparece com a
caixa desabilitada e uma explicação ao passar o mouse — sem isso, marcar a de amanhã
geraria a de depois de amanhã, e a fila andaria para frente sem o trabalho ter sido feito.

Duas coisas continuam liberadas de propósito:

- **Tarefas atrasadas** — a diária de ontem que você esqueceu de marcar. Se travasse,
  ela ficaria impossível de concluir para sempre.
- **Reabrir uma tarefa concluída** — desmarcar nunca é bloqueado.

Para desligar, vá em **Configurações → Tarefas recorrentes**. A trava vem ligada.

### Conclusão automática

No formulário da tarefa, junto da duração, o interruptor **Concluir automaticamente**
faz a tarefa se marcar como feita quando o tempo dela acaba. A legenda mostra o horário
exato: *"Marca como feita às 07:00, sem você precisar clicar"*.

Serve para o que passa por si — dormir, descanso, pausas. Ninguém abre o app às 7h da
manhã para confirmar que dormiu, e sem isso essas tarefas ficariam pendentes para sempre
inflando o contador de atrasadas.

A varredura roda no **processo principal**, a cada 30 segundos, junto do alarme: a tarefa
fecha no horário mesmo com o app minimizado na bandeja e a janela fechada. Numa tarefa
recorrente a marcação é herdada pela próxima ocorrência — uma diária de dormir não voltaria
a exigir o clique já na segunda noite.

O interruptor não aparece em **lembretes**, que não ocupam tempo e por isso não têm um
fim para disparar a conclusão.

### Calendário e tarefas do mês

O calendário mostra o mês inteiro. Cada dia exibe pontinhos coloridos — um por tarefa,
na cor da categoria. Tarefas concluídas aparecem esmaecidas.

- **Um clique** em um dia → lista as tarefas daquele dia no painel ao lado
- **Dois cliques** em um dia → cria uma tarefa já com aquele prazo
- Setas `‹` `›` navegam entre meses; o botão **Hoje** volta ao mês atual

### Alarme das tarefas

Quando o horário do lembrete chega (prazo menos a antecedência), o app dispara:

1. Uma **notificação nativa do Windows** — clicar nela abre o app na tarefa
2. Um **som de alerta** (se ativado nas configurações)
3. Um aviso dentro do app, se a janela estiver aberta

O alarme roda no processo principal, **não na interface**. Isso significa que ele
continua funcionando com a janela fechada, desde que o app esteja na bandeja.

Tarefas vencidas que ainda não foram notificadas também disparam o aviso, com o
título “Tarefa vencida”.

### Ícone na bandeja

Com **“Fechar para a bandeja”** ativado (padrão), o botão X esconde a janela em vez
de encerrar o app — e os alarmes continuam.

Clique com o botão direito no ícone da bandeja para: **Abrir**, **Nova tarefa**,
**Sincronizar agora** ou **Sair**. Dois cliques no ícone reabrem a janela.

### Inicializar junto com o Windows

Em **Configurações → Inicialização**, ligue **“Iniciar com o Windows”**. O app se
registra na inicialização do sistema, na mesma lista que aparece no
**Gerenciador de Tarefas → Inicializar**.

Combine com **“Iniciar minimizado na bandeja”** para o app subir silenciosamente,
sem abrir a janela, mas já vigiando seus prazos.

> Em modo de desenvolvimento (`npm run dev`) o atalho registrado aponta para o
> executável do Electron, não para o app. **A inicialização automática só funciona
> de verdade depois de instalar o `.exe`.**

---

## Stack usada e o porquê de cada escolha

| Camada | Escolha | Por que essa e não outra |
|---|---|---|
| Shell desktop | **Electron 43** | Foi o pedido, e é o que dá acesso nativo ao que o app precisa no Windows: `setLoginItemSettings` (autostart), `Tray` (bandeja) e `Notification` (toast nativo). Uma PWA não alcança nada disso. |
| Build | **electron-vite 5** | Gerencia as três entradas (main, preload, renderer) numa config só, com HMR na interface e rebuild automático do processo principal. Sem ele seria preciso orquestrar dois builds à mão. |
| UI | **React 19 + TypeScript** | Foi o pedido. O TypeScript aqui paga especialmente: os tipos em `src/shared/` são compartilhados entre processo principal e interface, então uma mudança no formato de `Task` quebra o build dos dois lados na hora. |
| Identidade visual | **Design próprio** (`new-design/`) | Paleta, tipografia e padrões de componente vieram do design feito no Claude Design. O fundo é um bege quente (`#f6f5f2`), não um cinza neutro — é o que dá o caráter da interface. As fontes **Instrument Sans** e **JetBrains Mono** são **embutidas no pacote**, não carregadas do Google Fonts: o app é offline-first e a CSP bloqueia rede externa, então uma fonte de CDN não apareceria sem internet. |
| Estilo e componentes | **Tailwind v4 + shadcn/ui** | Foi o pedido. O bloco oficial **`sidebar`** do shadcn já entrega exatamente a sidebar retrátil pedida — modo ícone, atalho Ctrl+B e persistência do estado — em vez de eu reimplementar isso. Como o shadcn copia o código para o projeto, cada componente pode ser ajustado sem lutar contra a biblioteca. |
| Roteamento | **react-router-dom (HashRouter)** | `HashRouter` e não `BrowserRouter`: no app empacotado a interface é servida por `file://`, onde rotas com caminho real quebram ao recarregar. |
| Dados na interface | **TanStack Query** | Num app com sincronização em background, os dados mudam **fora** do fluxo do React — um pull do Neon pode trazer tarefas criadas em outra máquina. O React Query resolve isso com invalidação de cache: o processo principal avisa que algo mudou e todas as telas se atualizam sozinhas. |
| Estado de interface | **Zustand** | Só para o que é realmente global e simples: sessão, tema e o diálogo de tarefa (aberto de cinco lugares diferentes). Sem provider, sem boilerplate. |
| Banco local | **`node:sqlite`** | **Trocado do `better-sqlite3` durante o desenvolvimento.** O `better-sqlite3` exige compilação nativa via node-gyp, que falhou aqui por ausência do Visual Studio Build Tools. O `node:sqlite` é o SQLite **embutido no Node 24**, que é o Node que acompanha o Electron 43 — mesma API síncrona, zero compilação, `npm install` limpo em qualquer máquina. |
| Banco remoto | **Neon + `@neondatabase/serverless`** | Foi o pedido. O driver oficial fala com o Neon por **HTTP**, sem manter conexão TCP aberta — ideal para um app desktop que fica horas ocioso e sincroniza em rajadas. |
| Migrations do Neon | **Prisma Migrate** | Usado **só em desenvolvimento**, para versionar o schema. Cada alteração vira um arquivo em `prisma/migrations/`, com histórico auditável e aplicação previsível em produção via `migrate deploy` — diferente de um `push` que sincroniza o schema sem deixar registro. **O Prisma Client não é usado em runtime**: ele traria um query engine nativo que precisaria sair do asar no empacotamento, justamente o tipo de dependência binária que este projeto evita. |
| Senha | **bcryptjs** | Implementação em JavaScript puro. O `bcrypt` nativo traria de volta exatamente o problema de compilação que evitamos ao sair do `better-sqlite3`. |
| Datas | **date-fns + locale pt-BR** | Formatação em português e cálculo da grade do calendário. Tree-shakeable, ao contrário do Moment. |
| Empacotamento | **electron-builder (NSIS)** | Gera o instalador `.exe` com atalhos. O instalador é **obrigatório** para o autostart funcionar de verdade — só assim o registro do Windows aponta para o app, e não para o binário do Electron. |
| Sessão | **`fs` + JSON** | Começou com `electron-store`, mas a versão 11 é ESM-only e não carrega no bundle CommonJS do processo principal. Para dois campos (`userId` e validade), escrever o JSON direto resolveu sem arrastar o problema junto. |

### Decisões que talvez surpreendam

**Por que o processo principal é CommonJS e não ESM?**
O módulo `electron` não expõe *named exports* quando o processo principal é carregado
como ESM — `import { app, BrowserWindow } from 'electron'` falha em tempo de execução.
Por isso o `package.json` não declara `"type": "module"`.

**Por que o som do alarme é sintetizado e não um arquivo `.mp3`?**
A CSP do app bloqueia `media-src` externo, e um arquivo de áudio aumentaria o pacote.
O som é gerado pela Web Audio API (`src/renderer/src/lib/alarm.ts`) — dois bipes curtos,
com volume previsível em qualquer máquina.

**Por que o alarme roda no processo principal?**
Se rodasse na interface, fechar a janela mataria os alarmes. No processo principal ele
sobrevive à janela e continua funcionando com o app na bandeja.

---

## Arquitetura

### Os três processos

```
┌──────────────────────┐   IPC tipado    ┌─────────────────────┐
│      RENDERER        │◄───────────────►│   PROCESSO PRINCIPAL │
│  React + shadcn/ui   │    (preload)    │        Node          │
│                      │                 │                      │
│  sem Node            │                 │  SQLite local        │
│  sem acesso ao banco │                 │  conexão com o Neon  │
│  sem DATABASE_URL    │                 │  alarmes, bandeja    │
└──────────────────────┘                 └──────────┬───────────┘
                                                     │ HTTPS
                                                     ▼
                                              ┌─────────────┐
                                              │    NEON     │
                                              │  Postgres   │
                                              └─────────────┘
```

**A regra de segurança central:** a `DATABASE_URL` e o banco local existem **apenas no
processo principal**. A interface roda com `contextIsolation: true`,
`nodeIntegration: false` e uma CSP que proíbe qualquer requisição de rede. Tudo que ela
pode fazer está declarado explicitamente em `src/preload/index.ts` — se um canal não
está ali, a interface não alcança.

### Como funciona a sincronização offline

O **SQLite local é a fonte de verdade da interface**; o Neon é o espelho durável e
compartilhado entre máquinas. Toda escrita vai primeiro para o SQLite e retorna na
hora — por isso o app não trava nem falha sem internet.

Cada tabela sincronizável tem `updated_at`, `deleted_at` e (só localmente) `dirty`.

**Push** — envia as linhas com `dirty = 1`. O `UPSERT` no Postgres só sobrescreve se a
versão enviada for mais nova:

```sql
INSERT INTO tasks (...) VALUES (...)
ON CONFLICT (id) DO UPDATE SET ...
WHERE tasks.updated_at < EXCLUDED.updated_at
```

**Pull** — traz o que mudou desde o cursor `last_pulled_at` daquela tabela e aplica
localmente, mas **nunca por cima de uma linha ainda `dirty`** — essa linha ainda vai ser
enviada, e quem decide o vencedor é o push, pelo mesmo critério.

**Conflitos** são resolvidos por **last-write-wins** comparando `updated_at`. As datas
são gravadas como texto ISO 8601 em UTC, o que torna a comparação alfabética equivalente
à cronológica nos dois bancos.

**Exclusões são lógicas** (`deleted_at`), então uma remoção viaja até o Neon como
qualquer outra atualização — não some silenciosamente em outra máquina.

**IDs são UUID gerados no cliente**, então não há espera por sequence do servidor nem
risco de colisão entre computadores.

**Quando sincroniza:** ao entrar, depois de cada alteração (com 2s de espera), a cada
5 minutos, e sob demanda pelo botão “Sincronizar agora” ou pelo menu da bandeja.

Se a rede cair no meio, nada se perde: a escrita local já retornou e o push fica
pendente para a próxima rodada. O indicador no topo mostra quantas alterações ainda
não subiram.

---

## Configurando o Neon

1. Crie um projeto em [neon.tech](https://neon.tech)
2. Copie a **connection string** em *Connection Details* (use a URL com `-pooler`)
3. Copie o arquivo de exemplo e cole a string:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://usuario:senha@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

4. Aplique as migrations:

```bash
npm run db:deploy
```

5. Reinicie o app.

> ⚠️ **Cole a string no `.env`, nunca no `.env.example`.** O `.gitignore` protege o
> `.env`; o `.env.example` **é versionado** e iria parar no GitHub com a sua senha.
>
> **O passo 4 é obrigatório.** O app não cria mais as tabelas sozinho — quem manda no
> schema é o Prisma Migrate. Se as tabelas não existirem, a sincronização avisa
> exatamente isso, em vez de criar por conta própria uma versão possivelmente
> desatualizada do schema.
>
> **Sem `DATABASE_URL` o app funciona normalmente** — só fica salvo neste computador,
> e a tela de Configurações mostra a sincronização como “Não configurado”.

### Alterando o schema depois

Edite `prisma/schema.prisma` e rode:

```bash
npm run db:migrate      # cria a migration e aplica no seu banco de desenvolvimento
```

Isso gera um arquivo novo em `prisma/migrations/`, que **deve ser commitado**. Em outra
máquina (ou em produção), `npm run db:deploy` aplica as pendentes na ordem correta.

Ao mudar o schema, lembre de refletir a alteração em **três lugares**, porque o app não
usa o Prisma Client em runtime:

1. `prisma/schema.prisma` — o banco remoto
2. `src/main/db/schema.ts` — o DDL do SQLite local e as listas `SYNC_COLUMNS`
3. `src/shared/types.ts` — os tipos usados pelos dois processos

---

## Gerando o instalador

```bash
npm run build:win     # instalador NSIS em dist/
npm run build:unpack  # só a pasta descompactada, para testar rápido
```

Se o build falhar com `EPERM ... rename dist\win-unpacked.tmp`, é porque uma execução
anterior do app ainda está aberta segurando os arquivos. Feche o app (inclusive o ícone
da bandeja) e apague a pasta `dist/`.

---

## Estrutura de pastas

```
prisma/
├── schema.prisma            schema do Neon — fonte da verdade das migrations
└── migrations/              histórico versionado, aplicado com db:deploy

src/
├── main/                    processo principal (Node)
│   ├── index.ts             bootstrap: banco → IPC → janela → bandeja → alarme → sync
│   ├── window.ts            BrowserWindow e a política de fechar-para-a-bandeja
│   ├── tray.ts              ícone e menu da bandeja
│   ├── auto-launch.ts       inicialização com o Windows
│   ├── scheduler.ts         varredura de prazos e disparo dos alarmes
│   ├── session.ts           sessão persistida em JSON
│   ├── db/
│   │   ├── local.ts         conexão SQLite e helpers de consulta
│   │   ├── schema.ts        DDL local e o mapa de colunas do sync
│   │   └── remote.ts        conexão com o Neon
│   ├── sync/engine.ts       push, pull e last-write-wins
│   ├── services/            regras de auth, tarefas, categorias e configurações
│   └── ipc/index.ts         registro de todos os handlers
├── preload/index.ts         única ponte com a interface (contextBridge)
├── shared/                  tipos e nomes de canais, usados pelos dois lados
└── renderer/src/
    ├── components/ui/       componentes do shadcn
    ├── components/layout/   shell, sidebar e indicador de sincronização
    ├── components/tasks/    diálogo, lista e item de tarefa
    ├── pages/               uma por tela
    ├── hooks/               React Query sobre o IPC, tema e eventos do main
    ├── stores/              Zustand: sessão e diálogo de tarefa
    └── lib/                 formatação pt-BR, som do alarme, cliente do React Query
```

---

## Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run dev` | Abre o app com hot reload |
| `npm run build` | Typecheck + build de produção em `out/` |
| `npm run build:win` | Gera o instalador `.exe` em `dist/` |
| `npm run build:unpack` | Gera só a pasta descompactada |
| `npm run typecheck` | Verifica os tipos do processo principal e da interface |
| `npm run db:deploy` | Aplica as migrations pendentes no Neon (é o que você roda no dia a dia) |
| `npm run db:migrate` | Cria uma nova migration a partir de mudanças no `schema.prisma` |
| `npm run db:status` | Mostra quais migrations já foram aplicadas |
| `npm run db:studio` | Abre o Prisma Studio para inspecionar os dados |

---

## Onde ficam os dados

| O quê | Onde |
|---|---|
| Banco local | `%APPDATA%\task-manager\task-manager.db` |
| Sessão | `%APPDATA%\task-manager\session.json` |
| Preferência da sidebar | cookie do renderer |
| Tarefas, categorias e configurações | banco local + Neon (se configurado) |

Desinstalar o app **não apaga** o banco local, de propósito — reinstalar recupera tudo.
