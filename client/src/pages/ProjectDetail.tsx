import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSupabase } from "../contexts/SupabaseContext";
import ReportViewer from "../components/ReportViewer";
import MindMap from "../components/MindMap";
import NodeDetailModal from "../components/NodeDetailModal";

interface Project {
  id: string;
  project_name: string;
  company_name: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  file_url?: string;
  report_url?: string;
  progress_percentage?: number;
  error_message?: string;
  total_pages?: number;
  processed_pages?: number;
}

interface Page {
  id?: string;
  page_number: number;
  llm_analysis_step_1_json: any;
  llm_analysis_step_2_json: any;
  created_at?: string;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { supabase } = useSupabase();

  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "analysis" | "report" | "visualization"
  >("overview");
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageImages, setPageImages] = useState<{ [key: number]: string }>({});
  const [analysisTab, setAnalysisTab] = useState<"step1" | "step2">("step1");
  const [overallAnalysis, setOverallAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 프로젝트 상세 정보 불러오기
  const fetchProject = async (showRefreshIndicator = false) => {
    if (!id) return;

    try {
      if (showRefreshIndicator) setRefreshing(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("인증 세션을 가져올 수 없습니다.");
      }

      console.log("Fetching project with ID:", id);
      console.log("Using server URL:", import.meta.env.VITE_SERVER_URL);
      console.log("User session:", session.user);

      // 디버깅용 - 모든 프로젝트 조회
      try {
        const debugResponse = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/projects/debug/all`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log("All user projects:", debugData);
        }
      } catch (debugError) {
        console.log("Debug API error:", debugError);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/projects/${id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      console.log("API Response status:", response.status);
      console.log("API Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("API Error response:", errorText);

        if (response.status === 404) {
          throw new Error("프로젝트를 찾을 수 없습니다.");
        }

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            errorData.message || "프로젝트 정보를 불러올 수 없습니다."
          );
        } catch (parseError) {
          throw new Error(
            `서버 오류: ${response.status} ${response.statusText}`
          );
        }
      }

      const responseData = await response.json();
      console.log("API Response data:", responseData);

      // 응답 구조 확인
      if (responseData.success && responseData.data) {
        const { project, pages } = responseData.data;
        setProject(project);
        setPages(pages || []);
      } else if (responseData.project) {
        // 레거시 응답 구조 지원
        setProject(responseData.project);
        setPages(responseData.pages || []);
      } else {
        throw new Error("잘못된 응답 형식입니다.");
      }

      setError(null);
    } catch (err) {
      console.error("Fetch project error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "프로젝트 정보를 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
      if (showRefreshIndicator) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchProject();
    }
  }, [user, id]);

  // 보고서 탭 선택 시 자동으로 내용 불러오기
  useEffect(() => {
    if (selectedTab === "report" && project?.report_url && !reportContent) {
      fetchReportContent();
    }
  }, [selectedTab, project?.report_url, reportContent]);

  // 시각화 탭 선택 시 분석 데이터 불러오기
  useEffect(() => {
    if (
      selectedTab === "visualization" &&
      project?.status === "completed" &&
      !overallAnalysis
    ) {
      fetchOverallAnalysis();
    }
  }, [selectedTab, project?.status, overallAnalysis]);

  // 실시간 업데이트 (polling)
  useEffect(() => {
    if (
      !project ||
      project.status === "completed" ||
      project.status === "failed"
    ) {
      return;
    }

    const interval = setInterval(() => {
      fetchProject();
    }, 5000); // 5초마다 업데이트

    return () => clearInterval(interval);
  }, [project?.status]);

  // 상태별 색상 및 텍스트 반환
  const getStatusDisplay = (status: string, progressPercentage?: number) => {
    switch (status) {
      case "pending":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          text: "대기중",
          icon: (
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      case "processing":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          text: `분석중 (${progressPercentage || 0}%)`,
          icon: (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          ),
        };
      case "completed":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          text: "완료",
          icon: (
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          ),
        };
      case "failed":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          text: "실패",
          icon: (
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
          ),
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          text: "알 수 없음",
          icon: null,
        };
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 분석 재시작
  const handleRestartAnalysis = async () => {
    if (!project || !confirm("분석을 다시 시작하시겠습니까?")) {
      return;
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("인증 세션을 가져올 수 없습니다.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/analysis/restart`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ projectId: project.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "분석 재시작에 실패했습니다.");
      }

      // 상태 새로고침
      fetchProject();
    } catch (err) {
      console.error("Restart analysis error:", err);
      alert(
        err instanceof Error
          ? err.message
          : "분석 재시작 중 오류가 발생했습니다."
      );
    }
  };

  // 보고서 내용 불러오기
  const fetchReportContent = async () => {
    if (!project?.id || !project.report_url) return;

    try {
      setReportLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("인증 세션을 가져올 수 없습니다.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/projects/${project.id}/report`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "보고서 내용을 불러올 수 없습니다."
        );
      }

      const { data } = await response.json();
      setReportContent(data.content);
    } catch (err) {
      console.error("Fetch report content error:", err);
      setReportContent(null);
      alert(
        err instanceof Error
          ? err.message
          : "보고서 내용을 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setReportLoading(false);
    }
  };

  // 전체 분석 데이터 불러오기
  const fetchOverallAnalysis = async () => {
    if (!project?.id) return;

    try {
      setAnalysisLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("인증 세션을 가져올 수 없습니다.");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/projects/${
          project.id
        }/analysis`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "분석 데이터를 불러올 수 없습니다."
        );
      }

      const { data } = await response.json();
      if (data.overall_analysis) {
        try {
          const parsedAnalysis =
            typeof data.overall_analysis === "string"
              ? JSON.parse(data.overall_analysis)
              : data.overall_analysis;
          setOverallAnalysis(parsedAnalysis);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          throw new Error("분석 데이터 형식이 올바르지 않습니다.");
        }
      }
    } catch (err) {
      console.error("Fetch overall analysis error:", err);
      setOverallAnalysis(null);
      alert(
        err instanceof Error
          ? err.message
          : "분석 데이터를 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  // 페이지 이미지 불러오기
  const fetchPageImage = async (pageNumber: number) => {
    if (!project?.id || pageImages[pageNumber]) return;

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/projects/${
          project.id
        }/pages/${pageNumber}/image`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setPageImages((prev) => ({ ...prev, [pageNumber]: imageUrl }));
      }
    } catch (err) {
      console.error("Fetch page image error:", err);
    }
  };

  // 페이지 변경 시 이미지 자동 로드
  useEffect(() => {
    if (pages.length > 0 && pages[currentPageIndex]) {
      fetchPageImage(pages[currentPageIndex].page_number);
    }
  }, [currentPageIndex, pages]);

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedTab !== "analysis" || pages.length <= 1) return;

      if (event.key === "ArrowLeft") {
        setCurrentPageIndex((prev) => Math.max(0, prev - 1));
      } else if (event.key === "ArrowRight") {
        setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTab, pages.length]);

  // 마인드맵 노드 클릭 핸들러
  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNode(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.966-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">
            오류가 발생했습니다
          </h3>
          <p className="text-red-600 mb-4">
            {error || "프로젝트를 찾을 수 없습니다."}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(
    project.status,
    project.progress_percentage
  );

  return (
    <div
      className={
        selectedTab === "report" && reportContent
          ? "w-full"
          : "max-w-6xl mx-auto p-6"
      }
    >
      {/* 헤더 - 보고서 탭에서는 숨김 */}
      {
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {project.project_name}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchProject(true)}
                disabled={refreshing}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg
                  className={`w-5 h-5 mr-2 ${refreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                새로고침
              </button>

              {project.status === "failed" && (
                <button
                  onClick={handleRestartAnalysis}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  분석 재시작
                </button>
              )}
            </div>
          </div>

          {/* 상태 정보 */}
          <div
            className={`inline-flex items-center px-4 py-2 rounded-lg border ${statusDisplay.color}`}
          >
            {statusDisplay.icon}
            <span className="ml-2 font-medium">{statusDisplay.text}</span>
          </div>
        </div>
      }

      {/* 탭 네비게이션 - 보고서 탭에서는 숨김 */}
      {
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              {
                key: "overview",
                label: "개요",
                icon: (
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                ),
              },
              {
                key: "analysis",
                label: "분석 결과",
                icon: (
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                ),
              },
              {
                key: "report",
                label: "보고서",
                icon: (
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                ),
              },
              {
                key: "visualization",
                label: "분석 시각화",
                icon: (
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
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                    />
                  </svg>
                ),
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      }

      {/* 탭 컨텐츠 */}
      {selectedTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 프로젝트 정보 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                프로젝트 정보
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">회사명</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {project.company_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    생성일시
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(project.created_at)}
                  </dd>
                </div>
                {project.completed_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      완료일시
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(project.completed_at)}
                    </dd>
                  </div>
                )}
                {project.total_pages && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      총 페이지 수
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {project.total_pages}페이지
                    </dd>
                  </div>
                )}
                {project.error_message && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      오류 메시지
                    </dt>
                    <dd className="mt-1 text-sm text-red-600">
                      {project.error_message}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* 진행 상태 */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                진행 상태
              </h3>

              {project.status === "processing" && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>분석 진행률</span>
                    <span>{project.progress_percentage || 0}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${project.progress_percentage || 0}%` }}
                    ></div>
                  </div>

                  {project.processed_pages && project.total_pages && (
                    <p className="text-sm text-gray-600 mt-2">
                      {project.processed_pages} / {project.total_pages} 페이지
                      처리 완료
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">PDF 업로드</span>
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">이미지 변환</span>
                  {project.status !== "pending" ? (
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">AI 분석</span>
                  {project.status === "completed" ? (
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : project.status === "processing" ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  ) : project.status === "failed" ? (
                    <svg
                      className="w-5 h-5 text-red-500"
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
                  ) : (
                    <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">보고서 생성</span>
                  {project.report_url ? (
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === "analysis" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">분석 결과</h3>
              {pages.length > 0 && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {currentPageIndex + 1} / {pages.length} 페이지
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setCurrentPageIndex(Math.max(0, currentPageIndex - 1))
                      }
                      disabled={currentPageIndex === 0}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPageIndex(
                          Math.min(pages.length - 1, currentPageIndex + 1)
                        )
                      }
                      disabled={currentPageIndex === pages.length - 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {pages.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h4 className="mt-2 text-sm font-medium text-gray-900">
                  분석 결과가 없습니다
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  {project.status === "processing"
                    ? "분석이 진행 중입니다..."
                    : "분석이 완료되면 결과가 표시됩니다."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 페이지 이미지 - 전체 너비 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    페이지 {pages[currentPageIndex].page_number} 이미지
                  </h4>
                  <div className="flex items-center justify-center bg-gray-50 rounded-lg min-h-[500px]">
                    {pageImages[pages[currentPageIndex].page_number] ? (
                      <img
                        src={pageImages[pages[currentPageIndex].page_number]}
                        alt={`페이지 ${pages[currentPageIndex].page_number}`}
                        className="max-w-full max-h-[500px] object-contain rounded"
                      />
                    ) : (
                      <div className="text-center py-8">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <button
                          onClick={() =>
                            fetchPageImage(pages[currentPageIndex].page_number)
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          이미지 불러오기
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 분석 결과 탭 */}
                <div className="border border-gray-200 rounded-lg">
                  {/* 탭 헤더 */}
                  <div className="border-b border-gray-200">
                    <nav className="flex">
                      <button
                        onClick={() => setAnalysisTab("step1")}
                        className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${
                          analysisTab === "step1"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        1단계 분석 (페이지 분석)
                      </button>
                      <button
                        onClick={() => setAnalysisTab("step2")}
                        className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${
                          analysisTab === "step2"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        2단계 분석 (심화 분석)
                      </button>
                    </nav>
                  </div>

                  {/* 탭 컨텐츠 */}
                  <div className="p-6">
                    {analysisTab === "step1" &&
                      pages[currentPageIndex].llm_analysis_step_1_json && (
                        <AnalysisStep1Display
                          data={
                            pages[currentPageIndex].llm_analysis_step_1_json
                          }
                        />
                      )}

                    {analysisTab === "step2" &&
                      pages[currentPageIndex].llm_analysis_step_2_json && (
                        <AnalysisStep2Display
                          data={
                            pages[currentPageIndex].llm_analysis_step_2_json
                          }
                        />
                      )}

                    {analysisTab === "step1" &&
                      !pages[currentPageIndex].llm_analysis_step_1_json && (
                        <div className="text-center py-8">
                          <p className="text-sm text-gray-500">
                            1단계 분석 결과가 없습니다.
                          </p>
                        </div>
                      )}

                    {analysisTab === "step2" &&
                      !pages[currentPageIndex].llm_analysis_step_2_json && (
                        <div className="text-center py-8">
                          <p className="text-sm text-gray-500">
                            2단계 분석 결과가 없습니다.
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* 페이지 인디케이터 */}
            {pages.length > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex space-x-2">
                  {pages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPageIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentPageIndex
                          ? "bg-blue-600"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === "report" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">분석 보고서</h3>
            {project.report_url && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchReportContent}
                  disabled={reportLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {reportLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  ) : (
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  )}
                  보고서 새로고침
                </button>
                <a
                  href={project.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  다운로드
                </a>
              </div>
            )}
          </div>

          {project.report_url ? (
            <div className="w-full">
              {reportContent ? (
                <div className="w-full overflow-hidden">
                  <ReportViewer content={reportContent} fullScreen={true} />
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-blue-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    보고서 내용 보기
                  </h4>
                  <p className="text-gray-600 mb-4">
                    "보고서 새로고침" 버튼을 클릭하여 보고서 내용을 확인하세요.
                  </p>
                  <button
                    onClick={fetchReportContent}
                    disabled={reportLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {reportLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                    보고서 내용 보기
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h4 className="mt-2 text-sm font-medium text-gray-900">
                보고서 준비 중
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                {project.status === "processing"
                  ? "분석이 완료되면 보고서가 자동으로 생성됩니다."
                  : project.status === "failed"
                  ? "분석이 실패하여 보고서를 생성할 수 없습니다."
                  : "분석을 시작하여 보고서를 생성하세요."}
              </p>
            </div>
          )}
        </div>
      )}

      {selectedTab === "visualization" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">분석 시각화</h3>
            {project.status === "completed" && !overallAnalysis && (
              <button
                onClick={fetchOverallAnalysis}
                disabled={analysisLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {analysisLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                ) : (
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                분석 데이터 불러오기
              </button>
            )}
          </div>

          {project.status !== "completed" ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                분석 진행 중
              </h4>
              <p className="text-gray-600">
                분석이 완료되면 시각화가 제공됩니다.
              </p>
            </div>
          ) : overallAnalysis ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-blue-800">
                    <strong>사용법:</strong> 마인드맵의 노드를 클릭하면 상세
                    내용을 확인할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <MindMap data={overallAnalysis} onNodeClick={handleNodeClick} />
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                분석 데이터 없음
              </h4>
              <p className="text-gray-600 mb-4">
                분석 데이터를 불러와서 시각화를 확인하세요.
              </p>
              <button
                onClick={fetchOverallAnalysis}
                disabled={analysisLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {analysisLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                분석 데이터 불러오기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 노드 상세 정보 모달 */}
      <NodeDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        nodeData={selectedNode}
      />
    </div>
  );
};

// 1단계 분석 결과 시각화 컴포넌트
const AnalysisStep1Display = ({ data }: { data: any }) => {
  const [expandedEvaluation, setExpandedEvaluation] = useState<number | null>(
    null
  );

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return (
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-blue-50 p-4 rounded">
            {data}
          </pre>
        </div>
      );
    }
  }

  const evaluationReport = data?.evaluation_report;
  if (!evaluationReport) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          분석 데이터를 표시할 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 슬라이드 기본 정보 */}
      {evaluationReport.slide && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            슬라이드 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold text-blue-800">제목</h4>
              <p className="text-gray-700 mt-1">
                {evaluationReport.slide.title}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-blue-800">카테고리</h4>
              <span className="inline-block bg-gray-200 text-blue-800 px-2 py-1 rounded text-sm mt-1">
                {evaluationReport.slide.category}
              </span>
            </div>
            <div className="md:col-span-2">
              <h4 className="font-bold text-blue-800">키워드</h4>
              <p className="text-gray-700 mt-1">
                {evaluationReport.slide.keywords}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 키포인트 */}
      {evaluationReport.slide?.keypoints && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            핵심 포인트
          </h3>
          <div className="space-y-3">
            {evaluationReport.slide.keypoints.map(
              (point: any, index: number) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded p-3"
                >
                  <h4 className="font-medium text-gray-800 mb-2">
                    {point.section}
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {point.details.map(
                      (detail: string, detailIndex: number) => (
                        <li key={detailIndex} className="text-gray-600 text-sm">
                          {detail}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* 요약 */}
      {evaluationReport.summary && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          {/* 강점 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              강점
            </h3>
            <ul className="space-y-2">
              {evaluationReport.summary.strengths.map(
                (strength: string, index: number) => (
                  <li key={index} className="text-green-700 text-sm">
                    <span className="font-medium">•</span> {strength}
                    {/* {strength.length > 100 && "..."} */}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* 약점 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              약점
            </h3>
            <ul className="space-y-2">
              {evaluationReport.summary.weaknesses.map(
                (weakness: string, index: number) => (
                  <li key={index} className="text-red-700 text-sm">
                    <span className="font-medium">•</span> {weakness}
                    {/* {weakness.length > 100 && "..."} */}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* 개선사항 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              개선사항
            </h3>
            <ul className="space-y-2">
              {evaluationReport.summary.improvements.map(
                (improvement: string, index: number) => (
                  <li key={index} className="text-yellow-700 text-sm">
                    <span className="font-medium">•</span> {improvement}
                    {/* {improvement.length > 100 && "..."} */}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      )}

      {/* 평가 항목들 */}
      {evaluationReport.evaluations && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            세부 평가
          </h3>
          <div className="space-y-3">
            {evaluationReport.evaluations.map(
              (evaluation: any, index: number) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg"
                >
                  <button
                    onClick={() =>
                      setExpandedEvaluation(
                        expandedEvaluation === index ? null : index
                      )
                    }
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-blue-600">
                          {evaluation.score}
                        </span>
                        <span className="text-gray-500 text-sm">/10</span>
                      </div>
                      <h4 className="font-medium text-gray-900">
                        {evaluation.category}
                      </h4>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transform transition-transform ${
                        expandedEvaluation === index ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {expandedEvaluation === index && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="mt-3 space-y-3">
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">
                            평가 내용
                          </h5>
                          <ul className="space-y-1">
                            {evaluation.content.map(
                              (item: string, itemIndex: number) => (
                                <li
                                  key={itemIndex}
                                  className="text-gray-600 text-sm flex"
                                >
                                  <span className="text-blue-500 mr-2">✓</span>
                                  <span>{item}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        {evaluation.suggestions && (
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">
                              개선 제안
                            </h5>
                            <ul className="space-y-1">
                              {evaluation.suggestions.map(
                                (
                                  suggestion: string,
                                  suggestionIndex: number
                                ) => (
                                  <li
                                    key={suggestionIndex}
                                    className="text-gray-600 text-sm flex"
                                  >
                                    <span className="text-yellow-500 mr-2">
                                      →
                                    </span>
                                    <span>{suggestion}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* 총점 및 최종 코멘트 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-blue-900">최종 평가</h3>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {evaluationReport.total_score}
            </div>
            <div className="text-blue-500 text-sm">총점</div>
          </div>
        </div>

        {evaluationReport.final_comment && (
          <div className="bg-white border border-blue-200 rounded p-4">
            <h4 className="font-medium text-blue-800 mb-2">최종 코멘트</h4>
            <p className="text-blue-700 text-sm leading-relaxed">
              {evaluationReport.final_comment}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// 2단계 분석 결과 시각화 컴포넌트
const AnalysisStep2Display = ({ data }: { data: any }) => {
  const [expandedSlide, setExpandedSlide] = useState<string | null>(null);
  const [expandedActionPlan, setExpandedActionPlan] = useState<string | null>(
    null
  );

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return (
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-green-50 p-4 rounded">
            {data}
          </pre>
        </div>
      );
    }
  }

  const slides = data?.slides;
  if (!slides || !Array.isArray(slides)) {
    return (
      <div className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-green-50 p-4 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 개요 섹션 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">2</span>
          </div>
          <h3 className="text-lg font-bold text-green-800">2단계 심층 분석</h3>
        </div>
        <p className="text-green-700 text-sm mb-4">
          투자자 관점에서 각 슬라이드의 설득력을 평가하고 구체적인 개선안을
          제시합니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded border">
            <div className="text-xs text-gray-600 mb-1">분석된 슬라이드</div>
            <div className="text-lg font-bold text-green-600">
              {slides.length}개
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-xs text-gray-600 mb-1">평가 기준</div>
            <div className="text-lg font-bold text-green-600">4가지</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-xs text-gray-600 mb-1">개선안 유형</div>
            <div className="text-lg font-bold text-green-600">3가지</div>
          </div>
        </div>
      </div>

      {/* 슬라이드별 분석 */}
      <div className="space-y-4">
        {slides.map((slide: any, index: number) => {
          const isExpanded = expandedSlide === slide.slideno;
          const investorReview = slide.investorPerspectiveReview;
          const totalScore =
            investorReview?.currentAssessment?.totalScore || "0/10점";
          const impactLevel =
            slide.investorPerspectiveReview?.investmentDecisionImpact?.level ||
            "Medium";

          return (
            <div
              key={slide.slideno || index}
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              {/* 슬라이드 헤더 */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedSlide(isExpanded ? null : slide.slideno)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-bold text-sm">
                        {slide.slideno?.replace(/\D/g, "") || index + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {slide.slideTitle}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">
                          평가 점수:{" "}
                          <span className="font-medium text-green-600">
                            {totalScore}
                          </span>
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            impactLevel === "High"
                              ? "bg-red-100 text-red-700"
                              : impactLevel === "Medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {impactLevel === "High"
                            ? "높은 영향"
                            : impactLevel === "Medium"
                            ? "중간 영향"
                            : "낮은 영향"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg
                      className={`w-5 h-5 transform transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 슬라이드 세부 내용 */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                    {/* 투자자 관점 리뷰 */}
                    <div className="space-y-4">
                      <h5 className="font-semibold text-gray-900 flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        투자자 관점 리뷰
                      </h5>

                      {/* 주요 관심사 */}
                      {investorReview?.investorMainConcerns && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <div className="text-sm font-medium text-blue-800 mb-2">
                            투자자 주요 관심사
                          </div>
                          <div className="text-sm text-blue-700">
                            {investorReview.investorMainConcerns}
                          </div>
                        </div>
                      )}

                      {/* 평가 기준별 점수 */}
                      {investorReview?.currentAssessment?.criteria && (
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-sm font-medium text-gray-800 mb-3">
                            세부 평가
                          </div>
                          <div className="space-y-2">
                            {Object.entries(
                              investorReview.currentAssessment.criteria
                            ).map(([key, criterion]: [string, any]) => (
                              <div
                                key={key}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-700">
                                  {key === "contentCompleteness"
                                    ? "콘텐츠 완성도"
                                    : key === "investorPersuasiveness"
                                    ? "투자자 설득력"
                                    : key === "dataReliability"
                                    ? "데이터 신뢰성"
                                    : key === "visualEffectiveness"
                                    ? "시각적 효과성"
                                    : key}
                                </span>
                                <span className="font-medium text-green-600">
                                  {criterion.score}/3점
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 강점과 약점 */}
                      <div className="grid grid-cols-1 gap-3">
                        {investorReview?.currentAssessment?.strengths && (
                          <div className="bg-green-50 p-3 rounded border border-green-200">
                            <div className="text-sm font-medium text-green-800 mb-2">
                              강점
                            </div>
                            <ul className="text-sm text-green-700 space-y-1">
                              {investorReview.currentAssessment.strengths.map(
                                (strength: string, idx: number) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-green-500 mr-1">
                                      •
                                    </span>
                                    {strength}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                        {investorReview?.currentAssessment?.weaknesses && (
                          <div className="bg-red-50 p-3 rounded border border-red-200">
                            <div className="text-sm font-medium text-red-800 mb-2">
                              약점
                            </div>
                            <ul className="text-sm text-red-700 space-y-1">
                              {investorReview.currentAssessment.weaknesses.map(
                                (weakness: string, idx: number) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-red-500 mr-1">•</span>
                                    {weakness}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* 핵심 질문들 */}
                      {investorReview?.coreQuestions && (
                        <div className="bg-purple-50 p-3 rounded border border-purple-200">
                          <div className="text-sm font-medium text-purple-800 mb-2">
                            투자자 핵심 질문
                          </div>
                          <div className="space-y-2">
                            {investorReview.coreQuestions.map(
                              (q: any, idx: number) => (
                                <div key={idx} className="text-sm">
                                  <div className="text-purple-700 font-medium">
                                    Q{idx + 1}: {q.question}
                                  </div>
                                  <div className="text-purple-600 text-xs mt-1 ml-4">
                                    {q.intent}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 실행 계획 */}
                    <div className="space-y-4">
                      <h5 className="font-semibold text-gray-900 flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 text-orange-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        실행 계획
                      </h5>

                      {slide.ActionPlan &&
                        slide.ActionPlan.map((plan: any, planIdx: number) => {
                          const planKey = `${slide.slideno}-${planIdx}`;
                          const isActionExpanded =
                            expandedActionPlan === planKey;

                          return (
                            <div
                              key={planIdx}
                              className="bg-orange-50 border border-orange-200 rounded"
                            >
                              <div
                                className="p-3 cursor-pointer hover:bg-orange-100 transition-colors"
                                onClick={() =>
                                  setExpandedActionPlan(
                                    isActionExpanded ? null : planKey
                                  )
                                }
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-orange-800">
                                    {plan.title}
                                  </div>
                                  <svg
                                    className={`w-4 h-4 transform transition-transform text-orange-600 ${
                                      isActionExpanded ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </div>
                              </div>

                              {isActionExpanded && (
                                <div className="px-3 pb-3 border-t border-orange-200">
                                  <div className="text-sm text-orange-700 mb-3">
                                    {plan.problemExplanation}
                                  </div>

                                  {plan.currentText && (
                                    <div className="mb-3">
                                      <div className="text-xs font-medium text-gray-600 mb-1">
                                        현재 내용
                                      </div>
                                      <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded italic">
                                        "{plan.currentText}"
                                      </div>
                                    </div>
                                  )}

                                  {plan.improvedText && (
                                    <div className="mb-3">
                                      <div className="text-xs font-medium text-green-600 mb-1">
                                        개선된 내용
                                      </div>
                                      <div className="text-sm text-green-700 bg-green-100 p-2 rounded">
                                        "{plan.improvedText}"
                                      </div>
                                    </div>
                                  )}

                                  {plan.actionItems && (
                                    <div className="space-y-2">
                                      {plan.actionItems.map(
                                        (action: any, actionIdx: number) => (
                                          <div
                                            key={actionIdx}
                                            className="bg-white p-2 rounded border"
                                          >
                                            <div
                                              className={`text-xs font-medium mb-1 ${
                                                action.type === "data"
                                                  ? "text-blue-600"
                                                  : action.type === "visual"
                                                  ? "text-purple-600"
                                                  : "text-indigo-600"
                                              }`}
                                            >
                                              {action.type === "data"
                                                ? "📊 데이터 개선"
                                                : action.type === "visual"
                                                ? "🎨 시각적 개선"
                                                : "📐 레이아웃 개선"}
                                            </div>

                                            {action.content && (
                                              <div className="space-y-1 text-xs">
                                                {action.content.rationale && (
                                                  <div>
                                                    <span className="font-medium">
                                                      이유:{" "}
                                                    </span>
                                                    <span className="text-gray-700">
                                                      {action.content.rationale.join(
                                                        " / "
                                                      )}
                                                    </span>
                                                  </div>
                                                )}
                                                {action.content.suggestion && (
                                                  <div>
                                                    <span className="font-medium">
                                                      제안:{" "}
                                                    </span>
                                                    <span className="text-gray-700">
                                                      {action.content.suggestion.join(
                                                        " / "
                                                      )}
                                                    </span>
                                                  </div>
                                                )}
                                                {action.content.gains && (
                                                  <div>
                                                    <span className="font-medium text-green-600">
                                                      효과:{" "}
                                                    </span>
                                                    <span className="text-green-700">
                                                      {action.content.gains.join(
                                                        " / "
                                                      )}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                      {/* 기대 효과 */}
                      {slide.ExpectedOutcome && (
                        <div className="bg-green-50 p-3 rounded border border-green-200">
                          <div className="text-sm font-medium text-green-800 mb-2">
                            기대 효과
                          </div>

                          {slide.ExpectedOutcome.expectedEffects && (
                            <div className="space-y-2 text-sm text-green-700">
                              {Object.entries(
                                slide.ExpectedOutcome.expectedEffects
                              ).map(([key, value]: [string, any]) => (
                                <div key={key}>
                                  <span className="font-medium">
                                    {key === "investorPersuasiveness"
                                      ? "설득력 향상: "
                                      : key === "comprehensionImprovement"
                                      ? "이해도 개선: "
                                      : key === "riskReduction"
                                      ? "리스크 감소: "
                                      : key === "decisionMakingSpeed"
                                      ? "의사결정 속도: "
                                      : `${key}: `}
                                  </span>
                                  <span>{value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {slide.ExpectedOutcome.finalCheck && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <div className="text-xs font-medium text-green-800 mb-1">
                                최종 점검
                              </div>
                              <div className="text-sm text-green-700">
                                {slide.ExpectedOutcome.finalCheck}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectDetail;
