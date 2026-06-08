<div align="center">

# 🦁 Studio Patty Leão

## Sistema Operacional de Salão

**Plataforma web para gestão operacional de salão de beleza, com agendamentos, atendimento, estoque, financeiro manual, vitrine de reservas e BI.**

<br>

<a href="https://studio-patty-leao.onrender.com" target="_blank">
  <img src="https://img.shields.io/badge/Acessar%20Plataforma-Studio%20Patty%20Leão-FACC15?style=for-the-badge&logo=render&logoColor=000000" />
</a>

<br><br>

### 🎓 Contexto do Projeto

<img src="https://img.shields.io/badge/Projeto-Acadêmico-0F172A?style=for-the-badge" />
<img src="https://img.shields.io/badge/FATEC-Zona%20Sul-2563EB?style=for-the-badge" />
<img src="https://img.shields.io/badge/Curso-DSM-1D4ED8?style=for-the-badge" />
<img src="https://img.shields.io/badge/Status-Online-16A34A?style=for-the-badge" />

<br><br>

### ⚙️ Stack Principal

<img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=000000" />
<img src="https://img.shields.io/badge/Express.js-4.x-111827?style=for-the-badge&logo=express&logoColor=white" />
<img src="https://img.shields.io/badge/EJS-Views-B4CA65?style=for-the-badge" />
<img src="https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white" />

<br><br>

### 🗄️ Banco, Deploy e Segurança

<img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
<img src="https://img.shields.io/badge/Mongoose-8.x-880000?style=for-the-badge" />
<img src="https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render&logoColor=000000" />
<img src="https://img.shields.io/badge/Auth-Session%20%2B%20bcrypt-F59E0B?style=for-the-badge" />
<img src="https://img.shields.io/badge/Banco-NoSQL-10B981?style=for-the-badge" />

<br><br>

### 🧩 Organização do Sistema

<img src="https://img.shields.io/badge/Arquitetura-MVC-7C3AED?style=for-the-badge" />
<img src="https://img.shields.io/badge/Foco-Gestão%20Operacional-020617?style=for-the-badge" />
<img src="https://img.shields.io/badge/BI-Dashboards-EC4899?style=for-the-badge" />
<img src="https://img.shields.io/badge/Financeiro-Manual-64748B?style=for-the-badge" />
<img src="https://img.shields.io/badge/Vitrine-Reserva%20Presencial-FACC15?style=for-the-badge" />

</div>

---

## 📌 Sobre o projeto

O **Studio Patty Leão — Sistema Operacional de Salão** é uma aplicação web desenvolvida como projeto acadêmico extensionista do curso de **Desenvolvimento de Software Multiplataforma da FATEC Zona Sul**.

A proposta do sistema é apoiar a rotina operacional de um salão de beleza, reunindo em uma única plataforma recursos de:

- agendamento de serviços;
- atendimento e acompanhamento da recepção;
- agenda dos profissionais;
- vitrine digital para reserva presencial de produtos;
- controle operacional de estoque;
- financeiro simples/manual;
- dashboard básico de BI;
- página institucional online.

Antes do projeto, a empresa não possuía site próprio e parte da rotina era feita de forma manual, com apoio de cadernos, folhas, mensagens e controles separados. Isso dificultava a organização dos horários, o acompanhamento dos atendimentos, o controle de insumos e a tomada de decisão.

---

## 🎯 Problema identificado

Durante a análise da rotina do Studio Patty Leão, foram identificados alguns gargalos operacionais:

| Problema | Impacto na operação |
|---|---|
| Ausência de site institucional | Menor presença digital e pouca centralização de informações |
| Agendamentos manuais | Maior risco de conflito de horários e perda de controle |
| Falta de agenda digital | Dificuldade para acompanhar profissionais e atendimentos |
| Estoque não integrado | Baixa visibilidade sobre produtos e insumos |
| Financeiro manual disperso | Falta de visão rápida sobre entradas e saídas |
| Vitrine sem reserva digital | Produtos divulgados sem fluxo organizado de retirada |
| Falta de BI | Pouca base para tomada de decisão |

A solução foi pensada para reduzir a dependência de controles soltos e criar uma base digital simples, funcional e evolutiva para o salão.

---

## 🔄 Mudança de escopo

No início do semestre, a proposta caminhava para um modelo mais próximo de **e-commerce**, com vitrine e venda digital.

Ao longo do desenvolvimento, a equipe percebeu que esse caminho não resolvia o principal problema da empresa. O maior valor para o Studio Patty Leão estava menos na venda online e mais na organização da operação diária.

Por isso, o projeto foi resetado e redirecionado para um **ERP simples de salão**, com foco em:

```txt
agendamentos
atendimentos
estoque
financeiro manual
vitrine de reservas
BI
```

Também houve uma mudança importante na estrutura do banco de dados. A ideia inicial usava uma modelagem mais próxima do modelo relacional, mas a versão final foi refeita em um modelo **não relacional com MongoDB**, utilizando o **MongoDB Atlas** para manter o banco online.

