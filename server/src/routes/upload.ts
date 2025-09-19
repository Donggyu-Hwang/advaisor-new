import { Router, Request, Response } from "express";
import multer from "multer";
import { fileService } from "../services/fileService";
import { analysisService } from "../services/analysisService";
import { logger } from "../utils/logger";
import { authenticateUser, AuthenticatedRequest } from "../middleware/auth";

export const uploadRoutes = Router();

// Root upload endpoint - provides information about available endpoints
uploadRoutes.post("/", (req: Request, res: Response) => {
  res.status(400).json({
    error: "Invalid endpoint",
    message: "Please use one of the following endpoints:",
    availableEndpoints: {
      "POST /api/upload/pdf": "Upload a PDF file with authentication",
      "POST /api/upload/process":
        "Upload and process a PDF file (full pipeline)",
      "POST /api/upload/convert/:projectId":
        "Convert an uploaded PDF to images",
      "GET /api/upload/status": "Check upload service status",
    },
    examples: {
      "PDF upload":
        "POST /api/upload/pdf with form-data: file (PDF) and projectName",
      "Full process":
        "POST /api/upload/process with form-data: file (PDF) and projectName",
    },
  });
});

// Multer 설정 (메모리 저장)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB 제한
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// PDF 업로드 엔드포인트
uploadRoutes.post(
  "/pdf",
  authenticateUser,
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const { projectName, companyName } = req.body;
      if (!projectName) {
        res.status(400).json({ error: "Project name is required" });
        return;
      }

      const result = await fileService.uploadPDFToSupabase(
        req.file,
        userId,
        projectName,
        companyName,
        req.accessToken
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Upload error:", error);
      res.status(500).json({
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// PDF를 이미지로 변환
uploadRoutes.post(
  "/convert/:projectId",
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const imagePaths = await fileService.convertPDFToImages(projectId);

      res.json({
        success: true,
        data: {
          projectId,
          imagePaths,
          imageCount: imagePaths.length,
        },
      });
    } catch (error) {
      logger.error("Conversion error:", error);
      res.status(500).json({
        error: "Conversion failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 전체 파이프라인 실행 (업로드 → 변환 → 분석)
uploadRoutes.post(
  "/process",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const { projectName, companyName } = req.body;
      if (!projectName) {
        res.status(400).json({ error: "Project name is required" });
        return;
      }

      const userId = (req.headers["user-id"] as string) || "temp-user-id";

      // 1. 업로드
      const uploadResult = await fileService.uploadPDFToSupabase(
        req.file,
        userId,
        projectName,
        companyName
      );

      // 2. 이미지 변환
      const imagePaths = await fileService.convertPDFToImages(
        uploadResult.projectId
      );

      // 3. 1단계 분석 시작 (비동기)
      analysisService
        .performStep1Analysis(uploadResult.projectId)
        .then((step1Results) => {
          logger.info(
            `Step 1 analysis completed for project ${uploadResult.projectId}`
          );
          // 4. 2단계 분석 시작
          return analysisService.performStep2Analysis(uploadResult.projectId);
        })
        .then((step2Results) => {
          logger.info(
            `Step 2 analysis completed for project ${uploadResult.projectId}`
          );
          // 5. 전체 분석
          return analysisService.performOverallAnalysis(uploadResult.projectId);
        })
        .then((overallResult) => {
          logger.info(
            `Overall analysis completed for project ${uploadResult.projectId}`
          );
          // 6. 마크다운 보고서 생성
          return analysisService.generateMarkdownReport(uploadResult.projectId);
        })
        .then((reportPath) => {
          logger.info(
            `Report generated for project ${uploadResult.projectId}: ${reportPath}`
          );
        })
        .catch((error) => {
          logger.error(
            `Analysis pipeline error for project ${uploadResult.projectId}:`,
            error
          );
        });

      res.json({
        success: true,
        data: {
          ...uploadResult,
          imagePaths,
          imageCount: imagePaths.length,
          message: "Processing started. Check status for progress.",
        },
      });
    } catch (error) {
      logger.error("Process error:", error);
      res.status(500).json({
        error: "Process failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 상태 확인
uploadRoutes.get("/status", (req: Request, res: Response) => {
  res.json({ message: "Upload service is running" });
});
