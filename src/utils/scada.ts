import type {
  ScadaComponent,
  ComponentConfig,
  ScadaProject,
  DataBinding,
  ScadaAlarm,
  RuntimeData,
  ComponentTemplate
} from '@/types/scada';

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    Object.keys(obj).forEach(key => {
      (cloned as any)[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  
  return obj;
}

/**
 * 创建默认的组件配置
 */
export function createDefaultComponentConfig(): ComponentConfig {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 1,
    backgroundColor: '#ffffff',
    borderColor: '#cccccc',
    borderWidth: 1,
    borderRadius: 0,
    fontSize: 14,
    fontColor: '#333333',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    textAlign: 'center'
  };
}

/**
 * 根据组件类型创建默认配置
 */
export function createComponentByType(type: string, template?: ComponentTemplate): Partial<ScadaComponent> {
  const baseConfig = createDefaultComponentConfig();
  const id = generateUUID();
  
  const component: Partial<ScadaComponent> = {
    id,
    componentType: type,
    componentName: template?.name || type,
    componentConfig: { ...baseConfig, ...template?.defaultConfig },
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // 根据组件类型设置特定的默认值
  switch (type) {
    case 'text':
      component.componentConfig = {
        ...component.componentConfig,
        text: '文本',
        width: 80,
        height: 30
      };
      break;
      
    case 'button':
      component.componentConfig = {
        ...component.componentConfig,
        text: '按钮',
        width: 80,
        height: 32,
        backgroundColor: '#409eff',
        fontColor: '#ffffff'
      };
      break;
      
    case 'image':
      component.componentConfig = {
        ...component.componentConfig,
        width: 100,
        height: 100,
        imageUrl: ''
      };
      break;
      
    case 'gauge':
      component.componentConfig = {
        ...component.componentConfig,
        width: 200,
        height: 200,
        min: 0,
        max: 100,
        value: 0,
        unit: ''
      };
      break;
      
    case 'chart':
      component.componentConfig = {
        ...component.componentConfig,
        width: 400,
        height: 300,
        chartType: 'line',
        chartData: [],
        chartOptions: {}
      };
      break;
      
    default:
      break;
  }
  
  return component;
}

/**
 * 计算组件的边界框
 */
export function getComponentBounds(component: ScadaComponent) {
  const { x, y, width, height, rotation = 0 } = component.componentConfig;
  
  if (rotation === 0) {
    return {
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
      width,
      height
    };
  }
  
  // 处理旋转的情况
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const rad = (rotation * Math.PI) / 180;
  
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const corners = [
    { x: x - centerX, y: y - centerY },
    { x: x + width - centerX, y: y - centerY },
    { x: x + width - centerX, y: y + height - centerY },
    { x: x - centerX, y: y + height - centerY }
  ];
  
  const rotatedCorners = corners.map(corner => ({
    x: corner.x * cos - corner.y * sin + centerX,
    y: corner.x * sin + corner.y * cos + centerY
  }));
  
  const xs = rotatedCorners.map(corner => corner.x);
  const ys = rotatedCorners.map(corner => corner.y);
  
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

/**
 * 检查两个组件是否重叠
 */
export function isComponentsOverlapping(comp1: ScadaComponent, comp2: ScadaComponent): boolean {
  const bounds1 = getComponentBounds(comp1);
  const bounds2 = getComponentBounds(comp2);
  
  return !(
    bounds1.right <= bounds2.left ||
    bounds2.right <= bounds1.left ||
    bounds1.bottom <= bounds2.top ||
    bounds2.bottom <= bounds1.top
  );
}

/**
 * 检查点是否在组件内
 */
export function isPointInComponent(x: number, y: number, component: ScadaComponent): boolean {
  const bounds = getComponentBounds(component);
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

/**
 * 对齐组件到网格
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * 对齐组件位置到网格
 */
export function snapComponentToGrid(component: ScadaComponent, gridSize: number): ScadaComponent {
  const snappedComponent = deepClone(component);
  snappedComponent.componentConfig.x = snapToGrid(component.componentConfig.x, gridSize);
  snappedComponent.componentConfig.y = snapToGrid(component.componentConfig.y, gridSize);
  return snappedComponent;
}

/**
 * 获取组件的中心点
 */
export function getComponentCenter(component: ScadaComponent): { x: number; y: number } {
  const { x, y, width, height } = component.componentConfig;
  return {
    x: x + width / 2,
    y: y + height / 2
  };
}

/**
 * 移动组件
 */
export function moveComponent(component: ScadaComponent, deltaX: number, deltaY: number): ScadaComponent {
  const movedComponent = deepClone(component);
  movedComponent.componentConfig.x += deltaX;
  movedComponent.componentConfig.y += deltaY;
  movedComponent.updatedAt = new Date().toISOString();
  return movedComponent;
}

/**
 * 调整组件大小
 */
export function resizeComponent(
  component: ScadaComponent,
  width: number,
  height: number
): ScadaComponent {
  const resizedComponent = deepClone(component);
  resizedComponent.componentConfig.width = Math.max(1, width);
  resizedComponent.componentConfig.height = Math.max(1, height);
  resizedComponent.updatedAt = new Date().toISOString();
  return resizedComponent;
}

/**
 * 旋转组件
 */
export function rotateComponent(component: ScadaComponent, rotation: number): ScadaComponent {
  const rotatedComponent = deepClone(component);
  rotatedComponent.componentConfig.rotation = rotation % 360;
  rotatedComponent.updatedAt = new Date().toISOString();
  return rotatedComponent;
}

/**
 * 获取组件的样式对象
 */
export function getComponentStyle(component: ScadaComponent): Record<string, any> {
  const config = component.componentConfig;
  
  const style: Record<string, any> = {
    position: 'absolute',
    left: `${config.x}px`,
    top: `${config.y}px`,
    width: `${config.width}px`,
    height: `${config.height}px`,
    opacity: config.opacity || 1,
    zIndex: component.zIndex || 1,
    visibility: component.isVisible ? 'visible' : 'hidden',
    pointerEvents: component.isLocked ? 'none' : 'auto'
  };
  
  if (config.rotation) {
    style.transform = `rotate(${config.rotation}deg)`;
  }
  
  if (config.backgroundColor) {
    style.backgroundColor = config.backgroundColor;
  }
  
  if (config.borderColor && config.borderWidth) {
    style.border = `${config.borderWidth}px solid ${config.borderColor}`;
  }
  
  if (config.borderRadius) {
    style.borderRadius = `${config.borderRadius}px`;
  }
  
  if (config.fontSize) {
    style.fontSize = `${config.fontSize}px`;
  }
  
  if (config.fontColor) {
    style.color = config.fontColor;
  }
  
  if (config.fontFamily) {
    style.fontFamily = config.fontFamily;
  }
  
  if (config.fontWeight) {
    style.fontWeight = config.fontWeight;
  }
  
  if (config.textAlign) {
    style.textAlign = config.textAlign;
  }
  
  return style;
}

/**
 * 验证组件配置
 */
export function validateComponentConfig(config: ComponentConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (config.width <= 0) {
    errors.push('宽度必须大于0');
  }
  
  if (config.height <= 0) {
    errors.push('高度必须大于0');
  }
  
  if (config.opacity < 0 || config.opacity > 1) {
    errors.push('透明度必须在0-1之间');
  }
  
  if (config.rotation < 0 || config.rotation >= 360) {
    errors.push('旋转角度必须在0-359之间');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 格式化数值
 */
export function formatValue(value: any, precision?: number, unit?: string): string {
  if (value === null || value === undefined) {
    return '--';
  }
  
  let formattedValue = value;
  
  if (typeof value === 'number') {
    if (precision !== undefined) {
      formattedValue = value.toFixed(precision);
    }
  }
  
  return unit ? `${formattedValue}${unit}` : String(formattedValue);
}

/**
 * 解析颜色值
 */
export function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  // 处理十六进制颜色
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
  }
  
  // 处理RGB/RGBA颜色
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
    };
  }
  
  // 默认返回黑色
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * 颜色转换为十六进制
 */
export function colorToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 获取对比色
 */
export function getContrastColor(backgroundColor: string): string {
  const { r, g, b } = parseColor(backgroundColor);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

/**
 * 计算两点之间的距离
 */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * 计算角度
 */
export function getAngle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

/**
 * 限制数值范围
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 线性插值
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * 检查是否为图片文件
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  const extension = getFileExtension(filename).toLowerCase();
  return imageExtensions.includes(extension);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间
 */
export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 获取相对时间
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const target = new Date(date);
  const diff = now.getTime() - target.getTime();
  
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`;
  } else {
    return `${Math.floor(diff / year)}年前`;
  }
}

/**
 * 导出项目数据
 */
export function exportProjectData(project: ScadaProject, components: ScadaComponent[]): string {
  const exportData = {
    project,
    components,
    exportTime: new Date().toISOString(),
    version: '1.0.0'
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * 导入项目数据
 */
export function importProjectData(jsonData: string): {
  project: ScadaProject;
  components: ScadaComponent[];
} | null {
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.project || !data.components) {
      throw new Error('Invalid project data format');
    }
    
    return {
      project: data.project,
      components: data.components
    };
  } catch (error) {
    console.error('Failed to import project data:', error);
    return null;
  }
}

/**
 * 获取组件类型的显示名称
 */
export function getComponentTypeDisplayName(type: string): string {
  const typeNames: Record<string, string> = {
    text: '文本',
    button: '按钮',
    image: '图片',
    gauge: '仪表盘',
    chart: '图表',
    slider: '滑块',
    input: '输入框',
    switch: '开关',
    progress: '进度条',
    table: '表格',
    list: '列表',
    tree: '树形控件',
    video: '视频',
    iframe: '内嵌页面'
  };
  
  return typeNames[type] || type;
}

/**
 * 获取报警级别的显示信息
 */
export function getAlarmLevelInfo(level: string): { text: string; color: string; icon: string } {
  const levelInfo: Record<string, { text: string; color: string; icon: string }> = {
    info: { text: '信息', color: '#909399', icon: 'info-filled' },
    warning: { text: '警告', color: '#e6a23c', icon: 'warning-filled' },
    error: { text: '错误', color: '#f56c6c', icon: 'error-filled' },
    critical: { text: '严重', color: '#f56c6c', icon: 'close-filled' }
  };
  
  return levelInfo[level] || levelInfo.info;
}

/**
 * 获取设备状态的显示信息
 */
export function getDeviceStatusInfo(status: string): { text: string; color: string; icon: string } {
  const statusInfo: Record<string, { text: string; color: string; icon: string }> = {
    connected: { text: '已连接', color: '#67c23a', icon: 'success-filled' },
    disconnected: { text: '未连接', color: '#909399', icon: 'warning-filled' },
    error: { text: '错误', color: '#f56c6c', icon: 'error-filled' }
  };
  
  return statusInfo[status] || statusInfo.disconnected;
}