import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import { SketchPicker } from 'react-color';

// Re-defining these types from App.tsx to avoid circular dependencies.
// In a larger app, this would be in a shared types file.
interface EditorState {
  imageDataUrl: string | null;
  borderColor: string;
  borderThickness: number;
  cornerRadius: number;
  texts: any[];
  qrCodes: any[];
  scale: number;
  rotation: number;
  defaultTextContent: string;
  defaultTextFontSize: number;
  defaultTextColor: string;
}

interface Template {
  name: string;
  borderColor: string;
  borderThickness: number;
  cornerRadius: number;
  defaultTextContent: string;
  defaultTextFontSize: number;
  defaultTextColor: string;
  thumbnailDataUrl?: string; // New optional property for thumbnail
}

interface ControlsProps {
  onImageUpload: (imageDataUrl: string) => void;
  onBorderColorChange: (color: string) => void;
  onBorderThicknessChange: (thickness: number) => void;
  onCornerRadiusChange: (radius: number) => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
  // QR Code handlers
  onAddQrCode: (url: string) => Promise<void>;
  onRemoveQrCode: (id: string) => void;
  // Default text property handlers
  onDefaultTextContentChange: (content: string) => void;
  onDefaultTextFontSizeChange: (size: number) => void;
  onDefaultTextColorChange: (color: string) => void;
  onAddText: (content: string) => void;
  onRemoveText: (id: string) => void;
  onPrint: () => void;
  layoutMode: 'current' | '2x3' | '4cards' | '4cards-portrait';
  onLayoutChange: (mode: 'current' | '2x3' | '4cards' | '4cards-portrait') => void;
  activeState: EditorState;
  templates: Template[];
  saveTemplate: (name: string) => void;
  loadTemplate: (template: Template) => void;
  deleteTemplate: (name: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onRemoveImage: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  onImageUpload,
  onBorderColorChange,
  onBorderThicknessChange,
  onCornerRadiusChange,
  onScaleChange,
  onRotationChange,
  onAddQrCode,
  onRemoveQrCode,
  onDefaultTextContentChange,
  onDefaultTextFontSizeChange,
  onDefaultTextColorChange,
  onAddText,
  onRemoveText,
  onPrint,
  layoutMode,
  onLayoutChange,
  activeState,
  templates,
  saveTemplate,
  loadTemplate,
  deleteTemplate,
  fileInputRef,
  onRemoveImage,
}) => {
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [qrCodeUrlInput, setQrCodeUrlInput] = useState<string>('https://example.com'); // State for QR URL input

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
    // onAddText now only takes content, others come from activeState
    if (activeState.defaultTextContent.trim() !== '') {
      onAddText(activeState.defaultTextContent);
    }
  };

  return (
    <div>
      <div className="control-group">
        <h3>Layout</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => onLayoutChange('current')} disabled={layoutMode === 'current'}>Single</button>
          <button onClick={() => onLayoutChange('2x3')} disabled={layoutMode === '2x3'}>2x3 Split</button>
          <button onClick={() => onLayoutChange('4cards')} disabled={layoutMode === '4cards'}>4 Cards</button>
          <button onClick={() => onLayoutChange('4cards-portrait')} disabled={layoutMode === '4cards-portrait'}>4 Cards Portrait</button>
        </div>
      </div>

      <div className="control-group">
        <h3>Image Upload</h3>
        <label>{layoutMode === '2x3' ? 'Active Image Upload' : 'Image Upload'}</label>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} />
        {activeState.imageDataUrl && (
          <button 
            onClick={onRemoveImage} 
            style={{ marginTop: '10px', backgroundColor: '#dc3545' }}
          >
            Remove Image
          </button>
        )}
      </div>

      <div className="control-group">
        <h3>Image Controls</h3>
        <div>
          <label>Scale: {Math.round(activeState.scale * 100)}%</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={activeState.scale}
            onChange={(e) => onScaleChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Rotation: {activeState.rotation}°</label>
          <input
            type="range"
            min="0"
            max="360"
            value={activeState.rotation}
            onChange={(e) => onRotationChange(Number(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <button style={{ width: 'auto', flexGrow: 1, marginRight: '5px' }} onClick={() => onRotationChange(0)}>0°</button>
            <button style={{ width: 'auto', flexGrow: 1, marginRight: '5px' }} onClick={() => onRotationChange(90)}>90°</button>
            <button style={{ width: 'auto', flexGrow: 1, marginRight: '5px' }} onClick={() => onRotationChange(180)}>180°</button>
            <button style={{ width: 'auto', flexGrow: 1 }} onClick={() => onRotationChange(270)}>270°</button>
          </div>
        </div>
      </div>

      <div className="control-group">
        <h3>QR Code Controls</h3>
        <div>
          <label>URL for QR Code:</label>
          <input
            type="text"
            value={qrCodeUrlInput}
            onChange={(e) => setQrCodeUrlInput(e.target.value)}
            placeholder="Enter URL"
          />
          <button onClick={() => onAddQrCode(qrCodeUrlInput)} style={{ marginTop: '10px' }}>Generate QR Code</button>
        </div>
        {activeState.qrCodes.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <label>Added QR Codes:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
              {activeState.qrCodes.map((qr, index) => (
                <div 
                  key={qr.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '5px 10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '0.9em'
                  }}
                >
                  <span>QR Code {index + 1}</span>
                  <button
                    onClick={() => onRemoveQrCode(qr.id)}
                    style={{ 
                      width: 'auto', 
                      padding: '2px 8px', 
                      fontSize: '0.8em',
                      backgroundColor: '#dc3545'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="control-group">
        <h3>Border Controls</h3>
        <div>
          <label>Thickness: {activeState.borderThickness}px</label>
          <input
            type="range"
            min="0"
            max="50"
            value={activeState.borderThickness}
            onChange={(e) => onBorderThicknessChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Corner Radius: {activeState.cornerRadius}px</label>
          <input
            type="range"
            min="0"
            max="100"
            value={activeState.cornerRadius}
            onChange={(e) => onCornerRadiusChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Color:</label>
          <SketchPicker
            color={activeState.borderColor}
            onChange={(color) => onBorderColorChange(color.hex)}
          />
        </div>
      </div>

      <div className="control-group">
        <h3>Text Controls</h3>
        <div>
          <label>Content:</label>
          <input
            type="text"
            value={activeState.defaultTextContent}
            onChange={(e) => onDefaultTextContentChange(e.target.value)}
            placeholder="Enter text"
          />
        </div>
        <div>
          <label>Font Size: {activeState.defaultTextFontSize}px</label>
          <input
            type="range"
            min="10"
            max="100"
            value={activeState.defaultTextFontSize}
            onChange={(e) => onDefaultTextFontSizeChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Color:</label>
          <SketchPicker
            color={activeState.defaultTextColor}
            onChange={(color) => onDefaultTextColorChange(color.hex)}
          />
        </div>
        <button onClick={handleAddText} style={{ marginTop: '10px' }}>Add Text</button>
        {activeState.texts.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <label>Added Text Elements:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
              {activeState.texts.map((text: any, index: number) => (
                <div 
                  key={text.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '5px 10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '0.9em'
                  }}
                >
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    maxWidth: '150px'
                  }}>
                    {text.content || `Text ${index + 1}`}
                  </span>
                  <button
                    onClick={() => onRemoveText(text.id)}
                    style={{ 
                      width: 'auto', 
                      padding: '2px 8px', 
                      fontSize: '0.8em',
                      backgroundColor: '#dc3545'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="control-group">
        <h3>Print</h3>
        <button onClick={onPrint}>Print Image</button>
      </div>

      <div className="control-group">
        <h3>Templates</h3>
        <div>
          <label>Template Name:</label>
          <input
            type="text"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Enter template name"
          />
          <button onClick={() => saveTemplate(newTemplateName)} style={{ marginTop: '10px' }}>Save Template</button>
        </div>
        <div style={{ marginTop: '20px' }}>
          <label>Saved Templates:</label>
          <div className="template-thumbnail-grid">
            {templates.map(t => (
              <div
                key={t.name}
                className="template-thumbnail-item"
                // On click, load the template
                onClick={() => loadTemplate(t)}
                title={t.name}
              >
                {t.thumbnailDataUrl ? (
                  <img src={t.thumbnailDataUrl} alt={t.name} />
                ) : (
                  <div className="no-thumbnail">No Preview</div>
                )}
                <span className="template-name">{t.name}</span>
                {/* Delete button for each template */}
                <button
                  className="delete-template-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent loading template when deleting
                    deleteTemplate(t.name);
                  }}
                  title={`Delete ${t.name}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;