---

## 🧭 Fluxo central do sistema

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

Esse fluxo conecta as principais áreas da aplicação e permite que os dados gerados na operação alimentem estoque, financeiro e indicadores.

---

## 🧱 Tecnologias utilizadas

| Categoria | Tecnologias |
|---|---|
| Runtime | Node.js |
| Linguagem | JavaScript |
| Framework | Express.js |
| Banco de dados | MongoDB Atlas |
| ODM | Mongoose |
| Views | EJS |
| Interface | HTML, CSS, Bootstrap |
| Autenticação | Express Session, bcrypt e token de sessão |
| Deploy | Render |
| Versionamento | Git e GitHub |

---

## 🏗️ Arquitetura

O projeto segue o padrão **MVC**, com separação entre camadas de dados, regras de negócio, rotas, autenticação e interface.

```txt
models/                 → Schemas Mongoose
controllers/            → Entrada das regras por rota
services/               → Regras de negócio principais
routes/                 → Rotas Express
middlewares/            → Autenticação, permissões e sessão
views/                  → Templates EJS
assets/                 → CSS, JS, imagens e vídeos
mongodb-seeds-json/     → Arquivos JSON para importação manual no MongoDB Atlas
```

A pasta `services/` concentra partes importantes da lógica do sistema, como agendamentos, estoque, financeiro e BI.

---

## 🧩 Módulos principais

### 🌐 Site institucional

- Página inicial;
- página sobre;
- página de serviços;
- galeria;
- vitrine digital;
- contato e horários.

### 📅 Agendamentos

- escolha de serviço;
- escolha de profissional;
- validação de data e horário;
- bloqueio de conflito de agenda;
- cálculo de duração do serviço;
- status operacional do atendimento.

### 🧾 Recepção

- agenda operacional;
- cadastro rápido de cliente;
- agendamento de balcão;
- consulta de disponibilidade;
- alteração de status dos atendimentos;
- apoio à organização da rotina presencial.

### 💇 Profissionais

- agenda mensal;
- atendimentos do período;
- histórico de serviços;
- indicadores simples;
- visão dos clientes atendidos;
- alertas operacionais.

### 🛍️ Vitrine digital

A vitrine funciona como uma área de **reserva presencial**.

O cliente pode visualizar produtos e registrar interesse de retirada no salão.  
Não há venda online, checkout ou pagamento integrado.

Produtos principais:

- Kit Tratamento Capilar;
- Perfume Capilar;
- Reparador de Pontas.

### 📦 Estoque

- cadastro de produtos e insumos;
- controle de quantidade;
- entrada e saída manual;
- estoque crítico;
- baixa de insumos ao concluir atendimento.

### 💰 Financeiro manual

O financeiro foi mantido simples, sem integração bancária.

O sistema permite:

- entradas;
- saídas;
- caixa simples;
- movimentações presenciais;
- acompanhamento básico de valores.

### 📊 BI básico

O painel de BI apresenta indicadores como:

- clientes ativos;
- agendamentos;
- atendimentos concluídos;
- cancelamentos;
- faltas;
- serviços mais realizados;
- profissionais mais requisitados;
- reservas da vitrine;
- estoque crítico;
- entradas financeiras.

---

## 🔐 Permissões

O sistema utiliza permissões múltiplas, permitindo que um mesmo usuário tenha mais de uma função.

```txt
SUPER_ADMIN
PROFISSIONAL
RECEPCAO
FINANCEIRO
ESTOQUE
CLIENTE
```

| Perfil | Acesso principal |
|---|---|
| SUPER_ADMIN | Visão geral, BI, recepção, estoque, financeiro e cadastros |
| PROFISSIONAL | Agenda própria e atendimentos |
| RECEPCAO | Agenda operacional e agendamentos de balcão |
| FINANCEIRO | Caixa manual e movimentações |
| ESTOQUE | Produtos, insumos e movimentações |
| CLIENTE | Agendamentos, reservas e perfil |

---

## 📅 Status dos agendamentos

```txt
Agendado
Confirmado
Em Atendimento
Concluido
Cancelado
Faltou
Reagendado
```

Esses status ajudam a organizar a rotina da recepção, a agenda dos profissionais, o histórico de atendimentos e os indicadores do sistema.

---

## 🛣️ Rotas principais

| Rota | Acesso | Descrição |
|---|---|---|
| `/` | Público | Página inicial |
| `/sobre` | Público | Página institucional |
| `/servicos` | Público | Serviços e preços |
| `/preco` | Público | Redirecionamento/compatibilidade |
| `/vitrine` | Público | Vitrine de reserva presencial |
| `/agendamento` | Cliente logado | Agendamento de serviços |
| `/perfil/cliente` | Cliente | Perfil, agendamentos e reservas |
| `/perfil/profissional` | Profissional | Agenda e visão de atendimentos |
| `/admin` | Super Admin | BI central |
| `/recepcao` | Super Admin / Recepção | Agenda operacional |
| `/estoque` | Super Admin / Estoque | Controle de estoque |
| `/financeiro` | Super Admin / Financeiro | Caixa manual e movimentações |

