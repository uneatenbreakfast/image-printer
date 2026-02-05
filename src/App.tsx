import Konva from "konva";
import React, { useState, useRef, useCallback, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import "./App.css";
import Editor from "./components/Editor";
import Controls from "./components/Controls";
import QRCode from "qrcode"; // Import qrcode library

const PRINT_ASPECT_RATIO_WIDTH = 600;
const PRINT_ASPECT_RATIO_HEIGHT = 400;
const PRINT_PORTRAIT_WIDTH = 400;
const PRINT_PORTRAIT_HEIGHT = 600;

interface TextElement {
  id: string;
  x: number;
  y: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle?: string; // 'bold', 'italic', etc.
}

interface QrCodeElement {
  id: string;
  x: number;
  y: number;
  dataUrl: string; // The generated QR code image Data URL
  size: number; // Size of the QR code on canvas
}

interface EditorState {
  imageDataUrl: string | null;
  borderColor: string;
  borderThickness: number;
  cornerRadius: number;
  texts: TextElement[];
  qrCodes: QrCodeElement[]; // New property for QR codes
  scale: number;
  rotation: number;
  // Default text properties for new text elements
  defaultTextContent: string;
  defaultTextFontSize: number;
  defaultTextColor: string;
}

const initialEditorState: EditorState = {
  imageDataUrl: null,
  borderColor: "#000000",
  borderThickness: 0,
  cornerRadius: 0,
  texts: [],
  qrCodes: [], // Initialize qrCodes
  scale: 1,
  rotation: 0,
  defaultTextContent: "New Text",
  defaultTextFontSize: 20,
  defaultTextColor: "#FF0000",
};

// Interface for saved templates
interface Template {
  name: string;
  // All properties from EditorState except imageDataUrl, scale, and rotation
  borderColor: string;
  borderThickness: number;
  cornerRadius: number;
  defaultTextContent: string;
  defaultTextFontSize: number;
  defaultTextColor: string;
  texts: TextElement[]; // Now saving text elements
  thumbnailDataUrl?: string; // New optional property for thumbnail
}

function App() {
  const [layoutMode, setLayoutMode] = useState<
    "current" | "2x3" | "4cards" | "4cards-portrait"
  >("current");
  const [activeEditor, setActiveEditor] = useState<
    "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >("top-left");

  // Canvas margins state (applies to entire canvas area, not per-card)
  const [canvasMargins, setCanvasMargins] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  const [editorStates, setEditorStates] = useState<
    Record<
      "top-left" | "top-right" | "bottom-left" | "bottom-right",
      EditorState
    >
  >({
    "top-left": initialEditorState,
    "top-right": initialEditorState,
    "bottom-left": initialEditorState,
    "bottom-right": initialEditorState,
  });

  const [templates, setTemplates] = useState<Template[]>(() => {
    try {
      const saved = localStorage.getItem("imagePrinterTemplates");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Failed to parse templates from localStorage:", error);
      return [];
    }
  });

  // Save templates to localStorage whenever they change
  React.useEffect(() => {
    try {
      localStorage.setItem("imagePrinterTemplates", JSON.stringify(templates));
    } catch (error) {
      console.error("Failed to save templates to localStorage:", error);
    }
  }, [templates]);

  // Update combined canvas dimensions when layout mode changes
  React.useEffect(() => {
    const canvas = combinedPrintCanvasRef.current;
    if (canvas) {
      if (layoutMode === "4cards-portrait") {
        canvas.width = PRINT_PORTRAIT_WIDTH;
        canvas.height = PRINT_PORTRAIT_HEIGHT;
      } else {
        canvas.width = PRINT_ASPECT_RATIO_WIDTH;
        canvas.height = PRINT_ASPECT_RATIO_HEIGHT;
      }
    }
  }, [layoutMode]);

  // Refs for all editor stages
  const editorStageRefs = useRef<
    Record<
      "top-left" | "top-right" | "bottom-left" | "bottom-right",
      Konva.Stage | null
    >
  >({
    "top-left": null,
    "top-right": null,
    "bottom-left": null,
    "bottom-right": null,
  });

  // New ref for the hidden combined print canvas
  const combinedPrintCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Ref for react-to-print v3 contentRef API
  const printContentRef = useRef<HTMLDivElement | null>(null);

  const editorRef = useRef<Konva.Stage | null>(null); // Ref for printing single editor's Konva Stage

  // Ref for the file input element
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to trigger the file input click
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // activeState and setActiveState for managing editor state
  const activeState =
    layoutMode === "current"
      ? editorStates["top-left"]
      : editorStates[activeEditor];
  const setActiveState = useCallback(
    (newState: React.SetStateAction<EditorState>) => {
      let editorKey: "top-left" | "top-right" | "bottom-left" | "bottom-right";
      if (layoutMode === "current") {
        editorKey = "top-left"; // Default for single layout
      } else if (layoutMode === "2x3") {
        // For 2x3, we only use 'top-left' and 'top-right' for active editor, so map them back
        editorKey =
          activeEditor === "top-left" || activeEditor === "top-right"
            ? activeEditor
            : "top-left";
      } else {
        // '4cards' and '4cards-portrait' layouts
        editorKey = activeEditor;
      }

      setEditorStates((prev) => ({
        ...prev,
        [editorKey]:
          typeof newState === "function" ? newState(prev[editorKey]) : newState,
      }));
    },
    [activeEditor, layoutMode],
  );

  const handleImageUpload = useCallback(
    (dataUrl: string) => {
      setActiveState((prev) => ({ ...prev, imageDataUrl: dataUrl }));
    },
    [setActiveState],
  );

  const handleBorderColorChange = useCallback(
    (color: string) => {
      setActiveState((prev) => ({ ...prev, borderColor: color }));
    },
    [setActiveState],
  );

  const handleBorderThicknessChange = useCallback(
    (thickness: number) => {
      setActiveState((prev) => ({ ...prev, borderThickness: thickness }));
    },
    [setActiveState],
  );

  const handleCornerRadiusChange = useCallback(
    (radius: number) => {
      setActiveState((prev) => ({ ...prev, cornerRadius: radius }));
    },
    [setActiveState],
  );

  const handleScaleChange = useCallback(
    (scale: number) => {
      setActiveState((prev) => ({ ...prev, scale }));
    },
    [setActiveState],
  );

  const handleRotationChange = useCallback(
    (rotation: number) => {
      setActiveState((prev) => ({ ...prev, rotation }));
    },
    [setActiveState],
  );

  const handleAddText = useCallback(
    (content: string) => {
      // Removed fontSize and fill as they come from activeState
      setActiveState((prev) => {
        const newText: TextElement = {
          id: `text-${prev.texts.length}-${Date.now()}`,
          x: 50,
          y: 50,
          content,
          fontSize: prev.defaultTextFontSize, // Use default from activeState
          fontFamily: "Arial",
          fill: prev.defaultTextColor, // Use default from activeState
        };
        return { ...prev, texts: [...prev.texts, newText] };
      });
    },
    [setActiveState],
  );

  const handleTextDragEnd = useCallback(
    (id: string, newX: number, newY: number) => {
      setActiveState((prev) => ({
        ...prev,
        texts: prev.texts.map((text) =>
          text.id === id ? { ...text, x: newX, y: newY } : text,
        ),
      }));
    },
    [setActiveState],
  );

  const handleEditText = useCallback(
    (id: string, newContent: string) => {
      setActiveState((prev) => ({
        ...prev,
        texts: prev.texts.map((text) =>
          text.id === id ? { ...text, content: newContent } : text,
        ),
      }));
    },
    [setActiveState],
  );

  const handleToggleTextBold = useCallback(
    (id: string) => {
      setActiveState((prev) => ({
        ...prev,
        texts: prev.texts.map((text) =>
          text.id === id
            ? {
                ...text,
                fontStyle: text.fontStyle === "bold" ? "normal" : "bold",
              }
            : text,
        ),
      }));
    },
    [setActiveState],
  );

  // Handlers for default text properties
  const handleDefaultTextContentChange = useCallback(
    (content: string) => {
      setActiveState((prev) => ({ ...prev, defaultTextContent: content }));
    },
    [setActiveState],
  );

  const handleDefaultTextFontSizeChange = useCallback(
    (size: number) => {
      setActiveState((prev) => ({ ...prev, defaultTextFontSize: size }));
    },
    [setActiveState],
  );

  const handleDefaultTextColorChange = useCallback(
    (color: string) => {
      setActiveState((prev) => ({ ...prev, defaultTextColor: color }));
    },
    [setActiveState],
  );

  // Canvas margin handlers (apply to entire canvas area)
  const handleCanvasMarginTopChange = useCallback((margin: number) => {
    setCanvasMargins((prev) => ({ ...prev, top: margin }));
  }, []);

  const handleCanvasMarginBottomChange = useCallback((margin: number) => {
    setCanvasMargins((prev) => ({ ...prev, bottom: margin }));
  }, []);

  const handleCanvasMarginLeftChange = useCallback((margin: number) => {
    setCanvasMargins((prev) => ({ ...prev, left: margin }));
  }, []);

  const handleCanvasMarginRightChange = useCallback((margin: number) => {
    setCanvasMargins((prev) => ({ ...prev, right: margin }));
  }, []);

  const handleAddQrCode = useCallback(
    async (url: string) => {
      if (!url) {
        alert("QR Code URL cannot be empty.");
        return;
      }
      try {
        const qrDataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "H",
          width: 100,
        });
        setActiveState((prev) => {
          const newQrCode: QrCodeElement = {
            id: `qrcode-${prev.qrCodes.length}-${Date.now()}`,
            x: 100, // Default position
            y: 100, // Default position
            dataUrl: qrDataUrl,
            size: 100, // Default size
          };
          return { ...prev, qrCodes: [...prev.qrCodes, newQrCode] };
        });
      } catch (err) {
        console.error("Failed to generate QR code:", err);
        alert("Failed to generate QR code. Please check the URL.");
      }
    },
    [setActiveState],
  );

  const onQrCodeDragEnd = useCallback(
    (id: string, newX: number, newY: number) => {
      setActiveState((prev) => ({
        ...prev,
        qrCodes: prev.qrCodes.map((qr) =>
          qr.id === id ? { ...qr, x: newX, y: newY } : qr,
        ),
      }));
    },
    [setActiveState],
  );

  const handleRemoveImage = useCallback(() => {
    setActiveState((prev) => ({ ...prev, imageDataUrl: null }));
  }, [setActiveState]);

  const handleRemoveQrCode = useCallback(
    (id: string) => {
      setActiveState((prev) => ({
        ...prev,
        qrCodes: prev.qrCodes.filter((qr) => qr.id !== id),
      }));
    },
    [setActiveState],
  );

  const handleRemoveText = useCallback(
    (id: string) => {
      setActiveState((prev) => ({
        ...prev,
        texts: prev.texts.filter((text) => text.id !== id),
      }));
    },
    [setActiveState],
  );

  const generateThumbnail = useCallback(
    async (state: EditorState): Promise<string> => {
      const THUMBNAIL_SIZE = 100;
      const stage = new Konva.Stage({
        container: document.createElement("div"),
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
      });
      const layer = new Konva.Layer();
      stage.add(layer);

      // Draw background
      layer.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
          fill: "#eeeeee",
        }),
      );

      // Draw border (simplified for thumbnail)
      if (state.borderThickness > 0) {
        layer.add(
          new Konva.Rect({
            x: 0,
            y: 0,
            width: THUMBNAIL_SIZE,
            height: THUMBNAIL_SIZE,
            fill: state.borderColor,
            cornerRadius: state.cornerRadius + state.borderThickness,
          }),
        );
      }

      // Draw text placeholder
      if (state.defaultTextContent) {
        const text = new Konva.Text({
          x: 5,
          y: 5,
          text:
            state.defaultTextContent.substring(0, 10) +
            (state.defaultTextContent.length > 10 ? "..." : ""), // Truncate text
          fontSize: 10,
          fill: state.defaultTextColor,
          width: THUMBNAIL_SIZE - 10,
          height: THUMBNAIL_SIZE - 10,
          verticalAlign: "middle",
          align: "center",
        });
        layer.add(text);
      }

      layer.draw();
      const dataUrl = await stage.toDataURL();
      stage.destroy();
      return dataUrl;
    },
    [],
  );

  const saveTemplate = useCallback(
    async (name: string) => {
      if (!name) {
        alert("Template name cannot be empty.");
        return;
      }
      const { imageDataUrl, scale, rotation, qrCodes, ...settingsToSave } =
        activeState;
      const thumbnailDataUrl = await generateThumbnail(activeState); // Generate thumbnail

      const newTemplate: Template = {
        name,
        ...settingsToSave,
        thumbnailDataUrl,
      };
      setTemplates((prev) => {
        const existingIndex = prev.findIndex((t) => t.name === name);
        if (existingIndex > -1) {
          const updatedTemplates = [...prev];
          updatedTemplates[existingIndex] = newTemplate;
          return updatedTemplates;
        }
        return [...prev, newTemplate];
      });
    },
    [activeState, setTemplates, generateThumbnail],
  );

  const loadTemplate = useCallback(
    (template: Template) => {
      setActiveState((prev) => ({
        ...prev,
        borderColor: template.borderColor,
        borderThickness: template.borderThickness,
        cornerRadius: template.cornerRadius,
        defaultTextContent: template.defaultTextContent,
        defaultTextFontSize: template.defaultTextFontSize,
        defaultTextColor: template.defaultTextColor,
        texts: template.texts || [], // Restore text elements from template
      }));
    },
    [setActiveState],
  );

  const deleteTemplate = useCallback(
    (name: string) => {
      if (
        window.confirm(`Are you sure you want to delete template "${name}"?`)
      ) {
        setTemplates((prev) => {
          const updatedTemplates = prev.filter((t) => t.name !== name);
          return updatedTemplates;
        });
      }
    },
    [setTemplates],
  );
  // High-resolution print preparation
  const preparePrintContent = useCallback(async () => {
    const printContainer = printContentRef.current;
    if (!printContainer) return;

    // Create a high-res canvas for printing
    let printWidth: number;
    let printHeight: number;

    if (layoutMode === "4cards-portrait") {
      printWidth = PRINT_PORTRAIT_WIDTH;
      printHeight = PRINT_PORTRAIT_HEIGHT;
    } else {
      printWidth = PRINT_ASPECT_RATIO_WIDTH;
      printHeight = PRINT_ASPECT_RATIO_HEIGHT;
    }

    // High-res multiplier
    const multiplier = 3;
    const highResWidth = printWidth * multiplier;
    const highResHeight = printHeight * multiplier;

    const printCanvas = document.createElement("canvas");
    printCanvas.width = highResWidth;
    printCanvas.height = highResHeight;
    printCanvas.style.width = `${printWidth}px`;
    printCanvas.style.height = `${printHeight}px`;

    const ctx = printCanvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, highResWidth, highResHeight);

    // Calculate content area size after margins (in high-res)
    const marginLeft = canvasMargins.left * multiplier;
    const marginRight = canvasMargins.right * multiplier;
    const marginTop = canvasMargins.top * multiplier;
    const marginBottom = canvasMargins.bottom * multiplier;

    const contentWidth = highResWidth - marginLeft - marginRight;
    const contentHeight = highResHeight - marginTop - marginBottom;

    // Capture stages at high resolution
    if (layoutMode === "2x3") {
      const leftStage = editorStageRefs.current["top-left"];
      const rightStage = editorStageRefs.current["top-right"];
      if (!leftStage || !rightStage) return;

      const leftCanvas = await leftStage.toCanvas({ pixelRatio: multiplier });
      const rightCanvas = await rightStage.toCanvas({ pixelRatio: multiplier });

      const halfContentWidth = contentWidth / 2;

      // Draw left card at (marginLeft, marginTop) with half content width
      ctx.drawImage(
        leftCanvas,
        marginLeft,
        marginTop,
        halfContentWidth,
        contentHeight,
      );
      // Draw right card at (marginLeft + halfContentWidth, marginTop) with half content width
      ctx.drawImage(
        rightCanvas,
        marginLeft + halfContentWidth,
        marginTop,
        halfContentWidth,
        contentHeight,
      );
    } else if (layoutMode === "4cards" || layoutMode === "4cards-portrait") {
      const tlStage = editorStageRefs.current["top-left"];
      const trStage = editorStageRefs.current["top-right"];
      const blStage = editorStageRefs.current["bottom-left"];
      const brStage = editorStageRefs.current["bottom-right"];

      if (!tlStage || !trStage || !blStage || !brStage) return;

      const tlCanvas = await tlStage.toCanvas({ pixelRatio: multiplier });
      const trCanvas = await trStage.toCanvas({ pixelRatio: multiplier });
      const blCanvas = await blStage.toCanvas({ pixelRatio: multiplier });
      const brCanvas = await brStage.toCanvas({ pixelRatio: multiplier });

      const cardWidth = contentWidth / 2;
      const cardHeight = contentHeight / 2;

      ctx.drawImage(tlCanvas, marginLeft, marginTop, cardWidth, cardHeight);
      ctx.drawImage(
        trCanvas,
        marginLeft + cardWidth,
        marginTop,
        cardWidth,
        cardHeight,
      );
      ctx.drawImage(
        blCanvas,
        marginLeft,
        marginTop + cardHeight,
        cardWidth,
        cardHeight,
      );
      ctx.drawImage(
        brCanvas,
        marginLeft + cardWidth,
        marginTop + cardHeight,
        cardWidth,
        cardHeight,
      );
    } else {
      // Single layout
      const stage = editorRef.current;
      if (!stage) return;

      const canvas = await stage.toCanvas({ pixelRatio: multiplier });
      ctx.drawImage(canvas, marginLeft, marginTop, contentWidth, contentHeight);
    }

    // Replace the editor content with high-res canvas for printing
    printContainer.innerHTML = "";
    printContainer.appendChild(printCanvas);
  }, [layoutMode, canvasMargins]);

  // State to force editor re-render after print
  const [printVersion, setPrintVersion] = useState(0);

  const handlePrint = useReactToPrint({
    contentRef: printContentRef,
    onBeforePrint: preparePrintContent,
    onAfterPrint: () => {
      // Force React to re-render the editor by updating state
      setPrintVersion((v) => v + 1);
    },
    documentTitle: "Image Print",
    pageStyle: `
      @page { 
        size: ${layoutMode === "4cards-portrait" ? `${PRINT_PORTRAIT_WIDTH}px ${PRINT_PORTRAIT_HEIGHT}px` : `${PRINT_ASPECT_RATIO_WIDTH}px ${PRINT_ASPECT_RATIO_HEIGHT}px`}; 
        margin: 0; 
      } 
      @media print { 
        body { 
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* White background */
        body, html, #root, .app-container, .editor-panel, div {
          background: white !important;
          background-color: white !important;
        }
        
        /* Remove all borders and padding from editor wrappers */
        .editor-wrapper,
        .active-editor-wrapper {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        /* Hide upload icon overlay */
        .upload-icon-overlay {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Hide remove buttons */
        .element-remove-btn {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Remove gaps between cards */
        div[style*="display: flex"] {
          gap: 0 !important;
        }
        
        div[style*="display: grid"] {
          gap: 0 !important;
        }
      }
    `,
  });

  const editorPanelContent = useMemo(() => {
    if (layoutMode === "2x3") {
      return (
        <div style={{ display: "flex", gap: "10px" }}>
          <div
            onClick={() => setActiveEditor("top-left")}
            className={
              activeEditor === "top-left"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["top-left"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={PRINT_ASPECT_RATIO_WIDTH / 2}
              canvasHeight={PRINT_ASPECT_RATIO_HEIGHT}
              onStageReady={(stage) => {
                editorStageRefs.current["top-left"] = stage;
              }}
              marginTop={canvasMargins.top}
              marginBottom={canvasMargins.bottom}
              marginLeft={canvasMargins.left}
              marginRight={canvasMargins.right}
            />
          </div>
          <div
            onClick={() => setActiveEditor("top-right")}
            className={
              activeEditor === "top-right"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["top-right"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={PRINT_ASPECT_RATIO_WIDTH / 2}
              canvasHeight={PRINT_ASPECT_RATIO_HEIGHT}
              onStageReady={(stage) => {
                editorStageRefs.current["top-right"] = stage;
              }}
              marginTop={canvasMargins.top}
              marginBottom={canvasMargins.bottom}
              marginLeft={canvasMargins.left}
              marginRight={canvasMargins.right}
            />
          </div>
        </div>
      );
    } else if (layoutMode === "4cards") {
      const cardWidth = PRINT_ASPECT_RATIO_WIDTH / 2;
      const cardHeight = PRINT_ASPECT_RATIO_HEIGHT / 2;
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(2, ${cardWidth}px)`,
            gridTemplateRows: `repeat(2, ${cardHeight}px)`,
            gap: "5px",
          }}
        >
          <div
            onClick={() => setActiveEditor("top-left")}
            className={
              activeEditor === "top-left"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["top-left"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={cardWidth}
              canvasHeight={cardHeight}
              onStageReady={(stage) => {
                editorStageRefs.current["top-left"] = stage;
              }}
              marginTop={canvasMargins.top}
              marginBottom={0}
              marginLeft={canvasMargins.left}
              marginRight={0}
            />
          </div>
          <div
            onClick={() => setActiveEditor("top-right")}
            className={
              activeEditor === "top-right"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["top-right"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={cardWidth}
              canvasHeight={cardHeight}
              onStageReady={(stage) => {
                editorStageRefs.current["top-right"] = stage;
              }}
              marginTop={canvasMargins.top}
              marginBottom={0}
              marginLeft={0}
              marginRight={canvasMargins.right}
            />
          </div>
          <div
            onClick={() => setActiveEditor("bottom-left")}
            className={
              activeEditor === "bottom-left"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["bottom-left"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={cardWidth}
              canvasHeight={cardHeight}
              onStageReady={(stage) => {
                editorStageRefs.current["bottom-left"] = stage;
              }}
              marginTop={0}
              marginBottom={canvasMargins.bottom}
              marginLeft={canvasMargins.left}
              marginRight={0}
            />
          </div>
          <div
            onClick={() => setActiveEditor("bottom-right")}
            className={
              activeEditor === "bottom-right"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["bottom-right"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={cardWidth}
              canvasHeight={cardHeight}
              onStageReady={(stage) => {
                editorStageRefs.current["bottom-right"] = stage;
              }}
              marginTop={0}
              marginBottom={canvasMargins.bottom}
              marginLeft={0}
              marginRight={canvasMargins.right}
            />
          </div>
        </div>
      );
    } else if (layoutMode === "4cards-portrait") {
      const cardWidth = PRINT_PORTRAIT_WIDTH / 2;
      const cardHeight = PRINT_PORTRAIT_HEIGHT / 2;
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(2, ${cardWidth}px)`,
            gridTemplateRows: `repeat(2, ${cardHeight}px)`,
            gap: "5px",
          }}
        >
          <div
            onClick={() => setActiveEditor("top-left")}
            className={
              activeEditor === "top-left"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["top-left"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={cardWidth}
              canvasHeight={cardHeight}
              onStageReady={(stage) => {
                editorStageRefs.current["top-left"] = stage;
              }}
              marginTop={canvasMargins.top}
              marginBottom={0}
              marginLeft={canvasMargins.left}
              marginRight={0}
            />
          </div>
          <div
            onClick={() => setActiveEditor("top-right")}
            className={
              activeEditor === "top-right"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["top-right"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={cardWidth}
              canvasHeight={cardHeight}
              onStageReady={(stage) => {
                editorStageRefs.current["top-right"] = stage;
              }}
              marginTop={canvasMargins.top}
              marginBottom={0}
              marginLeft={0}
              marginRight={canvasMargins.right}
            />
          </div>
          <div
            onClick={() => setActiveEditor("bottom-left")}
            className={
              activeEditor === "bottom-left"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["bottom-left"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={cardWidth}
              canvasHeight={cardHeight}
              onStageReady={(stage) => {
                editorStageRefs.current["bottom-left"] = stage;
              }}
              marginTop={0}
              marginBottom={canvasMargins.bottom}
              marginLeft={canvasMargins.left}
              marginRight={0}
            />
          </div>
          <div
            onClick={() => setActiveEditor("bottom-right")}
            className={
              activeEditor === "bottom-right"
                ? "active-editor-wrapper"
                : "editor-wrapper"
            }
          >
            <Editor
              {...editorStates["bottom-right"]}
              onTextDragEnd={handleTextDragEnd}
              onQrCodeDragEnd={onQrCodeDragEnd}
              onUploadClick={triggerFileInput}
              canvasWidth={cardWidth}
              canvasHeight={cardHeight}
              onStageReady={(stage) => {
                editorStageRefs.current["bottom-right"] = stage;
              }}
              marginTop={0}
              marginBottom={canvasMargins.bottom}
              marginLeft={0}
              marginRight={canvasMargins.right}
            />
          </div>
        </div>
      );
    }
    // 'current' layout
    return (
      <Editor
        {...editorStates["top-left"]} // 'top-left' is the default for single layout
        onTextDragEnd={handleTextDragEnd}
        onQrCodeDragEnd={onQrCodeDragEnd}
        onUploadClick={triggerFileInput}
        canvasWidth={PRINT_ASPECT_RATIO_WIDTH}
        canvasHeight={PRINT_ASPECT_RATIO_HEIGHT}
        onStageReady={(stage) => {
          editorRef.current = stage;
        }} // Set editorRef to the Stage
        marginTop={canvasMargins.top}
        marginBottom={canvasMargins.bottom}
        marginLeft={canvasMargins.left}
        marginRight={canvasMargins.right}
      />
    );
  }, [
    layoutMode,
    editorStates,
    activeEditor,
    handleTextDragEnd,
    onQrCodeDragEnd,
    triggerFileInput,
    printVersion,
    canvasMargins,
  ]);

  return (
    <div className="app-container">
      <div className="controls-panel">
        <Controls
          onImageUpload={handleImageUpload}
          onBorderColorChange={handleBorderColorChange}
          onBorderThicknessChange={handleBorderThicknessChange}
          onCornerRadiusChange={handleCornerRadiusChange}
          onScaleChange={handleScaleChange}
          onRotationChange={handleRotationChange}
          // QR Code Handlers
          onAddQrCode={handleAddQrCode}
          onRemoveQrCode={handleRemoveQrCode}
          // Pass default text handlers
          onDefaultTextContentChange={handleDefaultTextContentChange}
          onDefaultTextFontSizeChange={handleDefaultTextFontSizeChange}
          onDefaultTextColorChange={handleDefaultTextColorChange}
          onAddText={handleAddText}
          onRemoveText={handleRemoveText}
          onEditText={handleEditText}
          onToggleTextBold={handleToggleTextBold}
          onPrint={handlePrint}
          layoutMode={layoutMode}
          onLayoutChange={setLayoutMode}
          activeState={activeState}
          templates={templates}
          saveTemplate={saveTemplate}
          loadTemplate={loadTemplate}
          deleteTemplate={deleteTemplate}
          fileInputRef={fileInputRef} // Pass fileInputRef to Controls
          onRemoveImage={handleRemoveImage}
          // Canvas margin state and handlers
          canvasMargins={canvasMargins}
          onCanvasMarginTopChange={handleCanvasMarginTopChange}
          onCanvasMarginBottomChange={handleCanvasMarginBottomChange}
          onCanvasMarginLeftChange={handleCanvasMarginLeftChange}
          onCanvasMarginRightChange={handleCanvasMarginRightChange}
        />
      </div>
      <div className="editor-panel">
        <div ref={printContentRef}>{editorPanelContent}</div>
      </div>
    </div>
  );
}

export default App;
