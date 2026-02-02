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
  dataUrl: string; // The generated QR code image Data URL
  size: number; // Size of the QR code on canvas
}

interface EditorProps {
  imageDataUrl: string | null;
  borderColor: string;
  borderThickness: number;
  cornerRadius: number;
  texts: TextElement[];
  qrCodes: QrCodeElement[]; // New property for QR codes
  scale: number;
  rotation: number;
  onTextDragEnd: (id: string, x: number, y: number) => void;
  onQrCodeDragEnd: (id: string, newX: number, newY: number) => void; // New handler
  onEditorClick: () => void; // New prop for click handling
  canvasWidth: number;
  canvasHeight: number;
  onStageReady?: (stage: Konva.Stage) => void; // New prop
}

const Editor: React.FC<EditorProps> = ({
  imageDataUrl,
  borderColor,
  borderThickness,
  cornerRadius,
  texts,
  qrCodes, // Destructure new prop
  scale,
  rotation,
  onTextDragEnd,
  onQrCodeDragEnd, // Destructure new prop
  onEditorClick, // Destructure new prop
  canvasWidth,
  canvasHeight,
  onStageReady, // Destructure new prop
}) => {
  const [image] = useImage(imageDataUrl || '');
  const imageRef = useRef<any>(null);
  const stageRef = useRef<Konva.Stage | null>(null); // Ref for Konva Stage
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
        imageRef.current.x(canvasWidth / 2); // Center of the canvas
        imageRef.current.y(canvasHeight / 2); // Center of the canvas
      }
    }
  }, [image, canvasWidth, canvasHeight]);

  // Pass Stage object to parent when ready
  useEffect(() => {
    if (onStageReady && stageRef.current) {
      onStageReady(stageRef.current);
    }
  }, [onStageReady, stageRef.current]);

  return (
    <Stage
      width={canvasWidth}
      height={canvasHeight}
      style={{ border: '1px solid #ccc' }}
      ref={stageRef} // Attach ref to Stage
      onClick={onEditorClick} // Attach onClick handler
    >
      <Layer>
        {/* 1. Background color for empty areas */}
        <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#eeeeee" />

        {/* 2. Border Rect - drawn behind the clipped group */}
        {borderThickness > 0 && (
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill={borderColor}
            cornerRadius={0} // Outer border is now sharp
          />
        )}

        {/* 3. Clipped Group for the image */}
        <Group
          clipFunc={(ctx: SceneContext) => {
            const rectX = borderThickness;
            const rectY = borderThickness;
            const rectWidth = canvasWidth - borderThickness * 2;
            const rectHeight = canvasHeight - borderThickness * 2;
            const radius = Math.max(0, cornerRadius); // Use cornerRadius directly for inner path

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
        
        {/* 4. Text drawn on top */}
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

        {/* 5. QR Codes drawn on top */}
        {qrCodes.map(qr => (
          <QrCodeImage
            key={qr.id}
            qrCode={qr}
            onQrCodeDragEnd={onQrCodeDragEnd}
          />
        ))}
      </Layer>
    </Stage>
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