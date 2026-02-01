import { useState, useRef, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import './App.css';

import Editor from './components/Editor';
import Controls from './components/Controls';

// Define the aspect ratio for printing, e.g., 4x6 inches
const PRINT_ASPECT_RATIO_WIDTH = 600; // Example width
const PRINT_ASPECT_RATIO_HEIGHT = 400; // Example height (4x6 ratio)

interface TextElement {
  id: string;
  x: number;
  y: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
}

function App() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [borderColor, setBorderColor] = useState<string>('#000000');
  const [borderThickness, setBorderThickness] = useState<number>(0);
  const [texts, setTexts] = useState<TextElement[]>([]);

  const editorRef = useRef(null); // Ref for the component to be printed

  const handleImageUpload = useCallback((dataUrl: string) => {
    setImageDataUrl(dataUrl);
  }, []);

  const handleBorderColorChange = useCallback((color: string) => {
    setBorderColor(color);
  }, []);

  const handleBorderThicknessChange = useCallback((thickness: number) => {
    setBorderThickness(thickness);
  }, []);

  const handleAddText = useCallback((content: string, fontSize: number, fill: string) => {
    const newText: TextElement = {
      id: `text-${texts.length}-${Date.now()}`, // Unique ID
      x: 50, // Initial X position
      y: 50, // Initial Y position
      content,
      fontSize,
      fontFamily: 'Arial', // Default font family
      fill,
    };
    setTexts((prevTexts) => [...prevTexts, newText]);
  }, [texts.length]);

  const handleTextDragEnd = useCallback((id: string, newX: number, newY: number) => {
    setTexts((prevTexts) =>
      prevTexts.map((text) => (text.id === id ? { ...text, x: newX, y: newY } : text))
    );
  }, []);

  const handlePrint = useReactToPrint({
    content: () => editorRef.current,
    documentTitle: 'Image with Border and Text',
    pageStyle: `@page { size: ${PRINT_ASPECT_RATIO_WIDTH}px ${PRINT_ASPECT_RATIO_HEIGHT}px; margin: 0; }
                @media print {
                  body { -webkit-print-color-adjust: exact; }
                }`,
  } as any);

  return (
    <div className="app-container">
      <div className="controls-panel">
        <Controls
          onImageUpload={handleImageUpload}
          onBorderColorChange={handleBorderColorChange}
          onBorderThicknessChange={handleBorderThicknessChange}
          onAddText={handleAddText}
          onPrint={handlePrint}
        />
      </div>
      <div className="editor-panel" ref={editorRef}>
        <Editor
          imageDataUrl={imageDataUrl}
          borderColor={borderColor}
          borderThickness={borderThickness}
          texts={texts}
          onTextDragEnd={handleTextDragEnd}
          canvasWidth={PRINT_ASPECT_RATIO_WIDTH}
          canvasHeight={PRINT_ASPECT_RATIO_HEIGHT}
        />
      </div>
    </div>
  );
}

export default App;;
