import fs from "fs";
import path from "path";
import { supabase } from "../config/supabase";
import { bedrockService } from "../config/bedrock";
import { fileService } from "./fileService";
import { logger } from "../utils/logger";

export interface AnalysisResult {
  pageNumber: number;
  step1Result?: any;
  step2Result?: any;
}

export class AnalysisService {
  private promptsDir: string;

  constructor() {
    this.promptsDir = path.join(process.cwd(), "../prompts");
  }

  private readPromptFile(filename: string): string {
    try {
      const filePath = path.join(this.promptsDir, filename);
      return fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      logger.error(`Failed to read prompt file ${filename}:`, error);
      throw new Error(`Prompt file not found: ${filename}`);
    }
  }

  private cleanJsonResponse(response: string): string {
    // 마크다운 코드 블록 제거
    let cleaned = response.replace(/```json\s*/g, "").replace(/```\s*$/g, "");

    // 줄바꿈 문자 정리 (JSON 내부의 \n은 유지하되, 불필요한 줄바꿈 제거)
    cleaned = cleaned.trim();

    // JSON 문자열 값 내부의 따옴표 처리
    // 정규표현식을 사용하여 문자열 값 내부의 따옴표를 임시로 대체
    cleaned = this.fixQuotesInJsonValues(cleaned);

    // 백슬래시 이스케이프 문자 정리
    cleaned = cleaned.replace(/\\n/g, "\n");
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\\t/g, "\t");

