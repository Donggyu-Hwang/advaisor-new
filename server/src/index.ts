import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createServer } from "http";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/auth";
import { uploadRoutes } from "./routes/upload";
import { analysisRoutes } from "./routes/analysis";
import { projectRoutes } from "./routes/projects";
import testRoutes from "./routes/test";

// 환경 변수 로드
dotenv.config({ path: "../.env" });

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// API 라우트 설정
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/test", testRoutes);

// 헬스 체크
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 에러 핸들러
app.use(errorHandler);

// 404 핸들러
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
