# Nexus Academic

Plataforma multi-institucional para cadastro e avaliação de projetos/startups. O frontend usa React + Vite; a API usa Node.js + Express; os dados são armazenados em PostgreSQL/Supabase.

## Fluxo de acesso e papéis

1. O `SUPERADMIN` é provisionado uma única vez por ambiente, usando `npm run seed:superadmin`. Ele administra a plataforma: cria, ativa e suspende instituições, designa administradores institucionais e acompanha solicitações de todas as instituições. Não deve ser criado pelo formulário público.
2. O superadmin cria uma instituição e designa um `ADMIN_INST` para ela. A pessoa designada precisa ter uma conta cadastrada.
3. Um novo usuário cria uma conta e escolhe uma instituição e um papel permitido. A conta é criada, mas o vínculo fica `PENDENTE`; não ganha acesso às áreas protegidas.
4. O administrador institucional aprova ou recusa a solicitação. Recusas exigem justificativa. A aprovação libera somente o papel e a instituição aprovados.
5. Usuários podem ter vínculos diferentes em instituições diferentes. Cada requisição protegida é autorizada no backend, considerando o vínculo ativo e o escopo institucional.
6. Administradores podem revogar vínculos aprovados. A revogação impede o uso daquele vínculo, sem apagar o histórico nem a conta global.
7. Administradores/coordenadores cadastram projetos e bancas, associam equipes e avaliadores, configuram critérios e pesos. Apenas avaliadores designados lançam notas durante o período aberto.
8. A gestão calcula e publica o ranking. A política de desempate fica registrada na banca; resultados publicados são tratados como imutáveis. O ranking pode ser apresentado em modo pódio e exportado para Excel, respeitando permissões.

## Módulos incluídos

- Página pública, login, cadastro e tela de aguardando aprovação.
- Recuperação e redefinição de senha por e-mail (Resend; requer configuração descrita abaixo).
- Painel global do superadmin, instituições e designação de administradores.
- Solicitações institucionais, aprovação/recusa com justificativa e revogação de vínculos.
- Projetos, associação de alunos/orientadores, bancas, critérios, avaliadores e submissão de avaliações.
- Consulta de avaliações para perfis de gestão, ranking, publicação, modo de apresentação/pódio e exportação `.xlsx`.
- Dashboard, trilha de auditoria e controles de autorização por instituição.

## Configuração local

Requer Node.js `22.12.x` e PostgreSQL. Não versione arquivos `.env` nem credenciais.

### Banco

1. Crie um banco PostgreSQL/Supabase.
2. Execute `backend/script.sql` no SQL Editor para um banco novo. Para uma base já existente, aplique somente as migrações ainda não executadas; a migração de recuperação de senha está em `backend/migrations/20261021_password_reset_tokens.sql`.
3. Configure `backend/.env` usando `backend/.env.example`. `DATABASE_URL` deve apontar para o PostgreSQL e `JWT_SECRET` deve ser um segredo aleatório com pelo menos 32 bytes. Em produção, mantenha TLS habilitado.

### Primeiro superadministrador (bootstrap seguro)

O formulário público nunca cria superadministradores. Para a primeira instalação, execute o script **uma única vez** no diretório `backend`, usando a mesma `DATABASE_URL` da API e as variáveis temporárias abaixo:

- `INITIAL_INSTITUTION_NAME`: nome da instituição inicial.
- `INITIAL_INSTITUTION_IDENTIFIER`: identificador único, com até 50 caracteres.
- `SEED_ADMIN_NAME`: nome do primeiro superadministrador.
- `SEED_ADMIN_EMAIL`: e-mail da conta.
- `SEED_ADMIN_PASSWORD`: senha forte com 12 a 72 caracteres.

Exemplo no terminal (substitua os valores; não os salve no repositório):

```sh
cd backend
npm ci
# Configure as cinco variáveis no ambiente/sessão antes de executar:
npm run seed:superadmin
```

Para inicializar a produção, execute o comando em um ambiente confiável apontando para a `DATABASE_URL` de produção, com TLS habilitado (`NODE_ENV=production`), ou no shell do serviço backend se disponível. Nunca coloque essas credenciais em código, no frontend, em logs compartilhados ou em commits.

O script usa uma transação e um bloqueio advisory do PostgreSQL para evitar execuções concorrentes. Se já existir qualquer vínculo com papel `SUPERADMIN`, ele não altera nada e termina sem criar outro. Se a conta indicada já existir, só poderá ser vinculada quando estiver ativa e a senha fornecida corresponder à senha atual; o script não redefine a senha nem desbloqueia a conta. A instituição inicial é criada apenas se não existir; uma instituição suspensa não é reativada automaticamente. Em caso de erro, as alterações da transação são revertidas.

Após confirmar que o login funciona, remova as variáveis `SEED_ADMIN_*` e `INITIAL_INSTITUTION_*` do ambiente temporário. Se perder o acesso futuramente, não reabra um endpoint público de bootstrap: faça uma recuperação administrativa controlada e auditável.

### Recuperação de senha

Configure `RESEND_API_KEY`, `EMAIL_FROM` (endereço/domínio verificado no Resend) e `FRONTEND_URL` no ambiente do backend. Sem essas variáveis, a API informa que a recuperação está temporariamente indisponível. Tokens são aleatórios, armazenados somente como hash, expiram em uma hora e só podem ser usados uma vez.

### Executar

Terminal 1:

```sh
cd backend
npm ci
npm run dev
```

Terminal 2:

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

No Vercel, defina `VITE_API_URL` como a URL HTTPS do backend Render terminando em `/api`. No Render, configure `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (origem do frontend, sem caminho), `NODE_ENV=production`, `RESEND_API_KEY`, `EMAIL_FROM` e `FRONTEND_URL`. Não use credenciais reais nos dados de demonstração.

## Testes e verificação

No backend: `npm test`. Testes de integração com banco exigem `TEST_DATABASE_URL` apontando para um banco descartável. No frontend: `npm run build` e `npm run lint`.

Roteiro manual mínimo:

- Cadastrar usuário em instituição A e confirmar que a solicitação aparece para o administrador da A e para o superadmin global.
- Confirmar que o usuário pendente não acessa projetos; aprovar e confirmar acesso; recusar outro pedido com justificativa.
- Criar instituição B e verificar que usuários de A não conseguem consultar nem alterar IDs de projetos de B.
- Cadastrar projeto, associar equipe, criar banca com critérios e avaliadores, submeter uma avaliação e tentar submeter a mesma avaliação novamente.
- Calcular ranking, verificar a política de empate, publicar e exportar `.xlsx`.
- Revogar um vínculo e confirmar que o acesso deixa de funcionar nas operações seguintes.
- Solicitar redefinição de senha, abrir o link enviado por e-mail e confirmar que o token expira e não pode ser reutilizado.

## Observações

O script SQL é uma inicialização de esquema, não deve ser executado indiscriminadamente sobre um banco que contenha dados. Revise migrações, variáveis de ambiente, regras de retenção/backups e testes de autorização antes de tratar o sistema como produção. A configuração de envio de e-mail é externa e precisa ser feita no provedor.
