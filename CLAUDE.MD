# CLAUDE.md

Instruções para o Claude neste projeto. Siga rigorosamente.

## Leitura deste arquivo

- Leia este arquivo **uma vez por sessão** e memorize as regras gerais.
- **Não releia** seções já conhecidas a cada nova tarefa.
- Releia apenas a seção específica **quando for executar aquela ação**:
  - Vai commitar? → consulte "Padrão de commits".
  - Vai abrir PR? → consulte "Pull Requests" (se existir).
- Se estiver em dúvida sobre uma regra pontual, releia **só** o trecho relevante, não o arquivo inteiro.

## Fluxo de trabalho

- **Nunca leia o arquivo .env** É permitido ler env example e etc, mas não o (.env).
- **Commite automaticamente.** Ao concluir e verificar cada modificação que eu pedir, faça um `git commit` atômico (um por alteração), seguindo o "Padrão de commits". Não espere eu pedir — eu reviso os commits depois.
- **Nunca faça push automaticamente.** Eu reviso e faço o `git push`. Só rode `git push` se eu pedir explicitamente.
- **Pedido claro = autorização para editar e commitar.** Quando eu pedir uma modificação objetiva, execute e commite direto. Só pare para analisar e confirmar **antes** de mexer se o pedido for ambíguo, arriscado ou destrutivo.
- Se eu pedir só uma análise, opinião ou revisão, **não escreva/edite código** — apenas responda.

## Padrão de commits

Consulte esta seção **apenas** quando eu pedir para commitar.

- **Um commit por alteração.** Cada mudança lógica distinta vai no seu próprio commit (commits atômicos). Nunca agrupe alterações não relacionadas — se uma tarefa mexeu em coisas independentes, separe em vários commits.
- Todos os commits devem seguir **Conventional Commits em português**.
- Formato: `tipo(escopo): descrição no imperativo, em minúsculo`
- A descrição deve ser em **português brasileiro**, curta e objetiva.

**Tipos permitidos:**
- `feat` — nova funcionalidade
- `fix` — correção de bug
- `refactor` — refatoração sem mudança de comportamento
- `style` — formatação, ponto e vírgula, etc. (sem mudança de lógica)
- `docs` — documentação
- `test` — testes
- `chore` — build, dependências, configs
- `perf` — melhoria de performance

**Escopos comuns:** `frontend`, `backend`, `api`, `db`, `auth`, `ui`, `deploy`, `config`

**Exemplos válidos:**
- `feat(frontend): adiciona nova aba de notas fiscais na sidebar`
- `fix(backend): corrige timeout na integração CAG`
- `refactor(api): extrai lógica de autenticação para middleware`
- `chore(deps): atualiza react para 18.3.0`

## Atribuição

- **Nunca** inclua menções ao Claude, à Anthropic ou a qualquer IA nos commits, PRs, comentários de código ou documentação.
- **Não** adicione rodapés tipo `Co-authored-by: Claude`, `Generated with Claude`, `🤖 Generated with...` ou similares.
- Escreva como se o código tivesse sido feito por mim.

## Comunicação

- Responda em português brasileiro.
- Seja direto e objetivo. Nada de rodeios ou explicações excessivas quando o pedido for simples.
- Ao propor alterações, mostre o plano antes de aplicar.