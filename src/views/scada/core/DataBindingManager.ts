/**
 * SCADA数据绑定管理器
 * 负责数据源管理、数据集定义、组件绑定等功能
 */

import { ref, reactive, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';

const parseBindingNumber = (value: any): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const numeric = parseFloat(value.replace(/[^0-9+\-.,]/g, ''));
    return Number.isNaN(numeric) ? 0 : numeric;
  }
  return 0;
};

// 数据源类型定义
export interface DataSource {
  id: string;
  name: string;
  type: 'mqtt' | 'api' | 'websocket' | 'database' | 'static';
  config: DataSourceConfig;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastUpdate?: string;
  errorMessage?: string;
}

// 数据源配置
export interface DataSourceConfig {
  // MQTT配置
  mqtt?: {
    broker: string;
    port: number;
    username?: string;
    password?: string;
    clientId?: string;
    topics: string[];
  };
  
  // API配置
  api?: {
    baseUrl: string;
    headers?: Record<string, string>;
    authentication?: {
      type: 'bearer' | 'basic' | 'apikey';
      token?: string;
      username?: string;
      password?: string;
      apiKey?: string;
    };
  };
  
  // WebSocket配置
  websocket?: {
    url: string;
    protocols?: string[];
    reconnectInterval?: number;
  };
  
  // 数据库配置
  database?: {
    type: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb';
    host: string;
    port: number;
    database: string;
    username?: string;
    password?: string;
  };
  
  // 静态数据配置
  static?: {
    data: any[];
  };
}

// 数据集定义
export interface DataSet {
  id: string;
  name: string;
  description: string;
  dataSourceId: string;
  query: string | object; // SQL查询、API路径或MQTT主题
  refreshInterval: number; // 刷新间隔（毫秒）
  fields: DataField[];
  transformScript?: string; // 数据转换JS脚本
  filters?: DataFilter[]; // 数据过滤器
  lastData?: any; // 最后一次获取的数据
  lastUpdate?: string;
  isActive: boolean; // 是否激活
}

// 数据字段定义
export interface DataField {
  name: string; // 字段名
  type: 'number' | 'string' | 'boolean' | 'date' | 'object';
  alias?: string; // 显示别名
  unit?: string; // 单位
  range?: { min: number; max: number }; // 数值范围
  format?: string; // 格式化字符串
  description?: string;
}

// 数据过滤器
export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
  enabled: boolean;
}

// 组件数据绑定配置
export interface ComponentBinding {
  componentId: string;
  bindings: PropertyBinding[];
}

// 属性绑定定义
export interface PropertyBinding {
  property: string; // 组件属性名（如：value、backgroundColor、visible等）
  datasetId: string;
  fieldName: string;
  bindingType: 'direct' | 'expression' | 'script'; // 绑定类型
  expression?: string; // 表达式（如：value > 100 ? 'red' : 'green'）
  script?: string; // JS脚本
  format?: string; // 格式化字符串
  updateTrigger?: 'always' | 'changed' | 'manual'; // 更新触发条件
}

// 数据绑定管理器类
export class DataBindingManager {
  // 响应式数据
  public dataSources = ref<DataSource[]>([]);
  public dataSets = ref<DataSet[]>([]);
  public componentBindings = ref<ComponentBinding[]>([]);
  public globalVariables = ref<Record<string, any>>({});
  
  // 数据更新定时器
  private updateTimers = new Map<string, NodeJS.Timeout>();
  
  // 脚本执行上下文
  private scriptContext = reactive({
    Math,
    Date,
    console,
    moment: null, // 如果使用moment.js
  });

  constructor() {
    this.initializeDefaultDataSources();
  }

  // 初始化默认数据源
  private initializeDefaultDataSources() {
    // 添加默认的静态数据源
    this.addDataSource({
      id: 'static-default',
      name: '静态数据源',
      type: 'static',
      config: {
        static: {
          data: [
            { id: 1, name: '设备1', temperature: 25.5, humidity: 60, status: true },
            { id: 2, name: '设备2', temperature: 28.2, humidity: 55, status: false },
            { id: 3, name: '设备3', temperature: 22.8, humidity: 70, status: true },
          ]
        }
      },
      status: 'connected'
    });
  }

