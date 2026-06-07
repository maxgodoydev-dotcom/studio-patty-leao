# MongoDB Atlas — JSONs manuais da Fase 6

Esta pasta foi criada para subir dados manualmente no MongoDB Atlas.

Não há seed automático nesta fase.

## Como importar

No MongoDB Atlas, importe cada arquivo JSON na collection indicada em `collection-map.json`.

A ordem recomendada é:

1. usuarios.json
2. clientes.json
3. profissionals.json
4. servicos.json
5. produtos.json
6. estoques.json
7. servicoinsumos.json
8. tipopagtos.json
9. agendamentos.json
10. reservavitrines.json
11. movimentacaoestoques.json
12. movimentacaofinanceiras.json
13. caixas.json
14. vendas.json
15. fornecedors.json

## Senha padrão dos usuários de exemplo

Todos os usuários de exemplo usam a senha padrão: `Admin@2026`

Usuário Super Admin principal: `maxgodoy.dev@gmail.com` / `Admin@2026`. Depois de subir no banco, altere as senhas pelo sistema ou diretamente no banco se desejar.

## Observações importantes

- CPF foi mantido como `null` em todos os usuários, pois deixou de ser obrigatório.
- Não há pagamento online, checkout ou gateway.
- A vitrine representa apenas reserva presencial.
- `Venda` foi mantido apenas como compatibilidade para venda presencial de balcão, não como e-commerce.
- PedidoCompra não foi populado porque o fluxo de compras avançado foi removido da prioridade do projeto.
- Os ObjectIds foram definidos de forma fixa para manter relacionamentos coerentes entre collections.

