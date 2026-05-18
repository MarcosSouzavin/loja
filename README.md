# 🛒 PromoCasa (E-Commerce API)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

Uma API REST completa para gerenciamento de uma loja virtual, desenvolvida em Node.js. O projeto conta com fluxo de autenticação seguro, gerenciamento de produtos, carrinho de compras e processamento de pedidos.

---

## 🚀 Funcionalidades

- **Autenticação de Usuários:** Cadastro, login e logout com senhas criptografadas e sessões seguras via cookies (JWT).
- **Catálogo de Produtos:** CRUD completo (criar, ler, atualizar e deletar) de produtos com categorias e controle de estoque.
- **Carrinho de Compras:** Adição, remoção e atualização de quantidade de itens no carrinho por usuário.
- **Pedidos (Checkout):** Fechamento de compras, geração de número de pedido e histórico de compras do usuário.

---

## 🛠️ Tecnologias Utilizadas

As seguintes ferramentas e bibliotecas foram utilizadas na construção do projeto:

- **[Node.js](https://nodejs.org/)** - Ambiente de execução Javascript server-side.
- **[Express](https://expressjs.com/pt-br/)** - Framework web para construção das rotas e middlewares.
- **[Bcrypt.js](https://www.npmjs.com/package/bcryptjs)** - Criptografia de senhas (hashing).
- **[JSON Web Token (JWT)](https://jwt.io/)** - Emissão de tokens para autenticação segura.
- **[SQLite / better-sqlite3](https://www.npmjs.com/package/better-sqlite3)** - Banco de dados relacional leve (ou substitua pelo banco que usou, ex: MongoDB/PostgreSQL).
- **[Dotenv](https://www.npmjs.com/package/dotenv)** - Gerenciamento de variáveis de ambiente.

---

## 📦 Como Instalar e Rodar o Projeto

### Pré-requisitos
Antes de começar, você vai precisar ter instalado em sua máquina o **[Git](https://git-scm.com)** e o **[Node.js](https://nodejs.org/pt-br/)**.
