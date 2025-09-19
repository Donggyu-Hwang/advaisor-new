import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReportViewerProps {
  content: string;
  fullScreen?: boolean;
}

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

const ReportViewer: React.FC<ReportViewerProps> = ({
  content,
  fullScreen = false,
}) => {
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>(
    []
  );
  const [activeSection, setActiveSection] = useState<string>("");
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    // 목차 생성
    const generateTableOfContents = (text: string): TableOfContentsItem[] => {
      const lines = text.split("\n");
      const toc: TableOfContentsItem[] = [];

      lines.forEach((line, index) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const title = match[2].trim();
          const id = `heading-${index}`;
          toc.push({ id, title, level });
        }
      });

      return toc;
    };

    if (content) {
      const toc = generateTableOfContents(content);
      console.log("Generated TOC:", toc); // 디버깅용
      setTableOfContents(toc);

      if (toc.length > 0) {
        setActiveSection(toc[0].id);
      }
    }
  }, [content]);

  useEffect(() => {
    const handleScroll = () => {
      // 읽기 진행도 계산
      const scrollTop = window.pageYOffset;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = Math.min((scrollTop / docHeight) * 100, 100);
      setReadingProgress(scrolled);

      // 현재 보이는 섹션 찾기
      if (tableOfContents.length > 0) {
        const headings = tableOfContents
          .map((item) => {
            const element = document.getElementById(item.id);
            return {
              id: item.id,
              offsetTop: element ? element.offsetTop : 0,
            };
          })
          .filter((item) => item.offsetTop > 0);

        // 현재 스크롤 위치에서 가장 가까운 헤딩 찾기
        const current = headings.find((heading, index) => {
          const nextHeading = headings[index + 1];
          return (
            scrollTop >= heading.offsetTop - 200 &&
            (!nextHeading || scrollTop < nextHeading.offsetTop - 200)
          );
        });

        if (current && current.id !== activeSection) {
          setActiveSection(current.id);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 초기 실행

    return () => window.removeEventListener("scroll", handleScroll);
  }, [tableOfContents, activeSection]);

  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(headingId);
    }
  };

  const getSectionIcon = (title: string) => {
    if (title.includes("핵심 투자 논리") || title.includes("투자의 심장"))
      return "🎯";
    if (title.includes("비즈니스 스토리") || title.includes("스토리 재창조"))
      return "📚";
    if (title.includes("콘텐츠 효율화") || title.includes("핵심 강화"))
      return "⚡";
    if (title.includes("논리적 흐름") || title.includes("3-way 흐름"))
      return "🔄";
    if (title.includes("핵심 요소") || title.includes("A-라운드")) return "✅";
    if (title.includes("전략 브리핑") || title.includes("투자자 공략"))
      return "🎯";
    if (title.includes("실행 로드맵") || title.includes("단계별")) return "�️";
    if (title.includes("차별화") || title.includes("경쟁 우위")) return "🏆";
    if (title.includes("시장") || title.includes("Market")) return "�";
    if (title.includes("데이터") || title.includes("지표")) return "📊";
    if (title.includes("팀") || title.includes("인력")) return "👥";
    if (title.includes("재무") || title.includes("수익")) return "�";
    return "📄";
  };

  const customRenderers = {
    heading: ({ level, children, ...props }: any) => {
      // children에서 텍스트 추출
      const text = Array.isArray(children)
        ? children
            .map((child) => (typeof child === "string" ? child : ""))
            .join("")
            .trim()
        : typeof children === "string"
        ? children.trim()
        : "";

      // 목차에서 해당 제목에 맞는 ID 찾기
      const tocItem = tableOfContents.find((item) => item.title === text);
      const id = tocItem
        ? tocItem.id
        : `heading-${Math.random().toString(36).substr(2, 9)}`;

      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
      const classes = {
        1: "text-3xl font-bold text-gray-900 mb-6 border-b-2 border-blue-500 pb-3",
        2: "text-2xl font-semibold text-gray-800 mb-4 mt-8",
        3: "text-xl font-semibold text-gray-700 mb-3 mt-6",
        4: "text-lg font-medium text-gray-600 mb-2 mt-4",
        5: "text-base font-medium text-gray-600 mb-2 mt-3",
        6: "text-sm font-medium text-gray-600 mb-2 mt-3",
      };

      return React.createElement(
        HeadingTag,
        {
          id,
          className: classes[level as keyof typeof classes] || classes[6],
          ...props,
        },
        children
      );
    },
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-6 shadow-sm rounded-lg">
        <table className="min-w-full bg-white border border-gray-200">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
        {children}
      </thead>
    ),
    th: ({ children }: any) => (
      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-6 py-4 text-sm text-gray-800 border-b border-gray-100 leading-relaxed">
        {children}
      </td>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-6 py-4 my-6 bg-gradient-to-r from-blue-50 to-transparent rounded-r-lg">
        <div className="text-blue-900 font-medium italic">{children}</div>
      </blockquote>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside space-y-2 my-4 ml-4">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside space-y-2 my-4 ml-4">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-gray-700 leading-relaxed">{children}</li>
    ),
    p: ({ children }: any) => (
      <p className="text-gray-700 leading-relaxed mb-4 text-justify">
        {children}
      </p>
    ),
    code: ({ children, className }: any) => {
      const isCodeBlock = className?.includes("language-");

      if (isCodeBlock) {
        return (
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto my-4 shadow-inner">
            <code className="text-sm font-mono">{children}</code>
          </pre>
        );
      }

      return (
        <code className="bg-red-50 text-red-700 px-2 py-1 rounded font-mono text-sm border">
          {children}
        </code>
      );
    },
    strong: ({ children }: any) => (
      <strong className="font-bold text-gray-900">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-blue-700">{children}</em>
    ),
  };

  return (
    <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl overflow-hidden">
      {/* 읽기 진행도 바 */}
      <div
        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-50 transition-all duration-300 shadow-sm"
        style={{ width: `${readingProgress}%` }}
      />

      <div className="flex relative">
        {/* 사이드바 네비게이션 */}
        <div className="w-80 bg-white shadow-lg border-r border-gray-200 max-h-screen sticky top-0 overflow-y-auto">
          <div className="p-6">
            {/* 헤더 */}
            <div className="flex items-center mb-8 mt-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">📊</span>
              </div>
              <div className="ml-3">
                <h2 className="text-xl font-bold text-gray-900">분석 보고서</h2>
                <p className="text-sm text-gray-500">IR 슬라이드 전문 분석</p>
              </div>
            </div>

            {/* 목차 */}
            <nav className="space-y-1">
              {tableOfContents.length > 0 ? (
                tableOfContents.map((item, index) => (
                  <button
                    key={`${item.id}-${index}`}
                    onClick={() => scrollToHeading(item.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 group ${
                      activeSection === item.id
                        ? "bg-blue-50 border-l-4 border-blue-500 text-blue-700"
                        : "text-gray-700 hover:text-gray-900"
                    }`}
                    style={{ paddingLeft: `${item.level * 12 + 12}px` }}
                  >
                    <div className="flex items-center">
                      <span className="mr-3 text-lg group-hover:scale-110 transition-transform">
                        {getSectionIcon(item.title)}
                      </span>
                      <span
                        className={`text-sm font-medium leading-tight ${
                          item.level === 1 ? "font-bold" : ""
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-2xl mb-2 block">📄</span>
                  <p className="text-sm">목차를 생성하는 중...</p>
                </div>
              )}
            </nav>

            {/* 통계 정보 */}
            <div className="mt-8 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                📈 보고서 정보
              </h3>
              <div className="space-y-3 text-xs text-gray-600">
                <div className="flex justify-between items-center">
                  <span>총 섹션:</span>
                  <span className="font-bold text-blue-600">
                    {tableOfContents.length}개
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>읽기 진행도:</span>
                  <span className="font-bold text-green-600">
                    {Math.round(readingProgress)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>예상 읽기 시간:</span>
                  <span className="font-bold text-purple-600">25분</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${readingProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 min-h-screen">
          <div className="p-8">
            {/* 헤더 */}
            <div className="mb-10">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2">
                      슬라이드 횡단분석 총평
                    </h1>
                    <p className="text-blue-100 text-xl">
                      TASCOM IR 슬라이드 전문 분석 보고서
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm text-blue-100 mt-6">
                  <div className="flex items-center">
                    <span className="mr-2">📅</span>
                    <span>{new Date().toLocaleDateString("ko-KR")}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">📄</span>
                    <span>{tableOfContents.length} 섹션</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">⏱️</span>
                    <span>25분 소요</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">🎯</span>
                    <span>A-라운드 대응</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 마크다운 콘텐츠 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={customRenderers}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>

            {/* 푸터 */}
            <div className="mt-12 p-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎉</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  보고서 읽기 완료!
                </h3>
                <p className="text-gray-600 mb-6 text-lg">
                  이 분석 내용을 바탕으로 IR 자료를 개선하여 성공적인 투자
                  유치를 이루어보세요.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() =>
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium"
                  >
                    ⬆️ 처음으로 돌아가기
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                  >
                    🖨️ 보고서 인쇄
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;
