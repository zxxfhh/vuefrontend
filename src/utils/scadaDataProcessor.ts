import { ref, type Ref } from "vue";
import { mqttManager } from "./mqtt";
import type { MessageHandler } from "./mqtt";

// 组件数据绑定接口
export interface ComponentBinding {
  componentId: string;
  deviceId: number;
  parameterBindings: ParameterBinding[];
}

// 参数绑定接口
export interface ParameterBinding {
  parameterId: string;
  parameterName: string;
  parameterCode: string;
  targetProperty: string;
  dataType: string;
  unit: string;
  currentValue: any;
  isWritable?: boolean;
  conversionFormula?: string;
  conditions?: BindingCondition[];
}

// 绑定条件接口
export interface BindingCondition {
  expression: string;
  actions: BindingAction[];
}

// 绑定动作接口
export interface BindingAction {
  type: "setProperty" | "setStyle" | "triggerAlarm" | "setValue";
  property?: string;
  value?: any;
  alarmLevel?: "low" | "medium" | "high";
  message?: string;
}

// 设备数据接口
export interface DeviceData {
  deviceId: number;
  deviceName: string;
  timestamp: string;
  parameters: ParameterData[];
}

// 参数数据接口
export interface ParameterData {
  parameterCode: string;
  parameterName: string;
  value: any;
  unit: string;
  quality: "good" | "bad" | "uncertain";
  timestamp: string;
}

// 组件状态更新接口
export interface ComponentUpdate {
  componentId: string;
  property: string;
  value: any;
  timestamp: string;
}

// SCADA数据处理器类
export class ScadaDataProcessor {
  private componentBindings: Map<string, ComponentBinding> = new Map();
  private deviceSubscriptions: Map<number, string[]> = new Map();
  private componentUpdates: Ref<ComponentUpdate[]> = ref([]);
  private isProcessing: boolean = false;

  constructor() {
    this.setupMqttHandlers();
  }

  /**
   * 设置MQTT消息处理器
   */
  private setupMqttHandlers(): void {
    // 设备数据主题处理器
    const deviceDataHandler: MessageHandler = (topic, message) => {
      this.handleDeviceData(topic, message);
    };

    // 设备状态主题处理器
    const deviceStatusHandler: MessageHandler = (topic, message) => {
      this.handleDeviceStatus(topic, message);
    };

    // 报警主题处理器
    const alarmHandler: MessageHandler = (topic, message) => {
      this.handleAlarm(topic, message);
    };

    // 订阅相关主题
    if (mqttManager.isConnectedToMqtt()) {
      mqttManager.subscribe("device/+/data", deviceDataHandler, 1);
      mqttManager.subscribe("device/+/status", deviceStatusHandler, 1);
      mqttManager.subscribe("alarm/+", alarmHandler, 1);
    }
  }

  /**
   * 添加组件绑定
   */
  addComponentBinding(binding: ComponentBinding): void {
    this.componentBindings.set(binding.componentId, binding);

    // 订阅设备数据主题
    const deviceTopic = `device/${binding.deviceId}/data`;
    const statusTopic = `device/${binding.deviceId}/status`;

    if (mqttManager.isConnectedToMqtt()) {
      mqttManager.subscribe(deviceTopic, (topic, message) => {
        this.handleDeviceData(topic, message);
      });
      mqttManager.subscribe(statusTopic, (topic, message) => {
        this.handleDeviceStatus(topic, message);
      });
    }

    // 记录设备订阅
    if (!this.deviceSubscriptions.has(binding.deviceId)) {
      this.deviceSubscriptions.set(binding.deviceId, []);
    }
    this.deviceSubscriptions.get(binding.deviceId)!.push(binding.componentId);
  }

  /**
   * 移除组件绑定
   */
  removeComponentBinding(componentId: string): void {
    const binding = this.componentBindings.get(componentId);
    if (binding) {
      // 从设备订阅中移除
      const deviceComponents = this.deviceSubscriptions.get(binding.deviceId);
      if (deviceComponents) {
        const index = deviceComponents.indexOf(componentId);
        if (index > -1) {
          deviceComponents.splice(index, 1);
        }

        // 如果没有其他组件使用该设备，取消订阅
        if (deviceComponents.length === 0) {
          this.deviceSubscriptions.delete(binding.deviceId);
          if (mqttManager.isConnectedToMqtt()) {
            mqttManager.unsubscribe(`device/${binding.deviceId}/data`);
            mqttManager.unsubscribe(`device/${binding.deviceId}/status`);
          }
        }
      }

      this.componentBindings.delete(componentId);
    }
  }

