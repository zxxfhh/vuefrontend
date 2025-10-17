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

// 处理画布拖放
export const handleCanvasDrop = (
  event: DragEvent,
  editorContainer: any,
  canvasZoom: any,
  currentEditorMode: any,
  activeComponent: any,
  setCanvasMode: (mode: string) => void,
  addComponentToCanvas: (componentInstance: any) => void,
  createComponentInstance: (component: any, position: any) => any,
  createTextComponent: (position: any) => any,
  snapToGrid?: (value: number) => number // 可选的吸附函数
) => {
  event.preventDefault();

  if (!event.dataTransfer) return;

  try {
    const dragData = JSON.parse(event.dataTransfer.getData("application/json"));

    if (dragData.type === "fuxa-component") {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const canvasRect = editorContainer.value?.getBoundingClientRect();

      if (canvasRect) {
        // 计算相对于画布的坐标
        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;

        // 调整缩放比例
        let scaledX = Math.round(x / (canvasZoom.value / 100));
        let scaledY = Math.round(y / (canvasZoom.value / 100));

        // 应用吸附功能（如果启用）
        if (snapToGrid) {
          scaledX = snapToGrid(scaledX);
          scaledY = snapToGrid(scaledY);
        }

        console.log("在画布位置添加组件:", {
          x: scaledX,
          y: scaledY,
          component: dragData.component
        });

        // 特殊处理路径组件 - 不支持拖拽创建，只能通过绘制工具创建
        if (dragData.component.name === 'path') {
          ElMessage.warning('路径组件不支持拖拽创建，请点击工具栏中的路径工具后在画布上绘制');
          return;
        }

        // 特殊处理文本工具 - 使用专门的创建函数
        let componentInstance;
        if (dragData.component.name === 'text') {
          componentInstance = createTextComponent({ x: scaledX, y: scaledY });
        } else {
          // 创建带位置信息的组件实例
          componentInstance = createComponentInstance(dragData.component, {
            x: scaledX,
            y: scaledY
          });
        }

        // 添加到画布
        addComponentToCanvas(componentInstance);

        // 切换回选择模式
        currentEditorMode.value = "select";
        activeComponent.value = null;
        setCanvasMode("select");
      }
    }
  } catch (error) {
    console.error("处理拖放失败:", error);
    ElMessage.error("组件添加失败: " + (error as Error).message);
  }
};

// 添加组件到画布
export const addComponentToCanvas = (
  componentInstance: any,
  projectData: any,
  editorContainer: any,
  isSaved: any,
  createComponentElement: (componentInstance: any) => void
) => {
  console.log('========== addComponentToCanvas 调用 ==========');
  console.log('接收到的组件实例:', componentInstance);
  console.log('组件类型:', componentInstance.type);
  console.log('组件名称:', componentInstance.name);
  console.log('=======================================');

  // 添加到项目数据
  if (projectData.value?.views?.[0]) {
    if (!projectData.value.views[0].components) {
      projectData.value.views[0].components = [];
    }
    projectData.value.views[0].components.push(componentInstance);
  }

  // 创建DOM元素
  createComponentElement(componentInstance);

  // 移除拖拽样式
  const canvas = editorContainer.value;
  if (canvas) {
    canvas.classList.remove("drag-over");
  }

  isSaved.value = false;
  ElMessage.success(`已添加组件: ${componentInstance.name}`);

  // 延迟清理异常的SVG元素，防止DOMParser创建的临时元素影响页面
  setTimeout(() => {
    try {
      cleanupAbnormalSvgElements();
    } catch (error) {
      console.warn('清理异常SVG元素时出现警告:', error);
    }
  }, 100);
};

// 已移动到utils1.ts中，删除重复方法


// extractComponentNameFromPath已移动到utils1.ts中

