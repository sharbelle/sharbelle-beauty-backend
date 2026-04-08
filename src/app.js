import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import env from "./config/env.js";
import sendResponse from "./helpers/sendResponse.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import notFoundMiddleware from "./middlewares/notFound.middleware.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.frontendOrigin,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer;
    },
  }),
);
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  return sendResponse(res, {
    message: "Backend is healthy",
    data: {
      uptime: process.uptime(),
      nodeEnv: env.nodeEnv,
    },
  });
});

app.use("/api", apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
