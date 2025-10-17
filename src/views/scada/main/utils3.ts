import { ElMessage, ElMessageBox } from "element-plus";
import { nextTick } from "vue";
import { pathTool } from '../core/PathTool';
import { componentManager } from "../core/ComponentManager";
import { svgManager, createSvgComponent, cleanupAbnormalSvgElements } from "../core/SvgManager";
import {
  addResizeHandles,
  removeResizeHandles,
  fuxaResizeHandles
} from "../core/FuxaResizeHandles";
import * as echarts from "echarts";
// 从 utils4.ts 导入大型 DOM创建函数和图表相关函数
import {
  createWebcamElement,
  createIframeElement,
  createTableElement,
  initEChart,
  generateChartOptions,
  createChartElement
} from "./utils4";

// 重新导出从 utils4 导入的函数，供 index.vue 调用
export { createWebcamElement, createIframeElement, createTableElement, initEChart, generateChartOptions, createChartElement };

// 拖拽过程中更新路径SVG
export const updatePathSVGDuringDrag = (element: HTMLElement, deltaX: number, deltaY: number) => {
  // 这个函数暂时不更新SVG内部，因为路径是相对坐标系统
  // 拖拽时只移动整个容器位置，SVG内部的相对坐标不变
  // 实际的路径点坐标更新在mouseUp时进行
};

// 创建更新后的路径SVG
export const createUpdatedPathSVG = (pathComponent: any) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', `0 0 ${pathComponent.width} ${pathComponent.height}`);
  svg.style.overflow = 'visible';

  // 转换点坐标到相对坐标
  const relativePoints = pathComponent.points.map((point: any) => ({
    x: point.x - pathComponent.x,
    y: point.y - pathComponent.y
  }));

  // 创建路径线条
  if (relativePoints.length >= 2) {
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    const points = relativePoints.map((p: any) => `${p.x},${p.y}`).join(' ');

    polyline.setAttribute('points', points);
    polyline.setAttribute('stroke', pathComponent.properties.strokeColor);
    polyline.setAttribute('stroke-width', pathComponent.properties.strokeWidth.toString());
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(polyline);
  }

  // 创建节点圆圈
  if (pathComponent.properties.showNodes) {
    relativePoints.forEach((point: any) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', point.x.toString());
      circle.setAttribute('cy', point.y.toString());
      circle.setAttribute('r', pathComponent.properties.nodeSize.toString());
      circle.setAttribute('fill', pathComponent.properties.nodeColor);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');

      svg.appendChild(circle);
    });
  }

  return svg;
};

// 画布拖拽悬停
export const handleCanvasDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = "copy";

  // 添加视觉反馈
  const canvas = event.currentTarget as HTMLElement;
  canvas.classList.add("drag-over");
};

// 画布拖拽离开
export const handleCanvasDragLeave = (event: DragEvent) => {
  // 只有当离开画布容器时才移除样式
  const canvas = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as HTMLElement;

  if (!canvas.contains(relatedTarget)) {
    canvas.classList.remove("drag-over");
  }
};

// 处理拖拽结束
export const handleCanvasDragEnd = (event: DragEvent) => {
  const canvas = event.currentTarget as HTMLElement;
  canvas.classList.remove("drag-over");
};

// 处理直线工具的点击绘制
export const handleLineToolClick = (
  event: MouseEvent,
  scaledX: number,
  scaledY: number,
  lineDrawingState: any,
  canvasZoom: any,
  createTempLine: (canvas: HTMLElement, startX: number, startY: number) => void,
  handleLineDraw: (event: MouseEvent) => void,
  removeTempLine: () => void,
  createLineComponent: (startPoint: any, endPoint: any) => any,
  addComponentToCanvas: (componentInstance: any) => void,
  resetLineDrawingState: () => void,
  currentEditorMode: any,
  activeComponent: any,
  setCanvasMode: (mode: string) => void,
  ElMessage: any
) => {
  const canvas = event.currentTarget as HTMLElement;

  if (!lineDrawingState.isDrawing) {
    // 第一次点击：开始绘制直线
    lineDrawingState.isDrawing = true;
    lineDrawingState.startPoint = { x: scaledX, y: scaledY };

    // 创建临时预览线
    createTempLine(canvas, scaledX, scaledY);

    // 添加鼠标移动监听来预览直线
    canvas.addEventListener("mousemove", handleLineDraw);

    ElMessage.info("请点击第二个点来完成直线绘制");
  } else {
    // 第二次点击：完成直线绘制
    const endPoint = { x: scaledX, y: scaledY };

    // 移除临时预览线
    removeTempLine();

    // 创建最终的直线组件
    const lineComponent = createLineComponent(
      lineDrawingState.startPoint,
      endPoint
    );
    addComponentToCanvas(lineComponent);

    // 重置状态
    resetLineDrawingState();

    // 移除鼠标移动监听
    canvas.removeEventListener("mousemove", handleLineDraw);

    // 切换回选择模式
    currentEditorMode.value = "select";
    activeComponent.value = null;
    setCanvasMode("select");

    ElMessage.success("直线绘制完成");
  }
};

// 创建临时预览线
export const createTempLine = (
  canvas: HTMLElement,
  startX: number,
  startY: number,
  lineDrawingState: any
) => {
  const tempLine = document.createElement("div");
  tempLine.className = "temp-line";
  tempLine.style.cssText = `
    position: absolute;
    background: #409eff;
    height: 2px;
    transform-origin: left center;
    pointer-events: none;
    z-index: 999;
    left: ${startX}px;
    top: ${startY}px;
  `;

  lineDrawingState.tempLineElement = tempLine;
  canvas.appendChild(tempLine);
};

// 移除临时预览线
export const removeTempLine = (lineDrawingState: any) => {
  if (lineDrawingState.tempLineElement) {
    lineDrawingState.tempLineElement.remove();
    lineDrawingState.tempLineElement = null;
  }
};

// 处理直线绘制时的鼠标移动
export const handleLineDraw = (
  event: MouseEvent,
  lineDrawingState: any,
  canvasZoom: any
) => {
  if (
    !lineDrawingState.isDrawing ||
    !lineDrawingState.startPoint ||
    !lineDrawingState.tempLineElement
  ) {
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const currentX = Math.round(
    (event.clientX - rect.left) / (canvasZoom.value / 100)
  );
  const currentY = Math.round(
    (event.clientY - rect.top) / (canvasZoom.value / 100)
  );

  // 计算直线的长度和角度
  const deltaX = currentX - lineDrawingState.startPoint.x;
  const deltaY = currentY - lineDrawingState.startPoint.y;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  // 更新临时预览线
  lineDrawingState.tempLineElement.style.width = `${length}px`;
  lineDrawingState.tempLineElement.style.transform = `rotate(${angle}deg)`;
};

// 创建直线组件
export const createLineComponent = (
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number }
) => {
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  return {
    id: `line_${Date.now()}`,
    type: "line",
    name: "直线",
    svgPath: "@/assets/svg/line.svg",
    position: {
      x: startPoint.x,
      y: startPoint.y
    },
    size: {
      width: Math.max(length, 10), // 最小宽度10px
      height: 2
    },
    rotation: angle,
    lineData: {
      startPoint: startPoint,
      endPoint: endPoint,
      length: length
    },
    properties: {
      strokeColor: "#409eff",
      strokeWidth: 2,
      strokeStyle: "solid"
    },
    style: {
      backgroundColor: "#409eff",
      borderColor: "transparent",
      color: "#409eff",
      transform: `rotate(${angle}deg)`,
      transformOrigin: "left center"
    },
    updated: new Date().toISOString()
  };
};

// 重置直线绘制状态
export const resetLineDrawingState = (lineDrawingState: any) => {
  lineDrawingState.isDrawing = false;
  lineDrawingState.startPoint = null;
  lineDrawingState.tempLineElement = null;
  lineDrawingState.currentPoints = [];
};