// 使组件可拖拽移动
export const makeComponentDraggable = (
  element: HTMLElement,
  component: any,
  canvasZoom: any,
  projectData: any,
  isSaved: any,
  updatePathSVGDuringDrag: (element: HTMLElement, deltaX: number, deltaY: number) => void,
  createUpdatedPathSVG: (pathComponent: any) => SVGElement,
  snapToGrid?: (value: number) => number // 可选的吸附函数
) => {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startPosX = 0;
  let startPosY = 0;

  element.addEventListener("mousedown", (e: MouseEvent) => {
    // 防止在拖拽时触发选择
    e.stopPropagation();

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startPosX = component.position.x;
    startPosY = component.position.y;

    element.classList.add("dragging");
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
  });

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const newX = startPosX + deltaX / (canvasZoom.value / 100);
    const newY = startPosY + deltaY / (canvasZoom.value / 100);

    // 应用吸附功能（如果启用）
    const finalX = snapToGrid ? snapToGrid(Math.max(0, newX)) : Math.max(0, newX);
    const finalY = snapToGrid ? snapToGrid(Math.max(0, newY)) : Math.max(0, newY);

    element.style.left = finalX + "px";
    element.style.top = finalY + "px";

    // 调试：检查组件尺寸是否被意外修改
    console.log(`拖拽中 - 组件${component.id} 尺寸检查:`, {
      name: component.name,
      type: component.type,
      sizeWidth: component.size?.width,
      width: component.width,
      sizeHeight: component.size?.height,
      height: component.height
    });

    // 特殊处理路径组件 - 在拖拽过程中更新SVG
    if (component.type === 'path' && element.classList.contains('path-component')) {
      const moveDeltaX = finalX - startPosX;
      const moveDeltaY = finalY - startPosY;

      // 更新SVG内部的路径点位置
      updatePathSVGDuringDrag(element, moveDeltaX, moveDeltaY);
    }

    // 在拖拽过程中实时触发位置更新事件
    // 更新组件位置数据（临时更新，不持久化到项目数据）
    component.position.x = finalX;
    component.position.y = finalY;
    component.x = finalX;
    component.y = finalY;

    // 添加时间戳触发响应式更新
    component.updated = new Date().toISOString();

    // 触发实时位置更新事件
    const updateEvent = new CustomEvent('componentPositionUpdated', {
      detail: {
        componentId: component.id,
        newPosition: { x: finalX, y: finalY },
        isDragging: true // 标识这是拖拽过程中的更新
      }
    });
    document.dispatchEvent(updateEvent);
  };

  const onMouseUp = (e: MouseEvent) => {
    if (!isDragging) return;

    isDragging = false;
    element.classList.remove("dragging");

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const newX = startPosX + deltaX / (canvasZoom.value / 100);
    const newY = startPosY + deltaY / (canvasZoom.value / 100);

    // 应用吸附功能（如果启用）
    const finalX = snapToGrid ? snapToGrid(Math.max(0, newX)) : Math.max(0, newX);
    const finalY = snapToGrid ? snapToGrid(Math.max(0, newY)) : Math.max(0, newY);

    // 更新传入的组件引用
    component.position.x = finalX;
    component.position.y = finalY;
    // 兼容性支持
    component.x = finalX;
    component.y = finalY;

    // 添加时间戳触发响应式更新
    component.updated = new Date().toISOString();

    // 同步更新项目数据中的组件坐标
    if (projectData.value?.views?.[0]?.components) {
      const projectComponent = projectData.value.views[0].components.find(
        comp => comp.id === component.id
      );
      if (projectComponent) {
        // 计算位置偏移量
        const deltaX = finalX - startPosX;
        const deltaY = finalY - startPosY;

        // 确保项目数据中的坐标同步更新
        if (projectComponent.position) {
          projectComponent.position.x = finalX;
          projectComponent.position.y = finalY;
        } else {
          projectComponent.position = { x: finalX, y: finalY };
        }
        // 兼容性支持
        projectComponent.x = finalX;
        projectComponent.y = finalY;

        // 特殊处理路径组件 - 更新路径点的坐标并重新渲染SVG
        if (projectComponent.type === 'path' && projectComponent.properties?.points) {
          projectComponent.properties.points = projectComponent.properties.points.map((point: any) => ({
            x: point.x + deltaX,
            y: point.y + deltaY
          }));

          // 重新渲染路径SVG
          const pathComponent = {
            id: projectComponent.id,
            type: projectComponent.type,
            x: finalX,
            y: finalY,
            width: projectComponent.size.width,
            height: projectComponent.size.height,
            points: projectComponent.properties.points,
            properties: {
              strokeColor: projectComponent.properties.strokeColor || '#409eff',
              strokeWidth: projectComponent.properties.strokeWidth || 2,
              nodeColor: projectComponent.properties.nodeColor || '#409eff',
              nodeSize: projectComponent.properties.nodeSize || 6,
              showNodes: projectComponent.properties.showNodes !== false
            }
          };

          // 清除旧的SVG并创建新的
          const svg = element.querySelector('svg');
          if (svg) {
            svg.remove();
          }
          const newSVG = createUpdatedPathSVG(pathComponent);
          element.appendChild(newSVG);

          console.log(`路径组件拖拽完成，已更新${projectComponent.properties.points.length}个路径点并重新渲染SVG`);
        }

        console.log(`组件拖拽完成 - ID: ${component.id}, 新坐标: (${finalX}, ${finalY})`);
      }
    }

    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    isSaved.value = false;

    // 拖拽结束后触发表单数据更新
    // 如果当前拖拽的组件是选中组件，需要更新属性面板表单数据
    // 因为watch监听器只监听引用变化，不监听对象内部属性变化
    console.log('拖拽结束，检查是否需要更新表单数据');

    // 这里触发一个自定义事件，通知表单数据需要更新
    // 由于我们在utils文件中，不能直接访问组件的响应式数据
    // 所以通过DOM事件的方式通知父组件
    const updateEvent = new CustomEvent('componentPositionUpdated', {
      detail: {
        componentId: component.id,
        newPosition: { x: finalX, y: finalY },
        isDragging: false // 标识这是拖拽结束的最终更新
      }
    });
    document.dispatchEvent(updateEvent);
  };
};


// 统一处理SVG容器背景的方法
export const applySvgContainerBackground = (element: HTMLElement, backgroundType: string, style: any) => {
  const svgElements = element.querySelectorAll('svg');
  if (svgElements.length === 0) return;

  console.log('处理SVG容器背景:', {
    backgroundType: backgroundType,
    svgCount: svgElements.length
  });

  // 根据背景类型决定要应用到SVG容器的样式
  let containerStyle: any = {};

  if (backgroundType === 'transparent') {
    containerStyle['background-color'] = 'transparent';
  } else if (backgroundType === 'linear-gradient') {
    const angle = style.gradientAngle || 0;
    const start = style.gradientStart || '#409eff';
    const end = style.gradientEnd || '#67c23a';
    containerStyle['background'] = `linear-gradient(${angle}deg, ${start}, ${end})`;
  } else if (backgroundType === 'radial-gradient') {
    const start = style.gradientStart || '#409eff';
    const end = style.gradientEnd || '#67c23a';
    const shape = style.gradientShape || 'circle';
    containerStyle['background'] = `radial-gradient(${shape}, ${start}, ${end})`;
  } else if (backgroundType === 'image' && style.backgroundImage) {
    containerStyle['background-image'] = `url(${style.backgroundImage})`;
    containerStyle['background-repeat'] = style.backgroundRepeat || 'no-repeat';
    containerStyle['background-size'] = style.backgroundSize || 'cover';
    containerStyle['background-position'] = style.backgroundPosition || 'center';
  } else {
    // 纯色背景（solid或其他情况）
    let bgColor = style.backgroundColor;

    // 检查和修正rgba透明度问题
    if (bgColor && typeof bgColor === 'string' && bgColor.includes('rgba')) {
      const rgbaMatch = bgColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (rgbaMatch) {
        const [, r, g, b, a] = rgbaMatch;
        const alpha = parseFloat(a);
        if (alpha === 0) {
          bgColor = `rgba(${r}, ${g}, ${b}, 1)`;
        }
      }
    }

    if (backgroundType === 'solid' && (!bgColor || bgColor === 'transparent')) {
      bgColor = 'rgba(255, 255, 255, 1)';
    } else if (!bgColor) {
      bgColor = 'transparent';
    }

    containerStyle['background-color'] = bgColor;
  }

  // 应用样式到SVG容器
  svgElements.forEach((svg, index) => {
    const svgParent = svg.parentElement;
    if (svgParent && svgParent !== element) {
      console.log(`应用背景样式到SVG容器 ${index}:`, containerStyle);

      // 先清除容器的所有背景样式
      svgParent.style.removeProperty('background');
      svgParent.style.removeProperty('background-color');
      svgParent.style.removeProperty('background-image');
      svgParent.style.removeProperty('background-repeat');
      svgParent.style.removeProperty('background-size');
      svgParent.style.removeProperty('background-position');

      // 应用新样式
      Object.keys(containerStyle).forEach(prop => {
        svgParent.style.setProperty(prop, containerStyle[prop], 'important');
      });

      // 同时应用边框样式到SVG容器
      const borderStyle = style.borderStyle || 'none';
      const borderWidth = style.borderWidth || 0;
      const borderColor = style.borderColor || '#d9d9d9';
      const borderRadius = style.borderRadius || 0;

      if (borderStyle !== 'none' && borderWidth > 0) {
        svgParent.style.setProperty('border', `${borderWidth}px ${borderStyle} ${borderColor}`, 'important');
        console.log(`SVG容器 ${index} 边框已应用:`, `${borderWidth}px ${borderStyle} ${borderColor}`);
      } else {
        svgParent.style.setProperty('border', 'none', 'important');
      }

      if (borderRadius > 0) {
        svgParent.style.setProperty('border-radius', `${borderRadius}px`, 'important');
      }

      // 同时应用阴影效果到SVG容器
      if (style.enableShadow) {
        const shadowType = style.shadowType || 'box';
        if (shadowType === 'box') {
          const shadowColor = style.shadowColor || 'rgba(0,0,0,0.3)';
          const offsetX = style.shadowOffsetX || 4;
          const offsetY = style.shadowOffsetY || 4;
          const blur = style.shadowBlur || 8;
          const spread = style.shadowSpread || 0;
          const inset = style.shadowInset ? 'inset' : '';
          const shadowValue = `${inset} ${offsetX}px ${offsetY}px ${blur}px ${spread}px ${shadowColor}`;

          svgParent.style.setProperty('box-shadow', shadowValue, 'important');
          console.log(`SVG容器 ${index} 阴影已应用:`, shadowValue);
        }
      } else {
        svgParent.style.removeProperty('box-shadow');
      }
    }
  });
};




