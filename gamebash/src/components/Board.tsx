import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Image as KonvaImage, Group, Text } from 'react-konva';
import { GameConfig, GamePiece } from '../types';
import useImage from 'use-image';

const PieceImage = ({ url, x, y, width, height, ...props }: any) => {
  const [image] = useImage(url);
  return <KonvaImage image={image} x={x} y={y} width={width} height={height} {...props} />;
};

const BoardBackground = ({ url, width, height, color }: any) => {
  const [image] = useImage(url);
  if (url && image) {
    return <KonvaImage image={image} width={width} height={height} />;
  }
  return <Rect width={width} height={height} fill={color} />;
};

interface BoardProps {
  config: GameConfig;
  piecesState?: { [pieceId: string]: { x: number; y: number; lastMovedBy: string } };
  onPieceMove?: (pieceId: string, x: number, y: number) => void;
  isEditable?: boolean;
  onPieceSelect?: (pieceId: string) => void;
  selectedPieceId?: string | null;
}

export const Board: React.FC<BoardProps> = ({
  config,
  piecesState,
  onPieceMove,
  isEditable = false,
  onPieceSelect,
  selectedPieceId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    updateDimensions();

    return () => observer.disconnect();
  }, []);

  if (!config?.board || dimensions.width === 0) {
    return (
      <div ref={containerRef} className="w-full h-full bg-neutral-900 rounded-xl" />
    );
  }

  const scale = Math.min(
    dimensions.width / (config?.board?.width || 800),
    dimensions.height / (config?.board?.height || 600),
    1 // Don't zoom in beyond 1:1 scale by default
  );

  const renderPiece = (piece: GamePiece) => {
    const state = piecesState?.[piece.id];
    const x = state ? state.x : piece.x;
    const y = state ? state.y : piece.y;
    const isSelected = selectedPieceId === piece.id;

    const commonProps = {
      x: x,
      y: y,
      width: piece.width,
      height: piece.height,
      draggable: isEditable || !!onPieceMove,
      stroke: isSelected ? '#00FF00' : 'transparent',
      strokeWidth: 2,
      onDragEnd: (e: any) => {
        if (onPieceMove) {
          onPieceMove(piece.id, e.target.x(), e.target.y());
        }
      },
      onClick: () => onPieceSelect?.(piece.id),
      onTap: () => onPieceSelect?.(piece.id),
    };

    if (piece.shape === 'image' && piece.imageUrl) {
      return <PieceImage key={piece.id} url={piece.imageUrl} {...commonProps} />;
    }

    if (piece.shape === 'circle') {
      return (
        <Circle
          key={piece.id}
          {...commonProps}
          radius={piece.width / 2}
          fill={piece.color}
          x={x + piece.width / 2}
          y={y + piece.height / 2}
        />
      );
    }

    return (
      <Rect
        key={piece.id}
        {...commonProps}
        fill={piece.color}
        cornerRadius={piece.shape === 'square' ? 0 : 4}
      />
    );
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-neutral-900 overflow-hidden rounded-xl border border-white/10 relative"
      style={{ touchAction: 'none' }}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
      >
        <Layer
          scaleX={scale}
          scaleY={scale}
          x={(dimensions.width - config.board.width * scale) / 2}
          y={(dimensions.height - config.board.height * scale) / 2}
        >
          {/* Board Background */}
          <BoardBackground 
            url={config.board.backgroundImage} 
            width={config.board.width} 
            height={config.board.height} 
            color={config.board.backgroundColor} 
          />

          {/* Grid Lines (Optional) */}
          {config.board.gridSize > 0 && Array.from({ length: Math.ceil(config.board.width / config.board.gridSize) + 1 }).map((_, i) => (
            <Rect
              key={`v-${i}`}
              x={i * config.board.gridSize}
              y={0}
              width={1}
              height={config.board.height}
              fill="rgba(255,255,255,0.05)"
            />
          ))}
          {config.board.gridSize > 0 && Array.from({ length: Math.ceil(config.board.height / config.board.gridSize) + 1 }).map((_, i) => (
            <Rect
              key={`h-${i}`}
              x={0}
              y={i * config.board.gridSize}
              width={config.board.width}
              height={1}
              fill="rgba(255,255,255,0.05)"
            />
          ))}

          {/* Pieces */}
          {(config.pieces || []).map(renderPiece)}
        </Layer>
      </Stage>
    </div>
  );
};
