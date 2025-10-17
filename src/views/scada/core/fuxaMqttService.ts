import { ref, reactive, computed } from "vue";
import type { 
  MqttDeviceData, 
  MqttDeviceStatusChange, 
  MqttDeviceProperty 
} from "@/api/scada/fuxa/types";

export type MqttConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * FUXA MQTT数据服务
 * 负责MQTT连接管理和设备数据订阅
 */
export class FuxaMqttService {
  // 连接状态
  private _status = ref<MqttConnectionStatus>('disconnected');
  private _error = ref<string>('');
  private _messageCount = ref<number>(0);

  // 设备数据存储
  private _devices = reactive(new Map<string, MqttDeviceData>());
  private _deviceProperties = reactive(new Map<string, Map<string, MqttDeviceProperty>>());

  // MQTT客户端实例（这里需要根据实际使用的MQTT库进行实现）
  private mqttClient: any = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private currentReconnectAttempts = 0;

  // 订阅的主题配置
  private readonly topicConfig = {
    deviceData: 'fuxa/device/+/data',
    deviceStatus: 'fuxa/device/+/status',
    deviceAlarm: 'fuxa/device/+/alarm'
  };

  // 响应式属性
  public readonly status = computed(() => this._status.value);
  public readonly error = computed(() => this._error.value);
  public readonly messageCount = computed(() => this._messageCount.value);
  public readonly devices = computed(() => this._devices);
  public readonly deviceCount = computed(() => this._devices.size);

