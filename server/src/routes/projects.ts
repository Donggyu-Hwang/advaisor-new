import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";
import { authenticateUser, AuthenticatedRequest } from "../middleware/auth";

export const projectRoutes = Router();

// 사용자의 모든 프로젝트 조회
projectRoutes.get(
  "/",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id; // authenticateUser 미들웨어에서 검증됨

      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      res.json({
        success: true,
        data: projects || [],
      });
    } catch (error) {
      logger.error("Get projects error:", error);
      res.status(500).json({
        error: "Failed to fetch projects",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 새 프로젝트 생성
projectRoutes.post(
  "/",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { project_name, company_name } = req.body;

      if (!project_name || !company_name) {
        res.status(400).json({
          error: "Bad Request",
          message: "프로젝트명과 회사명은 필수입니다.",
        });
        return;
      }

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          project_name,
          company_name,
          status: "pending",
          progress_percentage: 0,
          processed_pages: 0,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create project: ${error.message}`);
      }

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      logger.error("Create project error:", error);
      res.status(500).json({
        error: "Failed to create project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 특정 프로젝트 상세 조회
projectRoutes.get(
  "/:projectId",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      logger.info(
        `Fetching project details - ProjectID: ${projectId}, UserID: ${userId}`
      );

      // 프로젝트 기본 정보
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", userId) // 사용자 권한 확인
        .single();

      logger.info(
        `Project query result - Data: ${JSON.stringify(
          project
        )}, Error: ${JSON.stringify(projectError)}`
      );

      if (projectError) {
        if (projectError.code === "PGRST116") {
          logger.warn(
            `Project not found - ProjectID: ${projectId}, UserID: ${userId}`
          );
          res.status(404).json({
            error: "Project not found",
            message: "프로젝트를 찾을 수 없거나 접근 권한이 없습니다.",
          });
          return;
        }
        throw new Error(`Project not found: ${projectError.message}`);
      }

      // 페이지별 분석 결과는 project_pages 테이블에서 조회
      const { data: pages, error: pagesError } = await supabase
        .from("project_pages")
        .select(
          "page_number, llm_analysis_step_1_json, llm_analysis_step_2_json"
        )
        .eq("project_id", projectId)
        .order("page_number");

      if (pagesError) {
        logger.warn(`Project pages error: ${pagesError.message}`);
        // 페이지 결과 에러는 치명적이지 않으므로 빈 배열로 처리
      }

      const responseData = {
        success: true,
        data: {
          project,
          pages: pages || [],
          total_pages: project.total_pages || 0,
          processed_pages: project.processed_pages || 0,
          progress_percentage: project.progress_percentage || 0,
        },
      };

      logger.info(
        `Sending response for project ${projectId}: ${JSON.stringify(
          responseData
        )}`
      );
      res.json(responseData);
    } catch (error) {
      logger.error("Get project detail error:", error);
      res.status(500).json({
        error: "Failed to fetch project details",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 프로젝트 삭제
projectRoutes.delete(
  "/:projectId",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      // TODO: 사용자 권한 확인

      // 먼저 사용자가 이 프로젝트의 소유자인지 확인
      const { data: project, error: checkError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single();

      if (checkError || !project) {
        res.status(404).json({
          error: "Project not found",
          message: "프로젝트를 찾을 수 없거나 접근 권한이 없습니다.",
        });
        return;
      }

      // 관련 파일들도 삭제해야 함 (Storage에서)
      // 일단 데이터베이스 레코드만 삭제

      // analysis_results 테이블은 사용하지 않으므로 제거
      // 분석 결과는 project_pages와 final_reports 테이블에서 관리됨

      const { error: projectError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (projectError) {
        throw new Error(`Failed to delete project: ${projectError.message}`);
      }

      res.json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      logger.error("Delete project error:", error);
      res.status(500).json({
        error: "Failed to delete project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 보고서 내용 조회 (MD 파일 내용)
projectRoutes.get(
  "/:projectId/report",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const { data: project, error } = await supabase
        .from("projects")
        .select("report_url")
        .eq("id", projectId)
        .eq("user_id", userId) // 사용자 권한 확인
        .single();

      if (error || !project) {
        res.status(404).json({
          error: "Project not found",
          message: "프로젝트를 찾을 수 없거나 접근 권한이 없습니다.",
        });
        return;
      }

      if (!project.report_url) {
        res.status(404).json({
          error: "Report not available yet",
          message: "보고서가 아직 생성되지 않았습니다.",
        });
        return;
      }

      // Supabase Storage에서 파일 내용 다운로드
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("ir-files")
        .download(project.report_url);

      if (downloadError) {
        throw new Error(`Failed to download report: ${downloadError.message}`);
      }

      // Blob을 텍스트로 변환
      const markdownContent = await fileData.text();

      res.json({
        success: true,
        data: {
          content: markdownContent,
          projectId,
          reportUrl: project.report_url,
        },
      });
    } catch (error) {
      logger.error("Get report content error:", error);
      res.status(500).json({
        error: "Failed to get report content",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 보고서 다운로드 URL 생성
projectRoutes.get(
  "/:projectId/download/:type",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId, type } = req.params; // type: 'markdown' | 'pdf'
      const userId = req.user!.id;

      const { data: project, error } = await supabase
        .from("projects")
        .select("report_url")
        .eq("id", projectId)
        .eq("user_id", userId) // 사용자 권한 확인
        .single();

      if (error || !project) {
        res.status(404).json({
          error: "Project not found",
          message: "프로젝트를 찾을 수 없거나 접근 권한이 없습니다.",
        });
        return;
      }

      if (!project.report_url) {
        res.status(404).json({
          error: "Report not available yet",
        });
        return;
      }

      // Supabase Storage에서 다운로드 URL 생성 (1시간 유효)
      const { data: urlData, error: urlError } = await supabase.storage
        .from("ir-files")
        .createSignedUrl(project.report_url, 3600);

      if (urlError) {
        throw new Error(`Failed to create download URL: ${urlError.message}`);
      }

      res.json({
        success: true,
        data: {
          downloadUrl: urlData.signedUrl,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      });
    } catch (error) {
      logger.error("Download URL generation error:", error);
      res.status(500).json({
        error: "Failed to generate download URL",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 페이지 이미지 조회
projectRoutes.get(
  "/:projectId/pages/:pageNumber/image",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId, pageNumber } = req.params;
      const userId = req.user!.id;

      logger.info(
        `Fetching page image - ProjectID: ${projectId}, PageNumber: ${pageNumber}, UserID: ${userId}`
      );

      // 먼저 사용자가 이 프로젝트에 접근 권한이 있는지 확인
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single();

      if (projectError || !project) {
        logger.warn(
          `Project access denied - ProjectID: ${projectId}, UserID: ${userId}`
        );
        res.status(404).json({
          error: "Project not found",
          message: "프로젝트를 찾을 수 없거나 접근 권한이 없습니다.",
        });
        return;
      }

      // 페이지 이미지 파일 경로 생성 (Supabase Storage에서 가져오기)
      // 경로 형태: /images/{projectId}/{projectId}_page_001.png
      const paddedPageNumber = pageNumber.toString().padStart(3, "0");
      const imagePath = `images/${projectId}/${projectId}_page_${paddedPageNumber}.png`;
      logger.info(`Looking for image at Supabase Storage path: ${imagePath}`);

      try {
        // Supabase Storage에서 이미지 파일 다운로드
        const { data: imageData, error: downloadError } = await supabase.storage
          .from("ir-files")
          .download(imagePath);

        if (downloadError) {
          logger.warn(
            `Page image not found in storage: ${imagePath} - ${downloadError.message}`
          );
          res.status(404).json({
            error: "Page image not found",
            message: "페이지 이미지를 찾을 수 없습니다.",
          });
          return;
        }

        // 이미지 데이터를 Buffer로 변환
        const imageBuffer = await imageData.arrayBuffer();

        logger.info(
          `Successfully downloaded image: ${imagePath}, Size: ${imageBuffer.byteLength} bytes`
        );

        // 이미지 응답 헤더 설정 및 전송
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=3600"); // 1시간 캐시
        res.send(Buffer.from(imageBuffer));
      } catch (storageError) {
        logger.warn(`Storage error for image ${imagePath}: ${storageError}`);
        res.status(404).json({
          error: "Page image not found",
          message: "페이지 이미지를 찾을 수 없습니다.",
        });
      }
    } catch (error) {
      logger.error("Get page image error:", error);
      res.status(500).json({
        error: "Failed to get page image",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 디버깅용 - 모든 프로젝트 조회 (개발 환경에서만)
projectRoutes.get(
  "/debug/all",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      logger.info(
        `Debug - All projects for user ${userId}: ${JSON.stringify(projects)}`
      );

      res.json({
        success: true,
        data: {
          userId,
          projectCount: projects?.length || 0,
          projects: projects || [],
        },
      });
    } catch (error) {
      logger.error("Debug projects error:", error);
      res.status(500).json({
        error: "Failed to fetch debug projects",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 프로젝트의 전체 분석 데이터 조회 (final_reports 테이블의 overall_analysis)
projectRoutes.get(
  "/:projectId/analysis",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      logger.info(
        `Fetching overall analysis - ProjectID: ${projectId}, UserID: ${userId}`
      );

      // 먼저 프로젝트 소유권 확인
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, status")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single();

      if (projectError || !project) {
        logger.warn(
          `Project not found for analysis - ProjectID: ${projectId}, UserID: ${userId}`
        );
        res.status(404).json({
          error: "Project not found",
          message: "프로젝트를 찾을 수 없거나 접근 권한이 없습니다.",
        });
        return;
      }

      // 프로젝트가 완료된 상태인지 확인
      if (project.status !== "completed") {
        res.status(400).json({
          error: "Analysis not ready",
          message: "분석이 아직 완료되지 않았습니다.",
        });
        return;
      }

      // final_reports 테이블에서 overall_analysis 조회
      const { data: finalReport, error: reportError } = await supabase
        .from("final_reports")
        .select("overall_analysis")
        .eq("project_id", projectId)
        .single();

      if (reportError) {
        logger.error(`Final report error: ${reportError.message}`);
        res.status(404).json({
          error: "Analysis not found",
          message: "분석 데이터를 찾을 수 없습니다.",
        });
        return;
      }

      if (!finalReport || !finalReport.overall_analysis) {
        res.status(404).json({
          error: "Analysis data not found",
          message: "분석 데이터가 없습니다.",
        });
        return;
      }

      res.json({
        success: true,
        data: {
          overall_analysis: finalReport.overall_analysis,
        },
      });
    } catch (error) {
      logger.error("Get overall analysis error:", error);
      res.status(500).json({
        error: "Failed to fetch analysis data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// 서비스 상태
projectRoutes.get("/health/check", (req: Request, res: Response) => {
  res.json({ message: "Projects service is running" });
});