// 处理图像工具的点击上传
export const handleImageToolClick = (
  event: MouseEvent,
  scaledX: number,
  scaledY: number,
  createImageComponent: (position: any, fileName: string, imageDataUrl: string, displayWidth: number, displayHeight: number, originalWidth: number, originalHeight: number) => any,
  addComponentToCanvas: (componentInstance: any) => void,
  currentEditorMode: any,
  activeComponent: any,
  setCanvasMode: (mode: string) => void,
  ElMessage: any
) => {
  // 创建文件输入元素
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";

  // 处理文件选择
  fileInput.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) {
      ElMessage.info("未选择文件");
      return;
    }

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      ElMessage.error("请选择图片文件");
      return;
    }

    // 检查文件大小 (限制为5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      ElMessage.error("图片文件大小不能超过5MB");
      return;
    }

    // 读取文件并创建图像组件
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const imageDataUrl = e.target?.result as string;

      // 创建图片元素来获取尺寸
      const tempImg = new Image();
      tempImg.onload = () => {
        // 计算合适的显示尺寸（最大300px，保持宽高比）
        const maxSize = 300;
        let displayWidth = tempImg.width;
        let displayHeight = tempImg.height;

        if (displayWidth > maxSize || displayHeight > maxSize) {
          const ratio = Math.min(
            maxSize / displayWidth,
            maxSize / displayHeight
          );
          displayWidth = Math.round(displayWidth * ratio);
          displayHeight = Math.round(displayHeight * ratio);
        }

        // 创建图像组件实例
        const imageComponent = createImageComponent(
          {
            x: scaledX,
            y: scaledY
          },
          file.name,
          imageDataUrl,
          displayWidth,
          displayHeight,
          tempImg.width,
          tempImg.height
        );

        // 添加到画布
        addComponentToCanvas(imageComponent);

        // 切换回选择模式
        currentEditorMode.value = "select";
        activeComponent.value = null;
        setCanvasMode("select");

        // ElMessage.success(`图片 "${file.name}" 已添加到画布`);
      };

      tempImg.onerror = () => {
        ElMessage.error("图片文件格式不支持或文件已损坏");
      };

      tempImg.src = imageDataUrl;
    };

    reader.onerror = () => {
      ElMessage.error("文件读取失败");
    };

    reader.readAsDataURL(file);

    // 清理文件输入元素
    document.body.removeChild(fileInput);
  };

  // 取消选择时的处理
  fileInput.oncancel = () => {
    document.body.removeChild(fileInput);
    ElMessage.info("已取消选择图片");
  };

  // 添加到DOM并触发点击
  document.body.appendChild(fileInput);
  fileInput.click();

  ElMessage.info("请选择要上传的图片文件");
};

// 处理文本工具的点击创建
export const handleTextToolClick = (
  event: MouseEvent,
  scaledX: number,
  scaledY: number,
  createTextComponent: (position: any) => any,
  addComponentToCanvas: (componentInstance: any) => void,
  currentEditorMode: any,
  activeComponent: any,
  setCanvasMode: (mode: string) => void,
  ElMessage: any
) => {
  // 创建文本组件实例
  const textComponent = createTextComponent({ x: scaledX, y: scaledY });

  // 添加到画布
  addComponentToCanvas(textComponent);

  // 切换回选择模式
  currentEditorMode.value = "select";
  activeComponent.value = null;
  setCanvasMode("select");

  ElMessage.success("文本框已添加到画布，点击可直接编辑");
};

// 处理iframe工具的点击创建
export const handleIframeToolClick = (
  event: MouseEvent,
  scaledX: number,
  scaledY: number,
  createIframeComponent: (position: any) => any,
  addComponentToCanvas: (componentInstance: any) => void,
  currentEditorMode: any,
  activeComponent: any,
  setCanvasMode: (mode: string) => void,
  ElMessage: any
) => {
  // 创建iframe组件实例
  const iframeComponent = createIframeComponent({ x: scaledX, y: scaledY });

  // 添加到画布
  addComponentToCanvas(iframeComponent);

  // 切换回选择模式
  currentEditorMode.value = "select";
  activeComponent.value = null;
  setCanvasMode("select");

  ElMessage.success("内嵌网页组件已添加，右键点击可配置URL");
};

// 处理视频工具的点击创建
export const handleVideoToolClick = (
  event: MouseEvent,
  scaledX: number,
  scaledY: number,
  createVideoComponent: (position: any) => any,
  addComponentToCanvas: (componentInstance: any) => void,
  currentEditorMode: any,
  activeComponent: any,
  setCanvasMode: (mode: string) => void,
  ElMessage: any
) => {
  // 创建视频组件实例
  const videoComponent = createVideoComponent({ x: scaledX, y: scaledY });

  // 添加到画布
  addComponentToCanvas(videoComponent);

  // 切换回选择模式
  currentEditorMode.value = "select";
  activeComponent.value = null;
  setCanvasMode("select");

  ElMessage.success("视频播放器已添加，右键点击可配置视频源");
};

// 创建文本组件
export const createTextComponent = (position: { x: number; y: number }) => {
  console.log('createTextComponent 调用，位置:', position);

  const textComponent = {
    id: `text_${Date.now()}`,
    type: "text-box",
    name: "文本框",
    title: "文本框", // 添加title，避免过长名称影响尺寸
    svgPath: "@/assets/svg/text.svg",
    // DrawingComponent 接口格式，使用固定合理尺寸
    x: position.x,
    y: position.y,
    width: 120,
    height: 40,
    // 同时保留原格式供其他部分使用
    position: position,
    size: {
      width: 120,
      height: 40
    },
    properties: {
      text: "文本框",
      fontSize: 14,
      fontFamily: "Arial",
      fontWeight: "normal",
      color: "#303133",
      textAlign: "left",
      verticalAlign: "middle",
      backgroundColor: "transparent",
      borderColor: "#409eff",
      borderWidth: 2,
      padding: 8
    },
    // 文本属性直接设置在顶层，便于属性面板读取
    text: "文本框",
    fontSize: 14,
    fontWeight: "normal",
    color: "#303133",
    textAlign: "left",
    verticalAlign: "middle",
    textDecoration: "none"
  };

  console.log('========== createTextComponent 详细调试 ==========');
  console.log('创建的组件:', textComponent);
  console.log('组件类型:', textComponent.type);
  console.log('组件尺寸:', { width: textComponent.width, height: textComponent.height });
  console.log('=========================================');
  return textComponent;
};

