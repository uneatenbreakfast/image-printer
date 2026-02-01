import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import { SketchPicker } from 'react-color';

interface ControlsProps {
  onImageUpload: (imageDataUrl: string) => void;
  onBorderColorChange: (color: string) => void;
  onBorderThicknessChange: (thickness: number) => void;
  onAddText: (content: string, fontSize: number, fill: string) => void;
  onPrint: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  onImageUpload,
  onBorderColorChange,
  onBorderThicknessChange,
  onAddText,
  onPrint,
}) => {
  const [currentBorderColor, setCurrentBorderColor] = useState<string>('#000000');
  const [currentBorderThickness, setCurrentBorderThickness] = useState<number>(0);
  const [newTextContent, setNewTextContent] = useState<string>('New Text');
  const [newTextFontSize, setNewTextFontSize] = useState<number>(20);
  const [newTextColor, setNewTextColor] = useState<string>('#FF0000'); // Default to red for visibility

  const handleBorderColorChange = (color: string) => {
    setCurrentBorderColor(color);
    onBorderColorChange(color);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onImageUpload(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddText = () => {
    if (newTextContent.trim() !== '') {
      onAddText(newTextContent, newTextFontSize, newTextColor);
      setNewTextContent(''); // Clear input after adding
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Image Upload</h3>
      <div style={{ marginBottom: '20px' }}>
        <input type="file" accept="image/*" onChange={handleImageChange} />
      </div>

      <h3>Border Controls</h3>
      <div>
        <label>Thickness: {currentBorderThickness}px</label>
        <input
          type="range"
          min="0"
          max="50"
          value={currentBorderThickness}
          onChange={(e) => {
            const thickness = Number(e.target.value);
            setCurrentBorderThickness(thickness);
            onBorderThicknessChange(thickness);
          }}
        />
      </div>
      <div>
        <label>Color:</label>
        <SketchPicker
          color={currentBorderColor}
          onChange={(color) => handleBorderColorChange(color.hex)}
        />
      </div>

      <h3>Text Controls</h3>
      <div>
        <label>Content:</label>
        <input
          type="text"
          value={newTextContent}
          onChange={(e) => setNewTextContent(e.target.value)}
          placeholder="Enter text"
        />
      </div>
      <div>
        <label>Font Size: {newTextFontSize}px</label>
        <input
          type="range"
          min="10"
          max="100"
          value={newTextFontSize}
          onChange={(e) => setNewTextFontSize(Number(e.target.value))}
        />
      </div>
      <div>
        <label>Color:</label>
        <SketchPicker
          color={newTextColor}
          onChange={(color) => setNewTextColor(color.hex)}
        />
      </div>
      <button onClick={handleAddText} style={{ marginTop: '10px' }}>Add Text</button>

      <h3 style={{ marginTop: '30px' }}>Print</h3>
      <button onClick={onPrint}>Print Image</button>
    </div>
  );
};

export default Controls;