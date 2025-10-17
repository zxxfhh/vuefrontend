import { ref, reactive, computed, watch, nextTick } from "vue";
import { fuxaMqttService } from "@/services/mqtt/fuxaMqttService";
import type { 
  FuxaComponent, 
  MqttDeviceData, 
  MqttDeviceProperty 
} from "@/api/scada/fuxa/types";

/**
 * 数据绑定配置接口
 */
interface DataBinding {
  id: string;
  componentId: string;
  propertyName: string;
  sourceType: 'mqtt' | 'api' | 'static' | 'expression';
  sourceConfig: {
    deviceId?: string;
    tagId?: string;
    apiEndpoint?: string;
    staticValue?: any;
    expression?: string;
  };
  transform?: {
    type: 'linear' | 'custom';
    min?: number;
    max?: number;
    outputMin?: number;
    outputMax?: number;
    customFunction?: string;
  };
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  updateInterval?: number; // 更新间隔(ms)
  enabled: boolean;
}

/**
 * 数据源接口
 */
interface DataSource {
  id: string;
  type: 'mqtt' | 'api' | 'websocket';
  config: any;
  status: 'connected' | 'disconnected' | 'error';
  lastUpdate: string;
}

/**
 * FUXA数据绑定系统
 * 负责管理组件与数据源的绑定关系，提供实时数据更新
 */
export class FuxaDataBinding {
  // 数据绑定注册表
  private _bindings = reactive(new Map<string, DataBinding>());
  private _componentBindings = reactive(new Map<string, string[]>()); // componentId -> bindingIds
  
  // 数据源管理
  private _dataSources = reactive(new Map<string, DataSource>());
  private _dataCache = reactive(new Map<string, any>());
  
  // 更新管理
  private _updateTimers = new Map<string, NodeJS.Timeout>();
  private _batchUpdateQueue = new Set<string>();
  private _batchUpdateTimer: NodeJS.Timeout | null = null;
  
  // API数据获取
  private _apiClients = new Map<string, any>();
  
  // 表达式引擎
  private _expressionContext = reactive(new Map<string, any>());

  constructor() {
    this.initializeDataBinding();
  }

  // ==================== 公共属性 ====================

  public get bindings() {
    return computed(() => this._bindings);
  }

  public get dataSources() {
    return computed(() => this._dataSources);
  }

  public get dataCache() {
    return computed(() => this._dataCache);
  }

  // ==================== 绑定管理 ====================