  // 添加数据源
  addDataSource(dataSource: Omit<DataSource, 'lastUpdate'>) {
    const newDataSource: DataSource = {
      ...dataSource,
      lastUpdate: new Date().toISOString()
    };
    
    this.dataSources.value.push(newDataSource);
    this.connectDataSource(dataSource.id);
    return newDataSource;
  }

  // 连接数据源
  async connectDataSource(dataSourceId: string) {
    const dataSource = this.dataSources.value.find(ds => ds.id === dataSourceId);
    if (!dataSource) return;

    dataSource.status = 'connecting';
    
    try {
      switch (dataSource.type) {
        case 'static':
          dataSource.status = 'connected';
          break;
          
        case 'mqtt':
          await this.connectMQTT(dataSource);
          break;
          
        case 'api':
          await this.connectAPI(dataSource);
          break;
          
        case 'websocket':
          await this.connectWebSocket(dataSource);
          break;
          
        default:
          dataSource.status = 'connected';
      }
      
      ElMessage.success(`数据源 "${dataSource.name}" 连接成功`);
    } catch (error) {
      dataSource.status = 'error';
      dataSource.errorMessage = (error as Error).message;
      ElMessage.error(`数据源 "${dataSource.name}" 连接失败: ${error}`);
    }
  }

  // MQTT连接
  private async connectMQTT(dataSource: DataSource) {
    // 这里应该实现MQTT连接逻辑
    // 可以使用mqtt.js库
    console.log('Connecting to MQTT:', dataSource.config.mqtt);
    dataSource.status = 'connected';
  }