// 创建图像DOM元素
export const createImageElement = (component: any, canvasContent: Element, setupComponentInteractions: (element: HTMLElement, component: any) => void) => {
  const element = document.createElement("div");
  element.id = component.id;
  element.className = "fuxa-component image-component";

  // 设置容器样式
  element.style.cssText = `
    position: absolute;
    left: ${component.position.x}px;
    top: ${component.position.y}px;
    width: ${component.size.width}px;
    height: ${component.size.height}px;
    border: ${component.style?.borderWidth || 1}px solid ${component.style?.borderColor || "#e4e7ed"};
    border-radius: ${component.style?.borderRadius || 0}px;
    background: ${component.style?.backgroundColor || "transparent"};
    overflow: hidden;
    cursor: pointer;
    user-select: none;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // 创建图片元素
  const img = document.createElement("img");
  img.src = component.imageData.dataUrl || component.properties.src;
  img.alt = component.properties.alt || component.name;
  img.style.cssText = `
    max-width: 100%;
    max-height: 100%;
    object-fit: ${component.properties.objectFit || "contain"};
    opacity: ${component.properties.opacity || 1};
    filter: ${component.properties.filter || "none"};
    pointer-events: none;
    border-radius: ${component.properties.borderRadius || 0}px;
  `;

  // 图片加载错误处理
  img.onerror = () => {
    console.warn("图像加载失败:", component.imageData.fileName);
    element.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 12px;
        text-align: center;
        padding: 10px;
        width: 100%;
        height: 100%;
      ">
        <div style="font-size: 24px; margin-bottom: 8px;">🖼️</div>
        <div>图像加载失败</div>
        <div style="font-size: 10px; margin-top: 4px;">${component.imageData.fileName || "Unknown"}</div>
      </div>
    `;
  };

  // 图片加载成功处理
  img.onload = () => {
    console.log("图像加载成功:", component.imageData.fileName);
  };

  element.appendChild(img);

  // 存储原始边框样式（用于选中效果）
  element.setAttribute(
    "data-original-border-color",
    component.style?.borderColor || "#e4e7ed"
  );
  element.setAttribute(
    "data-original-border-width",
    (component.style?.borderWidth || 1) + "px"
  );

  // 添加图像数据属性
  element.setAttribute(
    "data-image-filename",
    component.imageData.fileName || ""
  );
  element.setAttribute(
    "data-image-original-size",
    `${component.imageData.originalWidth}x${component.imageData.originalHeight}`
  );

  // 设置组件交互
  setupComponentInteractions(element, component);

  canvasContent.appendChild(element);

  return element;
};

// 创建视频 DOM元素
export const createVideoElement = (component: any, canvasContent: Element, setupComponentInteractions: (element: HTMLElement, component: any) => void) => {
  const element = document.createElement("div");
  element.id = component.id;
  element.className = "fuxa-component video-component";

  // 设置容器样式
  element.style.cssText = `
    position: absolute;
    left: ${component.position.x}px;
    top: ${component.position.y}px;
    width: ${component.size.width}px;
    height: ${component.size.height}px;
    border: ${component.style?.borderWidth || 1}px solid ${component.style?.borderColor || "#e4e7ed"};
    border-radius: ${component.style?.borderRadius || 4}px;
    background: ${component.style?.backgroundColor || "#000000"};
    overflow: hidden;
    cursor: pointer;
    user-select: none;
    z-index: 10;
  `;

  // 创建video元素
  const video = document.createElement("video");

  // 设置video属性
  if (component.properties.url) {
    video.src = component.properties.url;
  }
  if (component.properties.poster) {
    video.poster = component.properties.poster;
  }

  video.controls = component.properties.controls !== false;
  video.autoplay = component.properties.autoplay === true;
  video.loop = component.properties.loop === true;
  video.muted = component.properties.muted === true;
  video.preload = component.properties.preload || "metadata";

  video.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  `;

  // 视频加载错误处理
  video.onerror = () => {
    console.warn("视频加载失败:", component.properties.url);
    element.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 12px;
        text-align: center;
        padding: 20px;
        width: 100%;
        height: 100%;
        background: #000;
      ">
        <div style="font-size: 48px; margin-bottom: 10px;">🎬</div>
        <div>视频加载失败</div>
        <div style="font-size: 10px; margin-top: 4px; word-break: break-all; color: #666;">${component.properties.url || "未设置视频URL"}</div>
      </div>
    `;
  };

  // 视频加载成功处理
  video.onloadedmetadata = () => {
    console.log("视频元数据加载成功:", component.properties.url);
  };

  element.appendChild(video);

  // 存储原始边框样式（用于选中效果）
  element.setAttribute(
    "data-original-border-color",
    component.style?.borderColor || "#e4e7ed"
  );
  element.setAttribute(
    "data-original-border-width",
    (component.style?.borderWidth || 1) + "px"
  );

  // 添加视频数据属性
  element.setAttribute("data-video-url", component.properties.url || "");
  if (component.properties.poster) {
    element.setAttribute("data-video-poster", component.properties.poster);
  }

  // 设置组件交互
  setupComponentInteractions(element, component);

  canvasContent.appendChild(element);

  return element;
};

// 创建按钮DOM元素 - 已移至 utils-button.ts

// 创建摄像头 DOM元素（实时视频流）
// createWebcamElement 已从 utils4.ts 导入

// 创建iframe DOM元素
// createIframeElement 已从 utils4.ts 导入

// 创建图像组件
export const createImageComponent = (
  position: { x: number; y: number },
  fileName: string,
  imageDataUrl: string,
  displayWidth: number,
  displayHeight: number,
  originalWidth: number,
  originalHeight: number
) => {
  return {
    id: `image_${Date.now()}`,
    type: "image",
    name: fileName || "图片",
    svgPath: "@/assets/svg/image.svg",
    position: position,
    size: {
      width: displayWidth,
      height: displayHeight
    },
    imageData: {
      fileName: fileName,
      dataUrl: imageDataUrl,
      originalWidth: originalWidth,
      originalHeight: originalHeight,
      displayWidth: displayWidth,
      displayHeight: displayHeight
    },
    properties: {
      src: imageDataUrl,
      alt: fileName,
      objectFit: "contain", // contain, cover, fill, scale-down, none
      borderRadius: 0,
      opacity: 1,
      filter: "none"
    },
    style: {
      backgroundColor: "transparent",
      borderColor: "#e4e7ed",
      borderWidth: 1,
      borderRadius: 0
    },
    updated: new Date().toISOString()
  };
};

// 创建iframe组件
export const createIframeComponent = (
  position: { x: number; y: number }
) => {
  return {
    id: `iframe_${Date.now()}`,
    type: "iframe",
    name: "内嵌网页",
    svgPath: "@/assets/svg/iframe.svg",
    position: position,
    size: {
      width: 600,
      height: 400
    },
    properties: {
      url: "https://www.example.com"
    },
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e4e7ed",
      borderWidth: 1,
      borderRadius: 4
    },
    updated: new Date().toISOString()
  };
};

// 创建视频组件
export const createVideoComponent = (
  position: { x: number; y: number }
) => {
  return {
    id: `video_${Date.now()}`,
    type: "video",
    name: "视频播放器",
    svgPath: "@/assets/svg/video.svg",
    position: position,
    size: {
      width: 640,
      height: 360
    },
    properties: {
      url: "",
      poster: "",
      controls: true,
      autoplay: false,
      loop: false,
      muted: false,
      preload: "metadata"
    },
    style: {
      backgroundColor: "#000000",
      borderColor: "#e4e7ed",
      borderWidth: 1,
      borderRadius: 4
    },
    updated: new Date().toISOString()
  };
};

// 创建表格组件
export const createTableComponent = (
  position: { x: number; y: number }
) => {
  return {
    id: `table_${Date.now()}`,
    type: "table",
    name: "数据表格",
    svgPath: "@/assets/svg/table.svg",
    position: position,
    size: {
      width: 600,
      height: 400
    },
    tableConfig: {
      title: "数据表格",
      border: true,
      stripe: true,
      size: "default",
      highlightCurrentRow: true,
      showHeader: true,
      columns: [
        { label: "序号", prop: "id", width: 80, align: "center", sortable: false, fixed: "" },
        { label: "名称", prop: "name", width: 0, align: "left", sortable: false, fixed: "" },
        { label: "状态", prop: "status", width: 100, align: "center", sortable: false, fixed: "" }
      ],
      datasetId: "",
      dataPath: "",
      pagination: {
        enabled: true,
        pageSize: 10,
        totalPath: "total"
      },
      autoRefresh: false,
      refreshInterval: 5000,
      headerBgColor: "#f5f7fa",
      headerTextColor: "#606266",
      rowBgColor: "#ffffff",
      stripeBgColor: "#fafafa",
      borderColor: "#ebeef5",
      hoverBgColor: "#f5f7fa"
    },
    properties: {},
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e4e7ed",
      borderWidth: 1,
      borderRadius: 4
    },
    updated: new Date().toISOString()
  };
};

