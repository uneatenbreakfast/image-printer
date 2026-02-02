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
  borderThickness: number;
  cornerRadius: number;
  texts: TextElement[];
  qrCodes: QrCodeElement[];
  scale: number;
  rotation: number;
  onTextDragEnd: (id: string, x: number, y: number) => void;
  onQrCodeDragEnd: (id: string, newX: number, newY: number) => void;
  onRemoveText: (id: string) => void;
  onRemoveQrCode: (id: string) => void;
  onUploadClick: () => void;
  canvasWidth: number;
  canvasHeight: number;
  onStageReady?: (stage: Konva.Stage) => void;
}

const Editor: React.FC<EditorProps> = ({
  imageDataUrl,
  borderColor,
  borderThickness,
  cornerRadius,
  texts,
  qrCodes,
  scale,
  rotation,
  onTextDragEnd,
  onQrCodeDragEnd,
  onRemoveText,
  onRemoveQrCode,
  onUploadClick,
  canvasWidth,
  canvasHeight,
  onStageReady,
}) => {
  const [image] = useImage(imageDataUrl || '');
  const imageRef = useRef<any>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (image) {
      const aspectRatio = image.width / image.height;
      let newWidth = canvasWidth;
      let newHeight = canvasWidth / aspectRatio;

      if (newHeight > canvasHeight) {
        newHeight = canvasHeight;
        newWidth = canvasHeight * aspectRatio;
      }
      setImageDimensions({ width: newWidth, height: newHeight });
      if (imageRef.current) {
        imageRef.current.x(canvasWidth / 2);
        imageRef.current.y(canvasHeight / 2);
      }
    }
  }, [image, canvasWidth, canvasHeight]);

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
        style={{ border: '1px solid #ccc' }}
        ref={stageRef}
      >
        <Layer>
          {/* Background color for empty areas */}
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#eeeeee" />

          {/* Border Rect - drawn behind the clipped group */}
          {borderThickness > 0 && (
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill={borderColor}
              cornerRadius={0}
            />
          )}

          {/* Clipped Group for the image */}
          <Group
            clipFunc={(ctx: SceneContext) => {
              const rectX = borderThickness;
              const rectY = borderThickness;
              const rectWidth = canvasWidth - borderThickness * 2;
              const rectHeight = canvasHeight - borderThickness * 2;
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
                x={canvasWidth / 2}
                y={canvasHeight / 2}
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
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              backgroundColor: 'rgba(0, 123, 255, 0.9)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 86, 179, 0.95)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.9)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            +
          </div>
        </div>
      )}

      {/* Remove buttons for text elements */}
      {texts.map((textItem) => (
        <button
          key={`remove-text-${textItem.id}`}
          onClick={() => onRemoveText(textItem.id)}
          style={{
            position: 'absolute',
            left: `${textItem.x}px`,
            top: `${textItem.y - 12}px`,
            width: '24px',
            height: '24px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: '2px solid white',
            borderRadius: '50%',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            padding: 0,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c82333';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#dc3545';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Remove text"
        >
          ×
        </button>
      ))}

      {/* Remove buttons for QR codes */}
      {qrCodes.map((qr) => (
        <button
          key={`remove-qr-${qr.id}`}
          onClick={() => onRemoveQrCode(qr.id)}
          style={{
            position: 'absolute',
            left: `${qr.x + qr.size - 12}px`,
            top: `${qr.y - 12}px`,
            width: '24px',
            height: '24px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: '2px solid white',
            borderRadius: '50%',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            padding: 0,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c82333';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#dc3545';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Remove QR code"
        >
          ×
        </button>
      ))}
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
