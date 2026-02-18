import React, { useRef, useEffect, useState } from 'react';
import type Konva from 'konva';
import { Stage, Layer, Image as KonvaImage, Rect, Text, Group } from 'react-konva';
import type { SceneContext } from 'konva/lib/Context';
import useImage from 'use-image';

interface TextElement {
  id: string;
  x: number;
  y: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle?: string;
}

interface QrCodeElement {
  id: string;
  x: number;
  y: number;
  dataUrl: string;
  size: number;
}

interface EditorProps {
  imageDataUrl: string | null;
  borderColor: string;
  borderThicknessTop: number;
  borderThicknessBottom: number;
  borderThicknessLeft: number;
  borderThicknessRight: number;
  cornerRadius: number;
  texts: TextElement[];
  qrCodes: QrCodeElement[];
  scale: number;
  rotation: number;
  onTextDragEnd: (id: string, x: number, y: number) => void;
  onQrCodeDragEnd: (id: string, newX: number, newY: number) => void;
  onUploadClick: () => void;
  canvasWidth: number;
  canvasHeight: number;
  onStageReady?: (stage: Konva.Stage) => void;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
}

const Editor: React.FC<EditorProps> = ({
  imageDataUrl,
  borderColor,
  borderThicknessTop,
  borderThicknessBottom,
  borderThicknessLeft,
  borderThicknessRight,
  cornerRadius,
  texts,
  qrCodes,
  scale,
  rotation,
  onTextDragEnd,
  onQrCodeDragEnd,
  onUploadClick,
  canvasWidth,
  canvasHeight,
  onStageReady,
  marginTop = 0,
  marginBottom = 0,
  marginLeft = 0,
  marginRight = 0,
}) => {
  const [image] = useImage(imageDataUrl || '');
  const imageRef = useRef<any>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Calculate available area after margins
  const availableWidth = canvasWidth - marginLeft - marginRight;
  const availableHeight = canvasHeight - marginTop - marginBottom;
  const centerX = marginLeft + availableWidth / 2;
  const centerY = marginTop + availableHeight / 2;

  // Calculate image dimensions to fit within available canvas area
  useEffect(() => {
    if (image) {
      const aspectRatio = image.width / image.height;
      let newWidth = availableWidth;
      let newHeight = availableWidth / aspectRatio;

      if (newHeight > availableHeight) {
        newHeight = availableHeight;
        newWidth = availableHeight * aspectRatio;
      }
      setImageDimensions({ width: newWidth, height: newHeight });
      if (imageRef.current) {
        imageRef.current.x(centerX);
        imageRef.current.y(centerY);
      }
    }
  }, [image, availableWidth, availableHeight, centerX, centerY]);

  useEffect(() => {
    if (onStageReady && stageRef.current) {
      onStageReady(stageRef.current);
    }
  }, [onStageReady, stageRef.current]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Stage
        width={canvasWidth}
        height={canvasHeight}
        className="canvas-stage"
        ref={stageRef}
      >
        <Layer>
          {/* Background color for empty areas */}
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#ffffff" />

          {/* Border Rects - drawn behind the clipped group */}
          {borderThicknessTop > 0 && (
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={borderThicknessTop}
              fill={borderColor}
            />
          )}
          {borderThicknessBottom > 0 && (
            <Rect
              x={0}
              y={canvasHeight - borderThicknessBottom}
              width={canvasWidth}
              height={borderThicknessBottom}
              fill={borderColor}
            />
          )}
          {borderThicknessLeft > 0 && (
            <Rect
              x={0}
              y={0}
              width={borderThicknessLeft}
              height={canvasHeight}
              fill={borderColor}
            />
          )}
          {borderThicknessRight > 0 && (
            <Rect
              x={canvasWidth - borderThicknessRight}
              y={0}
              width={borderThicknessRight}
              height={canvasHeight}
              fill={borderColor}
            />
          )}

          {/* Clipped Group for the image */}
          <Group
            clipFunc={(ctx: SceneContext) => {
              const rectX = marginLeft + borderThicknessLeft;
              const rectY = marginTop + borderThicknessTop;
              const rectWidth = availableWidth - borderThicknessLeft - borderThicknessRight;
              const rectHeight = availableHeight - borderThicknessTop - borderThicknessBottom;
              const radius = Math.max(0, cornerRadius);

              ctx.beginPath();
              ctx.moveTo(rectX + radius, rectY);
              ctx.lineTo(rectX + rectWidth - radius, rectY);
              ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius);
              ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
              ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight);
              ctx.lineTo(rectX + radius, rectY + rectHeight);
              ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - radius);
              ctx.lineTo(rectX, rectY + radius);
              ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
              ctx.closePath();
            }}
          >
            {image && (
              <KonvaImage
                ref={imageRef}
                image={image}
                x={centerX}
                y={centerY}
                width={imageDimensions.width}
                height={imageDimensions.height}
                draggable
                scaleX={scale}
                scaleY={scale}
                rotation={rotation}
                offsetX={imageDimensions.width / 2}
                offsetY={imageDimensions.height / 2}
              />
            )}
          </Group>

          {/* Text drawn on top */}
          {texts.map((textItem) => (
            <Text
              key={textItem.id}
              x={textItem.x}
              y={textItem.y}
              text={textItem.content}
              fontSize={textItem.fontSize}
              fontFamily={textItem.fontFamily}
              fill={textItem.fill}
              fontStyle={textItem.fontStyle || 'normal'}
              width={Math.max(50, canvasWidth - marginLeft - marginRight - textItem.x - 10)}
              lineHeight={1.2}
              draggable
              onDragEnd={(e) => {
                onTextDragEnd(textItem.id, e.target.x(), e.target.y());
              }}
            />
          ))}

          {/* QR Codes drawn on top */}
          {qrCodes.map(qr => (
            <QrCodeImage
              key={qr.id}
              qrCode={qr}
              onQrCodeDragEnd={onQrCodeDragEnd}
            />
          ))}
        </Layer>
      </Stage>

      {/* Upload icon overlay - only shown when no image */}
      {!imageDataUrl && (
        <div
          className="upload-icon-overlay"
          onClick={onUploadClick}
        >
          <div className="upload-icon">
            +
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;

// Helper component to load and render QR code image
interface QrCodeImageProps {
  qrCode: QrCodeElement;
  onQrCodeDragEnd: (id: string, newX: number, newY: number) => void;
}

const QrCodeImage: React.FC<QrCodeImageProps> = ({ qrCode, onQrCodeDragEnd }) => {
  const [qrImage] = useImage(qrCode.dataUrl);

  return (
    qrImage && (
      <KonvaImage
        image={qrImage}
        x={qrCode.x}
        y={qrCode.y}
        width={qrCode.size}
        height={qrCode.size}
        draggable
        onDragEnd={(e) => onQrCodeDragEnd(qrCode.id, e.target.x(), e.target.y())}
      />
    )
  );
};
