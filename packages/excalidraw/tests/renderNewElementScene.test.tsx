import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderNewElementScene } from "../renderer/renderNewElementScene";
import { isInvisiblySmallElement, shouldApplyFrameClip, getTargetFrame, renderElement } from "@excalidraw/element";
import { bootstrapCanvas, getNormalizedCanvasDimensions } from "../renderer/helpers";
import { frameClip } from "../renderer/staticScene";

// Mocks
vi.mock("@excalidraw/element");
vi.mock("../renderer/helpers");
vi.mock("../renderer/staticScene");
vi.mock("@excalidraw/common", () => ({
  throttleRAF: (fn: any) => fn,
  MIME_TYPES: {
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    ico: "image/x-icon",
    avif: "image/avif",
    jfif: "image/jfif",
    text: "text/plain",
    html: "text/html",
    "excalidraw.svg": "image/svg+xml",
    "excalidraw.png": "image/png",
    binary: "application/octet-stream",
  },
}));

describe("renderNewElementScene - Testes de Unidade", () => {
  let mockCanvas: any;
  let mockContext: any;
  let mockRc: any;
  let mockElementsMap: any;
  let mockAllElementsMap: any;
  let mockAppState: any;
  let mockRenderConfig: any;

  beforeEach(() => {
    // Setup mock context
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      clearRect: vi.fn(),
    };

    // Setup mock canvas
    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 800,
      height: 600,
    };

    mockRc = {};
    mockElementsMap = new Map();
    mockAllElementsMap = new Map();
    
    mockAppState = {
      zoom: { value: 1 },
      frameRendering: {
        enabled: false,
        clip: false,
      },
      frameToHighlight: null,
    };

    mockRenderConfig = {
      canvas: mockCanvas,
      rc: mockRc,
      newElement: null,
      elementsMap: mockElementsMap,
      allElementsMap: mockAllElementsMap,
      scale: 1,
      appState: mockAppState,
      renderConfig: {},
    };

    // Setup default mock returns
    vi.mocked(getNormalizedCanvasDimensions).mockReturnValue([800, 600]);
    vi.mocked(bootstrapCanvas).mockReturnValue(mockContext);
    vi.mocked(isInvisiblySmallElement).mockReturnValue(false);
    vi.mocked(shouldApplyFrameClip).mockReturnValue(false);
    vi.mocked(getTargetFrame).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // CT1: Canvas existe/válido
  test("CT1: Canvas existe e é válido - renderização inicia normalmente", () => {
    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
    };

    renderNewElementScene(config);

    expect(bootstrapCanvas).toHaveBeenCalled();
    expect(mockContext.save).toHaveBeenCalled();
    expect(mockContext.scale).toHaveBeenCalled();
    expect(mockContext.restore).toHaveBeenCalled();
  });

  // CT2: Canvas não existe
  test("CT2: Canvas não existe - nenhuma renderização é feita", () => {
    const config = {
      ...mockRenderConfig,
      canvas: null,
    };

    renderNewElementScene(config);

    expect(bootstrapCanvas).not.toHaveBeenCalled();
    expect(mockContext.save).not.toHaveBeenCalled();
  });

  // CT3: Element é nulo
  test("CT3: newElement é nulo - canvas é limpo", () => {
    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: null,
    };

    renderNewElementScene(config);

    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(renderElement).not.toHaveBeenCalled();
  });

  // CT4: Elemento é uma seleção
  test("CT4: Elemento é uma seleção - canvas é limpo", () => {
    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: {
        id: "test-1",
        type: "selection",
      },
    };

    renderNewElementScene(config);

    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(renderElement).not.toHaveBeenCalled();
  });

  // CT5: Elemento é válido
  test("CT5: Elemento é válido (não nulo e não é selection) - elemento é renderizado", () => {
    const mockElement = {
      id: "test-1",
      type: "rectangle",
      frameId: null,
    };

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
    };

    renderNewElementScene(config);

    expect(renderElement).toHaveBeenCalledWith(
      mockElement,
      mockElementsMap,
      mockAllElementsMap,
      mockRc,
      mockContext,
      {},
      mockAppState
    );
    expect(mockContext.clearRect).not.toHaveBeenCalled();
  });

  // CT6: Elemento visível (length >= 2)
  test("CT6: Elemento visível (tamanho válido) - elemento é renderizado", () => {
    vi.mocked(isInvisiblySmallElement).mockReturnValue(false);

    const mockElement = {
      id: "test-1",
      type: "rectangle",
      width: 100,
      height: 100,
    };

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
    };

    renderNewElementScene(config);

    expect(isInvisiblySmallElement).toHaveBeenCalledWith(mockElement);
    expect(renderElement).toHaveBeenCalled();
  });

  // CT7: Elemento invisível (length < 2)
  test("CT7: Elemento invisível (muito pequeno) - renderização é interrompida", () => {
    vi.mocked(isInvisiblySmallElement).mockReturnValue(true);

    const mockElement = {
      id: "test-1",
      type: "rectangle",
      width: 1,
      height: 1,
    };

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
    };

    renderNewElementScene(config);

    expect(isInvisiblySmallElement).toHaveBeenCalledWith(mockElement);
    expect(renderElement).not.toHaveBeenCalled();
  });

  // CT8: Frame não possui clip ativo (frameId = false)
  test("CT8: frameId é false - nenhum recorte aplicado", () => {
    const mockElement = {
      id: "test-1",
      type: "rectangle",
      frameId: null,
    };

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
      appState: {
        ...mockAppState,
        frameRendering: {
          enabled: true,
          clip: true,
        },
      },
    };

    renderNewElementScene(config);

    expect(frameClip).not.toHaveBeenCalled();
    expect(renderElement).toHaveBeenCalled();
  });

  // CT9: Frame rendering desabilitado
  test("CT9: frameRendering.enabled é false - nenhum recorte aplicado", () => {
    const mockElement = {
      id: "test-1",
      type: "rectangle",
      frameId: "frame-1",
    };

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
      appState: {
        ...mockAppState,
        frameRendering: {
          enabled: false,
          clip: true,
        },
      },
    };

    renderNewElementScene(config);

    expect(frameClip).not.toHaveBeenCalled();
    expect(renderElement).toHaveBeenCalled();
  });

  // CT10: Frame clip inexistente
  test("CT10: frameRendering.clip é false - nenhum recorte aplicado", () => {
    const mockElement = {
      id: "test-1",
      type: "rectangle",
      frameId: "frame-1",
    };

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
      appState: {
        ...mockAppState,
        frameRendering: {
          enabled: true,
          clip: false,
        },
      },
    };

    renderNewElementScene(config);

    expect(frameClip).not.toHaveBeenCalled();
    expect(renderElement).toHaveBeenCalled();
  });

  // CT11: Frame válido com clip e rendering habilitados
  test("CT11: Frame válido com clip e rendering habilitados - recorte aplicado", () => {
    const mockFrame = { id: "frame-1", type: "frame" };
    const mockElement = {
      id: "test-1",
      type: "rectangle",
      frameId: "frame-1",
    };

    vi.mocked(getTargetFrame).mockReturnValue(mockFrame);
    vi.mocked(shouldApplyFrameClip).mockReturnValue(true);

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
      appState: {
        ...mockAppState,
        frameRendering: {
          enabled: true,
          clip: true,
        },
      },
    };

    renderNewElementScene(config);

    expect(getTargetFrame).toHaveBeenCalledWith(mockElement, mockElementsMap, config.appState);
    expect(shouldApplyFrameClip).toHaveBeenCalledWith(mockElement, mockFrame, config.appState, mockElementsMap);
    expect(frameClip).toHaveBeenCalledWith(mockFrame, mockContext, {}, config.appState);
    expect(renderElement).toHaveBeenCalled();
  });

  // CT12: Frame não existe
  test("CT12: frame é null - nenhum recorte é aplicado", () => {
    const mockElement = {
      id: "test-1",
      type: "rectangle",
      frameId: "frame-1",
    };

    vi.mocked(getTargetFrame).mockReturnValue(null);
    vi.mocked(shouldApplyFrameClip).mockReturnValue(true);

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
      appState: {
        ...mockAppState,
        frameRendering: {
          enabled: true,
          clip: true,
        },
      },
    };

    renderNewElementScene(config);

    expect(getTargetFrame).toHaveBeenCalled();
    expect(frameClip).not.toHaveBeenCalled();
    expect(renderElement).toHaveBeenCalled();
  });

  // CT13: Frame existe mas recorte não deve ser aplicado
  test("CT13: Frame existe mas shouldApplyFrameClip retorna false - nenhum recorte aplicado", () => {
    const mockFrame = { id: "frame-1", type: "frame" };
    const mockElement = {
      id: "test-1",
      type: "rectangle",
      frameId: "frame-1",
    };

    vi.mocked(getTargetFrame).mockReturnValue(mockFrame);
    vi.mocked(shouldApplyFrameClip).mockReturnValue(false);

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
      appState: {
        ...mockAppState,
        frameRendering: {
          enabled: true,
          clip: true,
        },
      },
    };

    renderNewElementScene(config);

    expect(shouldApplyFrameClip).toHaveBeenCalled();
    expect(frameClip).not.toHaveBeenCalled();
    expect(renderElement).toHaveBeenCalled();
  });

  // CT14: Frame válido e clip é aplicável
  test("CT14: Frame válido e clip aplicável - executa o recorte com frameClip", () => {
    const mockFrame = { id: "frame-1", type: "frame" };
    const mockElement = {
      id: "test-1",
      type: "rectangle",
      frameId: "frame-1",
    };

    vi.mocked(getTargetFrame).mockReturnValue(mockFrame);
    vi.mocked(shouldApplyFrameClip).mockReturnValue(true);

    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
      newElement: mockElement,
      appState: {
        ...mockAppState,
        frameRendering: {
          enabled: true,
          clip: true,
        },
      },
    };

    renderNewElementScene(config);

    expect(frameClip).toHaveBeenCalledWith(mockFrame, mockContext, {}, config.appState);
    expect(renderElement).toHaveBeenCalled();
  });

  // CT15: Função throttle não fornecida
  test("CT15: throttle é false/undefined - usa renderização direta", () => {
    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
    };

    renderNewElementScene(config, false);

    expect(bootstrapCanvas).toHaveBeenCalled();
    expect(mockContext.save).toHaveBeenCalled();
  });

  // CT16: Função throttle fornecida
  test("CT16: throttle é true - cria renderização com controle de taxa", () => {
    const config = {
      ...mockRenderConfig,
      canvas: mockCanvas,
    };

    renderNewElementScene(config, true);

    // Como o throttleRAF está mockado para retornar a função diretamente,
    // a renderização ainda deve acontecer
    expect(bootstrapCanvas).toHaveBeenCalled();
    expect(mockContext.save).toHaveBeenCalled();
  });
});