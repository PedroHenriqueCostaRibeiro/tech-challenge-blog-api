# Tech Challenge - API de Blogging

API REST para uma plataforma de blogging voltada a professores(as) e alunos(as)
da rede publica de educacao. Refatoracao do back-end para **Node.js + Express +
TypeScript**, com persistencia em **PostgreSQL** via **TypeORM**.

## Tecnologias

- Node.js + Express
- TypeScript
- TypeORM
- PostgreSQL

## Estrutura do projeto

```
src/
  config/         # DataSource do TypeORM (conexao com o banco)
  entities/       # Entidades / modelos de dados (Post)
  services/       # Regras de negocio
  controllers/    # Handlers das requisicoes HTTP
  routes/         # Definicao das rotas
  middlewares/    # Tratamento de erros e 404
  errors/         # Classe AppError
  app.ts          # Configuracao do Express
  server.ts       # Ponto de entrada (conecta ao banco e sobe o servidor)
```

## Pre-requisitos

- Node.js 18+
- PostgreSQL em execucao (local ou em container)

## Configuracao

1. Instale as dependencias:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` a partir do exemplo e ajuste as credenciais do banco:

   ```bash
   cp .env.example .env
   ```

3. Garanta que o banco definido em `DB_DATABASE` exista no PostgreSQL.
   Com `DB_SYNCHRONIZE=true`, a tabela `posts` e criada automaticamente ao subir a aplicacao.

## Executando

```bash
# Desenvolvimento (hot reload)
npm run dev

# Producao
npm run build
npm start
```

O servidor sobe por padrao em `http://localhost:3000`.

## Endpoints

| Metodo | Rota            | Descricao                                              |
| ------ | --------------- | ------------------------------------------------------ |
| GET    | `/posts`        | Lista todas as postagens                               |
| GET    | `/posts/search` | Busca posts por palavra-chave (`?q=termo`)             |
| GET    | `/posts/:id`    | Retorna uma postagem pelo id                           |
| POST   | `/posts`        | Cria uma nova postagem                                 |
| PUT    | `/posts/:id`    | Edita uma postagem existente                           |
| DELETE | `/posts/:id`    | Exclui uma postagem                                    |
| GET    | `/health`       | Healthcheck da aplicacao                               |

### Corpo da requisicao (POST / PUT)

```json
{
  "title": "Titulo do post",
  "content": "Conteudo completo do post",
  "author": "Nome do docente"
}
```

### Exemplos com curl

```bash
# Criar
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Aula de Historia","content":"Revolucao Francesa...","author":"Prof. Maria"}'

# Listar
curl http://localhost:3000/posts

# Buscar
curl "http://localhost:3000/posts/search?q=revolucao"

# Ler por id
curl http://localhost:3000/posts/<id>

# Editar
curl -X PUT http://localhost:3000/posts/<id> \
  -H "Content-Type: application/json" \
  -d '{"content":"Conteudo atualizado"}'

# Excluir
curl -X DELETE http://localhost:3000/posts/<id>
```

## Proximos passos (planejados)

- Docker Compose (app + PostgreSQL)
- Testes automatizados (Jest)
- Pipeline de CI/CD (GitHub Actions)
- Documentacao com Swagger