  /**
   * 创建数据绑定
   */
  public createBinding(config: Omit<DataBinding, 'id'>): string {
    const bindingId = `binding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const binding: DataBinding = {
      id: bindingId,
      ...config,
      enabled: config.enabled !== false
    };

    this._bindings.set(bindingId, binding);

    // 维护组件绑定索引
    if (!this._componentBindings.has(config.componentId)) {
      this._componentBindings.set(config.componentId, []);
    }
    this._componentBindings.get(config.componentId)!.push(bindingId);

    // 启动数据更新
    if (binding.enabled) {
      this.startDataUpdate(binding);
    }

    console.log(`数据绑定已创建: ${bindingId}`);
    return bindingId;
  }

  /**
   * 删除数据绑定
   */
  public removeBinding(bindingId: string): boolean {
    const binding = this._bindings.get(bindingId);
    if (!binding) return false;

    // 停止数据更新
    this.stopDataUpdate(bindingId);

    // 从组件绑定索引中移除
    const componentBindings = this._componentBindings.get(binding.componentId);
    if (componentBindings) {
      const index = componentBindings.indexOf(bindingId);
      if (index >= 0) {
        componentBindings.splice(index, 1);
      }
      if (componentBindings.length === 0) {
        this._componentBindings.delete(binding.componentId);
      }
    }

    // 删除绑定
    this._bindings.delete(bindingId);

    console.log(`数据绑定已删除: ${bindingId}`);
    return true;
  }

  /**
   * 更新数据绑定配置
   */
  public updateBinding(bindingId: string, updates: Partial<DataBinding>): boolean {
    const binding = this._bindings.get(bindingId);
    if (!binding) return false;

    // 停止旧的数据更新
    this.stopDataUpdate(bindingId);

    // 更新配置
    Object.assign(binding, updates);

    // 重新启动数据更新
    if (binding.enabled) {
      this.startDataUpdate(binding);
    }

    console.log(`数据绑定已更新: ${bindingId}`);
    return true;
  }

  /**
   * 启用/禁用数据绑定
   */
  public toggleBinding(bindingId: string, enabled?: boolean): boolean {
    const binding = this._bindings.get(bindingId);
    if (!binding) return false;

    const newState = enabled !== undefined ? enabled : !binding.enabled;
    
    if (newState !== binding.enabled) {
      binding.enabled = newState;
      
      if (newState) {
        this.startDataUpdate(binding);
      } else {
        this.stopDataUpdate(bindingId);
      }
    }

    return true;
  }

  /**
   * 获取组件的所有数据绑定
   */
  public getComponentBindings(componentId: string): DataBinding[] {
    const bindingIds = this._componentBindings.get(componentId) || [];
    return bindingIds.map(id => this._bindings.get(id)!).filter(Boolean);
  }

  /**
   * 删除组件的所有数据绑定
   */
  public removeComponentBindings(componentId: string): void {
    const bindingIds = this._componentBindings.get(componentId) || [];
    bindingIds.forEach(bindingId => {
      this.removeBinding(bindingId);
    });
  }

  // ==================== 数据源管理 ====================

  /**
   * 注册数据源
   */
  public registerDataSource(source: DataSource): void {
    this._dataSources.set(source.id, source);
    console.log(`数据源已注册: ${source.id} (${source.type})`);
  }

  /**
   * 获取数据源
   */
  public getDataSource(sourceId: string): DataSource | undefined {
    return this._dataSources.get(sourceId);
  }

  /**
   * 移除数据源
   */
  public removeDataSource(sourceId: string): boolean {
    const source = this._dataSources.get(sourceId);
    if (!source) return false;

    // 停止相关绑定
    this._bindings.forEach((binding) => {
      if (this.getBindingDataSourceId(binding) === sourceId) {
        this.stopDataUpdate(binding.id);
      }
    });

    this._dataSources.delete(sourceId);
    console.log(`数据源已移除: ${sourceId}`);
    return true;
  }

  // ==================== 实时数据更新 ====================

  /**
   * 启动数据更新
   */
  private startDataUpdate(binding: DataBinding): void {
    switch (binding.sourceType) {
      case 'mqtt':
        this.startMqttDataUpdate(binding);
        break;
      case 'api':
        this.startApiDataUpdate(binding);
        break;
      case 'static':
        this.updateStaticData(binding);
        break;
      case 'expression':
        this.startExpressionUpdate(binding);
        break;
    }
  }

  /**
   * 停止数据更新
   */
  private stopDataUpdate(bindingId: string): void {
    const timer = this._updateTimers.get(bindingId);
    if (timer) {
      clearInterval(timer);
      this._updateTimers.delete(bindingId);
    }
  }

  /**
   * 启动MQTT数据更新
   */
  private startMqttDataUpdate(binding: DataBinding): void {
    const { deviceId, tagId } = binding.sourceConfig;
    if (!deviceId || !tagId) {
      console.warn(`MQTT绑定配置不完整: ${binding.id}`);
      return;
    }

    // 立即更新一次
    this.updateMqttData(binding);

    // 设置定时更新
    const interval = binding.updateInterval || 1000;
    const timer = setInterval(() => {
      this.updateMqttData(binding);
    }, interval);

    this._updateTimers.set(binding.id, timer);
  }

  /**
   * 更新MQTT数据
   */
  private updateMqttData(binding: DataBinding): void {
    const { deviceId, tagId } = binding.sourceConfig;
    if (!deviceId || !tagId) return;

    const deviceProperty = fuxaMqttService.getDeviceProperty(deviceId, tagId);
    if (deviceProperty) {
      const transformedValue = this.transformValue(deviceProperty.value, binding.transform);
      const validatedValue = this.validateValue(transformedValue, binding.validation);
      
      if (validatedValue !== undefined) {
        this.updateComponentProperty(binding, validatedValue);
        
        // 缓存数据
        const cacheKey = `mqtt_${deviceId}_${tagId}`;
        this._dataCache.set(cacheKey, {
          value: validatedValue,
          timestamp: deviceProperty.timestamp,
          quality: deviceProperty.quality
        });
      }
    }
  }

  /**
   * 启动API数据更新
   */
  private startApiDataUpdate(binding: DataBinding): void {
    const { apiEndpoint } = binding.sourceConfig;
    if (!apiEndpoint) {
      console.warn(`API绑定配置不完整: ${binding.id}`);
      return;
    }

    // 立即更新一次
    this.updateApiData(binding);

    // 设置定时更新
    const interval = binding.updateInterval || 5000;
    const timer = setInterval(() => {
      this.updateApiData(binding);
    }, interval);

    this._updateTimers.set(binding.id, timer);
  }

  /**
   * 更新API数据
   */
  private async updateApiData(binding: DataBinding): Promise<void> {
    const { apiEndpoint } = binding.sourceConfig;
    if (!apiEndpoint) return;

    try {
      const response = await fetch(apiEndpoint);
      const data = await response.json();
      
      const transformedValue = this.transformValue(data, binding.transform);
      const validatedValue = this.validateValue(transformedValue, binding.validation);
      
      if (validatedValue !== undefined) {
        this.updateComponentProperty(binding, validatedValue);
        
        // 缓存数据
        const cacheKey = `api_${apiEndpoint}`;
        this._dataCache.set(cacheKey, {
          value: validatedValue,
          timestamp: new Date().toISOString(),
          status: 'success'
        });
      }
    } catch (error) {
      console.error(`API数据更新失败 (${binding.id}):`, error);
      
      // 缓存错误信息
      const cacheKey = `api_${apiEndpoint}`;
      this._dataCache.set(cacheKey, {
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'error'
      });
    }
  }

  /**
   * 更新静态数据
   */
  private updateStaticData(binding: DataBinding): void {
    const { staticValue } = binding.sourceConfig;
    
    const transformedValue = this.transformValue(staticValue, binding.transform);
    const validatedValue = this.validateValue(transformedValue, binding.validation);
    
    if (validatedValue !== undefined) {
      this.updateComponentProperty(binding, validatedValue);
    }
  }

  /**
   * 启动表达式更新
   */
  private startExpressionUpdate(binding: DataBinding): void {
    const { expression } = binding.sourceConfig;
    if (!expression) {
      console.warn(`表达式绑定配置不完整: ${binding.id}`);
      return;
    }

    // 立即计算一次
    this.updateExpressionData(binding);

    // 监听表达式上下文变化
    const interval = binding.updateInterval || 1000;
    const timer = setInterval(() => {
      this.updateExpressionData(binding);
    }, interval);

    this._updateTimers.set(binding.id, timer);
  }

  /**
   * 更新表达式数据
   */
  private updateExpressionData(binding: DataBinding): void {
    const { expression } = binding.sourceConfig;
    if (!expression) return;

    try {
      const result = this.evaluateExpression(expression, this._expressionContext);
      
      const transformedValue = this.transformValue(result, binding.transform);
      const validatedValue = this.validateValue(transformedValue, binding.validation);
      
      if (validatedValue !== undefined) {
        this.updateComponentProperty(binding, validatedValue);
      }
    } catch (error) {
      console.error(`表达式计算失败 (${binding.id}):`, error);
    }
  }

  // ==================== 数据处理 ====================

  /**
   * 数值转换
   */
  private transformValue(value: any, transform?: DataBinding['transform']): any {
    if (!transform || value == null) return value;

    switch (transform.type) {
      case 'linear':
        if (typeof value === 'number' && 
            transform.min !== undefined && transform.max !== undefined &&
            transform.outputMin !== undefined && transform.outputMax !== undefined) {
          // 线性映射: (value - min) / (max - min) * (outputMax - outputMin) + outputMin
          const ratio = (value - transform.min) / (transform.max - transform.min);
          return transform.outputMin + ratio * (transform.outputMax - transform.outputMin);
        }
        break;
        
      case 'custom':
        if (transform.customFunction) {
          try {
            // 安全的表达式求值
            const func = new Function('value', `return ${transform.customFunction}`);
            return func(value);
          } catch (error) {
            console.error('自定义转换函数执行失败:', error);
          }
        }
        break;
    }
    
    return value;
  }

  /**
   * 数值验证
   */
  private validateValue(value: any, validation?: DataBinding['validation']): any {
    if (!validation) return value;

    // 必填验证
    if (validation.required && (value == null || value === '')) {
      console.warn('验证失败: 值不能为空');
      return undefined;
    }

    // 数值范围验证
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        console.warn(`验证失败: 值 ${value} 小于最小值 ${validation.min}`);
        return undefined;
      }
      if (validation.max !== undefined && value > validation.max) {
        console.warn(`验证失败: 值 ${value} 大于最大值 ${validation.max}`);
        return undefined;
      }
    }

    // 正则表达式验证
    if (typeof value === 'string' && validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        console.warn(`验证失败: 值 "${value}" 不匹配模式 "${validation.pattern}"`);
        return undefined;
      }
    }

    return value;
  }

  /**
   * 表达式求值
   */
  private evaluateExpression(expression: string, context: Map<string, any>): any {
    try {
      // 创建安全的求值上下文
      const contextObj: Record<string, any> = {};
      context.forEach((value, key) => {
        contextObj[key] = value;
      });

      // 添加常用函数
      contextObj.Math = Math;
      contextObj.Date = Date;
      contextObj.JSON = JSON;

      // 创建函数并执行
      const func = new Function(...Object.keys(contextObj), `return ${expression}`);
      return func(...Object.values(contextObj));
    } catch (error) {
      console.error('表达式求值失败:', error);
      return undefined;
    }
  }

  /**
   * 更新组件属性
   */
  private updateComponentProperty(binding: DataBinding, value: any): void {
    // 添加到批量更新队列
    this._batchUpdateQueue.add(binding.id);

    // 延迟批量更新
    if (!this._batchUpdateTimer) {
      this._batchUpdateTimer = setTimeout(() => {
        this.processBatchUpdate();
        this._batchUpdateTimer = null;
      }, 16); // ~60fps
    }

    // 触发组件属性更新事件
    document.dispatchEvent(new CustomEvent('fuxa:data:update', {
      detail: {
        bindingId: binding.id,
        componentId: binding.componentId,
        propertyName: binding.propertyName,
        value: value,
        timestamp: new Date().toISOString()
      }
    }));
  }

  /**
   * 处理批量更新
   */
  private processBatchUpdate(): void {
    const updates: Array<{ componentId: string; propertyName: string; value: any }> = [];

    this._batchUpdateQueue.forEach(bindingId => {
      const binding = this._bindings.get(bindingId);
      if (binding) {
        const cacheKey = this.getBindingCacheKey(binding);
        const cachedData = this._dataCache.get(cacheKey);
        if (cachedData && cachedData.value !== undefined) {
          updates.push({
            componentId: binding.componentId,
            propertyName: binding.propertyName,
            value: cachedData.value
          });
        }
      }
    });

    if (updates.length > 0) {
      document.dispatchEvent(new CustomEvent('fuxa:data:batch-update', {
        detail: { updates }
      }));
    }

    this._batchUpdateQueue.clear();
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取绑定的数据源ID
   */
  private getBindingDataSourceId(binding: DataBinding): string {
    switch (binding.sourceType) {
      case 'mqtt':
        return `mqtt_${binding.sourceConfig.deviceId}`;
      case 'api':
        return `api_${binding.sourceConfig.apiEndpoint}`;
      default:
        return binding.sourceType;
    }
  }

  /**
   * 获取绑定的缓存键
   */
  private getBindingCacheKey(binding: DataBinding): string {
    switch (binding.sourceType) {
      case 'mqtt':
        return `mqtt_${binding.sourceConfig.deviceId}_${binding.sourceConfig.tagId}`;
      case 'api':
        return `api_${binding.sourceConfig.apiEndpoint}`;
      case 'static':
        return `static_${binding.id}`;
      case 'expression':
        return `expr_${binding.id}`;
      default:
        return binding.id;
    }
  }

  /**
   * 初始化数据绑定系统
   */
  private initializeDataBinding(): void {
    // 监听MQTT连接状态
    watch(
      () => fuxaMqttService.status.value,
      (status) => {
        const mqttSource = this._dataSources.get('mqtt_default');
        if (mqttSource) {
          mqttSource.status = status === 'connected' ? 'connected' : 'disconnected';
          mqttSource.lastUpdate = new Date().toISOString();
        }
      }
    );

    // 注册默认MQTT数据源
    this.registerDataSource({
      id: 'mqtt_default',
      type: 'mqtt',
      config: {
        broker: 'localhost',
        port: 9001
      },
      status: 'disconnected',
      lastUpdate: new Date().toISOString()
    });

    console.log('FUXA数据绑定系统已初始化');
  }

  // ==================== 公共接口方法 ====================

  /**
   * 创建MQTT数据绑定的便捷方法
   */
  public bindMqttData(
    componentId: string,
    propertyName: string,
    deviceId: string,
    tagId: string,
    options?: Partial<DataBinding>
  ): string {
    return this.createBinding({
      componentId,
      propertyName,
      sourceType: 'mqtt',
      sourceConfig: { deviceId, tagId },
      enabled: true,
      ...options
    });
  }

  /**
   * 创建API数据绑定的便捷方法
   */
  public bindApiData(
    componentId: string,
    propertyName: string,
    apiEndpoint: string,
    options?: Partial<DataBinding>
  ): string {
    return this.createBinding({
      componentId,
      propertyName,
      sourceType: 'api',
      sourceConfig: { apiEndpoint },
      updateInterval: 5000,
      enabled: true,
      ...options
    });
  }

  /**
   * 创建静态数据绑定的便捷方法
   */
  public bindStaticData(
    componentId: string,
    propertyName: string,
    staticValue: any,
    options?: Partial<DataBinding>
  ): string {
    return this.createBinding({
      componentId,
      propertyName,
      sourceType: 'static',
      sourceConfig: { staticValue },
      enabled: true,
      ...options
    });
  }

  /**
   * 创建表达式数据绑定的便捷方法
   */
  public bindExpressionData(
    componentId: string,
    propertyName: string,
    expression: string,
    options?: Partial<DataBinding>
  ): string {
    return this.createBinding({
      componentId,
      propertyName,
      sourceType: 'expression',
      sourceConfig: { expression },
      updateInterval: 1000,
      enabled: true,
      ...options
    });
  }

  /**
   * 设置表达式上下文变量
   */
  public setExpressionVariable(name: string, value: any): void {
    this._expressionContext.set(name, value);
  }

  /**
   * 获取缓存的数据值
   */
  public getCachedValue(cacheKey: string): any {
    return this._dataCache.get(cacheKey);
  }

  /**
   * 清除所有绑定
   */
  public clearAllBindings(): void {
    // 停止所有定时器
    this._updateTimers.forEach(timer => clearInterval(timer));
    this._updateTimers.clear();

    // 清除批量更新定时器
    if (this._batchUpdateTimer) {
      clearTimeout(this._batchUpdateTimer);
      this._batchUpdateTimer = null;
    }

    // 清除所有数据
    this._bindings.clear();
    this._componentBindings.clear();
    this._dataCache.clear();
    this._batchUpdateQueue.clear();

    console.log('所有数据绑定已清除');
  }
}

// 导出单例实例
export const fuxaDataBinding = new FuxaDataBinding();

// 导出类型
export type { DataBinding, DataSource };