  /**
   * 连接到MQTT服务器
   */
  async connect(brokerUrl?: string, options?: any): Promise<void> {
    if (this._status.value === 'connected' || this._status.value === 'connecting') {
      return;
    }

    try {
      this._status.value = 'connecting';
      this._error.value = '';

      // 默认MQTT配置
      const defaultBrokerUrl = brokerUrl || 'ws://localhost:9001/mqtt';
      const defaultOptions = {
        clientId: `fuxa_editor_${Date.now()}`,
        username: '',
        password: '',
        keepalive: 60,
        clean: true,
        reconnectPeriod: 5000,
        ...options
      };

      // 这里需要根据实际使用的MQTT库进行实现
      // 示例使用 mqtt.js 库
      // import * as mqtt from 'mqtt/dist/mqtt.min.js';
      // this.mqttClient = mqtt.connect(defaultBrokerUrl, defaultOptions);

      // 模拟连接成功（实际项目中替换为真实的MQTT连接）
      await this.simulateConnection();

      this._status.value = 'connected';
      this.currentReconnectAttempts = 0;

      // 订阅设备数据主题
      await this.subscribeToTopics();

      console.log('MQTT连接成功');
    } catch (error) {
      this._status.value = 'error';
      this._error.value = error instanceof Error ? error.message : '连接失败';
      console.error('MQTT连接失败:', error);
      
      // 启动重连机制
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * 断开MQTT连接
   */
  disconnect(): void {
    if (this.mqttClient) {
      this.mqttClient.end?.();
      this.mqttClient = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this._status.value = 'disconnected';
    this._error.value = '';
    this.currentReconnectAttempts = 0;
    
    // 清除设备数据
    this._devices.clear();
    this._deviceProperties.clear();
    
    console.log('MQTT连接已断开');
  }

  /**
   * 订阅设备数据主题
   */
  private async subscribeToTopics(): Promise<void> {
    const topics = [
      this.topicConfig.deviceData,
      this.topicConfig.deviceStatus,
      this.topicConfig.deviceAlarm
    ];

    for (const topic of topics) {
      await this.subscribe(topic);
    }

    // 设置消息处理回调
    this.setupMessageHandlers();
  }

  /**
   * 订阅指定主题
   */
  private async subscribe(topic: string): Promise<void> {
    // 实际项目中使用真实的MQTT客户端订阅
    // this.mqttClient.subscribe(topic, { qos: 1 });
    
    console.log(`已订阅主题: ${topic}`);
  }

  /**
   * 设置消息处理回调
   */
  private setupMessageHandlers(): void {
    // 实际项目中设置MQTT消息处理
    // this.mqttClient.on('message', (topic: string, message: Buffer) => {
    //   this.handleMessage(topic, message.toString());
    // });

    // 模拟消息处理（实际项目中删除此部分）
    this.startMessageSimulation();
  }

  /**
   * 处理接收到的MQTT消息
   */
  private handleMessage(topic: string, message: string): void {
    try {
      this._messageCount.value++;

      if (topic.includes('/data')) {
        // 处理设备数据消息
        const deviceData: MqttDeviceData = JSON.parse(message);
        this.updateDeviceData(deviceData);
      } else if (topic.includes('/status')) {
        // 处理设备状态变更消息
        const statusData: MqttDeviceStatusChange = JSON.parse(message);
        this.updateDeviceStatus(statusData);
      } else if (topic.includes('/alarm')) {
        // 处理设备报警消息
        console.log('收到设备报警:', message);
      }
    } catch (error) {
      console.error('处理MQTT消息失败:', error, '主题:', topic, '消息:', message);
    }
  }

  /**
   * 更新设备数据
   */
  private updateDeviceData(deviceData: MqttDeviceData): void {
    const deviceId = deviceData.deviceId;
    
    // 更新设备基本信息
    this._devices.set(deviceId, deviceData);

    // 更新设备属性数据
    if (!this._deviceProperties.has(deviceId)) {
      this._deviceProperties.set(deviceId, new Map());
    }
    
    const deviceProps = this._deviceProperties.get(deviceId)!;
    deviceData.properties.forEach(prop => {
      deviceProps.set(prop.tagId, prop);
    });

    //console.log(`设备 ${deviceId} 数据已更新:`, deviceData);
  }

  /**
   * 更新设备状态
   */
  private updateDeviceStatus(statusData: MqttDeviceStatusChange): void {
    const deviceId = statusData.deviceId;
    const currentDevice = this._devices.get(deviceId);
    
    if (currentDevice) {
      currentDevice.deviceInfo.status = statusData.statusChange.to as any;
      currentDevice.deviceInfo.lastUpdate = statusData.timestamp;
      
      console.log(`设备 ${deviceId} 状态变更:`, statusData.statusChange);
    }
  }

  /**
   * 获取指定设备的数据
   */
  getDeviceData(deviceId: string): MqttDeviceData | undefined {
    return this._devices.get(deviceId);
  }

  /**
   * 获取指定设备的属性值
   */
  getDeviceProperty(deviceId: string, tagId: string): MqttDeviceProperty | undefined {
    return this._deviceProperties.get(deviceId)?.get(tagId);
  }

  /**
   * 获取所有在线设备列表
   */
  getOnlineDevices(): MqttDeviceData[] {
    return Array.from(this._devices.values()).filter(
      device => device.deviceInfo.status === 'online'
    );
  }

  /**
   * 重连调度
   */
  private scheduleReconnect(): void {
    if (this.currentReconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      return;
    }

    this.currentReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.currentReconnectAttempts), 30000);

    this.reconnectTimer = setTimeout(() => {
      console.log(`第 ${this.currentReconnectAttempts} 次重连尝试...`);
      this.connect().catch(err => {
        console.error('重连失败:', err);
      });
    }, delay);
  }

  /**
   * 模拟连接（开发阶段使用）
   */
  private async simulateConnection(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  /**
   * 模拟消息数据（开发阶段使用）
   */
  private startMessageSimulation(): void {
    // 模拟设备数据
    const simulateDeviceData = () => {
      const deviceIds = ['device_001', 'device_002', 'device_003'];
      
      deviceIds.forEach(deviceId => {
        const mockData: MqttDeviceData = {
          timestamp: new Date().toISOString(),
          deviceId,
          deviceInfo: {
            name: `温度传感器_${deviceId.slice(-3)}`,
            type: 'TemperatureSensor',
            location: `车间A-${deviceId.slice(-2)}`,
            status: Math.random() > 0.1 ? 'online' : 'offline',
            lastUpdate: new Date().toISOString()
          },
          properties: [
            {
              tagId: `temp_${deviceId}`,
              name: '温度值',
              value: (20 + Math.random() * 10).toFixed(1),
              unit: '°C',
              dataType: 'float',
              quality: 'good',
              timestamp: new Date().toISOString()
            },
            {
              tagId: `humidity_${deviceId}`,
              name: '湿度值',
              value: (50 + Math.random() * 30).toFixed(1),
              unit: '%',
              dataType: 'float',
              quality: 'good',
              timestamp: new Date().toISOString()
            },
            {
              tagId: `status_${deviceId}`,
              name: '运行状态',
              value: Math.random() > 0.8 ? '故障' : '正常',
              unit: '',
              dataType: 'string',
              quality: 'good',
              timestamp: new Date().toISOString()
            }
          ],
          metadata: {
            source: 'modbus',
            version: '1.0',
            messageId: `msg_${Date.now()}_${deviceId}`
          }
        };

        this.handleMessage(`fuxa/device/${deviceId}/data`, JSON.stringify(mockData));
      });
    };

    // 立即执行一次，然后每5秒更新一次
    simulateDeviceData();
    setInterval(simulateDeviceData, 5000);
  }
}

// 创建单例实例
export const fuxaMqttService = new FuxaMqttService();

// 默认导出
export default fuxaMqttService;