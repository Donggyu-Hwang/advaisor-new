import React, { useState } from "react";
import Tree from "react-d3-tree";

interface MindMapNode {
  name: string;
  children?: MindMapNode[];
  attributes?: {
    value?: any;
    id?: string;
  };
}

interface MindMapProps {
  data: any;
  onNodeClick: (node: any) => void;
}

const MindMap: React.FC<MindMapProps> = ({ data, onNodeClick }) => {
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // JSON 데이터를 D3 Tree 노드 구조로 변환
  const transformDataToNodes = (obj: any, parentKey = ""): MindMapNode => {
    if (typeof obj !== "object" || obj === null) {
      return {
        name: parentKey || "Root",
        attributes: {
          value: obj,
          id: parentKey || "root",
        },
      };
    }

    const children: MindMapNode[] = [];

    Object.entries(obj).forEach(([key, value]) => {
      const nodeId = parentKey ? `${parentKey}.${key}` : key;

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // 객체인 경우 재귀적으로 처리
        const childNode = transformDataToNodes(value, nodeId);
        children.push({
          name: key,
          children: childNode.children || [],
          attributes: {
            value: value,
            id: nodeId,
          },
        });
      } else {
        // 기본값인 경우
        children.push({
          name: key,
          attributes: {
            value: value,
            id: nodeId,
          },
        });
      }
    });

    return {
      name: parentKey || "IR 분석 보고서",
      children: children.length > 0 ? children : undefined,
      attributes: {
        value: obj,
        id: parentKey || "root",
      },
    };
  };

  // 노드 클릭 핸들러
  const handleNodeClick = (nodeData: any) => {
    if (onNodeClick) {
      onNodeClick({
        id: nodeData.attributes?.id,
        label: nodeData.name,
        value: nodeData.attributes?.value,
      });
    }
  };

  // 컨테이너 크기 설정
  React.useEffect(() => {
    const dimensions = { width: 800, height: 600 };
    setTranslate({
      x: dimensions.width / 2,
      y: dimensions.height / 2,
    });
  }, []);

  const treeData = transformDataToNodes(data);

  // 커스텀 노드 렌더링
  const renderCustomNodeElement = ({ nodeDatum, toggleNode }: any) => (
    <g>
      <rect
        width="120"
        height="40"
        x="-60"
        y="-20"
        fill={nodeDatum.children ? "#1890ff" : "#e8f4fd"}
        stroke="#1890ff"
        strokeWidth="1"
        rx="5"
        style={{ cursor: "pointer" }}
        onClick={() => handleNodeClick(nodeDatum)}
      />
      <text
        fill={nodeDatum.children ? "#fff" : "#1890ff"}
        strokeWidth="0"
        x="0"
        y="5"
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        style={{ cursor: "pointer" }}
        onClick={() => handleNodeClick(nodeDatum)}
      >
        {nodeDatum.name.length > 15
          ? `${nodeDatum.name.substring(0, 15)}...`
          : nodeDatum.name}
      </text>
      {nodeDatum.children && (
        <circle
          r="8"
          x="0"
          y="25"
          fill="#1890ff"
          stroke="#fff"
          strokeWidth="2"
          style={{ cursor: "pointer" }}
          onClick={toggleNode}
        />
      )}
    </g>
  );

  return (
    <div
      className="w-full h-full min-h-[600px] border border-gray-200 rounded-lg bg-white"
      style={{ minHeight: "600px", width: "100%", height: "600px" }}
    >
      {data && (
        <Tree
          data={treeData}
          translate={translate}
          orientation="vertical"
          pathFunc="diagonal"
          nodeSize={{ x: 150, y: 100 }}
          separation={{ siblings: 1, nonSiblings: 2 }}
          renderCustomNodeElement={renderCustomNodeElement}
          zoom={0.8}
          enableLegacyTransitions={true}
        />
      )}
    </div>
  );
};

export default MindMap;