// 处理表格工具的点击创建
export const handleTableToolClick = (
  event: MouseEvent,
  scaledX: number,
  scaledY: number,
  createTableComponent: (position: any) => any,
  addComponentToCanvas: (componentInstance: any) => void,
  currentEditorMode: any,
  activeComponent: any,
  setCanvasMode: (mode: string) => void,
  ElMessage: any
) => {
  // 创建表格组件实例
  const tableComponent = createTableComponent({
    x: scaledX,
    y: scaledY
  });

  // 添加到画布
  addComponentToCanvas(tableComponent);

  // 切换回选择模式
  currentEditorMode.value = "select";
  activeComponent.value = null;
  setCanvasMode("select");

  ElMessage.success("数据表格已添加到画布，右键点击可配置");
};

// 创建表格DOM元素

// 处理图表工具的点击创建
export const handleChartToolClick = (
  event: MouseEvent,
  scaledX: number,
  scaledY: number,
  componentType: any,
  createChartComponent: (position: any, componentType: any) => any,
  addComponentToCanvas: (componentInstance: any) => void,
  currentEditorMode: any,
  activeComponent: any,
  setCanvasMode: (mode: string) => void,
  ElMessage: any
) => {
  // 创建图表组件实例
  const chartComponent = createChartComponent(
    {
      x: scaledX,
      y: scaledY
    },
    componentType
  );

  // 添加到画布
  addComponentToCanvas(chartComponent);

  // 切换回选择模式
  currentEditorMode.value = "select";
  activeComponent.value = null;
  setCanvasMode("select");

  ElMessage.success(`${componentType.title}已添加到画布，右键点击可配置数据源`);
};

// 获取图表类型推荐尺寸
const getChartRecommendedSize = (chartType: string) => {
  const sizeMap = {
    'line': { width: 500, height: 300 },      // 折线图：中等宽度
    'bar': { width: 500, height: 300 },       // 柱状图：中等宽度
    'pie': { width: 450, height: 450 },       // 饼图：正方形更好
    'area': { width: 500, height: 300 },      // 面积图：中等宽度
    'gauge': { width: 450, height: 350 },     // 仪表盘：宽度略大于高度，适合半圆形仪表
    'radar': { width: 500, height: 500 },     // 雷达图：需要更大的正方形空间
    'funnel': { width: 450, height: 500 },    // 漏斗图：需要更高
    'scatter': { width: 500, height: 400 },   // 散点图：中等偏宽
    'candlestick': { width: 600, height: 400 } // K线图：需要更宽
  };

  return sizeMap[chartType] || { width: 400, height: 300 }; // 默认尺寸
};

// 创建图表组件
export const createChartComponent = (
  position: { x: number; y: number },
  componentType: any
) => {
  // 根据组件名称确定图表类型
  // 统一图表组件(unified-chart)默认为折线图
  let chartType = "line"; // 默认为折线图

  // 支持统一图表组件和旧版独立图表组件
  if (componentType.name === "unified-chart") {
    chartType = "line"; // 统一图表组件默认为折线图
  } else if (componentType.name === "pie-chart") {
    chartType = "pie"; // 兼容旧版饼图组件
  } else if (componentType.name === "chart") {
    chartType = "line"; // 兼容旧版折线图组件
  } else if (
    componentType.name === "bar-chart" ||
    componentType.name === "graphbar" ||
    componentType.name.includes("bar")
  ) {
    chartType = "bar"; // 兼容旧版条形图组件
  }

  // 根据图表类型获取推荐尺寸
  const recommendedSize = getChartRecommendedSize(chartType);

  return {
    id: `chart_${Date.now()}`,
    type: componentType.name,
    name: componentType.title,
    svgPath: componentType.iconPath || componentType.svgPath,
    position: position,
    size: recommendedSize,
    chartConfig: {
      type: chartType,
      title: componentType.title,
      dataSource: "static",
      staticData:
        chartType === "pie"
          ? [
              { name: "类别A", value: 35 },
              { name: "类别B", value: 25 },
              { name: "类别C", value: 20 },
              { name: "类别D", value: 20 }
            ]
          : [
              { name: "1月", value: 120 },
              { name: "2月", value: 200 },
              { name: "3月", value: 150 },
              { name: "4月", value: 180 }
            ],
      apiConfig: {
        url: "",
        method: "GET",
        headers: {},
        params: {},
        dataPath: "data"
      },
      mqttConfig: {
        topic: "",
        dataPath: "value"
      },
      refreshInterval: 5000,
      theme: "default"
    },
    properties: {
      backgroundColor: "#ffffff",
      borderColor: "#e4e7ed",
      borderWidth: 1,
      borderRadius: 4,
      showTitle: true,
      showLegend: true,
      showTooltip: true
    },
    style: {
      backgroundColor: "#ffffff",
      borderColor: "#e4e7ed",
      borderWidth: 1,
      borderRadius: 4
    },
    updated: new Date().toISOString()
  };
};

// 创建直线DOM元素
export const createLineElement = (component: any, canvasContent: Element, setupComponentInteractions: (element: HTMLElement, component: any) => void) => {
  const element = document.createElement("div");
  element.id = component.id;
  element.className = "fuxa-component line-component";

  // 设置基本样式
  element.style.cssText = `
    position: absolute;
    left: ${component.position.x}px;
    top: ${component.position.y}px;
    width: ${component.size.width}px;
    height: ${component.size.height}px;
    background: ${component.properties?.strokeColor || component.style?.backgroundColor || "#409eff"};
    border: none;
    pointer-events: auto;
    cursor: pointer;
    user-select: none;
    z-index: 10;
    transform-origin: left center;
  `;

  // 应用旋转变换
  if (component.rotation !== undefined) {
    element.style.transform = `rotate(${component.rotation}deg)`;
  } else if (component.style?.transform) {
    element.style.transform = component.style.transform;
  }

  // 存储原始边框样式（用于选中效果）
  element.setAttribute("data-original-border-color", "transparent");
  element.setAttribute("data-original-border-width", "0px");

  // 添加直线数据属性
  if (component.lineData) {
    element.setAttribute(
      "data-line-start",
      JSON.stringify(component.lineData.startPoint)
    );
    element.setAttribute(
      "data-line-end",
      JSON.stringify(component.lineData.endPoint)
    );
    element.setAttribute(
      "data-line-length",
      component.lineData.length.toString()
    );
  }

  // 设置组件交互
  setupComponentInteractions(element, component);

  canvasContent.appendChild(element);

  return element;
};

// 创建路径DOM元素
export const createPathElement = (component: any, canvasContent: Element, setupPathComponentInteractions: (element: HTMLElement, component: any) => void) => {
  // 转换为PathComponent格式
  const pathComponent = {
    id: component.id,
    type: component.type,
    x: component.position.x,
    y: component.position.y,
    width: component.size.width,
    height: component.size.height,
    points: component.properties?.points || [],
    properties: {
      strokeColor: component.properties?.strokeColor || '#409eff',
      strokeWidth: component.properties?.strokeWidth || 2,
      nodeColor: component.properties?.nodeColor || '#409eff',
      nodeSize: component.properties?.nodeSize || 6,
      showNodes: component.properties?.showNodes !== false
    }
  };

  // 使用PathTool创建SVG元素
  const pathElement = pathTool.createPathSVG(pathComponent);

  // 需要设置组件交互以支持属性面板，但要避免拖拽冲突
  // PathTool已经处理了拖拽，所以我们只设置其他交互
  setupPathComponentInteractions(pathElement, component);

  canvasContent.appendChild(pathElement);

  return pathElement;
};

// 设置路径组件特殊交互
export const setupPathComponentInteractions = (element: HTMLElement, component: any) => {
  // 路径组件的特殊交互处理
  element.addEventListener("click", e => {
    e.stopPropagation();
    // 选中路径组件的处理逻辑
    console.log('路径组件被点击:', component.id);
  });

  element.addEventListener("contextmenu", e => {
    e.preventDefault();
    e.stopPropagation();
    console.log('路径组件右键菜单:', component.id);
  });
};

