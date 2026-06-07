# Hotfix — UI, financeiro e agenda profissional

Ajustes realizados:

- Corrigido erro do financeiro causado por uso incorreto de `.lean()` em `buscarCaixaAberto()`.
- Melhorado contraste de inputs, selects e opções nativas em páginas públicas e administrativas.
- Criado atalho `/profissional` redirecionando para `/perfil/profissional`.
- Adicionado atalho “Minha Agenda” no perfil admin quando o usuário também possui permissão `PROFISSIONAL`.
- Ajustado produto `Finalizador Leave-in` para usar imagem existente da vitrine.
- Garantido `.gitignore` para não versionar `.env`.
