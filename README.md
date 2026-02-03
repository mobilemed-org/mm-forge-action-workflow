# Laravel Forge Deployment Action

Action do GitHub que dispara e monitora deployments automaticamente via API do Laravel Forge.

## Funcionalidades

- ✅ Dispara deployments no Laravel Forge
- ⏳ Monitora o status do deployment em tempo real
- 📊 Exibe logs do deployment progressivamente
- ✅ Finaliza com sucesso quando o deployment é concluído
- ❌ Falha com logs de erro quando o deployment falha
- ⏰ Timeout após 10 minutos

## Pré-requisitos

- Conta no Laravel Forge com um site configurado
- Token de API do Laravel Forge
- Organization slug, Server ID e Site ID do Forge
- Repositório no GitHub

## Tutorial Completo de Configuração

### Passo 1: Obter Credenciais do Forge

Antes de configurar a action, você precisa coletar as seguintes informações do Laravel Forge:

#### 1.1. Token de API

1. Acesse [Forge Account Settings](https://forge.laravel.com/profile/api)
2. Clique em "Create New Token"
3. Dê um nome ao token (ex: "GitHub Actions")
4. Copie o token gerado (você não poderá vê-lo novamente)

#### 1.2. Organization Slug

1. Acesse seu dashboard do Forge
2. Observe a URL no navegador: `https://forge.laravel.com/orgs/{organization}`
3. Copie o valor de `{organization}` (ex: "minha-empresa")

#### 1.3. Server ID

1. No Forge, acesse o servidor que hospeda seu site
2. Observe a URL: `https://forge.laravel.com/orgs/{org}/servers/{server}`
3. Copie o número do `{server}` (ex: "123456")

#### 1.4. Site ID

1. No Forge, acesse o site específico
2. Observe a URL: `https://forge.laravel.com/orgs/{org}/servers/{server}/sites/{site}`
3. Copie o número do `{site}` (ex: "789012")

### Passo 2: Configurar Secrets no GitHub

1. Acesse seu repositório no GitHub
2. Vá em **Settings** > **Secrets and variables** > **Actions**
3. Clique em **New repository secret**
4. Crie os seguintes secrets (um por vez):

| Nome do Secret | Descrição | Exemplo |
|----------------|-----------|---------|
| `FORGE_API_TOKEN` | Token de API do Forge | `eyJ0eXAiOiJKV1QiLCJ...` |
| `FORGE_ORGANIZATION` | Slug da organização | `minha-empresa` |
| `FORGE_SERVER_ID` | ID do servidor (numérico) | `123456` |
| `FORGE_SITE_ID` | ID do site (numérico) | `789012` |

### Passo 3: Criar o Workflow do GitHub Actions

Agora você vai criar o arquivo de workflow que utilizará esta action.

#### 3.1. Criar Estrutura de Diretórios

No seu repositório, crie a pasta `.github/workflows/` se ela não existir.

#### 3.2. Criar Arquivo de Workflow

Crie um arquivo chamado `.github/workflows/deploy.yml` com o seguinte conteúdo:

```yaml
name: Deploy para Laravel Forge

on:
  push:
    branches:
      - main  # Dispara quando houver push na branch main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deployment no Forge
    
    steps:
      - name: Checkout do código
        uses: actions/checkout@v4
      
      - name: Deploy para Laravel Forge
        uses: mobilemed-org/forge-action@v1
        with:
          forge-api-token: ${{ secrets.FORGE_API_TOKEN }}
          forge-organization: ${{ secrets.FORGE_ORGANIZATION }}
          forge-server-id: ${{ secrets.FORGE_SERVER_ID }}
          forge-site-id: ${{ secrets.FORGE_SITE_ID }}
```

> **Nota:** Substitua `mobilemed-org/forge-action@v1` pelo caminho correto da action no GitHub (usuário/repositório@versão).

### Passo 4: Fazer o Deploy

Após configurar tudo:

1. Faça commit das alterações no arquivo de workflow
2. Faça push para a branch `main`
3. Acesse a aba **Actions** no seu repositório GitHub
4. Você verá o workflow sendo executado
5. Clique no workflow para ver os logs em tempo real

## Opções de Configuração

### Disparar em Branches Específicas

```yaml
on:
  push:
    branches:
      - main
      - production
      - staging
```

### Disparar Apenas com Tags

```yaml
on:
  push:
    tags:
      - 'v*.*.*'  # Dispara em tags como v1.0.0
```

### Disparar Manualmente

```yaml
on:
  workflow_dispatch:  # Permite executar manualmente pela interface do GitHub
```

### Disparar em Pull Requests

```yaml
on:
  pull_request:
    branches:
      - main
```

### Combinação de Triggers

```yaml
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  workflow_dispatch:
```

## Exemplo de Workflow Avançado

Aqui está um exemplo mais completo com testes antes do deploy:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches:
      - main

jobs:
  tests:
    runs-on: ubuntu-latest
    name: Executar Testes
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
      
      - name: Install Dependencies
        run: composer install --no-interaction --prefer-dist
      
      - name: Run Tests
        run: php artisan test

  deploy:
    runs-on: ubuntu-latest
    name: Deploy para Forge
    needs: tests  # Só executa se os testes passarem
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Deploy para Laravel Forge
        uses: mobilemed-org/forge-action@v1
        with:
          forge-api-token: ${{ secrets.FORGE_API_TOKEN }}
          forge-organization: ${{ secrets.FORGE_ORGANIZATION }}
          forge-server-id: ${{ secrets.FORGE_SERVER_ID }}
          forge-site-id: ${{ secrets.FORGE_SITE_ID }}
```

## Deploy em Múltiplos Ambientes

Exemplo de deploy para staging e production:

```yaml
name: Deploy Multi-ambiente

on:
  push:
    branches:
      - main
      - staging

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    name: Deploy Staging
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Deploy para Staging
        uses: mobilemed-org/forge-action@v1
        with:
          forge-api-token: ${{ secrets.FORGE_API_TOKEN }}
          forge-organization: ${{ secrets.FORGE_ORGANIZATION }}
          forge-server-id: ${{ secrets.FORGE_STAGING_SERVER_ID }}
          forge-site-id: ${{ secrets.FORGE_STAGING_SITE_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    name: Deploy Production
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Deploy para Production
        uses: mobilemed-org/forge-action@v1
        with:
          forge-api-token: ${{ secrets.FORGE_API_TOKEN }}
          forge-organization: ${{ secrets.FORGE_ORGANIZATION }}
          forge-server-id: ${{ secrets.FORGE_PRODUCTION_SERVER_ID }}
          forge-site-id: ${{ secrets.FORGE_PRODUCTION_SITE_ID }}
```

## Como Funciona

A action executa as seguintes etapas automaticamente:

1. **Validação**: Valida todas as variáveis de ambiente necessárias
2. **Criar Deployment**: Dispara um novo deployment via API do Forge
3. **Monitorar**: Verifica o status do deployment a cada 10 segundos
4. **Exibir Logs**: Mostra a saída do deployment progressivamente
5. **Finalizar**: Retorna código 0 em sucesso ou 1 em falha

## Status de Deployment

A action trata os seguintes status do Forge:

| Status | Descrição | Ação |
|--------|-----------|------|
| `pending` | Aguardando na fila | Continua monitorando |
| `queued` | Na fila | Continua monitorando |
| `deploying` | Em execução | Continua monitorando |
| `finished` | Concluído com sucesso | Finaliza com sucesso (código 0) |
| `failed` | Falhou | Exibe logs e falha (código 1) |
| `failed-build` | Falha no build | Exibe logs e falha (código 1) |
| `cancelled` | Cancelado | Falha (código 1) |

## Tratamento de Erros

A action trata automaticamente os seguintes cenários de erro:

- ❌ Variáveis de ambiente ausentes
- 🔐 Falhas de autenticação (401)
- 🚫 Erros de permissão (403)
- 🔍 Recursos não encontrados (404)
- ⏱️ Rate limiting (429)
- 🔧 Erros do servidor Forge (500, 503)
- 🌐 Erros de rede
- ⏰ Timeout do deployment (10 minutos)

## Exemplo de Saída no GitHub Actions

```
🔧 Laravel Forge Deployment Action

==================================================
✓ Environment variables validated

🚀 Starting deployment...
✓ Deployment created (ID: 12345)

⏳ Monitoring deployment...

📊 Status: deploying

--- Deployment Output ---
Cloning repository...
Installing dependencies...
Running migrations...
Building assets...
Clearing cache...
------------------------

📊 Status: finished

✅ Deployment completed successfully!

==================================================
✅ Action completed successfully
```

## Solução de Problemas

### Erro 401 - Authentication Failed

- Verifique se o `FORGE_API_TOKEN` está correto
- Gere um novo token no Forge se necessário
- Certifique-se de que o secret está configurado corretamente no GitHub

### Erro 404 - Resource Not Found

- Verifique o `FORGE_ORGANIZATION` (deve ser o slug, não o nome)
- Confirme que `FORGE_SERVER_ID` e `FORGE_SITE_ID` são números corretos
- Acesse o Forge e confirme que esses recursos existem

### Erro 403 - Access Forbidden

- Verifique se o token tem permissões necessárias
- Confirme que você tem acesso ao servidor e site especificados

### Timeout após 10 minutos

- Verifique se há problemas no script de deployment do Forge
- Confirme que o servidor está respondendo corretamente
- Revise os logs do Forge para identificar gargalos

## Referência da API

Esta action utiliza os seguintes endpoints da API do Laravel Forge:

- `POST /orgs/{org}/servers/{server}/sites/{site}/deployments` - Cria deployment
- `GET /orgs/{org}/servers/{server}/sites/{site}/deployments/{id}` - Obtém status
- `GET /orgs/{org}/servers/{server}/sites/{site}/deployments/{id}/log` - Obtém logs

[Documentação Oficial da API do Forge](https://forge.laravel.com/docs/api-reference/deployments/create-deployment)

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## Licença

MIT