// 对齐组件
export const alignComponent = (alignment: string, selectedCanvasComponent: any, editorContainer: any, componentFormData: any, isSaved: any, ElMessage: any) => {
  if (!selectedCanvasComponent.value || !editorContainer.value) return;

  const component = selectedCanvasComponent.value;
  const canvasRect = editorContainer.value.getBoundingClientRect();
  const canvasWidth = 1200; // 画布宽度
  const canvasHeight = 800; // 画布高度

  let newPosition = { ...component.position };

  switch (alignment) {
    case "left":
      newPosition.x = 0;
      break;
    case "center":
      newPosition.x = (canvasWidth - component.size.width) / 2;
      break;
    case "right":
      newPosition.x = canvasWidth - component.size.width;
      break;
    case "top":
      newPosition.y = 0;
      break;
    case "middle":
      newPosition.y = (canvasHeight - component.size.height) / 2;
      break;
    case "bottom":
      newPosition.y = canvasHeight - component.size.height;
      break;
  }

  // 更新组件位置
  component.position = newPosition;
  componentFormData.value.position = { ...newPosition };

  // 更新DOM
  const element = document.getElementById(component.id);
  if (element) {
    element.style.left = `${newPosition.x}px`;
    element.style.top = `${newPosition.y}px`;
  }

  isSaved.value = false;
  ElMessage.success(`组件已${getAlignmentName(alignment)}`);
};

// 获取对齐名称
export const getAlignmentName = (alignment: string) => {
  const names = {
    left: "左对齐",
    center: "水平居中",
    right: "右对齐",
    top: "顶对齐",
    middle: "垂直居中",
    bottom: "底对齐"
  };
  return names[alignment] || alignment;
};

// 更新组件交互属性
export const updateComponentInteractivity = (selectedCanvasComponent: any, componentFormData: any, isSaved: any, ElMessage: any) => {
  if (!selectedCanvasComponent.value) return;

  const component = selectedCanvasComponent.value;

  // 更新交互属性
  component.clickable = componentFormData.value.clickable;
  component.hoverable = componentFormData.value.hoverable;
  component.longPress = componentFormData.value.longPress;
  component.doubleClick = componentFormData.value.doubleClick;
  component.bindVariable = componentFormData.value.bindVariable;
  component.updateRate = componentFormData.value.updateRate;
  component.dataFormat = componentFormData.value.dataFormat;
  component.visibilityCondition = componentFormData.value.visibilityCondition;
  component.enableCondition = componentFormData.value.enableCondition;
  component.requiredPermission = componentFormData.value.requiredPermission;
  component.userGroups = componentFormData.value.userGroups;

  // 更新DOM元素的交互行为
  const element = document.getElementById(component.id);
  if (element) {
    // 清除之前的交互类
    element.classList.remove(
      "hoverable-component",
      "component-clickable",
      "data-bound",
      "conditional-component",
      "permission-restricted"
    );

    // 设置鼠标样式和点击行为
    if (component.clickable) {
      element.style.cursor = "pointer";
      element.classList.add("component-clickable");
    } else {
      element.style.cursor = "default";
    }

    // 添加悬停效果
    if (component.hoverable) {
      element.classList.add("hoverable-component");
    }

    // 数据绑定指示器
    if (component.bindVariable) {
      element.classList.add("data-bound");
      element.setAttribute("data-bind-variable", component.bindVariable);
      element.setAttribute(
        "data-update-rate",
        component.updateRate || "normal"
      );

      if (component.dataFormat) {
        element.setAttribute("data-format", component.dataFormat);
      }
    }

    // 条件状态指示器
    if (component.visibilityCondition || component.enableCondition) {
      element.classList.add("conditional-component");

      if (component.visibilityCondition) {
        element.setAttribute(
          "data-visibility-condition",
          component.visibilityCondition
        );
      }
      if (component.enableCondition) {
        element.setAttribute(
          "data-enable-condition",
          component.enableCondition
        );
      }
    }

    // 权限限制指示器
    if (
      component.requiredPermission &&
      component.requiredPermission !== "none"
    ) {
      element.classList.add("permission-restricted");
      element.setAttribute(
        "data-required-permission",
        component.requiredPermission
      );

      if (component.userGroups) {
        element.setAttribute("data-user-groups", component.userGroups);
      }
    }

    // 长按和双击事件处理
    if (component.longPress) {
      element.setAttribute("data-long-press", "true");
    }
    if (component.doubleClick) {
      element.setAttribute("data-double-click", "true");
    }

    // 应用条件样式
    applyConditionalStyles(component);
  }

  isSaved.value = false;
  ElMessage.success("组件交互属性已更新");
};

// 应用条件样式
export const applyConditionalStyles = (component: any) => {
  const element = document.getElementById(component.id);
  if (!element) return;

  // 应用可见性条件
  if (component.visibilityCondition) {
    try {
      // 这里应该评估条件表达式，暂时用简单逻辑
      const shouldShow = true; // 实际项目中需要根据数据源评估
      element.style.display = shouldShow ? "block" : "none";
    } catch (error) {
      console.warn("可见性条件评估失败:", error);
    }
  }

  // 应用启用条件
  if (component.enableCondition) {
    try {
      // 这里应该评估条件表达式，暂时用简单逻辑
      const shouldEnable = true; // 实际项目中需要根据数据源评估
      element.style.opacity = shouldEnable ? "1" : "0.5";
      element.style.pointerEvents = shouldEnable ? "auto" : "none";
    } catch (error) {
      console.warn("启用条件评估失败:", error);
    }
  }
};

