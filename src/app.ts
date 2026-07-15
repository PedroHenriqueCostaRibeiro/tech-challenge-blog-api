import express, { Application } from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

const app: Application = express();

app.use(cors());
app.use(express.json());

app.use(routes);

// Rota nao encontrada + tratamento central de erros (sempre por ultimo).
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
