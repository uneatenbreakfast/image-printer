import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text } from 'react-konva';
import useImage from 'use-image';

interface EditorProps {
  imageDataUrl: string | null;
  borderColor: string;
  borderThickness: number;
  texts: {
    id: string;
    x: number;
    y: number;
    content: string;
    fontSize: number;
    fontFamily: string;
    fill: string;
  }[];
  onTextDragEnd: (id: string, x: number, y: number) => void;
  canvasWidth: number;
  canvasHeight: number;
}

const Editor: React.FC<EditorProps> = ({
  imageDataUrl,
  borderColor,
  borderThickness,
  texts,
  onTextDragEnd,
  canvasWidth,
  canvasHeight,
}) => {
  const [image] = useImage(imageDataUrl || '');
  const imageRef = useRef<any>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (image) {
      // Calculate scaled dimensions to fit within canvas while maintaining aspect ratio
      const aspectRatio = image.width / image.height;
      let newWidth = canvasWidth;
      let newHeight = canvasWidth / aspectRatio;

      if (newHeight > canvasHeight) {
        newHeight = canvasHeight;
        newWidth = canvasHeight * aspectRatio;
      }
      setImageDimensions({ width: newWidth, height: newHeight });
      // Center the image initially
      if (imageRef.current) {
        imageRef.current.x((canvasWidth - newWidth) / 2);
        imageRef.current.y((canvasHeight - newHeight) / 2);
      }
    }
  }, [image, canvasWidth, canvasHeight]);

  const handleImageDragEnd = () => {
    // Optional: could save image position here if needed
    // console.log("Image dragged to:", e.target.x(), e.target.y());
  };

  return (
    <Stage width={canvasWidth} height={canvasHeight} style={{ border: '1px solid #ccc' }}>
      <Layer>
        {/* Background rectangle to show clipped areas */}
        <Rect
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          fill="#eeeeee"
        />

        {image && (
          <KonvaImage
            image={image}
            x={imageRef.current ? imageRef.current.x() : (canvasWidth - imageDimensions.width) / 2}
            y={imageRef.current ? imageRef.current.y() : (canvasHeight - imageDimensions.height) / 2}
            width={imageDimensions.width}
            height={imageDimensions.height}
            draggable
            onDragEnd={handleImageDragEnd}
            ref={imageRef}
          />
        )}

        {/* Border */}
        {borderThickness > 0 && (
          <Rect
            x={borderThickness / 2}
            y={borderThickness / 2}
            width={canvasWidth - borderThickness}
            height={canvasHeight - borderThickness}
            stroke={borderColor}
            strokeWidth={borderThickness}
            listening={false} // Border should not interfere with drag events
          />
        )}

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
      </Layer>
    </Stage>
  );
};

export default Editor;