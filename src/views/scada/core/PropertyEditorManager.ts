import type { ScadaComponent } from '../types'

/**
 * 属性编辑器配置接口
 */
export interface PropertyEditorConfig {
  type: string;
  title: string;
  icon: string;
  category: 'basic' | 'style' | 'behavior' | 'data' | 'advanced';
  fields: PropertyField[];
  validation?: ValidationRule[];
}

/**
 * 属性字段配置
 */
export interface PropertyField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'switch' | 'slider' | 'textarea' | 'date' | 'time' | 'file';
  defaultValue: any;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
  disabled?: boolean;
  visible?: boolean;
  description?: string;
  group?: string;
  dependency?: string; // 依赖的字段名
  dependencyValue?: any; // 依赖字段的值
}

/**
 * 选择选项
 */
export interface SelectOption {
  label: string;
  value: any;
  icon?: string;
  disabled?: boolean;
}

/**
 * 验证规则
 */
export interface ValidationRule {
  field: string;
  rule: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any, component: ScadaComponent) => boolean;
}

/**
 * 属性编辑器管理器
 */
export class PropertyEditorManager {
  private editorConfigs: Map<string, PropertyEditorConfig> = new Map();
  private customValidators: Map<string, Function> = new Map();
  
  constructor() {
    this.initializeDefaultConfigs();
  }
  
