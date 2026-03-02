

# CallDesk — App de Lista Telefônica por Território

## Visão Geral
App para gestão de listas telefônicas com dois perfis: **Admin** (gestor) e **Operador** (acesso por link sem login). O Admin cria listas de contatos, distribui entre operadores e acompanha resultados. O Operador acessa pelo celular e registra o resultado de cada ligação.

---

## Design & Tema
- **Tema escuro** com acentos em verde-teal (#00C897)
- Fontes: **Syne** (títulos) + **DM Sans** (corpo) via Google Fonts
- Logo "**Call**Desk" (Call branco, Desk verde)
- Cards com bordas sutis, sombras suaves, animações de transição
- Mobile-first na tela do operador

---

## Integração com Supabase
- Conexão direta ao Supabase existente (tabelas `contatos`, `listas`, `lista_contatos`, `registros`, `admins` e view `painel_resultados`)
- Autenticação manual do Admin via SHA-256 (sem Supabase Auth)
- Sessão do admin salva em localStorage

---

## Telas e Funcionalidades

### 1. Login do Admin (`/admin/login`)
- Campos email e senha
- Autenticação: busca na tabela `admins`, compara hash SHA-256
- Redirecionamento para dashboard após login

### 2. Dashboard do Admin (`/admin/dashboard`)
- **Cabeçalho**: logo CallDesk, nome do admin, logout
- **Aba Visão Geral**: cards de estatísticas (total contatos, listas, ligações, pendentes) + tabela de listas com progresso
- **Aba Criar Lista**: formulário com filtros (território, tipo, quantidade), checkbox "sem ligação prévia", prévia dos contatos, adição de até 10 operadores, distribuição automática igualitária, geração de links copiáveis
- **Aba Gerenciar Listas**: listagem expansível com operadores, links, status por contato, ações de ativar/desativar links e listas
- **Aba Resultados**: tabela da view `painel_resultados` com filtros por lista/status/operador/território, badges coloridos por status, ordenação por coluna

### 3. Tela do Operador (`/lista/:token`)
- Acesso sem login via token na URL
- Verificação de link ativo e lista ativa
- **Cabeçalho**: logo, nome do operador, progresso "X de Y"
- **Card do contato**: nome, telefones (split por `/` e `,` com botão "Ligar" individual via `tel:`), endereço, tipo, território, observação, histórico de tentativas anteriores
- **Botões de status**: 7 opções com cores definidas (Atendeu, Não Atendeu, Caixa Postal, Número Inválido, Não Quer Contato, Retornar Depois com campo de horário, Revisita)
- **Campo de observações** opcional
- **Navegação**: Anterior / Salvar e Próximo
- **Tela final**: parabéns com resumo ao completar todos os contatos

