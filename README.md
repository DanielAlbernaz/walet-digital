# WalletDigital

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.1.4.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Acesso Externo (Fora da Rede Local)

Para permitir acesso ao servidor de desenvolvimento de fora da sua rede local, você tem duas opções:

#### Opção 1: Usando Túnel (Recomendado - Mais Seguro)

**⚠️ IMPORTANTE:** Para evitar erros de WebSocket (`/ng-cli-ws`), use o comando `start:external` que desabilita o live reload.

1. **Usando ngrok** (requer cadastro gratuito):
   ```bash
   # Instale o ngrok globalmente
   npm install -g ngrok
   
   # Inicie o servidor com configuração para acesso externo
   npm run start:external
   
   # Em outro terminal, crie o túnel
   ngrok http 4200
   ```
   O ngrok fornecerá uma URL pública (ex: `https://abc123.ngrok.io`)

2. **Usando localtunnel** (sem cadastro):
   ```bash
   # Instale o localtunnel globalmente
   npm install -g localtunnel
   
   # Inicie o servidor com configuração para acesso externo
   npm run start:external
   
   # Em outro terminal, crie o túnel
   lt --port 4200
   ```

**Nota:** O `start:external` desabilita o live reload (hot reload) para evitar problemas com WebSocket através de túneis. A aplicação funcionará normalmente, mas você precisará recarregar manualmente a página quando fizer alterações no código.

#### Opção 2: Acesso Direto (Requer Configuração de Firewall/Roteador)

1. Inicie o servidor com acesso externo:
   ```bash
   npm run start:external
   ```

2. Descubra seu IP local:
   ```bash
   # Windows PowerShell
   ipconfig
   # Procure por "IPv4 Address" (ex: 192.168.1.100)
   ```

3. Configure o firewall do Windows para permitir conexões na porta 4200

4. Configure o roteador para fazer port forwarding da porta 4200 para o IP da sua máquina

5. Acesse usando seu IP público: `http://SEU_IP_PUBLICO:4200`

**Nota:** A Opção 1 (túnel) é mais segura e fácil de configurar, não requer alterações no firewall ou roteador.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