// 键盘快捷键处理
export const handleKeydown = (
  event: KeyboardEvent,
  currentEditorMode: any,
  pathTool: any,
  lineDrawingState: any,
  removeTempLine: () => void,
  resetLineDrawingState: () => void,
  activeComponent: any,
  setCanvasMode: (mode: string) => void,
  selectedCanvasComponent: any,
  deleteSelectedComponent: () => void,
  saveProject: () => Promise<void>,
  handleCopyComponent: () => void,
  handleCutComponent: () => void,
  handlePasteComponent: () => void,
  clipboardData: any
) => {
  // 检查是否在输入框中，如果是则不处理快捷键
  const target = event.target as HTMLElement;
  const isInputElement =
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.contentEditable === "true" ||
    target.closest(".el-input") ||
    target.closest(".el-textarea") ||
    target.closest(".el-select") ||
    target.closest(".el-color-picker") ||
    target.closest(".property-form");

  // 如果在输入元素中，只处理ESC键，其他键让输入框正常处理
  if (isInputElement && event.key !== "Escape") {
    return;
  }

  // ESC 键切换到选择模式或取消直线绘制
  if (event.key === "Escape") {
    // 如果正在绘制路径，取消绘制
    if (currentEditorMode.value === "path" && pathTool.isActive()) {
      pathTool.stopDrawing();
      ElMessage.info("已取消路径绘制");
    }
    // 如果正在绘制直线，取消绘制
    else if (lineDrawingState.isDrawing) {
      removeTempLine();
      resetLineDrawingState();

      // 移除鼠标移动监听
      const canvas = document.querySelector(".fuxa-canvas");
      if (canvas) {
        canvas.removeEventListener("mousemove", handleLineDraw);
      }

      ElMessage.info("已取消直线绘制");
    }

    currentEditorMode.value = "select";
    activeComponent.value = null;
    setCanvasMode("select");
    ElMessage.info("已切换到选择模式");
    event.preventDefault();
  }

  // Delete 键删除选择的组件
  if (event.key === "Delete" && selectedCanvasComponent.value) {
    deleteSelectedComponent();
    event.preventDefault();
  }

  // Ctrl+Z 撤销 (占位，后续实现)
  if (event.ctrlKey && event.key === "z") {
    ElMessage.info("撤销功能尚未实现");
    event.preventDefault();
  }

  // Ctrl+S 保存
  if (event.ctrlKey && event.key === "s") {
    saveProject();
    event.preventDefault();
  }

  // Ctrl+C 复制
  if (event.ctrlKey && event.key === "c" && selectedCanvasComponent.value) {
    handleCopyComponent();
    event.preventDefault();
  }

  // Ctrl+X 剪切
  if (event.ctrlKey && event.key === "x" && selectedCanvasComponent.value) {
    handleCutComponent();
    event.preventDefault();
  }

  // Ctrl+V 粘贴
  if (event.ctrlKey && event.key === "v" && clipboardData.value) {
    handlePasteComponent();
    event.preventDefault();
  }
};


// 删除选择的组件
export const deleteSelectedComponent = (
  selectedCanvasComponent: any,
  projectData: any,
  isSaved: any
) => {
  if (!selectedCanvasComponent.value) return;

  const componentId = selectedCanvasComponent.value.id;

  // 从项目数据中移除
  if (projectData.value?.views?.[0]?.components) {
    const index = projectData.value.views[0].components.findIndex(
      comp => comp.id === componentId
    );
    if (index > -1) {
      projectData.value.views[0].components.splice(index, 1);
    }
  }

  // 从DOM中移除
  const element = document.getElementById(componentId);
  if (element) {
    element.remove();
  }

  selectedCanvasComponent.value = null;
  isSaved.value = false;
  ElMessage.success("已删除组件");
};

// 创建绘图形状
export const createDrawingShape = (element: HTMLElement, component: any) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText = `
    width: 100%;
    height: 100%;
    pointer-events: none;
  `;
  svg.setAttribute(
    "viewBox",
    `0 0 ${component.size.width} ${component.size.height}`
  );

  const strokeColor =
    component.properties?.strokeColor ||
    component.style?.borderColor ||
    "#409eff";
  const fillColor =
    component.properties?.fillColor ||
    component.style?.backgroundColor ||
    "transparent";
  const strokeWidth =
    component.properties?.strokeWidth || component.style?.borderWidth || 2;

  switch (component.type) {
    case "rectangle":
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      rect.setAttribute("x", "1");
      rect.setAttribute("y", "1");
      rect.setAttribute("width", (component.size.width - 2).toString());
      rect.setAttribute("height", (component.size.height - 2).toString());
      rect.setAttribute("stroke", strokeColor);
      rect.setAttribute("stroke-width", strokeWidth.toString());
      rect.setAttribute("fill", fillColor);
      rect.setAttribute(
        "rx",
        (component.properties?.cornerRadius || 0).toString()
      );
      svg.appendChild(rect);
      break;

    case "circle":
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      const radius =
        Math.min(component.size.width, component.size.height) / 2 - strokeWidth;
      circle.setAttribute("cx", (component.size.width / 2).toString());
      circle.setAttribute("cy", (component.size.height / 2).toString());
      circle.setAttribute("r", radius.toString());
      circle.setAttribute("stroke", strokeColor);
      circle.setAttribute("stroke-width", strokeWidth.toString());
      circle.setAttribute("fill", fillColor);
      svg.appendChild(circle);
      break;

    case "ellipse":
      const ellipse = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "ellipse"
      );
      ellipse.setAttribute("cx", (component.size.width / 2).toString());
      ellipse.setAttribute("cy", (component.size.height / 2).toString());
      ellipse.setAttribute(
        "rx",
        (component.size.width / 2 - strokeWidth).toString()
      );
      ellipse.setAttribute(
        "ry",
        (component.size.height / 2 - strokeWidth).toString()
      );
      ellipse.setAttribute("stroke", strokeColor);
      ellipse.setAttribute("stroke-width", strokeWidth.toString());
      ellipse.setAttribute("fill", fillColor);
      svg.appendChild(ellipse);
      break;

    case "line":
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", "0");
      line.setAttribute("y1", (component.size.height / 2).toString());
      line.setAttribute("x2", component.size.width.toString());
      line.setAttribute("y2", (component.size.height / 2).toString());
      line.setAttribute("stroke", strokeColor);
      line.setAttribute("stroke-width", strokeWidth.toString());
      svg.appendChild(line);
      break;

    case "polyline":
      if (
        component.properties?.points &&
        component.properties.points.length > 1
      ) {
        const polyline = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polyline"
        );
        const points = component.properties.points
          .map((p: any) => `${p.x},${p.y}`)
          .join(" ");
        polyline.setAttribute("points", points);
        polyline.setAttribute("stroke", strokeColor);
        polyline.setAttribute("stroke-width", strokeWidth.toString());
        polyline.setAttribute("fill", "none");
        svg.appendChild(polyline);
      }
      break;

    case "arrow":
      const arrowLine = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      arrowLine.setAttribute("x1", "10");
      arrowLine.setAttribute("y1", (component.size.height / 2).toString());
      arrowLine.setAttribute("x2", (component.size.width - 20).toString());
      arrowLine.setAttribute("y2", (component.size.height / 2).toString());
      arrowLine.setAttribute("stroke", strokeColor);
      arrowLine.setAttribute("stroke-width", strokeWidth.toString());
      svg.appendChild(arrowLine);

      // 箭头头部
      const arrowHead = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon"
      );
      const arrowSize = component.properties?.arrowSize || 10;
      const centerY = component.size.height / 2;
      const endX = component.size.width - 5;
      arrowHead.setAttribute(
        "points",
        `${endX},${centerY} ${endX - arrowSize},${centerY - arrowSize / 2} ${endX - arrowSize},${centerY + arrowSize / 2}`
      );
      arrowHead.setAttribute("fill", strokeColor);
      svg.appendChild(arrowHead);
      break;

    case "text-box":
      const textElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      textElement.setAttribute("x", "50%");
      textElement.setAttribute("y", "50%");
      textElement.setAttribute("dominant-baseline", "middle");
      textElement.setAttribute("text-anchor", "middle");
      textElement.setAttribute(
        "fill",
        component.properties?.color || "#303133"
      );
      textElement.setAttribute(
        "font-size",
        (component.properties?.fontSize || 14).toString()
      );
      textElement.setAttribute(
        "font-family",
        component.properties?.fontFamily || "Arial"
      );
      textElement.textContent =
        component.properties?.text || component.name || "文本框";
      svg.appendChild(textElement);
      break;

    case "connector":
      const connectorLine = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      connectorLine.setAttribute("x1", "0");
      connectorLine.setAttribute("y1", (component.size.height / 2).toString());
      connectorLine.setAttribute("x2", component.size.width.toString());
      connectorLine.setAttribute("y2", (component.size.height / 2).toString());
      connectorLine.setAttribute("stroke", strokeColor);
      connectorLine.setAttribute("stroke-width", strokeWidth.toString());

      // 添加虚线效果
      if (component.properties?.connectionType === "dashed") {
        connectorLine.setAttribute("stroke-dasharray", "5,5");
      }
      svg.appendChild(connectorLine);

      // 连接器末端
      if (component.properties?.endConnector === "arrow") {
        const endArrow = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon"
        );
        const endY = component.size.height / 2;
        endArrow.setAttribute(
          "points",
          `${component.size.width},${endY} ${component.size.width - 8},${endY - 4} ${component.size.width - 8},${endY + 4}`
        );
        endArrow.setAttribute("fill", strokeColor);
        svg.appendChild(endArrow);
      }
      break;
  }

  // 清空元素并添加SVG
  element.innerHTML = "";
  element.appendChild(svg);

  // 对于文本框，还需要支持文本编辑
  if (component.type === "text-box") {
    element.style.overflow = "visible";
  }
};