  /**
   * 处理设备数据消息
   */
  private handleDeviceData(topic: string, message: Buffer): void {
    try {
      const deviceData: DeviceData = JSON.parse(message.toString());
      this.processDeviceDataInternal(deviceData);
    } catch (error) {
      console.error("解析设备数据失败:", error);
    }
  }

  /**
   * 处理设备状态消息
   */
  private handleDeviceStatus(topic: string, message: Buffer): void {
    try {
      const statusData = JSON.parse(message.toString());
      this.processDeviceStatus(statusData);
    } catch (error) {
      console.error("解析设备状态失败:", error);
    }
  }

  /**
   * 处理报警消息
   */
  private handleAlarm(topic: string, message: Buffer): void {
    try {
      const alarmData = JSON.parse(message.toString());
      this.processAlarm(alarmData);
    } catch (error) {
      console.error("解析报警数据失败:", error);
    }
  }

  /**
   * 处理设备数据（内部方法）
   */
  private processDeviceDataInternal(deviceData: DeviceData): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 查找使用该设备的组件
      const componentIds = this.deviceSubscriptions.get(deviceData.deviceId) || [];

      componentIds.forEach(componentId => {
        const binding = this.componentBindings.get(componentId);
        if (binding) {
          this.updateComponentFromDeviceData(binding, deviceData);
        }
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理设备状态
   */
  private processDeviceStatus(statusData: any): void {
    // 处理设备在线/离线状态
    console.log("设备状态更新:", statusData);
    
    // 可以在这里更新组件的连接状态显示
    const componentIds = this.deviceSubscriptions.get(statusData.deviceId) || [];
    componentIds.forEach(componentId => {
      this.addComponentUpdate({
        componentId,
        property: "deviceStatus",
        value: statusData.status,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * 处理报警
   */
  private processAlarm(alarmData: any): void {
    console.log("收到报警:", alarmData);
    
    // 可以在这里触发组件的报警显示
    if (alarmData.deviceId) {
      const componentIds = this.deviceSubscriptions.get(alarmData.deviceId) || [];
      componentIds.forEach(componentId => {
        this.addComponentUpdate({
          componentId,
          property: "alarmStatus",
          value: alarmData,
          timestamp: new Date().toISOString()
        });
      });
    }
  }

  /**
   * 根据设备数据更新组件
   */
  private updateComponentFromDeviceData(
    binding: ComponentBinding,
    deviceData: DeviceData
  ): void {
    binding.parameterBindings.forEach(paramBinding => {
      // 查找对应的参数数据
      const paramData = deviceData.parameters.find(
        p => p.parameterCode === paramBinding.parameterCode
      );

      if (paramData) {
        // 更新参数当前值
        paramBinding.currentValue = paramData.value;

        // 应用转换公式
        let processedValue = paramData.value;
        if (paramBinding.conversionFormula) {
          processedValue = this.applyConversionFormula(
            paramData.value,
            paramBinding.conversionFormula
          );
        }

        // 检查条件并执行动作
        if (paramBinding.conditions) {
          this.evaluateConditions(
            binding.componentId,
            paramBinding.conditions,
            processedValue
          );
        } else {
          // 直接更新目标属性
          this.addComponentUpdate({
            componentId: binding.componentId,
            property: paramBinding.targetProperty,
            value: processedValue,
            timestamp: deviceData.timestamp
          });
        }
      }
    });
  }

  /**
   * 应用转换公式
   */
  private applyConversionFormula(value: any, formula: string): any {
    try {
      // 简单的公式计算实现
      // 替换 'value' 为实际值
      const expression = formula.replace(/\bvalue\b/g, String(value));
      
      // 使用 Function 构造器安全地计算表达式
      const result = new Function(`return ${expression}`)();
      return result;
    } catch (error) {
      console.error("转换公式执行失败:", formula, error);
      return value;
    }
  }

  /**
   * 评估条件并执行动作
   */
  private evaluateConditions(
    componentId: string,
    conditions: BindingCondition[],
    value: any
  ): void {
    conditions.forEach(condition => {
      if (this.evaluateExpression(condition.expression, value)) {
        condition.actions.forEach(action => {
          this.executeAction(componentId, action, value);
        });
      }
    });
  }

  /**
   * 评估条件表达式
   */
  private evaluateExpression(expression: string, value: any): boolean {
    try {
      // 替换 'value' 为实际值
      const expr = expression.replace(/\bvalue\b/g, JSON.stringify(value));
      
      // 使用 Function 构造器安全地计算表达式
      const result = new Function(`return ${expr}`)();
      return Boolean(result);
    } catch (error) {
      console.error("条件表达式评估失败:", expression, error);
      return false;
    }
  }

  /**
   * 执行绑定动作
   */
  private executeAction(componentId: string, action: BindingAction, value: any): void {
    switch (action.type) {
      case "setProperty":
        if (action.property) {
          this.addComponentUpdate({
            componentId,
            property: action.property,
            value: action.value !== undefined ? action.value : value,
            timestamp: new Date().toISOString()
          });
        }
        break;

      case "setStyle":
        if (action.property) {
          this.addComponentUpdate({
            componentId,
            property: `style.${action.property}`,
            value: action.value,
            timestamp: new Date().toISOString()
          });
        }
        break;

      case "triggerAlarm":
        this.addComponentUpdate({
          componentId,
          property: "alarm",
          value: {
            level: action.alarmLevel,
            message: action.message,
            value: value
          },
          timestamp: new Date().toISOString()
        });
        break;

      case "setValue":
        this.addComponentUpdate({
          componentId,
          property: "value",
          value: action.value !== undefined ? action.value : value,
          timestamp: new Date().toISOString()
        });
        break;
    }
  }

  /**
   * 添加组件更新
   */
  private addComponentUpdate(update: ComponentUpdate): void {
    this.componentUpdates.value.push(update);
    
    // 限制更新记录数量
    if (this.componentUpdates.value.length > 1000) {
      this.componentUpdates.value.splice(0, 500);
    }
  }

  /**
   * 获取组件更新
   */
  getComponentUpdates(): Ref<ComponentUpdate[]> {
    return this.componentUpdates;
  }

  /**
   * 清空组件更新
   */
  clearComponentUpdates(): void {
    this.componentUpdates.value = [];
  }

  /**
   * 发送控制命令
   */
  sendControlCommand(deviceId: number, command: any): void {
    if (mqttManager.isConnectedToMqtt()) {
      const topic = `device/${deviceId}/command`;
      const message = JSON.stringify(command);
      mqttManager.publish(topic, message, { qos: 1 });
    }
  }

  /**
   * 获取组件绑定信息
   */
  getComponentBinding(componentId: string): ComponentBinding | undefined {
    return this.componentBindings.get(componentId);
  }

  /**
   * 获取所有组件绑定
   */
  getAllComponentBindings(): ComponentBinding[] {
    return Array.from(this.componentBindings.values());
  }

  /**
   * 处理设备数据（用于外部调用）
   */
  processDeviceData(deviceId: string, messageData: any): any {
    try {
      // 转换为标准的 DeviceData 格式
      const deviceData: DeviceData = {
        deviceId: parseInt(deviceId),
        deviceName: messageData.deviceName || `Device_${deviceId}`,
        timestamp: messageData.timestamp || new Date().toISOString(),
        parameters: Array.isArray(messageData.parameters) 
          ? messageData.parameters 
          : Object.entries(messageData.parameters || {}).map(([key, value]) => ({
              parameterCode: key,
              parameterName: key,
              value: value,
              unit: '',
              quality: 'good' as const,
              timestamp: messageData.timestamp || new Date().toISOString()
            }))
      };

      // 调用内部处理方法
      this.processDeviceDataInternal(deviceData);
      
      return {
        deviceId: deviceId,
        timestamp: Date.now(),
        parameters: messageData.parameters || {},
        status: messageData.status || 'online'
      };
    } catch (error) {
      console.error('处理设备数据失败:', error);
      return null;
    }
  }

  /**
   * 评估条件表达式（用于外部调用）
   */
  evaluateCondition(condition: string, value: any): boolean {
    return this.evaluateExpression(condition, value);
  }

  /**
   * 销毁处理器
   */
  destroy(): void {
    // 取消所有MQTT订阅
    this.deviceSubscriptions.forEach((componentIds, deviceId) => {
      if (mqttManager.isConnectedToMqtt()) {
        mqttManager.unsubscribe(`device/${deviceId}/data`);
        mqttManager.unsubscribe(`device/${deviceId}/status`);
      }
    });

    // 清空数据
    this.componentBindings.clear();
    this.deviceSubscriptions.clear();
    this.componentUpdates.value = [];
  }
}

// 全局数据处理器实例
export const scadaDataProcessor = new ScadaDataProcessor();

// 导出默认实例
export default scadaDataProcessor;