import { Router, Response } from "express";
import { authenticateUser, AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../utils/logger";

export const authRoutes = Router();

// 인증 상태 확인
authRoutes.get("/status", (req, res) => {
  res.json({ message: "Auth routes ready" });
});

// 현재 사용자 정보 조회
authRoutes.get(
  "/me",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      logger.error("Get user info error:", error);
      res.status(500).json({
        error: "Failed to get user info",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