// 更新组件形状属性
export const updateComponentShape = (selectedCanvasComponent: any, componentFormData: any, isSaved: any, ElMessage: any) => {
  if (!selectedCanvasComponent.value) return;

  const component = selectedCanvasComponent.value;

  // 更新形状属性
  component.strokeStyle = componentFormData.value.strokeStyle;
  component.dashArray = componentFormData.value.dashArray;
  component.lineCap = componentFormData.value.lineCap;
  component.fillType = componentFormData.value.fillType;
  component.gradientStart = componentFormData.value.gradientStart;
  component.gradientEnd = componentFormData.value.gradientEnd;
  component.gradientAngle = componentFormData.value.gradientAngle;
  component.enableShadow = componentFormData.value.enableShadow;
  component.shadowColor = componentFormData.value.shadowColor;
  component.shadowOffsetX = componentFormData.value.shadowOffsetX;
  component.shadowOffsetY = componentFormData.value.shadowOffsetY;
  component.shadowBlur = componentFormData.value.shadowBlur;
  component.blur = componentFormData.value.blur;
  component.brightness = componentFormData.value.brightness;
  component.contrast = componentFormData.value.contrast;

  // 更新DOM元素的形状样式
  const element = document.getElementById(component.id);
  if (element) {
    // 应用边框样式
    if (component.strokeStyle === "none") {
      element.style.border = "none";
    } else {
      let borderStyle = component.strokeStyle;
      if (borderStyle === "dashed") {
        element.style.borderStyle = "dashed";
      } else if (borderStyle === "dotted") {
        element.style.borderStyle = "dotted";
      } else if (borderStyle === "double") {
        element.style.borderStyle = "double";
      } else {
        element.style.borderStyle = "solid";
      }
    }

    // 应用填充效果
    if (component.fillType === "linear") {
      const gradient = `linear-gradient(${component.gradientAngle}deg, ${component.gradientStart}, ${component.gradientEnd})`;
      element.style.background = gradient;
    } else if (component.fillType === "radial") {
      const gradient = `radial-gradient(circle, ${component.gradientStart}, ${component.gradientEnd})`;
      element.style.background = gradient;
    } else if (component.fillType === "none") {
      element.style.background = "transparent";
    }

    // 应用阴影效果
    let boxShadow = "";
    if (component.enableShadow) {
      boxShadow = `${component.shadowOffsetX}px ${component.shadowOffsetY}px ${component.shadowBlur}px ${component.shadowColor}`;
    }
    element.style.boxShadow = boxShadow;

    // 应用滤镜效果
    let filter = "";
    if (component.blur > 0) {
      filter += `blur(${component.blur}px) `;
    }
    if (component.brightness !== 1) {
      filter += `brightness(${component.brightness}) `;
    }
    if (component.contrast !== 1) {
      filter += `contrast(${component.contrast}) `;
    }
    element.style.filter = filter.trim();
  }

  isSaved.value = false;
  ElMessage.success("组件形状属性已更新");
};

// 更新组件样式
export const updateComponentStyle = (selectedCanvasComponent: any, componentFormData: any, isSaved: any, applySvgStyles: (element: HTMLElement, component: any) => void, ElMessage: any) => {
  if (!selectedCanvasComponent.value) return;

  const component = selectedCanvasComponent.value;
  component.style = { ...componentFormData.value.style };

  // 更新DOM元素样式
  const element = document.getElementById(component.id);
  if (element) {
    const isSelected = element.classList.contains("selected");

    // 应用背景色
    if (
      component.style.backgroundColor &&
      component.style.backgroundColor !== "transparent"
    ) {
      element.style.backgroundColor = component.style.backgroundColor;
    } else {
      element.style.backgroundColor = "transparent";
    }

    // 存储原始边框样式，用于取消选中时恢复
    if (component.style.borderColor) {
      element.setAttribute(
        "data-original-border-color",
        component.style.borderColor
      );
    }
    if (component.style.borderWidth !== undefined) {
      element.setAttribute(
        "data-original-border-width",
        component.style.borderWidth + "px"
      );
    }

    // 应用边框样式（如果不是选中状态则立即应用）
    if (!isSelected) {
      if (component.style.borderColor) {
        element.style.borderColor = component.style.borderColor;
      }
      if (component.style.borderWidth !== undefined) {
        element.style.borderWidth = component.style.borderWidth + "px";
      }
    }

    // 应用边框圆角
    if (component.style.borderRadius !== undefined) {
      element.style.borderRadius = component.style.borderRadius + "px";
    }

    // 应用文字颜色
    if (component.style.color) {
      element.style.color = component.style.color;
      // 同时应用到子元素
      const textElements = element.querySelectorAll(
        "span, div, p, .component-text"
      );
      textElements.forEach(textEl => {
        (textEl as HTMLElement).style.color = component.style.color;
      });
    }

    // 应用透明度
    if (component.style.opacity !== undefined) {
      element.style.opacity = component.style.opacity.toString();
    }

    // 应用阴影效果
    if (component.style.boxShadow) {
      element.style.boxShadow = component.style.boxShadow;
    } else {
      // 如果选中状态，保持选中阴影，否则清除阴影
      if (!isSelected) {
        element.style.boxShadow = "";
      }
    }

    // 如果有SVG图标，重新应用SVG样式
    if (component.svgPath) {
      console.log('样式更新时重新应用SVG样式');
      setTimeout(() => {
        applySvgStyles(element, component);
      }, 50); // 短暂延迟确保DOM已更新
    }
  }

  isSaved.value = false;
  ElMessage.success("组件样式已更新");
};

