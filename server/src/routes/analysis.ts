import { Router, Request, Response } from "express";
import { analysisService } from "../services/analysisService";
import { logger } from "../utils/logger";
import { authenticateUser, AuthenticatedRequest } from "../middleware/auth";

export const analysisRoutes = Router();

// 분석 시작 - 전체 분석 프로세스 시작
analysisRoutes.post(
  "/start",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.body;
      const userId = req.user!.id;

      if (!projectId) {
        res.status(400).json({
          error: "Bad Request",
          message: "Project ID is required",
        });
        return;
      }

      // 프로젝트 상태를 processing으로 업데이트
      await analysisService.updateProjectStatus(projectId, "processing");

      // Step 1 분석 시작
      const step1Results = await analysisService.performStep1Analysis(
        projectId
      );

      // Step 2 분석 시작
      const step2Results = await analysisService.performStep2Analysis(
        projectId
      );

      // 전체 분석 수행
      const overallResult = await analysisService.performOverallAnalysis(
        projectId
      );

      // 마크다운 보고서 생성
      const reportPath = await analysisService.generateMarkdownReport(
        projectId
      );

      // 프로젝트 상태를 completed로 업데이트
      await analysisService.updateProjectStatus(projectId, "completed");

      res.json({
        success: true,
        data: {
          projectId,
          step1Results,
          step2Results,
          overallResult,
          reportPath,
        },
      });
    } catch (error) {
      logger.error("Analysis start error:", error);

      // 오류 발생 시 프로젝트 상태를 failed로 업데이트
      if (req.body.projectId) {
        try {
          await analysisService.updateProjectStatus(
            req.body.projectId,
            "failed",
            error instanceof Error ? error.message : "Unknown error"
          );
        } catch (updateError) {
          logger.error("Failed to update project status:", updateError);
        }
      }

      res.status(500).json({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 분석 재시작
analysisRoutes.post(
  "/restart",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.body;
      const userId = req.user!.id;

      if (!projectId) {
        res.status(400).json({
          error: "Bad Request",
          message: "Project ID is required",
        });
        return;
      }

      // 기존 분석 결과 삭제
      await analysisService.clearAnalysisResults(projectId);

      // 프로젝트 상태를 processing으로 리셋
      await analysisService.updateProjectStatus(
        projectId,
        "processing",
        null,
        0
      );

      // 분석 재시작
      const step1Results = await analysisService.performStep1Analysis(
        projectId
      );
      const step2Results = await analysisService.performStep2Analysis(
        projectId
      );
      const overallResult = await analysisService.performOverallAnalysis(
        projectId
      );
      const reportPath = await analysisService.generateMarkdownReport(
        projectId
      );

      // 프로젝트 상태를 completed로 업데이트
      await analysisService.updateProjectStatus(projectId, "completed");

      res.json({
        success: true,
        data: {
          projectId,
          step1Results,
          step2Results,
          overallResult,
          reportPath,
        },
      });
    } catch (error) {
      logger.error("Analysis restart error:", error);

      // 오류 발생 시 프로젝트 상태를 failed로 업데이트
      if (req.body.projectId) {
        try {
          await analysisService.updateProjectStatus(
            req.body.projectId,
            "failed",
            error instanceof Error ? error.message : "Unknown error"
          );
        } catch (updateError) {
          logger.error("Failed to update project status:", updateError);
        }
      }

      res.status(500).json({
        error: "Analysis restart failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 1단계 분석 시작
analysisRoutes.post(
  "/step1/:projectId",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const results = await analysisService.performStep1Analysis(projectId);

      res.json({
        success: true,
        data: {
          projectId,
          results,
          processedPages: results.length,
        },
      });
    } catch (error) {
      logger.error("Step 1 analysis error:", error);
      res.status(500).json({
        error: "Step 1 analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 2단계 분석 시작
analysisRoutes.post(
  "/step2/:projectId",
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const results = await analysisService.performStep2Analysis(projectId);

      res.json({
        success: true,
        data: {
          projectId,
          results,
          processedPages: results.length,
        },
      });
    } catch (error) {
      logger.error("Step 2 analysis error:", error);
      res.status(500).json({
        error: "Step 2 analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 전체 분석 수행
analysisRoutes.post(
  "/overall/:projectId",
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const result = await analysisService.performOverallAnalysis(projectId);

      res.json({
        success: true,
        data: {
          projectId,
          result,
        },
      });
    } catch (error) {
      logger.error("Overall analysis error:", error);
      res.status(500).json({
        error: "Overall analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 마크다운 보고서 생성
analysisRoutes.post(
  "/report/:projectId",
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const reportPath = await analysisService.generateMarkdownReport(
        projectId
      );

      res.json({
        success: true,
        data: {
          projectId,
          reportPath,
        },
      });
    } catch (error) {
      logger.error("Report generation error:", error);
      res.status(500).json({
        error: "Report generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 프로젝트 상태 조회
analysisRoutes.get(
  "/status/:projectId",
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;

      const status = await analysisService.getProjectStatus(projectId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error("Status check error:", error);
      res.status(500).json({
        error: "Status check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 서비스 상태
analysisRoutes.get("/health", (req: Request, res: Response) => {
  res.json({ message: "Analysis service is running" });
});