// 设置组件交互
export const setupComponentInteractions = (
  element: HTMLElement,
  component: any,
  toggleSwitchState: (component: any, element: HTMLElement) => void,
  executeComponentEvents: (component: any, eventType: string, event?: Event) => void,
  selectComponent: (component: any) => void,
  makeComponentDraggable: (element: HTMLElement, component: any) => void,
  setupComponentTimers: (component: any, element: HTMLElement) => void,
  setupValueChangeEvents: (component: any, element: HTMLElement) => void,
  contextMenuPosition: any,
  adjustMenuPosition: (componentRect?: DOMRect) => void,
  contextMenuVisible: any,
  isSimulating?: { value: boolean } // 新增：仿真模式标志
) => {
  // 添加点击事件
  element.addEventListener("click", e => {
    e.stopPropagation();

    // 🔄 只在仿真模式下执行组件的点击事件，编辑模式下不触发
    if (isSimulating && isSimulating.value) {
      console.log('仿真模式：执行组件点击事件');
      executeComponentEvents(component, 'click', e);
    }

    // 编辑模式下选中组件，仿真模式下不选中（避免干扰）
    if (!isSimulating || !isSimulating.value) {
      selectComponent(component);
    }
  });

  // 添加双击事件
  element.addEventListener("dblclick", e => {
    e.stopPropagation();
    console.log('双击事件触发，组件:', component.id, component.type);
    console.log('组件事件配置:', component.events);

    // 🔄 只在仿真模式下执行组件的双击事件
    if (isSimulating && isSimulating.value) {
      console.log('仿真模式：执行组件双击事件');
      executeComponentEvents(component, 'dblclick', e);
    }
  });

  // 添加鼠标悬停事件
  element.addEventListener("mouseenter", e => {
    // 🔄 只在仿真模式下执行组件的悬停事件
    if (isSimulating && isSimulating.value) {
      executeComponentEvents(component, 'hover', e);
    }
  });

  // 添加鼠标离开事件
  element.addEventListener("mouseleave", e => {
    // 🔄 只在仿真模式下执行组件的离开事件
    if (isSimulating && isSimulating.value) {
      executeComponentEvents(component, 'leave', e);
    }
  });

  // 添加右键事件
  element.addEventListener("contextmenu", e => {
    e.preventDefault();
    e.stopPropagation();

    // 先选中组件
    selectComponent(component);

    // 获取组件的边界信息
    const componentRect = element.getBoundingClientRect();

    // 然后显示右键菜单 - 优先显示在组件右侧
    contextMenuPosition.x = componentRect.right + 10; // 组件右边界 + 间距
    contextMenuPosition.y = e.clientY; // 保持鼠标Y坐标

    // 先显示菜单
    contextMenuVisible.value = true;

    // 在下一帧调整菜单位置(确保菜单已经渲染)
    nextTick(() => {
      adjustMenuPosition(componentRect);
    });
  });

  // 添加拖拽移动功能
  makeComponentDraggable(element, component);

  // 如果有定时器事件，启动定时器
  if (component.events) {
    setupComponentTimers(component, element);
  }

  // 如果有数值变化事件，设置数据监听
  if (component.events) {
    setupValueChangeEvents(component, element);
  }
};

// 执行组件事件
export const executeComponentEvents = (component: any, eventType: string, event?: Event, executeEvent?: (component: any, eventConfig: any, triggerEvent?: Event) => void) => {
  if (!component.events || !Array.isArray(component.events)) {
    console.log('组件没有事件配置:', component.id);
    return;
  }

  console.log(`执行组件 ${component.id} 的 ${eventType} 事件`);
  console.log('可用事件列表:', component.events);

  // 查找匹配的事件
  const matchingEvents = component.events.filter(evt =>
    evt.type === eventType && evt.enabled !== false
  );

  console.log(`找到 ${matchingEvents.length} 个匹配的 ${eventType} 事件`);

  // 执行所有匹配的事件
  matchingEvents.forEach(evt => {
    console.log('执行事件:', evt);
    if (executeEvent) {
      executeEvent(component, evt, event);
    }
  });
};

// 执行单个事件
export const executeEvent = (component: any, eventConfig: any, triggerEvent?: Event, executeComponentAction?: (component: any, action: any) => void) => {
  console.log('执行事件详情:', {
    componentId: component.id,
    eventType: eventConfig.type,
    actionsCount: eventConfig.actions?.length || 0,
    eventConfig
  });

  if (!eventConfig.actions || !Array.isArray(eventConfig.actions)) {
    console.warn('事件没有配置动作:', eventConfig);
    return;
  }

  // 检查触发条件（数值变化事件）
  if (eventConfig.type === 'valuechange' && eventConfig.condition) {
    try {
      // 这里可以添加条件检查逻辑
      // 简化处理，直接执行
    } catch (error) {
      console.warn('条件检查失败:', error);
      return;
    }
  }

  // 执行所有动作
  eventConfig.actions.forEach((action: any, index: number) => {
    console.log(`执行动作 ${index + 1}:`, action);

    // 延迟执行（如果有配置延迟）
    const delay = action.delay || 0;

    setTimeout(() => {
      if (executeComponentAction) {
        executeComponentAction(component, action);
      }
    }, delay);
  });
};

