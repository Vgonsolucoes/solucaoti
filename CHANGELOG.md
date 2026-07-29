# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e este projeto adere a [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [0.1.0] - 2026-07-29

Primeira release pública do sistema de controle de dispositivos e vinculações.

### Added (Adicionado)
- Autenticação via Supabase (perfis: admin, operator, master_operator, employee).
- Dashboard com indicadores:
  - Total de dispositivos
  - Disponíveis / Em uso / Avariados (configuráveis)
  - Próprios vs Locados
  - **Valor total de dispositivos locados** (soma `rental_value` de origem “Locado”)
- CRUD de **Dispositivos**:
  - Tipo, marca, modelo, categoria, status, origem (Próprio/Locado), valor de locação, etc.
  - Tela `Dispositivos` com filtros por categoria e status.
- CRUD de **Colaboradores**.
- **Nova Vinculação** (2 passos):
  - Passo 1: seleciona colaborador, operador e dispositivos disponíveis.
  - Passo 2: exibição e impressão de **Termo de Responsabilidade** em PDF.
  - Variáveis disponíveis no modelo do termo: `{NOME_FUNCIONARIO}`, `{CPF_FUNCIONARIO}` (e alias `{CPF}`), `{LISTA_EQUIPAMENTOS}`, `{DATA_ATUAL}`.
- Tela de **Vinculações**:
  - Listagem com filtros e status da vinculação.
  - Status “Devolvido” quando todos os equipamentos são devolvidos.
  - Reenvio de e-mail de aceite (bloqueado quando já devolvido).
- **Devolução** de dispositivos:
  - Atualiza status do dispositivo para `available`.
  - Remove os dispositivos devolvidos de `assignments.device_ids`.
- **Configurações** (textos salvos no navegador para implantação local):
  - **Texto de Aceite**: template do e-mail enviado para aceite de vinculação.
    - Variáveis: `{employee_name}`, `{employee_email}`, `{device_list}`, `{assignment_date}`, `{operator_name}`, `{acceptance_link}`.
  - **Modelo do Termo**: conteúdo exibido no Passo 2 da vinculação e no PDF.
  - Botões Salvar e Restaurar padrão.
- **Importar Dispositivos** (restrito a admin/master_operator):
  - Upload de CSV com preview, validação de cabeçalhos e normalização de acentos/case no backend.
  - Rota extra `/devices/import` como alias amigável.
- Backend Node/Express no mesmo repositório (`server.cjs`):
  - Serve a build do Vite (`dist/`).
  - Endpoints `/api/*` com bypass RLS via `SUPABASE_SERVICE_ROLE`:
    - `/api/upsert-devices`
    - `/api/upsert-employee`
    - `/api/create-assignment`
    - `/api/process-device-return`
    - `/api/import-devices`
    - `/api/send-acceptance-email` (usa o “Texto de Aceite” enviado pelo front)
    - `/api/test-smtp`
- Deploy de produção com PM2 + `.env.example` + README com passo a passo.
- Repositório Git publicado em `https://github.com/Vgonsolucoes/solucaoti`.

### Changed (Modificado)
- Campo “Valor da locação” (`rental_value`) se torna opcional no formulário de dispositivo; quando a coluna não existe no schema do Supabase, a aplicação tenta salvar sem o campo.
- Importação CSV tolera variações de acento/case nos cabeçalhos (ex.: `localização_física` → `localizacao_fisica`).

### Fixed (Corrigido)
- Erro “Configuração ausente: SUPABASE_SERVICE_ROLE não definido no servidor” em endpoints críticos: agora documentado no README e validado no deploy.
- Erro `Could not find the 'rental_value' column of 'devices' in the schema cache` ao criar dispositivo: implementado fallback que remove `rental_value` do payload e tenta novamente.

### Security (Segurança)
- `.env`, `ecosystem.config.cjs` e `.ssh-local/` estão no `.gitignore` para evitar commit de segredos.
- `SUPABASE_SERVICE_ROLE` é usado **apenas no backend Node** e nunca vai para o bundle do Vite.
- Push Git é feito via Personal Access Token (GitHub não aceita senha para operações Git).

---

[0.1.0]: https://github.com/Vgonsolucoes/solucaoti/releases/tag/v0.1.0