---

## 🗄️ Banco de dados

O projeto utiliza **MongoDB Atlas**.

A população do banco é feita manualmente a partir dos arquivos JSON disponíveis em:

```txt
mongodb-seeds-json/
```

Arquivos auxiliares:

```txt
mongodb-seeds-json/README_IMPORTACAO_MONGODB.md
mongodb-seeds-json/import-order.json
mongodb-seeds-json/collection-map.json
```

O comando `npm run seed` foi mantido apenas por compatibilidade, mas não executa inserts automáticos.

### Collections principais

```txt
usuarios
clientes
profissionals
servicos
produtos
estoques
servicoinsumos
agendamentos
reservavitrines
caixas
movimentacaoestoques
movimentacaofinanceiras
fornecedors
tipopagtos
vendas
```

---

## ⚙️ Variáveis de ambiente

Use `.env.example` como referência.

Crie um arquivo `.env` apenas localmente ou configure as variáveis diretamente no Render.

```env
MONGO_URI=mongodb+srv://USUARIO:SENHA@cluster.XXXXX.mongodb.net/?retryWrites=true&w=majority
DB_NAME=studio_patty_leao
SESSION_SECRET=string-aleatoria-longa-e-segura
NODE_ENV=production
PORT=5000
```

Nunca envie credenciais reais para o GitHub.

---

## ▶️ Como executar localmente

Clone o repositório:

```bash
git clone https://github.com/maxgodoydev-dotcom/studio-patty-leao.git
```

Acesse a pasta:

```bash
cd studio-patty-leao
```

Instale as dependências:

```bash
npm install
```

Execute em desenvolvimento:

```bash
npm run dev
```

Execute em produção:

```bash
npm start
```

---

## 🧪 Teste de usabilidade

Durante o teste de usabilidade com a cliente, a demonstração levou aproximadamente **40 minutos**.

O tempo maior aconteceu porque foi necessário apresentar o sistema, explicar os fluxos principais, demonstrar os módulos e validar o entendimento da solução com a usuária final.

Para a entrega final, os vídeos serão editados em uma versão mais objetiva, destacando as funcionalidades principais e o impacto prático da plataforma.

---

## 📈 Impacto esperado

Com a plataforma, o Studio Patty Leão passa a contar com uma base digital para organizar parte da operação.

Entre os principais ganhos esperados estão:

- presença digital própria;
- centralização de informações;
- melhor organização dos agendamentos;
- controle básico de estoque;
- visão gerencial por indicadores;
- separação de permissões por setor;
- acompanhamento dos atendimentos;
- apoio à tomada de decisão.

---

## 👥 Autores e principais contribuições

Projeto desenvolvido no contexto acadêmico do curso de **Desenvolvimento de Software Multiplataforma da FATEC Zona Sul**.

A versão final publicada foi estruturada e consolidada principalmente por:

| Integrante | Principais contribuições |
|---|---|
| **Max Godoy** | Reestruturação geral do projeto, mudança de escopo de e-commerce para ERP simples, organização da arquitetura MVC, reestruturação do banco MongoDB Atlas, deploy no Render, versionamento no GitHub, regras de negócio, BI e integração geral da aplicação. |
| **Luca Simões Dagostino** | Organização da arquitetura MVC, validação da estrutura do sistema, participação na transformação do projeto para ERP simples, contribuições em fluxos operacionais, BI, testes de funcionalidades e consolidação da versão final. |
| **Maycon Lima Teixeira Cavalcante** | Modelagem e validação do banco de dados, análise das regras de negócio, validação de decisões operacionais, participação na arquitetura MVC e olhar crítico sobre consistência dos dados, fluxos e estrutura geral do sistema. |

---

## 📌 Observações importantes

- O sistema não é e-commerce.
- Não possui checkout online.
- Não possui gateway de pagamento.
- Não possui pagamento digital integrado.
- CPF é opcional e não aparece em sessões ou views comuns.
- A vitrine registra apenas reservas presenciais.
- O financeiro é simples e manual.
- O estoque de insumos é baixado ao concluir atendimento.
- O estoque de produto da vitrine é baixado quando a reserva é marcada como retirada.

---

## 🏢 Organização atendida

O projeto foi desenvolvido para o **Studio Patty Leão**, salão de beleza utilizado como organização beneficiária no contexto do projeto acadêmico extensionista.

A solução foi pensada para apoiar a digitalização de parte da rotina operacional da empresa, principalmente em agendamentos, atendimento, estoque, financeiro manual, vitrine de reservas e indicadores básicos de gestão.

---

## 🎓 Contexto acadêmico

Projeto desenvolvido como atividade acadêmica extensionista, com foco em aplicação prática de tecnologia para uma organização real.

O objetivo foi entregar uma solução funcional, com código-fonte público, documentação técnica, plataforma online e evidências de impacto operacional.
