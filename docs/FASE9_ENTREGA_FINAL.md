# Fase 9 — Entrega final consolidada

Esta versão consolida as etapas de correção do projeto Studio Patty Leão.

## Objetivo final

O sistema foi redirecionado para gestão operacional de salão, mantendo o padrão MVC e retirando o foco de e-commerce, checkout e pagamentos online.

Fluxo principal:

```txt
AGENDAMENTO → ATENDIMENTO → CONSUMO DE INSUMOS → ESTOQUE → FINANCEIRO MANUAL → BI
```

## O que esta versão contempla

- Permissões múltiplas por usuário.
- CPF opcional e protegido.
- Status operacionais de agendamento.
- `data_hora_fim` em agendamentos.
- Validação de conflito de agenda por sobreposição real.
- Validação de horário final dentro do expediente.
- Agenda por perfil de acesso.
- Baixa automática de insumos ao concluir atendimento.
- Bloqueio de estoque negativo.
- Histórico de movimentações de estoque.
- Vitrine como reserva presencial, sem venda online.
- Financeiro simples/manual.
- Caixa simples.
- Movimentações financeiras manuais.
- Dashboard BI básico com indicadores reais.
- JSONs manuais para importação no MongoDB Atlas.
- Segurança básica com Helmet, rate limit e sanitização MongoDB.
- CSS, navbar, sidebar e views revisadas sem descaracterizar a identidade visual.

## Banco de dados

Não há seed automático.

Os dados devem ser importados manualmente no MongoDB Atlas usando:

```txt
mongodb-seeds-json/
```

Leia antes:

```txt
mongodb-seeds-json/README_IMPORTACAO_MONGODB.md
mongodb-seeds-json/import-order.json
mongodb-seeds-json/collection-map.json
```

## Deploy no Render

Configurar no Render:

```env
MONGO_URI=...
DB_NAME=studio_patty_leao
SESSION_SECRET=uma_string_longa_e_segura
NODE_ENV=production
```

Não subir `.env` real para o GitHub.

## Validações feitas nesta consolidação

- Sintaxe dos arquivos JavaScript validada com `node -c`.
- JSONs da pasta `mongodb-seeds-json` validados como JSON válido.
- Estrutura MVC preservada.
- Arquivos de projeto consolidados em ZIP final.

## Observações importantes

- O model `Venda` foi mantido somente por compatibilidade/registro presencial de balcão, não como e-commerce.
- `PedidoCompra.js` permanece fora do fluxo principal, pois compras avançadas não são prioridade desta entrega.
- Não há integração com gateway, API bancária, checkout ou pagamento digital.