    // 추가적인 마크다운 아티팩트 제거
    cleaned = cleaned.replace(/```/g, "");

    // 문자열 끝에 있는 불완전한 텍스트 패턴 제거 (예: "..."}...)
    cleaned = cleaned.replace(/\.\.\.\s*$/, "");
    cleaned = cleaned.replace(/\.\.\.["\}\]]*\s*$/, "");

    // JSON 구조의 완전성 확인 및 수정
    // 열린 중괄호와 닫힌 중괄호의 균형 맞추기
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;

    if (openBraces > closeBraces) {
      // 부족한 닫는 중괄호 추가
      const missingBraces = openBraces - closeBraces;
      cleaned += "}".repeat(missingBraces);
    }

    // 열린 대괄호와 닫힌 대괄호의 균형 맞추기
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;

    if (openBrackets > closeBrackets) {
      // 부족한 닫는 대괄호 추가
      const missingBrackets = openBrackets - closeBrackets;
      cleaned += "]".repeat(missingBrackets);
    }

    return cleaned;
  }

  private fixQuotesInJsonValues(jsonString: string): string {
    try {
      // 더 안전하고 포괄적인 방법으로 JSON 문자열 값 내부의 따옴표 처리
      let result = jsonString;
      let inString = false;
      let inKey = false;
      let escapeNext = false;
      let processedChars = [];
      let i = 0;

      while (i < result.length) {
        const char = result[i];
        const nextChar = result[i + 1];

        if (escapeNext) {
          processedChars.push(char);
          escapeNext = false;
          i++;
          continue;
        }

        if (char === "\\") {
          processedChars.push(char);
          escapeNext = true;
          i++;
          continue;
        }

        if (char === '"') {
          if (!inString) {
            // 문자열 시작
            inString = true;
            // 콜론이 뒤에 오는지 확인 (키인지 값인지 판단)
            let colonPos = -1;
            for (let j = i + 1; j < result.length; j++) {
              if (result[j] === ":") {
                colonPos = j;
                break;
              }
              if (
                result[j] === '"' ||
                result[j] === "," ||
                result[j] === "}" ||
                result[j] === "]"
              ) {
                break;
              }
            }
            inKey = colonPos > -1;
            processedChars.push(char);
          } else {
            // 문자열 끝 또는 내부 따옴표
            if (inKey) {
              // 키 문자열 내부라면 끝
              inString = false;
              inKey = false;
              processedChars.push(char);
            } else {
              // 값 문자열 내부
              // 다음 문자들을 확인하여 실제 끝인지 판단
              let isEnd = false;
              for (let j = i + 1; j < result.length; j++) {
                const nextChar = result[j];
                if (
                  nextChar === " " ||
                  nextChar === "\n" ||
                  nextChar === "\t"
                ) {
                  continue;
                }
                if (nextChar === "," || nextChar === "}" || nextChar === "]") {
                  isEnd = true;
                }
                break;
              }

              if (isEnd) {
                // 실제 문자열 끝
                inString = false;
                processedChars.push(char);
              } else {
                // 문자열 내부의 따옴표이므로 이스케이프 처리
                processedChars.push('\\"');
              }
            }
          }
        } else {
          processedChars.push(char);
        }

        i++;
      }

      return processedChars.join("");
    } catch (error) {
      // 처리에 실패하면 원본 반환
      logger.warn(
        "Failed to fix quotes in JSON values, returning original string"
      );
      return jsonString;
    }
  }

  private parseJsonSafely(jsonString: string, pageNumber?: number): any {
    try {
      const cleanedResult = this.cleanJsonResponse(jsonString);
      const parsed = JSON.parse(cleanedResult);

      // raw_analysis 필드가 있는 경우, 그 내용을 파싱 시도
      if (parsed && typeof parsed === "object" && parsed.raw_analysis) {
        try {
          const rawAnalysis =
            typeof parsed.raw_analysis === "string"
              ? parsed.raw_analysis
              : JSON.stringify(parsed.raw_analysis);

          // 이스케이프된 JSON 문자열을 정리
          let unescaped = rawAnalysis
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "\r")
            .replace(/\\\\/g, "\\");

          // 파싱 시도
          const parsedRawAnalysis = JSON.parse(unescaped);

          logger.info(
            `Successfully parsed raw_analysis content${
              pageNumber ? ` for page ${pageNumber}` : ""
            }`
          );
          return parsedRawAnalysis;
        } catch (rawError) {
          logger.warn(
            `Failed to parse raw_analysis content${
              pageNumber ? ` for page ${pageNumber}` : ""
            }, returning original parsed object`
          );
          return parsed;
        }
      }

      return parsed;
    } catch (parseError) {
      logger.warn(
        `Failed to parse JSON${
          pageNumber ? ` for page ${pageNumber}` : ""
        }, trying additional cleanup`
      );

      try {
        // 더 적극적인 정리 시도
        let aggressive = this.cleanJsonResponse(jsonString);

        // 문자열 끝의 잘린 부분을 찾아서 제거
        const lastValidChar = Math.max(
          aggressive.lastIndexOf("}"),
          aggressive.lastIndexOf("]")
        );

        if (lastValidChar > 0) {
          aggressive = aggressive.substring(0, lastValidChar + 1);
        }

        const parsed = JSON.parse(aggressive);

        // 여기서도 raw_analysis 처리
        if (parsed && typeof parsed === "object" && parsed.raw_analysis) {
          try {
            const rawAnalysis =
              typeof parsed.raw_analysis === "string"
                ? parsed.raw_analysis
                : JSON.stringify(parsed.raw_analysis);

            let unescaped = rawAnalysis
              .replace(/\\"/g, '"')
              .replace(/\\n/g, "\n")
              .replace(/\\t/g, "\t")
              .replace(/\\r/g, "\r")
              .replace(/\\\\/g, "\\");

            const parsedRawAnalysis = JSON.parse(unescaped);
            return parsedRawAnalysis;
          } catch (rawError) {
            return parsed;
          }
        }

        return parsed;
      } catch (secondError) {
        logger.warn(
          `Second JSON parse attempt failed${
            pageNumber ? ` for page ${pageNumber}` : ""
          }, using raw text`
        );
        return { raw_analysis: jsonString };
      }
    }
  }

  async performStep1Analysis(projectId: string): Promise<AnalysisResult[]> {
    try {
      const prompt1 = this.readPromptFile("prompt_1_page_analysis.md");

      // 프로젝트의 모든 페이지 조회 (Raw SQL 사용)
      let { data: pages, error: pagesError } = await supabase.rpc(
        "get_project_pages",
        { project_id_param: projectId }
      );

      // Raw SQL이 없다면 직접 SQL 쿼리 사용
      if (pagesError || !pages) {
        logger.warn("RPC failed, trying direct SQL query");
        const { data: pagesSql, error: sqlError } = await supabase
          .from("project_pages")
          .select("*")
          .eq("project_id", projectId)
          .order("page_number");

        if (sqlError) {
          // 최후 수단: 테이블이 비어있다고 가정하고 빈 배열 반환
          logger.error(`Failed to fetch pages with SQL: ${sqlError.message}`);
          logger.info(
            "Assuming empty project_pages, will create pages during conversion"
          );
          return [];
        }

        if (!pagesSql || pagesSql.length === 0) {
          logger.info(
            "No pages found for project, will be created during PDF conversion"
          );
          return [];
        }

        pages = pagesSql;
      }

      // 이미지 경로가 있는 페이지만 필터링
      const validPages = pages.filter((page: any) => page.image_storage_path);
      if (validPages.length === 0) {
        logger.warn("No pages with image paths found");
        return [];
      }

      logger.info(`Processing ${validPages.length} pages in batches of 30`);

      const results: AnalysisResult[] = [];
      const BATCH_SIZE = 30;
      const DELAY_BETWEEN_BATCHES = 60000; // 1분 = 60초

      // 페이지를 30개씩 청크로 나누기
      for (let i = 0; i < validPages.length; i += BATCH_SIZE) {
        const chunk = validPages.slice(i, i + BATCH_SIZE);
        const chunkNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalChunks = Math.ceil(validPages.length / BATCH_SIZE);

        logger.info(
          `Processing chunk ${chunkNumber}/${totalChunks} (${chunk.length} pages)`
        );

        // 현재 청크의 모든 페이지를 병렬로 처리
        const chunkPromises = chunk.map(async (page: any) => {
          try {
            if (!page.image_storage_path) {
              logger.warn(`No image path for page ${page.page_number}`);
              return null;
            }

            // 이미지를 Base64로 변환
            const imageBase64 = await fileService.getImageAsBase64(
              page.image_storage_path
            );

            // Bedrock API 호출
            const analysisResult = await bedrockService.analyzePageImage(
              imageBase64,
              prompt1
            );

            // JSON 파싱 시도
            const parsedResult = this.parseJsonSafely(
              analysisResult,
              page.page_number
            );

            // 결과를 데이터베이스에 저장
            const { error: updateError } = await supabase
              .from("project_pages")
              .update({ llm_analysis_step_1_json: parsedResult })
              .eq("id", page.id);

            if (updateError) {
              logger.error(
                `Failed to save step 1 result for page ${page.page_number}:`,
                updateError
              );
              return null;
            }

            logger.info(
              `Step 1 analysis completed for page ${page.page_number}`
            );
            return {
              pageNumber: page.page_number,
              step1Result: parsedResult,
            };
          } catch (error) {
            logger.error(
              `Step 1 analysis failed for page ${page.page_number}:`,
              error
            );
            return null;
          }
        });

        // 현재 청크의 모든 작업이 완료될 때까지 대기
        const chunkResults = await Promise.allSettled(chunkPromises);

        // 성공한 결과만 추가
        chunkResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            results.push(result.value);
          }
        });

        logger.info(
          `Chunk ${chunkNumber}/${totalChunks} completed. Processed ${results.length}/${validPages.length} pages so far.`
        );

        // 마지막 청크가 아니라면 1분 대기
        if (i + BATCH_SIZE < validPages.length) {
          logger.info(
            `Waiting ${
              DELAY_BETWEEN_BATCHES / 1000
            } seconds before next batch...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_BATCHES)
          );
        }
      }

      // 프로젝트 상태 업데이트
      await supabase
        .from("projects")
        .update({ status: "processing" })
        .eq("id", projectId);

      logger.info(
        `Step 1 analysis completed for project ${projectId}: ${results.length} pages processed`
      );

      return results;
    } catch (error) {
      logger.error(`Step 1 analysis error for project ${projectId}:`, error);
      throw error;
    }
  }

  async performStep2Analysis(projectId: string): Promise<AnalysisResult[]> {
    try {
      const prompt2 = this.readPromptFile("prompt_2_page_deep_analysis.md");

      // 1단계 분석이 완료된 페이지들 조회
      const { data: pages, error: pagesError } = await supabase
        .from("project_pages")
        .select("*")
        .eq("project_id", projectId)
        .not("llm_analysis_step_1_json", "is", null)
        .order("page_number");

      if (pagesError) {
        throw new Error(`Failed to fetch pages: ${pagesError.message}`);
      }

      if (!pages || pages.length === 0) {
        throw new Error("No pages with step 1 analysis found");
      }

      logger.info(
        `Processing ${pages.length} pages for step 2 analysis in batches of 30`
      );

      const results: AnalysisResult[] = [];
      const BATCH_SIZE = 30;
      const DELAY_BETWEEN_BATCHES = 60000; // 1분 = 60초

      // 페이지를 30개씩 청크로 나누기
      for (let i = 0; i < pages.length; i += BATCH_SIZE) {
        const chunk = pages.slice(i, i + BATCH_SIZE);
        const chunkNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalChunks = Math.ceil(pages.length / BATCH_SIZE);

        logger.info(
          `Processing step 2 chunk ${chunkNumber}/${totalChunks} (${chunk.length} pages)`
        );

        // 현재 청크의 모든 페이지를 병렬로 처리
        const chunkPromises = chunk.map(async (page: any) => {
          try {
            // 1단계 결과를 입력으로 사용
            const step1Data = page.llm_analysis_step_1_json;

            // Bedrock API 호출
            const analysisResult = await bedrockService.analyzeWithPrompt(
              step1Data,
              prompt2
            );

            // JSON 파싱 시도
            const parsedResult = this.parseJsonSafely(
              analysisResult,
              page.page_number
            );

            // 결과를 데이터베이스에 저장
            const { error: updateError } = await supabase
              .from("project_pages")
              .update({ llm_analysis_step_2_json: parsedResult })
              .eq("id", page.id);

            if (updateError) {
              logger.error(
                `Failed to save step 2 result for page ${page.page_number}:`,
                updateError
              );
              return null;
            }

            logger.info(
              `Step 2 analysis completed for page ${page.page_number}`
            );
            return {
              pageNumber: page.page_number,
              step1Result: step1Data,
              step2Result: parsedResult,
            };
          } catch (error) {
            logger.error(
              `Step 2 analysis failed for page ${page.page_number}:`,
              error
            );
            return null;
          }
        });

        // 현재 청크의 모든 작업이 완료될 때까지 대기
        const chunkResults = await Promise.allSettled(chunkPromises);

        // 성공한 결과만 추가
        chunkResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            results.push(result.value);
          }
        });

        logger.info(
          `Step 2 chunk ${chunkNumber}/${totalChunks} completed. Processed ${results.length}/${pages.length} pages so far.`
        );

        // 마지막 청크가 아니라면 1분 대기
        if (i + BATCH_SIZE < pages.length) {
          logger.info(
            `Waiting ${
              DELAY_BETWEEN_BATCHES / 1000
            } seconds before next batch...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_BATCHES)
          );
        }
      }

      // 프로젝트 상태 업데이트
      await supabase
        .from("projects")
        .update({ status: "processing" })
        .eq("id", projectId);

      logger.info(
        `Step 2 analysis completed for project ${projectId}: ${results.length} pages processed`
      );

      return results;
    } catch (error) {
      logger.error(`Step 2 analysis error for project ${projectId}:`, error);
      throw error;
    }
  }

  async performOverallAnalysis(projectId: string): Promise<any> {
    try {
      const prompt3 = this.readPromptFile("prompt_3_overall_analysis.md");

      // 2단계 분석이 완료된 모든 페이지 조회
      const { data: pages, error: pagesError } = await supabase
        .from("project_pages")
        .select("page_number, llm_analysis_step_2_json")
        .eq("project_id", projectId)
        .not("llm_analysis_step_2_json", "is", null)
        .order("page_number");

      if (pagesError) {
        throw new Error(`Failed to fetch pages: ${pagesError.message}`);
      }

      if (!pages || pages.length === 0) {
        throw new Error("No pages with step 2 analysis found");
      }

      // 모든 페이지의 2단계 결과를 하나로 합침
      const combinedData = {
        project_id: projectId,
        total_pages: pages.length,
        page_analyses: pages.map((page) => ({
          page_number: page.page_number,
          analysis: page.llm_analysis_step_2_json,
        })),
      };

      // 전체 분석 수행
      const overallResult = await bedrockService.analyzeWithPrompt(
        combinedData,
        prompt3
      );

      // JSON 파싱 시도
      const parsedResult = this.parseJsonSafely(overallResult);

      // 최종 보고서 테이블에 저장
      const { data: reportData, error: reportError } = await supabase
        .from("final_reports")
        .insert({
          project_id: projectId,
          overall_analysis: parsedResult,
        })
        .select()
        .single();

      if (reportError) {
        throw new Error(
          `Failed to save overall analysis: ${reportError.message}`
        );
      }

      // 프로젝트 상태 업데이트
      await supabase
        .from("projects")
        .update({ status: "processing" })
        .eq("id", projectId);

      logger.info(`Overall analysis completed for project ${projectId}`);

      return parsedResult;
    } catch (error) {
      logger.error(`Overall analysis error for project ${projectId}:`, error);
      throw error;
    }
  }

  async generateMarkdownReport(projectId: string): Promise<string> {
    try {
      const prompt4 = this.readPromptFile("prompt_4_md_conversion.md");

      // 전체 분석 결과 조회
      const { data: report, error: reportError } = await supabase
        .from("final_reports")
        .select("overall_analysis")
        .eq("project_id", projectId)
        .single();

      if (reportError || !report) {
        throw new Error("Overall analysis not found");
      }

      // Markdown 보고서 생성
      const markdownContent = await bedrockService.analyzeWithPrompt(
        report.overall_analysis,
        prompt4
      );

      // Supabase Storage에 Markdown 파일 저장
      const fileName = `report_${projectId}.md`;
      const storagePath = `reports/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ir-files")
        .upload(storagePath, markdownContent, {
          cacheControl: "3600",
          upsert: true,
          contentType: "text/markdown",
        });

      if (uploadError) {
        throw new Error(`Failed to upload markdown: ${uploadError.message}`);
      }

      // 보고서 경로 업데이트
      await supabase
        .from("final_reports")
        .update({ report_storage_path: storagePath })
        .eq("project_id", projectId);

      // 프로젝트 상태 업데이트
      await supabase
        .from("projects")
        .update({ status: "completed", report_url: storagePath })
        .eq("id", projectId);

      logger.info(`Markdown report generated for project ${projectId}`);

      return storagePath;
    } catch (error) {
      logger.error(
        `Markdown generation error for project ${projectId}:`,
        error
      );
      throw error;
    }
  }

  async getProjectStatus(projectId: string): Promise<any> {
    try {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*, final_reports(*)")
        .eq("id", projectId)
        .single();

      if (projectError) {
        throw new Error(`Project not found: ${projectError.message}`);
      }

      const { data: pages, error: pagesError } = await supabase
        .from("project_pages")
        .select(
          "page_number, llm_analysis_step_1_json, llm_analysis_step_2_json"
        )
        .eq("project_id", projectId)
        .order("page_number");

      if (pagesError) {
        throw new Error(`Failed to fetch pages: ${pagesError.message}`);
      }

      return {
        project,
        pages: pages || [],
        step1_completed:
          pages?.filter((p) => p.llm_analysis_step_1_json).length || 0,
        step2_completed:
          pages?.filter((p) => p.llm_analysis_step_2_json).length || 0,
        total_pages: pages?.length || 0,
      };
    } catch (error) {
      logger.error(`Get project status error for project ${projectId}:`, error);
      throw error;
    }
  }

  async updateProjectStatus(
    projectId: string,
    status: "pending" | "processing" | "completed" | "failed",
    errorMessage?: string | null,
    progressPercentage?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        ...(progressPercentage !== undefined && {
          progress_percentage: progressPercentage,
        }),
        ...(errorMessage !== undefined && { error_message: errorMessage }),
        ...(status === "completed" && {
          completed_at: new Date().toISOString(),
        }),
      };

      const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", projectId);

      if (error) {
        throw new Error(`Failed to update project status: ${error.message}`);
      }

      logger.info(`Project ${projectId} status updated to ${status}`);
    } catch (error) {
      logger.error(
        `Update project status error for project ${projectId}:`,
        error
      );
      throw error;
    }
  }

  async clearAnalysisResults(projectId: string): Promise<void> {
    try {
      // 페이지별 분석 결과 초기화
      const { error: pagesError } = await supabase
        .from("project_pages")
        .update({
          llm_analysis_step_1_json: null,
          llm_analysis_step_2_json: null,
        })
        .eq("project_id", projectId);

      if (pagesError) {
        throw new Error(`Failed to clear page analysis: ${pagesError.message}`);
      }

      // analysis_results 테이블은 사용하지 않으므로 제거
      // 분석 결과는 project_pages 테이블에 JSON으로 저장됨

      // final_reports 테이블의 기존 보고서 삭제 (있는 경우)
      const { error: reportsError } = await supabase
        .from("final_reports")
        .delete()
        .eq("project_id", projectId);

      // final_reports 테이블이 없어도 오류로 처리하지 않음
      if (reportsError && !reportsError.message.includes("relation")) {
        logger.warn(`Failed to clear final reports: ${reportsError.message}`);
      }

      logger.info(`Analysis results cleared for project ${projectId}`);
    } catch (error) {
      logger.error(
        `Clear analysis results error for project ${projectId}:`,
        error
      );
      throw error;
    }
  }
}

export const analysisService = new AnalysisService();
