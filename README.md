# Studio Patty Leão — Sistema Operacional de Salão

Sistema web para gestão operacional do Studio Patty Leão.

O projeto é focado em:

- agendamentos digitais;
- agenda dos profissionais;
- reserva presencial de produtos pela vitrine digital;
- controle operacional de estoque;
- financeiro simples/manual;
- dashboard de BI básico;
- página institucional já preparada para deploy no Render.

Não é e-commerce, não possui checkout online, gateway de pagamento ou pagamento digital integrado.

---

## Stack

- **Runtime**: Node.js ≥ 18
- **Framework**: Express 4
- **Banco**: MongoDB Atlas / Mongoose 8
- **Views**: EJS + Bootstrap 5.3
- **Auth**: Express Session + bcrypt + token de sessão
- **Deploy**: Render

---

## Arquitetura

O projeto segue o padrão MVC:

```txt
models/       → Schemas Mongoose
controllers/  → Entrada das regras por rota
services/     → Regras de negócio principais
routes/       → Rotas Express
middlewares/  → Auth, permissões e sessão
views/        → EJS
assets/       → CSS, JS, imagens e vídeos
```

O fluxo central do sistema é:

```txt
AGENDAMENTO
↓
ATENDIMENTO
↓
CONSUMO DE INSUMOS
↓
MOVIMENTAÇÃO DE ESTOQUE
↓
REGISTRO FINANCEIRO MANUAL
↓
BI
```

---

## Variáveis de ambiente

Use `.env.example` como modelo. Crie um arquivo `.env` apenas localmente ou configure diretamente no Render:

```env
MONGO_URI=mongodb+srv://USUARIO:SENHA@cluster.XXXXX.mongodb.net/?retryWrites=true&w=majority
DB_NAME=studio_patty_leao
SESSION_SECRET=string-aleatoria-longa-e-segura
NODE_ENV=production
PORT=5000
```

Nunca suba credenciais reais para o GitHub.

---

## Instalação local

```bash
npm install
npm run dev
```

Para produção:

```bash
npm start
```

---

## Banco de dados — importação manual no MongoDB Atlas

Este projeto NÃO usa seed automático para popular o banco.

Os dados devem ser importados manualmente no MongoDB Atlas usando os arquivos da pasta:

```txt
mongodb-seeds-json/
```

Leia antes:

```txt
mongodb-seeds-json/README_IMPORTACAO_MONGODB.md
mongodb-seeds-json/import-order.json
mongodb-seeds-json/collection-map.json
```

O comando `npm run seed` foi mantido apenas por compatibilidade, mas não executa inserts automáticos.

---

## Permissões

O sistema utiliza permissões múltiplas:

```txt
SUPER_ADMIN
PROFISSIONAL
RECEPCAO
FINANCEIRO
ESTOQUE
CLIENTE
```

Exemplos:

- Patty Leão: `SUPER_ADMIN` + `PROFISSIONAL`
- Max: `SUPER_ADMIN`
- Daniel Leão: `FINANCEIRO` + `ESTOQUE`
- Recepção: `RECEPCAO`
- Cabeleireira: `PROFISSIONAL`
- Cliente comum: `CLIENTE`

---

## Status de agendamento

```txt
Agendado
Confirmado
Em Atendimento
Concluido
Cancelado
Faltou
Reagendado
```

Esses status alimentam agenda, estoque, financeiro e BI.

---

## Rotas principais

| Rota | Acesso | Descrição |
|---|---|---|
| `/` | Público | Home |
| `/sobre` | Público | Página institucional |
| `/preco` | Público | Serviços e preços |
| `/vitrine` | Público | Vitrine para reserva presencial |
| `/agendamento` | Login para enviar | Agendamento de serviços |
| `/perfil/cliente` | Cliente | Histórico e dados do cliente |
| `/perfil/profissional` | Profissional | Agenda da profissional |
| `/admin` | Super Admin / operação | BI central |
| `/recepcao` | Super Admin / Recepção | Agenda operacional |
| `/estoque` | Super Admin / Estoque | Controle de estoque |
| `/financeiro` | Super Admin / Financeiro | Caixa manual e movimentações |

---

## Observações importantes

- CPF é opcional e não aparece em sessões ou views comuns.
- A vitrine não vende online; ela registra reservas para retirada presencial.
- O financeiro é simples e manual; não há integração bancária.
- Estoque de insumos é baixado ao concluir atendimento.
- Estoque de produto da vitrine é baixado quando a reserva é marcada como retirada.

---

## Contato da empresa

Instagram: [@patricialeaoofc](https://instagram.com/patricialeaoofc)  
WhatsApp: [(11) 95848-1204](https://wa.me/5511958481204)  
Endereço: Alameda Caulin, 303 — Sala 204, São Caetano do Sul — SP  
Horário: Terça a Sábado · 09h às 18h