// 执行组件动作
export const executeComponentAction = (
  component: any,
  action: any,
  executeBackgroundColorChange: (component: any, element: HTMLElement, action: any) => void,
  executeSvgColorChange: (component: any, element: HTMLElement, action: any) => void,
  executeMoveAction: (component: any, element: HTMLElement, action: any) => void,
  executeSetValueAction: (component: any, element: HTMLElement, action: any) => void,
  executeDialogAction: (action: any) => void,
  executeCommandAction: (action: any) => void
) => {
  console.log('executeComponentAction 调用:', {
    componentId: component.id,
    actionType: action.type,
    action
  });

  const element = document.getElementById(component.id);
  if (!element) {
    console.error('找不到组件元素:', component.id);
    return;
  }

  try {
    switch (action.type) {
      case 'visibility':
        // 显示/隐藏动作
        const isVisible = element.style.display !== 'none';
        element.style.display = isVisible ? 'none' : 'block';
        console.log(`组件 ${component.id} 可见性切换为:`, !isVisible);
        break;

      case 'backgroundColorChange':
        // 背景颜色变化动作
        executeBackgroundColorChange(component, element, action);
        break;

      case 'svgColorChange':
        // SVG颜色变化动作
        executeSvgColorChange(component, element, action);
        break;

      case 'move':
        // 位置移动动作
        executeMoveAction(component, element, action);
        break;

      case 'setValue':
        // 设置数值动作
        executeSetValueAction(component, element, action);
        break;

      case 'dialog':
        // 弹出对话框动作
        executeDialogAction(action);
        break;

      case 'command':
        // 发送命令动作
        executeCommandAction(action);
        break;

      default:
        console.warn('未知的动作类型:', action.type);
    }
  } catch (error) {
    console.error('执行动作失败:', error, action);
  }
};

// 调整菜单位置
export const adjustMenuPosition = (contextMenuPosition: any, componentRect?: DOMRect) => {
  const menuWidth = 180;

  // 动态获取菜单的实际高度
  let menuHeight = 320; // 默认值
  const menuElement = document.querySelector('.context-menu') as HTMLElement;
  if (menuElement) {
    // 使用 nextTick 确保菜单已经渲染
    menuHeight = menuElement.offsetHeight || menuElement.scrollHeight || 320;
    console.log('动态获取菜单高度:', menuHeight, 'offsetHeight:', menuElement.offsetHeight, 'scrollHeight:', menuElement.scrollHeight);
  }

  // 获取画布容器的边界
  const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;

  if (canvasContainer) {
    const containerRect = canvasContainer.getBoundingClientRect();

    console.log('调整菜单位置:', {
      容器边界: {
        left: containerRect.left,
        right: containerRect.right,
        top: containerRect.top,
        bottom: containerRect.bottom
      },
      组件边界: componentRect ? {
        left: componentRect.left,
        right: componentRect.right,
        top: componentRect.top,
        bottom: componentRect.bottom,
        width: componentRect.width,
        height: componentRect.height
      } : null,
      当前菜单位置: {
        x: contextMenuPosition.x,
        y: contextMenuPosition.y
      },
      菜单尺寸: { width: menuWidth, height: menuHeight }
    });

    // 如果有组件信息，根据组件位置智能调整
    if (componentRect) {
      // 水平方向：优先右侧，不够则左侧
      const rightSideX = componentRect.right + 10;
      const leftSideX = componentRect.left - menuWidth - 10;

      if (rightSideX + menuWidth <= containerRect.right) {
        // 右侧有足够空间
        contextMenuPosition.x = rightSideX;
        console.log('菜单放置在组件右侧');
      } else if (leftSideX >= containerRect.left) {
        // 左侧有足够空间
        contextMenuPosition.x = leftSideX;
        console.log('菜单放置在组件左侧');
      } else {
        // 两侧都不够空间，选择空间较大的一侧
        const rightSpace = containerRect.right - rightSideX;
        const leftSpace = leftSideX - containerRect.left;

        if (rightSpace >= leftSpace) {
          // 右侧空间较大，贴着容器右边界
          contextMenuPosition.x = containerRect.right - menuWidth - 10;
          console.log('菜单贴着容器右边界');
        } else {
          // 左侧空间较大，贴着容器左边界
          contextMenuPosition.x = containerRect.left + 10;
          console.log('菜单贴着容器左边界');
        }
      }

      // 垂直方向：根据浏览器视口底部高度智能调整菜单位置
      let targetY = contextMenuPosition.y; // 使用当前鼠标位置作为起点

      // 获取浏览器视口的实际高度
      const viewportBottom = window.innerHeight;

      console.log('视口底部高度:', viewportBottom, '菜单高度:', menuHeight, '当前Y:', targetY, '组件底部:', componentRect.bottom);

      // 检查菜单是否会超出浏览器视口底部
      if (targetY + menuHeight > viewportBottom) {
        // 会超出视口底部,优先尝试向上移动到鼠标位置上方
        targetY = contextMenuPosition.y - menuHeight - 10;
        console.log('菜单会超出视口底部,向上移动到鼠标位置上方, 新Y:', targetY);

        // 如果向上移动后仍然超出顶部,则直接贴着视口底部显示
        if (targetY < containerRect.top) {
          targetY = viewportBottom - menuHeight - 10;
          console.log('菜单过高,贴着视口底部显示, 新Y:', targetY);
        }
      } else {
        // 不会超出视口底部,使用鼠标位置或组件顶部(取较高者)
        targetY = Math.max(targetY, componentRect.top);
        console.log('菜单不超出视口,对齐鼠标位置或组件顶部, 新Y:', targetY);
      }

      // 最终确保菜单完全在视口内
      if (targetY + menuHeight > viewportBottom) {
        targetY = viewportBottom - menuHeight - 10;
        console.log('最终调整：贴着视口底部, 新Y:', targetY);
      }
      if (targetY < containerRect.top) {
        targetY = containerRect.top + 10;
        console.log('最终调整：贴着容器顶部, 新Y:', targetY);
      }

      contextMenuPosition.y = targetY;
    } else {
      // 没有组件信息，使用原来的逻辑（画布空白区域右键）
      if (contextMenuPosition.x + menuWidth > containerRect.right) {
        contextMenuPosition.x = contextMenuPosition.x - menuWidth;
        if (contextMenuPosition.x < containerRect.left) {
          contextMenuPosition.x = containerRect.right - menuWidth - 10;
        }
      }

      if (contextMenuPosition.y + menuHeight > containerRect.bottom) {
        contextMenuPosition.y = contextMenuPosition.y - menuHeight;
        if (contextMenuPosition.y < containerRect.top) {
          contextMenuPosition.y = containerRect.bottom - menuHeight - 10;
        }
      }

      // 确保不超出容器边界
      if (contextMenuPosition.x < containerRect.left) {
        contextMenuPosition.x = containerRect.left + 10;
      }
      if (contextMenuPosition.y < containerRect.top) {
        contextMenuPosition.y = containerRect.top + 10;
      }
    }
  } else {
    // 如果找不到容器，回退到原来的窗口边界检查
    console.warn('未找到画布容器，使用窗口边界检查');

    if (contextMenuPosition.x + menuWidth > window.innerWidth) {
      contextMenuPosition.x = window.innerWidth - menuWidth - 10;
    }

    if (contextMenuPosition.y + menuHeight > window.innerHeight) {
      contextMenuPosition.y = window.innerHeight - menuHeight - 10;
    }
  }

  console.log('最终菜单位置:', {
    x: contextMenuPosition.x,
    y: contextMenuPosition.y
  });
};

