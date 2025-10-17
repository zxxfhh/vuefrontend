import type { ScadaComponent } from '../types'
import { DrawingToolManager, drawingTools } from './DrawingTools'
import { ChartComponentManager, chartComponents } from './ChartComponents'
import { ImageComponentManager, imageComponents } from './ImageComponent'
import { TimePickerComponentManager, timePickerComponents } from './TimePickerComponent'
import { PropertyEditorManager } from './PropertyEditorManager'
import { findComponentByName } from './fuxa-icon-mapping'

/**
 * 统一组件管理器
 * 负责管理所有类型的SCADA组件
 */
export class ComponentManager {
  private drawingManager: DrawingToolManager
  private chartManager: ChartComponentManager
  private imageManager: ImageComponentManager
  private timePickerManager: TimePickerComponentManager
  private propertyManager: PropertyEditorManager
  
  private componentInstances: Map<string, HTMLElement> = new Map()
  private componentTypes: Map<string, string> = new Map() // componentId -> componentType
  
  constructor() {
    this.drawingManager = new DrawingToolManager()
    this.chartManager = new ChartComponentManager()
    this.imageManager = new ImageComponentManager()
    this.timePickerManager = new TimePickerComponentManager()
    this.propertyManager = new PropertyEditorManager()
    
    this.setupEventHandlers()
  }
  
  /**
   * 初始化组件管理器
   */
  public initialize(container: HTMLElement) {
    // 各个管理器的初始化逻辑
    if (this.drawingManager.initialize) {
      this.drawingManager.initialize(container)
    }
    if (this.chartManager.initialize) {
      this.chartManager.initialize(container)
    }
    if (this.imageManager.initialize) {
      this.imageManager.initialize(container)
    }
    if (this.timePickerManager.initialize) {
      this.timePickerManager.initialize(container)
    }
    if (this.propertyManager.initialize) {
      this.propertyManager.initialize(container)
    }
    
    console.log('组件管理器已初始化')
  }
  
  /**
   * 设置事件处理器
   */
  private setupEventHandlers() {
    // 图片上传完成事件
    this.imageManager.onImageUploaded = (componentId: string, file: File, base64: string) => {
      console.log('图片上传完成:', componentId, file.name)
      this.onComponentUpdate?.(componentId, { src: base64 })
    }
    
    // 图片错误事件
    this.imageManager.onImageError = (componentId: string, error: string) => {
      console.error('图片组件错误:', componentId, error)
    }
    
    // 时间选择器变化事件
    this.timePickerManager.onTimePickerChange = (componentId: string, value: string | string[], category: string) => {
      console.log('时间选择器值变化:', componentId, value, category)
      this.onComponentUpdate?.(componentId, { value })
    }
    
    // 绘图工具完成事件
    this.drawingManager.onDrawingComplete = (componentId: string, shapeData: any) => {
      console.log('绘图完成:', componentId, shapeData)
      this.onComponentUpdate?.(componentId, shapeData)
    }
    
    // 图表数据更新事件
    this.chartManager.onChartDataUpdate = (componentId: string, data: any) => {
      console.log('图表数据更新:', componentId, data)
      this.onComponentUpdate?.(componentId, { data })
    }
  }
  
  /**
   * 创建组件实例
   */
  createComponent(component: ScadaComponent, container: HTMLElement): HTMLElement {
    let element: HTMLElement

    // 根据组件类型创建相应的实例
    if (this.isDrawingTool(component.type)) {
      element = this.drawingManager.createDrawingComponent(component, container)
    } else if (this.isChartComponent(component.type)) {
      element = this.chartManager.createChartComponent(component, container)
    } else if (this.isImageComponent(component.type)) {
      element = this.imageManager.createImageComponent(component, container)
    } else if (this.isTimePickerComponent(component.type)) {
      element = this.timePickerManager.createTimePickerComponent(component, container)
    } else if (this.isRegularSvgComponent(component.type)) {
      // 常规SVG组件（如心形、箭头等）通过DrawingManager处理
      element = this.drawingManager.createDrawingComponent(component, container)
    } else {
      // 默认处理或其他组件类型
      element = this.createDefaultComponent(component, container)
    }

    // 缓存组件实例和类型
    this.componentInstances.set(component.id, element)
    this.componentTypes.set(component.id, component.type)

    return element
  }
  
