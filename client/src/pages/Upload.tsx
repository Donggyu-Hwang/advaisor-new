import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSupabase } from "../contexts/SupabaseContext";

interface UploadProgress {
  percentage: number;
  stage: "uploading" | "processing" | "analyzing" | "completed" | "error";
  message: string;
}

const Upload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    percentage: 0,
    stage: "uploading",
    message: "",
  });
  const [error, setError] = useState<string | null>(null);

  // 파일 유효성 검사
  const validateFile = (file: File): string | null => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ["application/pdf"];

    if (!allowedTypes.includes(file.type)) {
      return "PDF 파일만 업로드 가능합니다.";
    }

    if (file.size > maxSize) {
      return "파일 크기는 50MB 이하여야 합니다.";
    }

    return null;
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  };

  // 파일 업로드 및 분석 시작
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !projectName.trim() || !companyName.trim()) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. 파일 업로드 단계
      setUploadProgress({
        percentage: 10,
        stage: "uploading",
        message: "IR 자료를 업로드하고 있습니다...",
      });

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectName", projectName.trim());
      formData.append("companyName", companyName.trim());

      // JWT 토큰 가져오기
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("인증 세션을 가져올 수 없습니다.");
      }

      // 서버로 업로드 요청 (인증된 PDF 업로드)
      const uploadResponse = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/upload/pdf`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || "업로드에 실패했습니다.");
      }

      const uploadData = await uploadResponse.json();
      const project = uploadData.data;

      console.log("Upload response:", uploadData);
      console.log("Project data:", project);

      if (!project || !project.projectId) {
        throw new Error("프로젝트 ID를 받을 수 없습니다.");
      }

      setUploadProgress({
        percentage: 30,
        stage: "processing",
        message: "PDF를 이미지로 변환하고 있습니다...",
      });

      // 2. PDF를 이미지로 변환
      const convertResponse = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/upload/convert/${
          project.projectId
        }`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!convertResponse.ok) {
        const errorData = await convertResponse.json();
        throw new Error(errorData.message || "PDF 변환에 실패했습니다.");
      }

      const convertData = await convertResponse.json();
      console.log("Convert response:", convertData);

      // 3. 분석 시작
      setUploadProgress({
        percentage: 70,
        stage: "analyzing",
        message: "AI가 IR 자료를 분석하고 있습니다...",
      });

      const analysisResponse = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/analysis/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ projectId: project.projectId }),
        }
      );

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        throw new Error(errorData.message || "분석 시작에 실패했습니다.");
      }

      setUploadProgress({
        percentage: 100,
        stage: "completed",
        message:
          "분석이 시작되었습니다. 잠시 후 대시보드에서 진행상황을 확인하세요.",
      });

      // 3초 후 프로젝트 상세 페이지로 이동
      setTimeout(() => {
        navigate(`/project/${project.projectId}`);
      }, 3000);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다."
      );
      setUploadProgress({
        percentage: 0,
        stage: "error",
        message: "업로드에 실패했습니다.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 파일 제거
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          IR 자료 업로드
        </h1>
        <p className="text-gray-600 mb-8">
          PDF 형태의 IR 자료를 업로드하여 AI 기반 분석 보고서를 생성하세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 프로젝트 정보 입력 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                회사명 *
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="분석할 회사명을 입력하세요"
                required
              />
            </div>

            <div>
              <label
                htmlFor="projectName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                프로젝트명 *
              </label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="프로젝트명을 입력하세요"
                required
              />
            </div>
          </div>

          {/* 파일 업로드 영역 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IR 자료 (PDF) *
            </label>

            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  PDF 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요
                </p>
                <p className="text-sm text-gray-500">
                  최대 50MB, PDF 형식만 지원
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 업로드 진행상황 */}
          {isUploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    {uploadProgress.message}
                  </p>
                  <div className="mt-2 bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isUploading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={
                !selectedFile ||
                !projectName.trim() ||
                !companyName.trim() ||
                isUploading
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? "업로드 중..." : "분석 시작"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Upload;
