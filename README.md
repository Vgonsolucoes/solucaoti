# SoluçãoTI — Controle de Dispositivos e Vinculações

Sistema interno para gestão de ativos de TI: cadastro de dispositivos, colaboradores,
vinculação (empréstimo de equipamentos), aceite via e-mail, devoluções, importação CSV
e dashboard com indicadores.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind + Heroicons
- **Backend**: Node.js + Express (mesmo repositório, serve `dist/` + API em `/api`)
- **Banco/Auth**: Supabase (Postgres + RLS + Auth)
- **E-mail**: SMTP via Nodemailer (Gmail, SendGrid, Mailgun, etc.)
- **Produção**: PM2 (backend) + Traefik/Nginx (proxy externo / HTTPS)

---

## 1) Instalação (desenvolvimento local)

### 1.1. Requisitos

- Node.js **20+** (recomendado)
- npm (vem com Node)
- Um projeto Supabase com as tabelas `devices`, `employees`, `assignments`, `returns`, `profiles` e as policies/policies de RLS correspondentes (arquivos SQL em `supabase/migrations/`, se presentes).

### 1.2. Passo a passo

```bash
# 1. Clonar e entrar no projeto
git clone https://github.com/Vgonsolucoes/solucaoti.git
cd solucaoti

# 2. Instalar dependências
npm install

# 3. Copiar variáveis de ambiente e preencher
cp .env.example .env
```

Edite `.env` e preencha **pelo menos**:

```ini
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key
SUPABASE_SERVICE_ROLE=seu_service_role_key
```

Se for usar envio de e-mail direto (front SMTP ou backend direto), preencha também as
variáveis `VITE_SMTP_*` e `VITE_EMAIL_FROM`.

### 1.3. Subir localmente (dev com Vite)

```bash
npm run dev
```

Abre em http://localhost:5173/

**Modo backend + build local (testar API)**:

```bash
npm run build
npm run server
# API + SPA em http://localhost:8089/
```

---

## 2) Estrutura

```
src/
  pages/          Rotas da UI (Dashboard, Dispositivos, Vinculações, Configurações, Importar, Login)
  components/     Formulários, tabelas e cards reutilizáveis
  lib/            supabase client, utils
  services/       email.ts (SMTP client)
  utils/          emailConfig.ts (persistência local do modelo do termo/texto de aceite)
  types/          database.ts (tipos das tabelas)
  contexts/       AuthContext.tsx
server.cjs        Backend Express: serve dist/ + endpoints /api/*
ecosystem.config.cjs  Config PM2 (produção)
proxy/default.conf    Config Nginx (se usar proxy local/docker)
supabase/migrations   Migrações SQL e ajustes de RLS
```

### 2.1 Endpoints principais (backend — `server.cjs`)

| Método | Rota                                       | Descrição                                 |
|--------|--------------------------------------------|-------------------------------------------|
| POST   | `/api/upsert-devices`                      | Criar/atualizar dispositivos (bypass RLS) |
| POST   | `/api/upsert-employee`                     | Criar/atualizar colaborador (bypass RLS)  |
| POST   | `/api/create-assignment`                   | Nova vinculação + retorno estruturado     |
| POST   | `/api/process-device-return`               | Registrar devolução (limpa device_ids)    |
| POST   | `/api/import-devices`                      | Importar dispositivos por CSV             |
| POST   | `/api/send-acceptance-email`               | Enviar e-mail de aceite da vinculação     |
| POST   | `/api/test-smtp`                           | Sanity check do SMTP                      |

Todos os endpoints sensíveis checam `SUPABASE_SERVICE_ROLE` para funcionar em produção.

---

## 3) Produção

### 3.1 Preparar a máquina

```bash
# Instalar PM2 globalmente (uma vez por servidor)
npm install -g pm2

# No diretório do projeto
cd /caminho/para/solucaoti
npm install
cp .env.example .env
# >>> edite .env com os valores reais <<<
```

### 3.2 Buildar e rodar com PM2

```bash
npm run build
pm2 start ecosystem.config.cjs --only solucaoti-app --update-env
pm2 save
pm2 startup systemd -u root --hp /root
# (execute o comando que o pm2 startup retorna, caso apareça)
```

Para atualizar após um `git pull`:

```bash
git pull --ff-only
npm run build
pm2 restart solucaoti-app --update-env
pm2 save
```

### 3.3 Variáveis obrigatórias em produção

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE`
- `HOST=0.0.0.0`
- `PORT=8089` (ou outra porta)

### 3.4 Acesso externo (HTTPS / domínio)

Sugestão: use **Nginx** ou **Traefik** na frente do Node, apontando para `127.0.0.1:8089`.
Neste servidor já usamos um container `solucaoti-proxy` (Nginx) na mesma rede do Traefik
(ingressando por porta 80/443), com proxy reverso para a porta 8089 do host.

Exemplo mínimo de Nginx (sem TLS):

```nginx
server {
  listen 80;
  server_name seu.dominio.com.br;
  client_max_body_size 500M;

  location / {
    proxy_pass http://127.0.0.1:8089;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
  }
}
```

---

## 4) Arquivos ignorados (importante)

- `.env` → segredos locais, **nunca commitar**
- `ecosystem.config.cjs` → pode conter `SUPABASE_SERVICE_ROLE` ou PAT; mantenha fora do git
- `.ssh-local/` → chaves SSH usadas apenas no ambiente local de deploy

Use `.env.example` como modelo e mantenha-o atualizado ao adicionar novas variáveis.

---

## 5) Comandos úteis

```bash
# Dev
npm run dev          # Vite em localhost:5173
npm run server       # Sobe backend express em PORT (default 8089), serve dist/ + /api

# Produção
npm run build        # Gera dist/ (build Vite)
npm run start        # Alias: build + server (uma tacada)

# PM2
pm2 ls
pm2 logs solucaoti-app --lines 80
pm2 restart solucaoti-app --update-env
```

---

## 6) Observações e restrições

- GitHub bloqueia push Git com senha. Sempre use **Personal Access Token (classic, escopo repo)** ou chave SSH.
- O build de produção contém apenas variáveis `VITE_*`. `SUPABASE_SERVICE_ROLE` só existe no `process.env` do servidor Node (nunca em `dist/`).
- Em caso de erro “Configuração ausente: SUPABASE_SERVICE_ROLE…”, reinicie o PM2 com `--update-env` e confirme a chave no `.env`/`ecosystem.config.cjs`.

---

**Versão atual**: `v0.1.0`