// 处理画布点击事件
export const handleCanvasClick = (
  event: MouseEvent,
  currentEditorMode: any,
  activeComponent: any,
  hideContextMenu: () => void,
  canvasZoom: any,
  handleLineToolClick: (event: MouseEvent, scaledX: number, scaledY: number) => void,
  handleImageToolClick: (event: MouseEvent, scaledX: number, scaledY: number) => void,
  handleTextToolClick: (event: MouseEvent, scaledX: number, scaledY: number) => void,
  handleIframeToolClick: (event: MouseEvent, scaledX: number, scaledY: number) => void,
  handleVideoToolClick: (event: MouseEvent, scaledX: number, scaledY: number) => void,
  handleTableToolClick: (event: MouseEvent, scaledX: number, scaledY: number) => void,
  handleChartToolClick: (event: MouseEvent, scaledX: number, scaledY: number, componentType: any) => void,
  createComponentInstance: (component: any, position: { x: number; y: number }) => any,
  addComponentToCanvas: (componentInstance: any) => void,
  setCanvasMode: (mode: string) => void,
  removeResizeHandles: (element: HTMLElement) => void,
  selectedCanvasComponent: any,
  snapToGrid?: (value: number) => number // 可选的吸附函数
) => {
  console.log("画布点击事件触发:", {
    currentEditorMode: currentEditorMode.value,
    activeComponent: activeComponent.value,
    event: event
  });

  // 隐藏右键菜单
  hideContextMenu();

  if (currentEditorMode.value !== "select" && activeComponent.value) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 调整缩放比例（不进行 Math.round，让 snapToGrid 来处理精确对齐）
    let scaledX = x / (canvasZoom.value / 100);
    let scaledY = y / (canvasZoom.value / 100);

    // 应用吸附功能（如果启用），否则进行四舍五入
    if (snapToGrid) {
      scaledX = snapToGrid(scaledX);
      scaledY = snapToGrid(scaledY);
    } else {
      scaledX = Math.round(scaledX);
      scaledY = Math.round(scaledY);
    }

    // 特殊处理直线工具的两点式绘制
    if (activeComponent.value.name === "line") {
      handleLineToolClick(event, scaledX, scaledY);
      return;
    }

    // 特殊处理图像工具的上传功能
    if (activeComponent.value.name === "image") {
      handleImageToolClick(event, scaledX, scaledY);
      return;
    }

    // 特殊处理文本工具
    if (activeComponent.value.name === "text") {
      handleTextToolClick(event, scaledX, scaledY);
      return;
    }

    // 特殊处理iframe工具
    if (activeComponent.value.name === "iframe") {
      handleIframeToolClick(event, scaledX, scaledY);
      return;
    }

    // 特殊处理视频工具
    if (activeComponent.value.name === "video") {
      handleVideoToolClick(event, scaledX, scaledY);
      return;
    }

    // 特殊处理表格工具
    if (activeComponent.value.name === "table") {
      handleTableToolClick(event, scaledX, scaledY);
      return;
    }

    // 特殊处理路径组件 - 路径组件通过专门的绘制工具处理，不在这里创建
    if (activeComponent.value.name === "path") {
      // 路径组件的点击由PathTool的事件处理器处理
      return;
    }

    // 特殊处理图表组件
    if (
      ["chart", "pie-chart", "bar-chart"].includes(
        activeComponent.value.name
      ) ||
      activeComponent.value.name.includes("chart")
    ) {
      handleChartToolClick(event, scaledX, scaledY, activeComponent.value);
      return;
    }

    // 普通组件的单点创建
    const componentInstance = createComponentInstance(activeComponent.value, {
      x: scaledX,
      y: scaledY
    });
    addComponentToCanvas(componentInstance);

    // 切换回选择模式
    currentEditorMode.value = "select";
    activeComponent.value = null;
    setCanvasMode("select");
  } else {
    // 清除选择和调整手柄
    const prevSelected = document.querySelector(".fuxa-component.selected");
    if (prevSelected) {
      prevSelected.classList.remove("selected");
      removeResizeHandles(prevSelected as HTMLElement);

      // 🔲 按钮组件特殊处理：取消选中时只清除阴影，不修改边框
      if ((prevSelected as HTMLElement).classList.contains('button-component')) {
        console.log('🔲 取消选中按钮组件，只清除阴影');
        (prevSelected as HTMLElement).style.boxShadow = "none";
      } else {
        // 恢复原始边框样式
        const originalBorderColor = (prevSelected as HTMLElement).getAttribute(
          "data-original-border-color"
        );
        const originalBorderWidth = (prevSelected as HTMLElement).getAttribute(
          "data-original-border-width"
        );

        if (originalBorderColor && originalBorderWidth) {
          (prevSelected as HTMLElement).style.borderColor = originalBorderColor;
          (prevSelected as HTMLElement).style.borderWidth = originalBorderWidth;
        } else {
          // 如果没有原始样式，使用默认样式
          (prevSelected as HTMLElement).style.border = "1px solid #e4e7ed";
        }
        (prevSelected as HTMLElement).style.boxShadow =
          "0 1px 3px rgba(0, 0, 0, 0.1)";
      }
    }
    selectedCanvasComponent.value = null;
  }
};

// 选择组件
export const selectCanvasComponent = (
  component: any,
  selectedCanvasComponent: any,
  removeResizeHandles: (element: HTMLElement) => void,
  addResizeHandles: (element: HTMLElement, component: any) => void,
  ElMessage: any
) => {
  console.log("选择组件:", component);

  // 清除之前选择的组件样式和调整手柄
  const prevSelected = document.querySelector(".fuxa-component.selected");
  if (prevSelected) {
    prevSelected.classList.remove("selected");
    removeResizeHandles(prevSelected as HTMLElement);

    // 🔲 按钮组件特殊处理：取消选中时只清除阴影，不修改边框
    if ((prevSelected as HTMLElement).classList.contains('button-component')) {
      console.log('🔲 取消选中按钮组件，只清除阴影');
      (prevSelected as HTMLElement).style.boxShadow = "none";
    } else {
      // 恢复原始边框样式
      const originalBorderColor = (prevSelected as HTMLElement).getAttribute(
        "data-original-border-color"
      );
      const originalBorderWidth = (prevSelected as HTMLElement).getAttribute(
        "data-original-border-width"
      );

      if (originalBorderColor && originalBorderWidth) {
        (prevSelected as HTMLElement).style.borderColor = originalBorderColor;
        (prevSelected as HTMLElement).style.borderWidth = originalBorderWidth;
      } else {
        // 如果没有原始样式，使用默认样式
        (prevSelected as HTMLElement).style.border = "1px solid #e4e7ed";
      }
      (prevSelected as HTMLElement).style.boxShadow =
        "0 1px 3px rgba(0, 0, 0, 0.1)";
    }
  }

  // 设置当前选择的组件
  selectedCanvasComponent.value = component;

  // 添加选择样式和调整手柄
  const element = document.getElementById(component.id);
  if (element) {
    console.log("找到元素，添加选中样式:", element);
    element.classList.add("selected");

    // 确保选中状态可见性（不改变层级）
    // element.style.zIndex = "1000"; // 移除自动移到顶层

    // 🔲 按钮组件特殊处理：只显示选中阴影，不改变边框
    if (element.classList.contains('button-component')) {
      console.log('🔲 按钮组件选中，只应用阴影效果');
      element.style.boxShadow = "0 0 0 2px rgba(64, 158, 255, 0.4)";
    } else {
      // 强制设置内联样式确保边框显示
      element.style.border = "2px solid #409eff";
      element.style.boxShadow = "0 0 0 2px rgba(64, 158, 255, 0.2)";
    }

    // 确保边框在拖拽时保持可见
    element.style.pointerEvents = "auto";
    element.style.userSelect = "none";

    // 添加调整手柄
    addResizeHandles(element, component);

    // 显示调整手柄
    setTimeout(() => {
      const handles = element.querySelectorAll(".fuxa-resize-handle");
      handles.forEach(handle => {
        (handle as HTMLElement).style.opacity = "1";
        (handle as HTMLElement).style.visibility = "visible";
      });
    }, 50);
  } else {
    console.error("未找到组件元素:", component.id);
  }

  ElMessage.success(`已选中组件: ${component.name || component.type}`);
};