  /**
   * 更新组件
   */
  updateComponent(componentId: string, properties: any) {
    const componentType = this.componentTypes.get(componentId)
    if (!componentType) return

    if (this.isDrawingTool(componentType)) {
      this.drawingManager.updateDrawingComponent(componentId, properties)
    } else if (this.isChartComponent(componentType)) {
      this.chartManager.updateChartComponent(componentId, properties)
    } else if (this.isImageComponent(componentType)) {
      this.imageManager.updateImageComponent(componentId, properties)
    } else if (this.isTimePickerComponent(componentType)) {
      this.timePickerManager.updateTimePickerComponent(componentId, properties)
    } else if (this.isRegularSvgComponent(componentType)) {
      this.drawingManager.updateDrawingComponent(componentId, properties)
    }
  }
  
  /**
   * 销毁组件
   */
  destroyComponent(componentId: string) {
    const componentType = this.componentTypes.get(componentId)
    if (!componentType) return

    if (this.isDrawingTool(componentType)) {
      this.drawingManager.destroyDrawingComponent(componentId)
    } else if (this.isChartComponent(componentType)) {
      this.chartManager.destroyChartComponent(componentId)
    } else if (this.isImageComponent(componentType)) {
      this.imageManager.removeUploadedImage(componentId)
    } else if (this.isTimePickerComponent(componentType)) {
      this.timePickerManager.destroyTimePickerComponent(componentId)
    } else if (this.isRegularSvgComponent(componentType)) {
      this.drawingManager.destroyDrawingComponent(componentId)
    }

    this.componentInstances.delete(componentId)
    this.componentTypes.delete(componentId)
  }
  
  /**
   * 获取组件的默认属性
   */
  getDefaultProperties(componentType: string): Record<string, any> {
    return this.propertyManager.generateDefaultProperties(componentType)
  }
  
  /**
   * 获取组件的属性编辑器配置
   */
  getPropertyEditorConfig(componentType: string) {
    return this.propertyManager.getEditorConfig(componentType)
  }
  
  /**
   * 验证组件属性
   */
  validateProperties(componentType: string, properties: Record<string, any>) {
    return this.propertyManager.validateProperties(componentType, properties)
  }
  
  /**
   * 获取可见的属性字段
   */
  getVisibleFields(componentType: string, properties: Record<string, any>) {
    return this.propertyManager.getVisibleFields(componentType, properties)
  }
  
  /**
   * 按组分组属性字段
   */
  getFieldsByGroup(componentType: string, properties: Record<string, any>) {
    return this.propertyManager.getFieldsByGroup(componentType, properties)
  }
  
  /**
   * 获取所有可用的组件类型
   */
  getAllComponentTypes() {
    return {
      drawing: drawingTools.map(tool => tool.name),
      charts: chartComponents.map(chart => chart.name),
      images: imageComponents.map(image => image.name),
      timePickers: timePickerComponents.map(picker => picker.name),
      registered: this.propertyManager.getRegisteredTypes()
    }
  }
  
  /**
   * 获取组件配置信息
   */
  getComponentConfig(componentType: string) {
    // 尝试从各个管理器获取配置
    const drawingTool = drawingTools.find(tool => tool.name === componentType)
    if (drawingTool) return drawingTool
    
    const chartConfig = chartComponents.find(chart => chart.name === componentType)
    if (chartConfig) return chartConfig
    
    const imageConfig = imageComponents.find(image => image.name === componentType)
    if (imageConfig) return imageConfig
    
    const timePickerConfig = timePickerComponents.find(picker => picker.name === componentType)
    if (timePickerConfig) return timePickerConfig
    
    return null
  }
  
  /**
   * 检查是否为绘图工具
   */
  private isDrawingTool(componentType: string): boolean {
    console.log('ComponentManager.isDrawingTool 检查:', componentType);
    console.log('可用的 drawingTools:', drawingTools.map(t => t.name));
    const result = drawingTools.some(tool => tool.name === componentType);
    console.log('ComponentManager.isDrawingTool 结果:', result);
    return result;
  }
  
