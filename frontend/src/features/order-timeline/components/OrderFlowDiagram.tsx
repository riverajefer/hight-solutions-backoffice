import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import OrderFlowNode from './OrderFlowNode';
import type { OrderFlowNodeData } from './OrderFlowNode';
import { getLayoutedElements } from '../utils/layout';
import type { OrderTreeResponse } from '../types/order-timeline.types';

const nodeTypes = { orderNode: OrderFlowNode };

interface OrderFlowDiagramProps {
  data: OrderTreeResponse;
}

export default function OrderFlowDiagram({ data }: OrderFlowDiagramProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    const nodes: Node[] = data.nodes.map((node) => ({
      id: node.id,
      type: 'orderNode' as const,
      position: { x: 0, y: 0 },
      data: {
        ...node,
        isFocused: node.id === data.focusedId,
      } as Record<string, unknown>,
    }));

    const edges: Edge[] = data.edges.map((edge) => ({
      id: `e-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: isDark ? alpha('#8B5CF6', 0.5) : alpha('#363A72', 0.4),
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isDark ? '#8B5CF6' : '#363A72',
        width: 16,
        height: 16,
      },
    }));

    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, 'LR');
    return { layoutedNodes: ln, layoutedEdges: le };
  }, [data, isDark]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        '.react-flow__background': {
          backgroundColor: isDark
            ? theme.palette.background.default
            : '#FAFBFC',
        },
        '.react-flow__minimap': {
          backgroundColor: isDark
            ? alpha(theme.palette.background.paper, 0.9)
            : '#F1F5F9',
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        },
        '.react-flow__controls': {
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
        },
        '.react-flow__controls-button': {
          backgroundColor: isDark
            ? theme.palette.background.paper
            : '#fff',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: isDark
              ? alpha(theme.palette.primary.main, 0.1)
              : alpha(theme.palette.primary.main, 0.08),
          },
          '& svg': {
            fill: theme.palette.text.primary,
          },
        },
      }}
    >
      <ReactFlow
        nodes={layoutedNodes}
        edges={layoutedEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={isDark ? alpha('#8B5CF6', 0.15) : alpha('#363A72', 0.1)}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const nodeData = node.data as unknown as OrderFlowNodeData;
            const typeColors: Record<string, string> = {
              COT: '#8B5CF6',
              OP: '#2EB0C4',
              OT: '#F97316',
              OG: '#22D3EE',
            };
            return typeColors[nodeData?.type] || '#9CA3AF';
          }}
          maskColor={isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)'}
          style={{ height: 100, width: 160 }}
        />
      </ReactFlow>
    </Box>
  );
}
