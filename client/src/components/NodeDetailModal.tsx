import React from "react";

interface NodeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: {
    id: string;
    label: string;
    value: any;
  } | null;
}

const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  isOpen,
  onClose,
  nodeData,
}) => {
  if (!isOpen || !nodeData) return null;

  // 값을 보기 좋게 포맷팅
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return value
          .map((item, index) => `${index + 1}. ${formatValue(item)}`)
          .join("\n");
      }
      return JSON.stringify(value, null, 2);
    }

    if (typeof value === "string" && value.length > 100) {
      return value;
    }

    return String(value);
  };

  // 키를 보기 좋게 포맷팅 (camelCase -> Title Case)
  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/_/g, " ");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] w-full mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {formatKey(nodeData.label)}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">경로</h3>
              <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded">
                {nodeData.id}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">내용</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {typeof nodeData.value === "object" &&
                nodeData.value !== null ? (
                  <div className="space-y-3">
                    {Object.entries(nodeData.value).map(([key, value]) => (
                      <div
                        key={key}
                        className="border-b border-gray-200 pb-3 last:border-b-0"
                      >
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          {formatKey(key)}
                        </h4>
                        <div className="text-sm text-gray-600">
                          {typeof value === "string" && value.length > 200 ? (
                            <div className="whitespace-pre-wrap break-words">
                              {value}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap break-words">
                              {formatValue(value)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                    {formatValue(nodeData.value)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailModal;