  /**
   * 检查是否为图表组件
   */
  private isChartComponent(componentType: string): boolean {
    return chartComponents.some(chart => chart.name === componentType)
  }
  
  /**
   * 检查是否为图片组件
   */
  private isImageComponent(componentType: string): boolean {
    return imageComponents.some(image => image.name === componentType)
  }
  
  /**
   * 检查是否为时间选择器组件
   */
  private isTimePickerComponent(componentType: string): boolean {
    return timePickerComponents.some(picker => picker.name === componentType)
  }

  /**
   * 检查是否为常规SVG组件（在fuxa-icon-mapping.ts中定义但不是绘图工具的组件）
   */
  private isRegularSvgComponent(componentType: string): boolean {
    const component = findComponentByName(componentType)
    return component !== undefined
  }
  
  /**
   * 检查组件类型是否被支持
   */
  public isComponentTypeSupported(componentType: string): boolean {
    return this.isDrawingTool(componentType) ||
           this.isChartComponent(componentType) ||
           this.isImageComponent(componentType) ||
           this.isTimePickerComponent(componentType) ||
           this.isRegularSvgComponent(componentType)
  }
  
  /**
   * 创建默认组件
   */
  private createDefaultComponent(component: ScadaComponent, container: HTMLElement): HTMLElement {
    const element = document.createElement('div')
    element.className = 'default-component'
    element.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f7fa;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      color: #909399;
      font-size: 14px;
    `
    element.textContent = component.name || component.type
    
    container.appendChild(element)
    return element
  }
  
  /**
   * 开始实时数据更新
   */
  startRealTimeUpdates() {
    this.chartManager.startRealTimeUpdates()
  }
  
  /**
   * 停止实时数据更新
   */
  stopRealTimeUpdates() {
    this.chartManager.stopRealTimeUpdates()
  }
  
  /**
   * 获取绘图管理器
   */
  getDrawingManager(): DrawingToolManager {
    return this.drawingManager
  }
  
  /**
   * 检查是否为绘图工具组件
   */
  isDrawingToolComponent(componentType: string): boolean {
    console.log('ComponentManager.isDrawingToolComponent 检查:', componentType);
    const result = this.drawingManager.isDrawingTool(componentType);
    console.log('ComponentManager.isDrawingToolComponent 结果:', result);
    return result;
  }
  
  /**
   * 获取图表管理器
   */
  getChartManager(): ChartComponentManager {
    return this.chartManager
  }
  
  /**
   * 获取图片管理器
   */
  getImageManager(): ImageComponentManager {
    return this.imageManager
  }
  
  /**
   * 获取时间选择器管理器
   */
  getTimePickerManager(): TimePickerComponentManager {
    return this.timePickerManager
  }
  
  /**
   * 获取属性管理器
   */
  getPropertyManager(): PropertyEditorManager {
    return this.propertyManager
  }
  
  /**
   * 清理所有资源
   */
  destroy() {
    this.drawingManager.destroy()
    this.chartManager.destroy()
    this.imageManager.clearCache()
    this.timePickerManager.destroy()
    this.propertyManager.clear()
    
    this.componentInstances.clear()
    this.componentTypes.clear()
  }
  
  /**
   * 设置绘图工具
   */
  setDrawingTool(toolName: string) {
    this.drawingManager.setCurrentTool(toolName)
  }
  
  /**
   * 启用绘图模式
   */
  enableDrawingMode() {
    this.drawingManager.enableDrawingMode()
  }
  
  /**
   * 禁用绘图模式
   */
  disableDrawingMode() {
    this.drawingManager.disableDrawingMode()
  }
  
  /**
   * 获取绘图工具管理器
   */
  getDrawingManager() {
    return this.drawingManager
  }
  
  // 事件回调
  onComponentCreated?: (component: any) => void
  onComponentUpdated?: (componentId: string, properties: any) => void
  onComponentDeleted?: (componentId: string) => void
  onComponentUpdate?: (componentId: string, properties: any) => void
  onComponentSelect?: (componentId: string) => void
  onComponentDelete?: (componentId: string) => void
}

/**
 * 创建全局组件管理器实例
 */
export const componentManager = new ComponentManager()