// 更新组件文字
export const updateComponentText = (selectedCanvasComponent: any, componentFormData: any, isSaved: any, ElMessage: any) => {
  if (!selectedCanvasComponent.value) return;

  const component = selectedCanvasComponent.value;
  const element = document.getElementById(component.id);

  if (element) {
    // 查找或创建文字显示元素
    let textElement = element.querySelector(".component-text");

    if (componentFormData.value.text) {
      // 如果有文字内容，创建或更新文字元素
      if (!textElement) {
        textElement = document.createElement("div");
        textElement.className = "component-text";
        textElement.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 90%;
          z-index: 5;
        `;
        element.appendChild(textElement);
      }

      // 更新文字内容和样式
      textElement.textContent = componentFormData.value.text;
      textElement.style.fontSize =
        (componentFormData.value.fontSize || 14) + "px";
      textElement.style.fontWeight =
        componentFormData.value.fontWeight || "normal";
      textElement.style.textAlign =
        componentFormData.value.textAlign || "center";
      textElement.style.verticalAlign =
        componentFormData.value.verticalAlign || "middle";
      textElement.style.textDecoration =
        componentFormData.value.textDecoration || "none";
      textElement.style.color =
        componentFormData.value.color ||
        selectedCanvasComponent.value?.color ||
        selectedCanvasComponent.value?.properties?.color ||
        "#303133";

      // 根据垂直对齐调整display和align-items
      const verticalAlign = componentFormData.value.verticalAlign || "middle";
      if (verticalAlign === "top") {
        textElement.style.top = "0";
        textElement.style.transform = "translateX(-50%)";
      } else if (verticalAlign === "bottom") {
        textElement.style.top = "auto";
        textElement.style.bottom = "0";
        textElement.style.transform = "translateX(-50%)";
      } else {
        textElement.style.top = "50%";
        textElement.style.bottom = "auto";
        textElement.style.transform = "translate(-50%, -50%)";
      }
    } else if (textElement) {
      // 如果没有文字内容，移除文字元素
      textElement.remove();
    }
  }

  // 更新组件数据
  selectedCanvasComponent.value.text = componentFormData.value.text;
  selectedCanvasComponent.value.fontSize = componentFormData.value.fontSize;
  selectedCanvasComponent.value.fontWeight = componentFormData.value.fontWeight;
  selectedCanvasComponent.value.textAlign = componentFormData.value.textAlign;
  selectedCanvasComponent.value.verticalAlign =
    componentFormData.value.verticalAlign;
  selectedCanvasComponent.value.textDecoration =
    componentFormData.value.textDecoration;

  isSaved.value = false;
  ElMessage.success("文字属性已更新");
};

// 更新SVG图标样式
export const updateSvgIconStyle = (selectedCanvasComponent: any, componentFormData: any, svgManager: any, isSaved: any, ElMessage: any) => {
  console.log('🔧 updateSvgIconStyle 被调用');

  if (!selectedCanvasComponent.value) {
    console.warn('⚠️ selectedCanvasComponent.value 不存在');
    return;
  }

  const component = selectedCanvasComponent.value;
  const element = document.getElementById(component.id);

  if (!element) {
    console.warn('⚠️ 未找到组件元素:', component.id);
    return;
  }

  if (!component.svgPath) {
    console.warn('⚠️ 组件没有 svgPath:', component.id);
    return;
  }

  console.log('🔧 updateSvgIconStyle 继续执行:', {
    componentId: component.id,
    componentType: component.type,
    hasSvgPath: !!component.svgPath
  });

  // 查找SVG容器元素
  const svgContainer = element.querySelector(".svg-container");

  if (!svgContainer) {
    console.warn('⚠️ 未找到 SVG 容器:', component.id);
    return;
  }

  console.log('✅ 找到 SVG 容器');

  const style = componentFormData.value.style || {};

  console.log('📦 componentFormData.value.style:', {
    svgAnimation: style.svgAnimation,
    animationSpeed: style.animationSpeed,
    animationDuration: style.animationDuration,
    animationStaticValue: style.animationStaticValue
  });

  // 构建SvgRenderOptions
  const svgOptions = {
      fillColor: style.svgColor || style.fill,
      strokeColor: style.stroke,
      strokeWidth: style.strokeWidth,
      strokeDasharray: style.strokeDasharray,
      strokeLinecap: style.strokeLinecap,
      strokeLinejoin: style.strokeLinejoin,
      fillOpacity: style.fillOpacity,
      strokeOpacity: style.strokeOpacity,
      opacity: style.svgOpacity || style.opacity,
      animation: style.svgAnimation,
      animationSpeed: style.animationSpeed,
      animationDuration: style.animationDuration,
      animationIterationCount: style.animationIterationCount,
      animationTimingFunction: style.animationTimingFunction,
      animationDelay: style.animationDelay,
      animationPlayStateOnHover: style.animationPlayStateOnHover,
      animationStaticValue: style.animationStaticValue,  // 🎯 动画静态值参数A (0-100)
      pipeFlowDirection: style.pipeFlowDirection,  // 管道流动方向
      switchState: style.switchState,  // 🔘 开关状态 (on/off)
      switchOnColor: style.switchOnColor,  // 🔘 开启状态颜色
      switchOffColor: style.switchOffColor,  // 🔘 关闭状态颜色
      enableDropShadow: style.enableDropShadow,
      dropShadowColor: style.dropShadowColor,
      dropShadowOffsetX: style.dropShadowOffsetX,
      dropShadowOffsetY: style.dropShadowOffsetY,
      dropShadowBlur: style.dropShadowBlur,
      svgBlur: style.svgBlur,
      gradientType: style.gradientType,
      gradientStart: style.gradientStart,
      gradientEnd: style.gradientEnd,
      gradientDirection: style.gradientDirection,
      // 🎨 图标效果渐变参数 - 修复渐变丢失问题
      fillType: style.fillType,
      fillGradientStart: style.fillGradientStart,
      fillGradientEnd: style.fillGradientEnd,
      fillGradientAngle: style.fillGradientAngle,
      fillGradientShape: style.fillGradientShape,
      svgStyleEnabled: style.svgStyleEnabled,
      hoverEffect: style.svgHoverEffect
    };

    console.log('🚀 调用 SvgManager.updateComponentStyle:', {
      componentType: component.type,
      animation: svgOptions.animation,
      animationStaticValue: svgOptions.animationStaticValue,
      svgOptions
    });

    // 使用SvgManager更新组件样式
    svgManager.updateComponentStyle(svgContainer as HTMLElement, svgOptions, component.type);

    // 更新组件数据
    if (!selectedCanvasComponent.value.style) {
      selectedCanvasComponent.value.style = {};
    }
    Object.assign(selectedCanvasComponent.value.style, componentFormData.value.style || {});

  isSaved.value = false;
  ElMessage.success("SVG图标样式已更新");
};

// 颜色转换工具函数
export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
};

export const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
};

// 保存图表配置
export const saveChartConfig = (currentChartComponent: any, chartConfigData: any, chartConfigVisible: any, isSaved: any, initEChart: (container: HTMLElement, component: any) => void, ElMessage: any) => {
  if (!currentChartComponent.value) return;

  // 更新组件配置
  currentChartComponent.value.chartConfig = {
    ...currentChartComponent.value.chartConfig,
    ...chartConfigData.value
  };

  currentChartComponent.value.updated = new Date().toISOString();

  // 重新渲染图表
  const element = document.getElementById(currentChartComponent.value.id);
  if (element) {
    const chartContainer = element.querySelector(".chart-container");
    if (chartContainer) {
      // 清理旧图表实例
      const oldChart = (chartContainer as any).__echarts__;
      if (oldChart) {
        oldChart.dispose();
      }

      // 重新初始化图表
      initEChart(chartContainer as HTMLElement, currentChartComponent.value);
    }
  }

  chartConfigVisible.value = false;
  isSaved.value = false;

  ElMessage.success("图表配置已更新");
};

// ComponentBinding相关方法
export const updateComponentBinding = (selectedCanvasComponent: any, componentFormData: any, isSaved: any) => {
  if (!selectedCanvasComponent.value) return;

  const component = selectedCanvasComponent.value;

  // 创建符合ComponentBinding接口的配置
  const componentBinding = {
    componentId: component.id,
    deviceId: componentFormData.value.deviceId,
    paramcode: componentFormData.value.paramcode,
    targetProperty: componentFormData.value.targetProperty,
    directMapping:
      componentFormData.value.bindingMode === "direct" ||
      componentFormData.value.bindingMode === "hybrid",
    valueTransform: componentFormData.value.valueTransform,
    conditions:
      componentFormData.value.bindingMode === "conditional" ||
      componentFormData.value.bindingMode === "hybrid"
        ? componentFormData.value.conditions
        : undefined,
    actions:
      componentFormData.value.bindingMode === "conditional" ||
      componentFormData.value.bindingMode === "hybrid"
        ? componentFormData.value.actions
        : undefined
  };

  // 更新组件的ComponentBinding配置
  component.componentBinding = componentBinding;
  componentFormData.value.componentBinding = componentBinding;

  // 标记项目未保存
  isSaved.value = false;

  console.log("ComponentBinding配置已更新:", component.componentBinding);
};

// 条件管理方法
export const addCondition = (componentFormData: any, updateComponentBinding: () => void) => {
  if (!componentFormData.value.conditions) {
    componentFormData.value.conditions = [];
  }

  const newCondition = {
    id: `condition_${Date.now()}`,
    type: "threshold",
    operator: ">",
    value: "",
    logicOperator: "AND"
  };

  componentFormData.value.conditions.push(newCondition);
  updateComponentBinding();
};

export const removeCondition = (index: number, componentFormData: any, updateComponentBinding: () => void) => {
  if (componentFormData.value.conditions) {
    componentFormData.value.conditions.splice(index, 1);
    updateComponentBinding();
  }
};

// ComponentBinding动作管理方法
export const addBindingAction = (componentFormData: any, updateComponentBinding: () => void) => {
  if (!componentFormData.value.actions) {
    componentFormData.value.actions = [];
  }

  const newAction = {
    id: `action_${Date.now()}`,
    type: "setValue",
    target: componentFormData.value.targetProperty || "text",
    value: "",
    duration: 1000
  };

  componentFormData.value.actions.push(newAction);
  updateComponentBinding();
};

export const removeBindingAction = (index: number, componentFormData: any, updateComponentBinding: () => void) => {
  if (componentFormData.value.actions) {
    componentFormData.value.actions.splice(index, 1);
    updateComponentBinding();
  }
};

// 绑定预览方法
export const previewBinding = (componentFormData: any, deviceList: any, ElMessage: any) => {
  if (!componentFormData.value.deviceId || !componentFormData.value.paramcode) {
    ElMessage.warning("请先配置设备和属性");
    return;
  }

  // 模拟数据值进行预览
  const device = deviceList.value.find(
    d => d.id === componentFormData.value.deviceId
  );
  const attribute = device?.attributes.find(
    attr => attr.paramcode === componentFormData.value.paramcode
  );

  if (!attribute) {
    ElMessage.error("找不到对应的设备属性");
    return;
  }

  // 模拟一个测试值
  let mockValue;
  if (attribute.type === "number") {
    const range = attribute.range;
    mockValue = range ? (range.min + range.max) / 2 : 50;
  } else if (attribute.type === "enum") {
    mockValue = attribute.enumValues ? attribute.enumValues[0] : "unknown";
  } else {
    mockValue = "test_value";
  }

  // 应用值转换
  if (
    componentFormData.value.valueTransform &&
    componentFormData.value.bindingMode !== "conditional"
  ) {
    try {
      const value = mockValue;
      const transformedValue = eval(componentFormData.value.valueTransform);
      ElMessage.success(`预览结果: ${transformedValue}`);
    } catch (error) {
      ElMessage.error("值转换表达式错误: " + error.message);
    }
  } else {
    ElMessage.success(`预览值: ${mockValue} ${attribute.unit || ""}`);
  }

  componentFormData.value.previewData = mockValue;
};

export const getBindingPreview = (componentFormData: any) => {
  const binding = componentFormData.value.componentBinding;
  if (!binding) {
    return JSON.stringify(
      {
        message: "暂未配置绑定"
      },
      null,
      2
    );
  }

  return JSON.stringify(binding, null, 2);
};

export const getBindingModeLabel = (componentFormData: any) => {
  const modes = {
    direct: "直接映射",
    conditional: "条件触发",
    hybrid: "混合模式"
  };
  return modes[componentFormData.value.bindingMode] || "未知";
};

// 处理图表配置更新
export const handleUpdateChartConfig = (property: string, value: any, selectedCanvasComponent: any, componentFormData: any, isSaved: any, ElMessage: any) => {
  if (!selectedCanvasComponent.value) return;

  // 确保chartConfig对象存在
  if (!selectedCanvasComponent.value.chartConfig) {
    selectedCanvasComponent.value.chartConfig = {};
  }

  // 处理嵌套属性路径，如 'mqttConfig.topic'
  if (property.includes(".")) {
    const parts = property.split(".");
    let obj = selectedCanvasComponent.value.chartConfig;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) {
        obj[parts[i]] = {};
      }
      obj = obj[parts[i]];
    }

    obj[parts[parts.length - 1]] = value;
  } else {
    selectedCanvasComponent.value.chartConfig[property] = value;
  }

  // 更新组件表单数据
  if (componentFormData.value.chartConfig) {
    if (property.includes(".")) {
      const parts = property.split(".");
      let obj = componentFormData.value.chartConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) {
          obj[parts[i]] = {};
        }
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
    } else {
      componentFormData.value.chartConfig[property] = value;
    }
  }

  isSaved.value = false;
  ElMessage.success("图表配置已更新");
};

// 画布重绘方法
export const redrawCanvas = (selectedCanvasComponent: any, applyStyleToElement: (component: any) => void, applyTransformToElement: (component: any) => void, nextTick: any) => {
  // 触发组件重新渲染
  nextTick(() => {
    if (selectedCanvasComponent.value) {
      const element = document.getElementById(selectedCanvasComponent.value.id);
      if (element) {
        const component = selectedCanvasComponent.value;

        // 应用所有样式
        applyStyleToElement(component);

        // 应用位置和尺寸
        if (component.position) {
          element.style.left = component.position.x + "px";
          element.style.top = component.position.y + "px";
        }
        if (component.size) {
          element.style.width = component.size.width + "px";
          element.style.height = component.size.height + "px";
        }

        // 应用变换
        applyTransformToElement(component);
      }
    }
  });
};

// 应用变换到DOM元素的方法
export const applyTransformToElement = (component: any) => {
  const element = document.getElementById(component.id);
  if (!element) return;

  const transforms = [];

  // 应用位移
  if (component.position) {
    element.style.left = component.position.x + "px";
    element.style.top = component.position.y + "px";
  }

  // 应用旋转
  if (component.rotation) {
    transforms.push(`rotate(${component.rotation}deg)`);
  }

  // 应用缩放
  if (component.scale && component.scale !== 1) {
    transforms.push(`scale(${component.scale})`);
  }

  // 应用翻转
  let scaleX = 1, scaleY = 1;
  if (component.flipHorizontal) scaleX = -1;
  if (component.flipVertical) scaleY = -1;
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX}, ${scaleY})`);
  }

  // 应用倾斜
  if (component.skewX) {
    transforms.push(`skewX(${component.skewX}deg)`);
  }
  if (component.skewY) {
    transforms.push(`skewY(${component.skewY}deg)`);
  }

  // 应用变换原点
  if (component.originX || component.originY) {
    const originX = component.originX || 'center';
    const originY = component.originY || 'center';
    element.style.transformOrigin = `${originX} ${originY}`;
  }

  // 应用所有变换
  element.style.transform = transforms.length > 0 ? transforms.join(' ') : 'none';
};

// 更新组件事件
export const updateComponentEvents = (selectedCanvasComponent: any, componentFormData: any, isSaved: any) => {
  if (!selectedCanvasComponent.value) return;

  selectedCanvasComponent.value.events = [...componentFormData.value.events];

  isSaved.value = false;
  console.log("组件事件已更新:", selectedCanvasComponent.value.events);
};

// 测试事件
export const testEvents = (componentFormData: any, getEventTypeName: (type: string) => string, getActionTypeName: (type: string) => string, ElMessage: any) => {
  const enabledEvents = componentFormData.value.events.filter(
    event => event.enabled
  );

  if (enabledEvents.length === 0) {
    ElMessage.warning("没有启用的事件可以测试");
    return;
  }

  enabledEvents.forEach((event, index) => {
    setTimeout(() => {
      ElMessage.info(`测试事件 ${index + 1}: ${getEventTypeName(event.type)}`);

      // 模拟执行动作
      event.actions?.forEach((action, actionIndex) => {
        setTimeout(() => {
          ElMessage.success(
            `执行动作 ${actionIndex + 1}: ${getActionTypeName(action.type)}`
          );
        }, action.delay || 0);
      });
    }, index * 500);
  });
};

// 处理样式更新
export const handleUpdateStyle = (property: string, value: any, selectedCanvasComponent: any, applySvgStyles: any, applyStyleToElement: any, redrawCanvas: any, isSaved: any) => {
  if (!selectedCanvasComponent.value) return;
  if (!selectedCanvasComponent.value.style) {
    selectedCanvasComponent.value.style = {
      backgroundColor: "transparent",
      borderColor: "#d9d9d9",
      color: "#333"
    };
  }

  console.log('📝 样式更新:', {
    property: property,
    value: value,
    valueType: typeof value,
    componentId: selectedCanvasComponent.value.id,
    currentStyle: selectedCanvasComponent.value.style,
    animationStaticValue_before: selectedCanvasComponent.value.style?.animationStaticValue
  });

  // 特殊处理颜色选择器的值
  if (property === 'backgroundColor' && value === null) {
    // 颜色选择器返回null时，设置为透明
    selectedCanvasComponent.value.style[property] = 'transparent';
    console.log('颜色选择器返回null，设置为透明');
  } else if (value === null || value === undefined) {
    // 其他属性为null或undefined时删除
    delete selectedCanvasComponent.value.style[property];
  } else {
    selectedCanvasComponent.value.style[property] = value;

    console.log(`✅ 已更新 selectedCanvasComponent.value.style.${property} =`, value);
    console.log(`🔍 更新后 animationStaticValue =`, selectedCanvasComponent.value.style.animationStaticValue);

    // 特殊处理：当设置backgroundType为solid时，确保有默认的backgroundColor
    if (property === 'backgroundType' && value === 'solid') {
      if (!selectedCanvasComponent.value.style.backgroundColor ||
          selectedCanvasComponent.value.style.backgroundColor === 'transparent') {
        selectedCanvasComponent.value.style.backgroundColor = 'rgba(255, 255, 255, 1)';
        console.log('设置默认背景色为白色RGBA');
      }
    }
  }

  // 立即应用样式到DOM元素
  applyStyleToElement(selectedCanvasComponent.value);

  // 如果是SVG相关属性变化，重新应用SVG样式
  const svgFillProperties = ['fillType', 'fill', 'svgColor', 'fillOpacity', 'fillGradientStart', 'fillGradientEnd', 'fillGradientAngle', 'fillGradientShape'];

  // 动画相关属性列表
  const animationProperties = [
    'svgAnimation',
    'animationSpeed',
    'animationDuration',
    'animationIterationCount',
    'animationTimingFunction',
    'animationDelay',
    'animationPlayStateOnHover',
    'animationStaticValue',  // 🎯 动画静态值参数A (0-100)
    'pipeFlowDirection',  // 管道流动方向
    'switchState',  // 🔘 开关状态
    'switchOnColor',  // 🔘 开启状态颜色
    'switchOffColor'  // 🔘 关闭状态颜色
  ];

  // SVG填充属性变化 - 使用applySvgStyles
  if (selectedCanvasComponent.value.svgPath && svgFillProperties.includes(property)) {
    console.log('SVG填充属性变化，重新应用SVG样式:', { property, value });
    const element = document.getElementById(selectedCanvasComponent.value.id);
    if (element) {
      setTimeout(() => {
        applySvgStyles(element, selectedCanvasComponent.value);
      }, 100); // 稍长延迟确保所有样式更新完成
    }
  }

  // 动画属性变化 - 需要重新应用整个SVG组件样式(包括动画)
  if (selectedCanvasComponent.value.svgPath && animationProperties.includes(property)) {
    console.log('🎬 动画属性变化，触发SVG组件样式完整更新:', { property, value });

    // 延迟调用以确保所有样式属性都已更新
    setTimeout(() => {
      const element = document.getElementById(selectedCanvasComponent.value.id);
      if (!element) {
        console.warn('未找到组件元素:', selectedCanvasComponent.value.id);
        return;
      }

      const svgContainer = element.querySelector(".svg-container");
      if (!svgContainer) {
        console.warn('未找到SVG容器:', selectedCanvasComponent.value.id);
        return;
      }

      const style = selectedCanvasComponent.value.style || {};

      // 🎯 特殊处理：如果动画为 none，需要设置默认动画以便触发液位更新
      let effectiveAnimation = style.svgAnimation || 'none';

      // 构建完整的SvgRenderOptions,包含所有动画参数
      const svgOptions = {
        fillColor: style.svgColor || style.fill,
        strokeColor: style.stroke,
        strokeWidth: style.strokeWidth,
        strokeDasharray: style.strokeDasharray,
        strokeLinecap: style.strokeLinecap,
        strokeLinejoin: style.strokeLinejoin,
        fillOpacity: style.fillOpacity,
        strokeOpacity: style.strokeOpacity,
        opacity: style.svgOpacity || style.opacity,
        animation: effectiveAnimation,  // 🎬 关键:动画类型
        animationSpeed: style.animationSpeed,
        animationDuration: style.animationDuration,  // 🎬 关键:动画时长
        animationIterationCount: style.animationIterationCount,  // 🎬 关键:循环次数
        animationTimingFunction: style.animationTimingFunction,
        animationDelay: style.animationDelay,
        animationPlayStateOnHover: style.animationPlayStateOnHover,
        animationStaticValue: style.animationStaticValue,  // 🎯 关键:动画静态值参数A (0-100)
        pipeFlowDirection: style.pipeFlowDirection,  // 🎬 关键:管道流动方向
        switchState: style.switchState,  // 🔘 开关状态 (on/off)
        switchOnColor: style.switchOnColor,  // 🔘 开启状态颜色
        switchOffColor: style.switchOffColor,  // 🔘 关闭状态颜色
        enableDropShadow: style.enableDropShadow,
        dropShadowColor: style.dropShadowColor,
        dropShadowOffsetX: style.dropShadowOffsetX,
        dropShadowOffsetY: style.dropShadowOffsetY,
        dropShadowBlur: style.dropShadowBlur,
        svgBlur: style.svgBlur,
        gradientType: style.gradientType,
        gradientStart: style.gradientStart,
        gradientEnd: style.gradientEnd,
        gradientDirection: style.gradientDirection,
        // 🎨 图标效果渐变参数 - 修复渐变丢失问题
        fillType: style.fillType,
        fillGradientStart: style.fillGradientStart,
        fillGradientEnd: style.fillGradientEnd,
        fillGradientAngle: style.fillGradientAngle,
        fillGradientShape: style.fillGradientShape,
        svgStyleEnabled: style.svgStyleEnabled,
        hoverEffect: style.svgHoverEffect
      };

      console.log('调用SvgManager.updateComponentStyle:', {
        componentType: selectedCanvasComponent.value.type,
        animation: svgOptions.animation,
        animationStaticValue: svgOptions.animationStaticValue,
        pipeFlowDirection: svgOptions.pipeFlowDirection,
        duration: svgOptions.animationDuration
      });

      // 使用SvgManager更新组件样式,这会触发动画重新应用
      svgManager.updateComponentStyle(
        svgContainer as HTMLElement,
        svgOptions,
        selectedCanvasComponent.value.type
      );
    }, 150);  // 稍长延迟,确保所有样式更新完成
  }

  isSaved.value = false;
  redrawCanvas();
};

// 处理文本更新
export const handleUpdateText = (property: string, value: any, selectedCanvasComponent: any, componentFormData: any, updateComponentText: any, isSaved: any, updateButtonAppearance?: any) => {
  if (!selectedCanvasComponent.value) return;

  console.log('🔧 handleUpdateText 调用:', {
    property,
    value,
    componentType: selectedCanvasComponent.value.type,
    hasUpdateButtonAppearance: !!updateButtonAppearance
  });

  // 更新组件属性
  selectedCanvasComponent.value[property] = value;

  // 更新表单数据
  componentFormData.value[property] = value;

  // 确保 properties 对象存在并更新
  if (!selectedCanvasComponent.value.properties) {
    selectedCanvasComponent.value.properties = {};
  }
  selectedCanvasComponent.value.properties[property] = value;

  console.log('🔧 已更新 properties:', selectedCanvasComponent.value.properties);

  // 检查是否是绘图工具创建的文本组件
  const element = document.getElementById(selectedCanvasComponent.value.id);
  if (element && element.classList.contains('text-component')) {
    // 直接更新 DOM 元素样式
    switch (property) {
      case 'text':
        element.textContent = value;
        break;
      case 'fontSize':
        element.style.fontSize = `${value}px`;
        break;
      case 'fontFamily':
        element.style.fontFamily = value;
        break;
      case 'fontWeight':
        element.style.fontWeight = value;
        break;
      case 'color':
        element.style.color = value;
        break;
      case 'textAlign':
        element.style.textAlign = value;
        break;
      case 'verticalAlign':
        const alignValue = value === 'top' ? 'flex-start' :
                          value === 'bottom' ? 'flex-end' : 'center';
        element.style.alignItems = alignValue;
        break;
      case 'backgroundColor':
        element.style.backgroundColor = value;
        break;
      case 'borderColor':
        element.style.borderColor = value;
        break;
      case 'borderWidth':
        element.style.borderWidth = `${value}px`;
        break;
      case 'textDecoration':
        element.style.textDecoration = value;
        break;
    }
  } else if (element && element.classList.contains('button-component')) {
    // 🔲 特殊处理按钮组件：当文本相关属性更新时，调用 updateButtonAppearance 更新按钮外观
    console.log('🔲 检测到按钮组件，准备更新外观', {
      hasUpdateButtonAppearance: !!updateButtonAppearance,
      property,
      value
    });

    if (updateButtonAppearance) {
      console.log('🔲 调用 updateButtonAppearance');
      updateButtonAppearance(selectedCanvasComponent.value, element);
      console.log('🔲 按钮文本属性已更新:', property, value);
    } else {
      console.warn('⚠️ updateButtonAppearance 函数不存在！');
    }
  } else {
    // 调用传统的文字更新方法
    console.log('🔧 使用传统文字更新方法');
    updateComponentText();
  }

  isSaved.value = false;
};


// 清除选择的组件
export const clearSelectedComponent = (selectedCanvasComponent: any, removeResizeHandles: any) => {
  // 清除选择和调整手柄
  const prevSelected = document.querySelector(".fuxa-component.selected");
  if (prevSelected) {
    prevSelected.classList.remove("selected");
    removeResizeHandles(prevSelected as HTMLElement);

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

    // 不再强制重置z-index，保持原有层级
    // (prevSelected as HTMLElement).style.zIndex = "10";
  }
  selectedCanvasComponent.value = null;
};