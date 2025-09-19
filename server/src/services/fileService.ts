import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";
import pdf2pic from "pdf2pic";

export interface UploadResult {
  projectId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
}

export class FileService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), "temp");
    this.ensureTempDirectory();
  }

  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async uploadPDFToSupabase(
    file: Express.Multer.File,
    userId: string,
    projectName: string,
    companyName?: string,
    accessToken?: string
  ): Promise<UploadResult> {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = `uploads/${userId}/${fileName}`;

      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from("ir-files")
        .upload(filePath, file.buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.mimetype,
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // 프로젝트 정보를 데이터베이스에 저장
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          project_name: projectName,
          company_name: companyName || "",
          status: "pending",
          file_url: filePath,
        })
        .select()
        .single();

      if (projectError) {
        throw new Error(`Database error: ${projectError.message}`);
      }

      logger.info(`PDF uploaded successfully: ${filePath}`);

      return {
        projectId: projectData.id,
        fileName: file.originalname,
        filePath: filePath,
        fileSize: file.size,
      };
    } catch (error) {
      logger.error("PDF upload error:", error);
      throw error;
    }
  }

  async convertPDFToImages(projectId: string): Promise<string[]> {
    try {
      // 프로젝트 정보 조회
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("file_url")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        throw new Error("Project not found");
      }

      // Supabase Storage에서 PDF 다운로드
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from("ir-files")
        .download(project.file_url);

      if (downloadError) {
        throw new Error(`PDF download error: ${downloadError.message}`);
      }

      // 임시 PDF 파일 저장
      const tempPdfPath = path.join(this.tempDir, `${projectId}.pdf`);
      const buffer = await pdfData.arrayBuffer();
      fs.writeFileSync(tempPdfPath, Buffer.from(buffer));

      // PDF를 이미지로 변환
      const convert = pdf2pic.fromPath(tempPdfPath, {
        density: 300,
        saveFilename: `${projectId}_page`,
        savePath: this.tempDir,
        format: "png",
        width: 2480,
        height: 3508,
      });

      const results = await convert.bulk(-1); // 모든 페이지 변환
      const imagePaths: string[] = [];

      // 변환된 이미지들을 Supabase Storage에 업로드
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result && result.path) {
          const imageBuffer = fs.readFileSync(result.path);
          const imageName = `${projectId}_page_${String(i + 1).padStart(
            3,
            "0"
          )}.png`;
          const storagePath = `images/${projectId}/${imageName}`;

          const { error: uploadError } = await supabase.storage
            .from("ir-files")
            .upload(storagePath, imageBuffer, {
              cacheControl: "3600",
              upsert: false,
              contentType: "image/png",
            });

          if (uploadError) {
            logger.error(`Image upload error for page ${i + 1}:`, uploadError);
            continue;
          }

          // 페이지 정보를 데이터베이스에 저장
          const { error: pageError } = await supabase
            .from("project_pages")
            .insert({
              project_id: projectId,
              page_number: i + 1,
              image_storage_path: storagePath,
            });

          if (pageError) {
            logger.error(
              `Page record creation error for page ${i + 1}:`,
              pageError
            );
            continue;
          }

          imagePaths.push(storagePath);

          // 임시 이미지 파일 삭제
          fs.unlinkSync(result.path);
        }
      }

      // 임시 PDF 파일 삭제
      fs.unlinkSync(tempPdfPath);

      // 프로젝트 상태 업데이트
      await supabase
        .from("projects")
        .update({ status: "converted" })
        .eq("id", projectId);

      logger.info(
        `PDF converted to ${imagePaths.length} images for project ${projectId}`
      );

      return imagePaths;
    } catch (error) {
      logger.error("PDF conversion error:", error);
      throw error;
    }
  }

  async getImageAsBase64(storagePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from("ir-files")
        .download(storagePath);

      if (error) {
        throw new Error(`Image download error: ${error.message}`);
      }

      const buffer = await data.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    } catch (error) {
      logger.error("Image download error:", error);
      throw error;
    }
  }
}

export const fileService = new FileService();