  /**
   * 初始化默认配置
   */
  private initializeDefaultConfigs() {
    // 文本组件
    this.registerEditor({
      type: 'text',
      title: '文本属性',
      icon: 'ep:edit',
      category: 'basic',
      fields: [
        {
          name: 'text',
          label: '文本内容',
          type: 'textarea',
          defaultValue: '文本内容',
          placeholder: '输入文本内容'
        },
        {
          name: 'fontSize',
          label: '字体大小',
          type: 'number',
          defaultValue: 14,
          min: 8,
          max: 72,
          suffix: 'px'
        },
        {
          name: 'fontFamily',
          label: '字体',
          type: 'select',
          defaultValue: 'Arial',
          options: [
            { label: 'Arial', value: 'Arial' },
            { label: '微软雅黑', value: 'Microsoft YaHei' },
            { label: '宋体', value: 'SimSun' },
            { label: '黑体', value: 'SimHei' },
            { label: 'Consolas', value: 'Consolas' }
          ]
        },
        {
          name: 'fontWeight',
          label: '字体粗细',
          type: 'select',
          defaultValue: 'normal',
          options: [
            { label: '正常', value: 'normal' },
            { label: '粗体', value: 'bold' },
            { label: '细体', value: 'lighter' }
          ]
        },
        {
          name: 'textAlign',
          label: '水平对齐',
          type: 'select',
          defaultValue: 'left',
          options: [
            { label: '左对齐', value: 'left', icon: 'ep:align-left' },
            { label: '居中', value: 'center', icon: 'ep:align-center' },
            { label: '右对齐', value: 'right', icon: 'ep:align-right' }
          ]
        },
        {
          name: 'color',
          label: '文字颜色',
          type: 'color',
          defaultValue: '#303133'
        }
      ],
      validation: [
        {
          field: 'text',
          rule: 'required',
          message: '文本内容不能为空'
        },
        {
          field: 'fontSize',
          rule: 'min',
          value: 8,
          message: '字体大小不能小于8px'
        }
      ]
    });
    
    // 图片组件
    this.registerEditor({
      type: 'image',
      title: '图片属性',
      icon: 'ep:picture',
      category: 'basic',
      fields: [
        {
          name: 'src',
          label: '图片源',
          type: 'file',
          defaultValue: '',
          placeholder: '选择图片文件或输入URL'
        },
        {
          name: 'alt',
          label: '替代文字',
          type: 'text',
          defaultValue: '图片',
          placeholder: '图片描述'
        },
        {
          name: 'fit',
          label: '适应方式',
          type: 'select',
          defaultValue: 'contain',
          options: [
            { label: '包含', value: 'contain' },
            { label: '覆盖', value: 'cover' },
            { label: '填充', value: 'fill' },
            { label: '缩小', value: 'scale-down' },
            { label: '原始', value: 'none' }
          ]
        },
        {
          name: 'borderRadius',
          label: '圆角',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 50,
          suffix: 'px'
        }
      ]
    });
    
    // 按钮组件
    this.registerEditor({
      type: 'button',
      title: '按钮属性',
      icon: 'ep:pointer',
      category: 'basic',
      fields: [
        {
          name: 'text',
          label: '按钮文字',
          type: 'text',
          defaultValue: '按钮',
          placeholder: '按钮文字'
        },
        {
          name: 'type',
          label: '按钮类型',
          type: 'select',
          defaultValue: 'primary',
          options: [
            { label: '主要', value: 'primary' },
            { label: '成功', value: 'success' },
            { label: '警告', value: 'warning' },
            { label: '危险', value: 'danger' },
            { label: '信息', value: 'info' },
            { label: '默认', value: 'default' }
          ]
        },
        {
          name: 'size',
          label: '按钮尺寸',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: '大型', value: 'large' },
            { label: '默认', value: 'default' },
            { label: '小型', value: 'small' }
          ]
        },
        {
          name: 'disabled',
          label: '禁用状态',
          type: 'switch',
          defaultValue: false
        },
        {
          name: 'loading',
          label: '加载状态',
          type: 'switch',
          defaultValue: false
        },
        {
          name: 'icon',
          label: '图标',
          type: 'text',
          defaultValue: '',
          placeholder: '图标名称'
        }
      ]
    });
    
    // 图表组件
    this.registerEditor({
      type: 'line-chart',
      title: '折线图属性',
      icon: 'ep:trend-charts',
      category: 'data',
      fields: [
        {
          name: 'title',
          label: '图表标题',
          type: 'text',
          defaultValue: '折线图',
          placeholder: '图表标题'
        },
        {
          name: 'xAxisTitle',
          label: 'X轴标题',
          type: 'text',
          defaultValue: 'X轴',
          placeholder: 'X轴标题'
        },
        {
          name: 'yAxisTitle',
          label: 'Y轴标题',
          type: 'text',
          defaultValue: 'Y轴',
          placeholder: 'Y轴标题'
        },
        {
          name: 'dataSource',
          label: '数据源',
          type: 'select',
          defaultValue: 'mock',
          options: [
            { label: '模拟数据', value: 'mock' },
            { label: '实时数据', value: 'realtime' },
            { label: '静态数据', value: 'static' },
            { label: 'API接口', value: 'api' }
          ]
        },
        {
          name: 'realTime',
          label: '实时更新',
          type: 'switch',
          defaultValue: false,
          dependency: 'dataSource',
          dependencyValue: 'realtime'
        },
        {
          name: 'updateInterval',
          label: '更新间隔',
          type: 'number',
          defaultValue: 1000,
          min: 100,
          step: 100,
          suffix: 'ms',
          dependency: 'realTime',
          dependencyValue: true
        },
        {
          name: 'maxDataPoints',
          label: '最大数据点',
          type: 'number',
          defaultValue: 100,
          min: 10,
          max: 1000
        }
      ]
    });
    
    // 仪表盘组件
    this.registerEditor({
      type: 'gauge',
      title: '仪表盘属性',
      icon: 'ep:odometer',
      category: 'data',
      fields: [
        {
          name: 'title',
          label: '标题',
          type: 'text',
          defaultValue: '仪表盘',
          placeholder: '仪表盘标题'
        },
        {
          name: 'min',
          label: '最小值',
          type: 'number',
          defaultValue: 0
        },
        {
          name: 'max',
          label: '最大值',
          type: 'number',
          defaultValue: 100
        },
        {
          name: 'value',
          label: '当前值',
          type: 'number',
          defaultValue: 50
        },
        {
          name: 'unit',
          label: '单位',
          type: 'text',
          defaultValue: '',
          placeholder: '数值单位'
        },
        {
          name: 'showValue',
          label: '显示数值',
          type: 'switch',
          defaultValue: true
        },
        {
          name: 'showTitle',
          label: '显示标题',
          type: 'switch',
          defaultValue: true
        },
        {
          name: 'tickCount',
          label: '刻度数量',
          type: 'number',
          defaultValue: 5,
          min: 2,
          max: 20
        }
      ]
    });

    // 摄像头组件
    this.registerEditor({
      type: 'webcam',
      title: '摄像头属性',
      icon: 'ep:video-camera',
      category: 'data',
      fields: [
        {
          name: 'name',
          label: '摄像头名称',
          type: 'text',
          defaultValue: '摄像头1',
          placeholder: '输入摄像头名称'
        },
        {
          name: 'streamUrl',
          label: '视频流地址',
          type: 'text',
          defaultValue: '',
          placeholder: '例如: https://example.com/live.m3u8',
          description: '支持RTSP、RTMP、HLS、HTTP等协议'
        },
        {
          name: 'protocol',
          label: '协议类型',
          type: 'select',
          defaultValue: 'hls',
          options: [
            { label: 'HLS (推荐)', value: 'hls' },
            { label: 'HTTP/HTTPS', value: 'http' },
            { label: 'WebRTC', value: 'webrtc' },
            { label: 'RTSP', value: 'rtsp' },
            { label: 'RTMP', value: 'rtmp' }
          ],
          description: 'RTSP和RTMP需要服务器端转码支持'
        },
        {
          name: 'width',
          label: '视频宽度',
          type: 'number',
          defaultValue: 640,
          min: 320,
          max: 1920,
          suffix: 'px',
          group: '视频设置'
        },
        {
          name: 'height',
          label: '视频高度',
          type: 'number',
          defaultValue: 480,
          min: 240,
          max: 1080,
          suffix: 'px',
          group: '视频设置'
        },
        {
          name: 'quality',
          label: '视频质量',
          type: 'select',
          defaultValue: 'auto',
          options: [
            { label: '自动', value: 'auto' },
            { label: '超清', value: 'ultra' },
            { label: '高清', value: 'high' },
            { label: '标清', value: 'medium' },
            { label: '流畅', value: 'low' }
          ],
          group: '视频设置'
        },
        {
          name: 'fps',
          label: '帧率',
          type: 'number',
          defaultValue: 25,
          min: 1,
          max: 60,
          suffix: 'fps',
          group: '视频设置'
        },
        {
          name: 'objectFit',
          label: '适应方式',
          type: 'select',
          defaultValue: 'contain',
          options: [
            { label: '适应容器', value: 'contain' },
            { label: '覆盖容器', value: 'cover' },
            { label: '填充容器', value: 'fill' },
            { label: '原始尺寸', value: 'none' }
          ],
          group: '视频设置'
        },
        {
          name: 'username',
          label: '用户名',
          type: 'text',
          defaultValue: '',
          placeholder: '认证用户名（可选）',
          group: '认证设置'
        },
        {
          name: 'password',
          label: '密码',
          type: 'text',
          defaultValue: '',
          placeholder: '认证密码（可选）',
          group: '认证设置'
        },
        {
          name: 'token',
          label: 'API令牌',
          type: 'text',
          defaultValue: '',
          placeholder: 'API令牌（可选）',
          group: '认证设置'
        },
        {
          name: 'autoPlay',
          label: '自动播放',
          type: 'switch',
          defaultValue: true,
          group: '播放控制'
        },
        {
          name: 'autoReconnect',
          label: '自动重连',
          type: 'switch',
          defaultValue: true,
          group: '播放控制'
        },
        {
          name: 'reconnectInterval',
          label: '重连间隔',
          type: 'number',
          defaultValue: 3000,
          min: 1000,
          max: 30000,
          suffix: 'ms',
          group: '播放控制',
          dependency: 'autoReconnect',
          dependencyValue: true
        },
        {
          name: 'reconnectMaxAttempts',
          label: '最大重连次数',
          type: 'number',
          defaultValue: 10,
          min: 1,
          max: 100,
          group: '播放控制',
          dependency: 'autoReconnect',
          dependencyValue: true
        },
        {
          name: 'bufferSize',
          label: '缓冲区大小',
          type: 'number',
          defaultValue: 1,
          min: 0.5,
          max: 10,
          step: 0.5,
          suffix: '秒',
          group: '播放控制'
        },
        {
          name: 'enableSnapshot',
          label: '启用快照',
          type: 'switch',
          defaultValue: true,
          description: '允许截取视频画面快照',
          group: '功能开关'
        },
        {
          name: 'enableFullscreen',
          label: '启用全屏',
          type: 'switch',
          defaultValue: true,
          description: '允许全屏播放',
          group: '功能开关'
        },
        {
          name: 'enableControls',
          label: '显示控制条',
          type: 'switch',
          defaultValue: true,
          description: '显示播放控制条',
          group: '功能开关'
        },
        {
          name: 'enablePTZ',
          label: '启用云台控制',
          type: 'switch',
          defaultValue: false,
          description: '启用摄像头云台控制功能',
          group: '功能开关'
        },
        {
          name: 'showTimestamp',
          label: '显示时间戳',
          type: 'switch',
          defaultValue: false,
          description: '在视频上显示时间戳',
          group: '显示设置'
        },
        {
          name: 'showBitrate',
          label: '显示码率',
          type: 'switch',
          defaultValue: false,
          description: '显示视频码率信息',
          group: '显示设置'
        }
      ],
      validation: [
        {
          field: 'streamUrl',
          rule: 'required',
          message: '视频流地址不能为空'
        },
        {
          field: 'width',
          rule: 'min',
          value: 320,
          message: '视频宽度不能小于320px'
        },
        {
          field: 'height',
          rule: 'min',
          value: 240,
          message: '视频高度不能小于240px'
        }
      ]
    });
  }
  
  /**
   * 注册属性编辑器
   */
  registerEditor(config: PropertyEditorConfig) {
    this.editorConfigs.set(config.type, config);
  }
  
  /**
   * 获取属性编辑器配置
   */
  getEditorConfig(type: string): PropertyEditorConfig | undefined {
    return this.editorConfigs.get(type);
  }
  
  /**
   * 获取所有注册的编辑器类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.editorConfigs.keys());
  }
  
  /**
   * 按分类获取编辑器
   */
  getEditorsByCategory(category: string): PropertyEditorConfig[] {
    return Array.from(this.editorConfigs.values()).filter(config => config.category === category);
  }
  
  /**
   * 生成组件的默认属性
   */
  generateDefaultProperties(type: string): Record<string, any> {
    const config = this.getEditorConfig(type);
    if (!config) return {};
    
    const properties: Record<string, any> = {};
    config.fields.forEach(field => {
      properties[field.name] = field.defaultValue;
    });
    
    return properties;
  }
  
  /**
   * 验证属性值
   */
  validateProperties(type: string, properties: Record<string, any>): ValidationResult {
    const config = this.getEditorConfig(type);
    if (!config || !config.validation) {
      return { valid: true, errors: [] };
    }
    
    const errors: ValidationError[] = [];
    
    config.validation.forEach(rule => {
      const value = properties[rule.field];
      let isValid = true;
      
      switch (rule.rule) {
        case 'required':
          isValid = value !== undefined && value !== null && value !== '';
          break;
        case 'min':
          isValid = typeof value === 'number' && value >= rule.value;
          break;
        case 'max':
          isValid = typeof value === 'number' && value <= rule.value;
          break;
        case 'pattern':
          isValid = typeof value === 'string' && new RegExp(rule.value).test(value);
          break;
        case 'custom':
          if (rule.validator) {
            isValid = rule.validator(value, { type, properties } as ScadaComponent);
          }
          break;
      }
      
      if (!isValid) {
        errors.push({
          field: rule.field,
          message: rule.message,
          value: value
        });
      }
    });
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * 过滤可见字段
   */
  getVisibleFields(type: string, properties: Record<string, any>): PropertyField[] {
    const config = this.getEditorConfig(type);
    if (!config) return [];
    
    return config.fields.filter(field => {
      if (field.visible === false) return false;
      
      // 检查依赖条件
      if (field.dependency) {
        const dependencyValue = properties[field.dependency];
        return dependencyValue === field.dependencyValue;
      }
      
      return true;
    });
  }
  
  /**
   * 按组分组字段
   */
  getFieldsByGroup(type: string, properties: Record<string, any>): Record<string, PropertyField[]> {
    const visibleFields = this.getVisibleFields(type, properties);
    const groups: Record<string, PropertyField[]> = {};
    
    visibleFields.forEach(field => {
      const groupName = field.group || 'default';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(field);
    });
    
    return groups;
  }
  
  /**
   * 更新字段配置
   */
  updateFieldConfig(type: string, fieldName: string, updates: Partial<PropertyField>) {
    const config = this.editorConfigs.get(type);
    if (!config) return;
    
    const field = config.fields.find(f => f.name === fieldName);
    if (field) {
      Object.assign(field, updates);
    }
  }
  
  /**
   * 添加自定义验证器
   */
  addCustomValidator(name: string, validator: Function) {
    this.customValidators.set(name, validator);
  }
  
  /**
   * 获取自定义验证器
   */
  getCustomValidator(name: string): Function | undefined {
    return this.customValidators.get(name);
  }
  
  /**
   * 克隆配置（用于动态修改）
   */
  cloneConfig(type: string): PropertyEditorConfig | undefined {
    const config = this.getEditorConfig(type);
    if (!config) return undefined;
    
    return JSON.parse(JSON.stringify(config));
  }
  
  /**
   * 合并配置
   */
  mergeConfigs(baseType: string, overrideConfig: Partial<PropertyEditorConfig>): PropertyEditorConfig | undefined {
    const baseConfig = this.cloneConfig(baseType);
    if (!baseConfig) return undefined;
    
    return {
      ...baseConfig,
      ...overrideConfig,
      fields: [
        ...baseConfig.fields,
        ...(overrideConfig.fields || [])
      ]
    };
  }
  
  /**
   * 移除编辑器配置
   */
  removeEditor(type: string) {
    this.editorConfigs.delete(type);
  }
  
  /**
   * 清空所有配置
   */
  clear() {
    this.editorConfigs.clear();
    this.customValidators.clear();
  }
  
  /**
   * 导出配置为JSON
   */
  exportConfigs(): string {
    const configs = Object.fromEntries(this.editorConfigs);
    return JSON.stringify(configs, null, 2);
  }
  
  /**
   * 从JSON导入配置
   */
  importConfigs(json: string): boolean {
    try {
      const configs = JSON.parse(json);
      Object.entries(configs).forEach(([type, config]) => {
        this.editorConfigs.set(type, config as PropertyEditorConfig);
      });
      return true;
    } catch (error) {
      console.error('导入配置失败:', error);
      return false;
    }
  }
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

/**
 * 创建全局实例
 */
export const propertyEditorManager = new PropertyEditorManager();