# Hotfix setorial — agendamento, serviços e vitrine

Correções aplicadas:

- BI Central restrito ao perfil `SUPER_ADMIN`.
- Login redireciona cada perfil para seu setor correto:
  - Super Admin → `/admin`
  - Recepção → `/recepcao`
  - Profissional → `/perfil/profissional`
  - Financeiro → `/financeiro`
  - Estoque → `/estoque`
- Recepção ganhou agendamento rápido de balcão para cliente sem cadastro completo.
- Super Admin também pode usar o agendamento rápido pela tela de recepção.
- Validação de conflito de horário permanece centralizada no `agendamentoService`.
- Super Admin pode alterar nome e e-mail em `/perfil/admin`.
- Navbar mudou `Preços` para `Serviços`, mantendo `/preco` como rota legada com redirect para `/servicos`.
- Vitrine pública passa a exibir apenas os 3 produtos oficiais.
- `Finalizador Leave-in` virou insumo interno, não produto de vitrine.
- `servicos.json` foi reorganizado para acompanhar melhor a tabela de serviços por categoria e tamanho de cabelo.
- CSS reforçado para melhorar contraste de selects, inputs e cards de serviços.

Observação: para refletir os serviços e vitrine corrigidos no banco, reimporte os JSONs atualizados correspondentes no MongoDB Atlas.