  // API连接测试
  private async connectAPI(dataSource: DataSource) {
    const config = dataSource.config.api;
    if (!config) throw new Error('API配置不存在');
    
    try {
      const response = await fetch(config.baseUrl, {
        method: 'GET',
        headers: config.headers || {}
      });
      
      if (response.ok) {
        dataSource.status = 'connected';
      } else {
        throw new Error(`API响应错误: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`API连接失败: ${error}`);
    }
  }

  // WebSocket连接
  private async connectWebSocket(dataSource: DataSource) {
    const config = dataSource.config.websocket;
    if (!config) throw new Error('WebSocket配置不存在');
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(config.url, config.protocols);
      
      ws.onopen = () => {
        dataSource.status = 'connected';
        resolve(ws);
      };
      
      ws.onerror = (error) => {
        dataSource.status = 'error';
        reject(error);
      };
    });
  }

  // 添加数据集
  addDataSet(dataSet: Omit<DataSet, 'lastUpdate' | 'isActive'>) {
    const newDataSet: DataSet = {
      ...dataSet,
      lastUpdate: new Date().toISOString(),
      isActive: false
    };
    
    this.dataSets.value.push(newDataSet);
    return newDataSet;
  }

  // 激活数据集（开始数据获取）
  activateDataSet(dataSetId: string) {
    const dataSet = this.dataSets.value.find(ds => ds.id === dataSetId);
    if (!dataSet) return;

    dataSet.isActive = true;
    this.startDataSetUpdate(dataSet);
    ElMessage.success(`数据集 "${dataSet.name}" 已激活`);
  }

  // 停用数据集
  deactivateDataSet(dataSetId: string) {
    const dataSet = this.dataSets.value.find(ds => ds.id === dataSetId);
    if (!dataSet) return;

    dataSet.isActive = false;
    this.stopDataSetUpdate(dataSetId);
    ElMessage.info(`数据集 "${dataSet.name}" 已停用`);
  }

  // 开始数据集更新
  private startDataSetUpdate(dataSet: DataSet) {
    // 清除之前的定时器
    this.stopDataSetUpdate(dataSet.id);
    
    // 立即执行一次
    this.updateDataSet(dataSet);
    
    // 设置定时更新
    if (dataSet.refreshInterval > 0) {
      const timer = setInterval(() => {
        this.updateDataSet(dataSet);
      }, dataSet.refreshInterval);
      
      this.updateTimers.set(dataSet.id, timer);
    }
  }

  // 停止数据集更新
  private stopDataSetUpdate(dataSetId: string) {
    const timer = this.updateTimers.get(dataSetId);
    if (timer) {
      clearInterval(timer);
      this.updateTimers.delete(dataSetId);
    }
  }

  // 更新数据集
  private async updateDataSet(dataSet: DataSet) {
    try {
      const dataSource = this.dataSources.value.find(ds => ds.id === dataSet.dataSourceId);
      if (!dataSource || dataSource.status !== 'connected') return;

      let rawData: any;
      
      switch (dataSource.type) {
        case 'static':
          rawData = dataSource.config.static?.data || [];
          break;
          
        case 'api':
          rawData = await this.fetchAPIData(dataSource, dataSet.query as string);
          break;
          
        case 'mqtt':
          // MQTT数据通常通过订阅获取，这里可能需要从缓存读取
          rawData = await this.getMQTTData(dataSource, dataSet.query as string);
          break;
          
        default:
          rawData = [];
      }

      // 应用数据转换脚本
      let processedData = rawData;
      if (dataSet.transformScript) {
        processedData = this.executeScript(dataSet.transformScript, rawData);
      }

      // 应用过滤器
      if (dataSet.filters && dataSet.filters.length > 0) {
        processedData = this.applyFilters(processedData, dataSet.filters);
      }

      // 更新数据集
      dataSet.lastData = processedData;
      dataSet.lastUpdate = new Date().toISOString();

      // 通知绑定的组件更新
      this.updateBoundComponents(dataSet.id);
      
    } catch (error) {
      console.error(`数据集 ${dataSet.name} 更新失败:`, error);
      ElMessage.error(`数据集 "${dataSet.name}" 更新失败`);
    }
  }

  // 获取API数据
  private async fetchAPIData(dataSource: DataSource, query: string): Promise<any> {
    const config = dataSource.config.api;
    if (!config) throw new Error('API配置不存在');
    
    const url = config.baseUrl + (query.startsWith('/') ? query : '/' + query);
    const headers = { ...config.headers };
    
    // 添加认证信息
    if (config.authentication) {
      const auth = config.authentication;
      switch (auth.type) {
        case 'bearer':
          if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;
          break;
        case 'basic':
          if (auth.username && auth.password) {
            headers['Authorization'] = `Basic ${btoa(auth.username + ':' + auth.password)}`;
          }
          break;
        case 'apikey':
          if (auth.apiKey) headers['X-API-Key'] = auth.apiKey;
          break;
      }
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  // 获取MQTT数据（从缓存）
  private async getMQTTData(dataSource: DataSource, topic: string): Promise<any> {
    // 这里应该从MQTT消息缓存中获取数据
    // 实现取决于具体的MQTT客户端
    return [];
  }

  // 执行数据转换脚本
  private executeScript(script: string, data: any): any {
    try {
      // 创建安全的执行环境
      const func = new Function('data', 'context', 'globals', `
        const { Math, Date, console } = context;
        const globals = arguments[2];
        ${script}
      `);
      
      return func(data, this.scriptContext, this.globalVariables.value);
    } catch (error) {
      console.error('脚本执行错误:', error);
      throw error;
    }
  }

  // 应用数据过滤器
  private applyFilters(data: any[], filters: DataFilter[]): any[] {
    return data.filter(item => {
      return filters.every(filter => {
        if (!filter.enabled) return true;
        
        const value = item[filter.field];
        switch (filter.operator) {
          case 'eq': return value === filter.value;
          case 'ne': return value !== filter.value;
          case 'gt': return value > filter.value;
          case 'ge': return value >= filter.value;
          case 'lt': return value < filter.value;
          case 'le': return value <= filter.value;
          case 'contains': return String(value).includes(String(filter.value));
          case 'startsWith': return String(value).startsWith(String(filter.value));
          case 'endsWith': return String(value).endsWith(String(filter.value));
          default: return true;
        }
      });
    });
  }

  // 绑定组件到数据集
  bindComponent(componentId: string, bindings: PropertyBinding[]) {
    const existingBinding = this.componentBindings.value.find(cb => cb.componentId === componentId);
    
    if (existingBinding) {
      existingBinding.bindings = bindings;
    } else {
      this.componentBindings.value.push({
        componentId,
        bindings
      });
    }
    
    // 立即更新一次绑定的组件
    setTimeout(() => {
      this.updateComponentBindings(componentId);
    }, 100);
  }

  // 更新绑定的组件
  private updateBoundComponents(dataSetId: string) {
    this.componentBindings.value.forEach(componentBinding => {
      const hasBinding = componentBinding.bindings.some(b => b.datasetId === dataSetId);
      if (hasBinding) {
        this.updateComponentBindings(componentBinding.componentId);
      }
    });
  }

  // 更新特定组件的绑定
  private updateComponentBindings(componentId: string) {
    const componentBinding = this.componentBindings.value.find(cb => cb.componentId === componentId);
    if (!componentBinding) return;

    const element = document.getElementById(componentId);
    if (!element) return;

    componentBinding.bindings.forEach(binding => {
      const dataSet = this.dataSets.value.find(ds => ds.id === binding.datasetId);
      if (!dataSet || !dataSet.lastData) return;

      try {
        let value: any;
        
        switch (binding.bindingType) {
          case 'direct':
            value = this.getDataValue(dataSet.lastData, binding.fieldName);
            break;
            
          case 'expression':
            value = this.evaluateExpression(binding.expression!, dataSet.lastData, binding.fieldName);
            break;
            
          case 'script':
            value = this.executeBindingScript(binding.script!, dataSet.lastData, binding.fieldName);
            break;
        }

        // 应用格式化
        if (binding.format) {
          value = this.formatValue(value, binding.format);
        }

        // 更新组件属性
        this.updateComponentProperty(element, binding.property, value);
        
      } catch (error) {
        console.error(`组件 ${componentId} 绑定更新失败:`, error);
      }
    });
  }

  // 获取数据值
  private getDataValue(data: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  // 计算表达式
  private evaluateExpression(expression: string, data: any, fieldName: string): any {
    try {
      const value = this.getDataValue(data, fieldName);
      const func = new Function('value', 'data', 'Math', 'Date', `return ${expression}`);
      return func(value, data, Math, Date);
    } catch (error) {
      console.error('表达式计算错误:', error);
      return null;
    }
  }

  // 执行绑定脚本
  private executeBindingScript(script: string, data: any, fieldName: string): any {
    try {
      const value = this.getDataValue(data, fieldName);
      const func = new Function('value', 'data', 'context', 'globals', `
        const { Math, Date, console } = context;
        ${script}
      `);
      return func(value, data, this.scriptContext, this.globalVariables.value);
    } catch (error) {
      console.error('绑定脚本执行错误:', error);
      return null;
    }
  }

  // 格式化数值
  private formatValue(value: any, format: string): any {
    try {
      if (typeof value === 'number') {
        if (format.includes('.')) {
          const decimals = parseInt(format.split('.')[1]) || 0;
          return value.toFixed(decimals);
        }
      }
      
      if (format.includes('%')) {
        return `${value}%`;
      }
      
      return value;
    } catch {
      return value;
    }
  }

  // 更新组件属性
  private updateComponentProperty(element: HTMLElement, property: string, value: any) {
    if (property.startsWith('properties.')) {
      const actualProperty = property.slice('properties.'.length);
      if (actualProperty) {
        this.updateComponentProperty(element, actualProperty, value);
        return;
      }
    }

    switch (property) {
      case 'visible':
        element.style.display = value ? 'block' : 'none';
        break;

      case 'backgroundColor':
        element.style.backgroundColor = value;
        break;

      case 'color':
        element.style.color = value;
        break;

      case 'opacity':
        element.style.opacity = value;
        break;

      case 'text':
        const textElement = element.querySelector('.component-text');
        if (textElement) {
          textElement.textContent = value;
        }
        break;

      case 'value':
        if (element.classList.contains('gaugeprogress-component')) {
          // 🎯 进度条现在使用 SvgManager，需要更新方式不同
          const componentRef = (element as any).__componentRef;
          if (componentRef) {
            const numericValue = parseBindingNumber(value);
            componentRef.properties = componentRef.properties || {};
            componentRef.properties.value = numericValue;

            // 使用 SvgManager 更新进度条
            const svgContainer = element.querySelector('.svg-container') as HTMLElement;
            if (svgContainer) {
              import('./SvgManager').then(({ svgManager }) => {
                const svgOptions: any = {
                  animation: componentRef.style?.svgAnimation || 'none',
                  animationSpeed: componentRef.style?.animationSpeed || 'normal',
                  animationDuration: componentRef.style?.animationDuration,
                  animationIterationCount: componentRef.style?.animationIterationCount || 'infinite',
                  animationStaticValue: numericValue, // 使用数据绑定的值作为目标值
                  strokeColor: componentRef.style?.borderColor,
                  strokeWidth: componentRef.style?.borderWidth,
                  opacity: componentRef.style?.opacity
                };
                svgManager.updateComponentStyle(svgContainer, svgOptions, 'progress-v');
                console.log('📊 数据绑定更新进度条值:', numericValue);
              });
            }
          } else {
            element.dataset.gaugeValue = parseBindingNumber(value).toString();
          }
          break;
        }

        // 对于开关、滑块等控件
        if (element.classList.contains('switch-component')) {
          // 更新开关状态
          this.updateSwitchValue(element, value);
        }
        break;

      case 'liquidLevel':
      case 'level':
      case 'percentage':
        // 液位组件特殊处理
        this.updateLiquidLevel(element, value);
        break;

      default:
        element.setAttribute(`data-${property}`, value);
    }
  }

  // 更新液位值
  private updateLiquidLevel(element: HTMLElement, value: any) {
    // 查找SVG元素
    const svgElement = element.querySelector('svg') as SVGSVGElement;
    if (!svgElement) {
      console.warn('未找到SVG元素，无法更新液位');
      return;
    }

    // 将值转换为百分比（0-100）
    let percentage = parseFloat(value);

    // 如果值在0-1之间，假设是小数形式，转换为百分比
    if (percentage > 0 && percentage <= 1) {
      percentage = percentage * 100;
    }

    // 限制范围
    percentage = Math.max(0, Math.min(100, percentage));

    // 动态导入SvgManager（避免循环依赖）
    import('./SvgManager').then(({ svgManager }) => {
      svgManager.updateLiquidLevel(svgElement, percentage, 1000);
    }).catch(error => {
      console.error('导入SvgManager失败:', error);
    });

    console.log(`数据绑定更新液位: ${percentage.toFixed(1)}%`);
  }

  // 更新开关值
  private updateSwitchValue(element: HTMLElement, value: any) {
    const isOn = Boolean(value);
    element.setAttribute('data-switch-state', isOn.toString());
    
    if (isOn) {
      element.style.backgroundColor = '#67c23a';
    } else {
      element.style.backgroundColor = '#dcdfe6';
    }
  }

  // 清理资源
  destroy() {
    // 清除所有定时器
    this.updateTimers.forEach(timer => clearInterval(timer));
    this.updateTimers.clear();
    
    // 清理数据
    this.dataSources.value = [];
    this.dataSets.value = [];
    this.componentBindings.value = [];
  }
}

// 导出单例实例
export const dataBindingManager = new DataBindingManager();
