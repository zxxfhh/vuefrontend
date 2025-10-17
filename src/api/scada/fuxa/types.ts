/**
 * FUXA组态编辑器相关类型定义
 */

// FUXA项目数据模型
export interface FuxaProject {
  Id: number;
  Name: string;
  Description?: string;
  ProjectData: string; // FUXA项目JSON数据
  Version: string;
  Status: number; // 0:草稿, 1:发布
  CreatedBy: number;
  ModifiedBy: number;
  CreateTime?: string;
  UpdateTime?: string;
  IsDeleted?: boolean;
}

// 项目创建/更新请求模型
export interface FuxaProjectRequest {
  Id?: number;
  Name: string;
  Description?: string;
  ProjectData: string;
  Version?: string;
  Status?: number;
}

// 项目查询参数
export interface FuxaProjectQuery {
  keyword?: string;
  status?: number;
  pageIndex?: number;
  pageSize?: number;
}

// MQTT设备数据模型
export interface MqttDeviceData {
  timestamp: string;
  deviceId: string;
  deviceInfo: {
    name: string;
    type: string;
    location: string;
    status: "online" | "offline" | "error";
    lastUpdate: string;
  };
  properties: MqttDeviceProperty[];
  metadata: {
    source: string;
    version: string;
    messageId: string;
  };
}

// MQTT设备属性数据
export interface MqttDeviceProperty {
  tagId: string;
  name: string;
  value: any;
  unit: string;
  dataType: "int" | "float" | "string" | "boolean";
  quality: "good" | "uncertain" | "bad" | "timeout";
  timestamp: string;
}

// 设备状态变更数据
export interface MqttDeviceStatusChange {
  timestamp: string;
  deviceId: string;
  statusChange: {
    from: string;
    to: string;
    reason: string;
  };
  deviceInfo: {
    name: string;
    type: string;
    location: string;
  };
}

// FUXA编辑器配置
export interface FuxaEditorConfig {
  mode: "edit" | "runtime"; // 编辑模式或运行模式
  theme: "light" | "dark";
  language: "zh-CN" | "en-US";
  autoSave: boolean;
  autoSaveInterval: number; // 自动保存间隔(秒)
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
}

// FUXA组件类型
export interface FuxaComponent {
  id: string;
  type: string;
  category: string;
  name: string;
  icon: string;
  properties: Record<string, any>;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  style: Record<string, any>;
  events: Record<string, any>;
  dataBinding?: {
    deviceId?: string;
    tagId?: string;
    propertyName?: string;
  };
}

// FUXA页面/视图
export interface FuxaView {
  id: string;
  name: string;
  description?: string;
  components: FuxaComponent[];
  background: {
    color?: string;
    image?: string;
  };
  settings: {
    width: number;
    height: number;
    gridSize: number;
    showGrid: boolean;
  };
}

// FUXA项目完整数据结构
export interface FuxaProjectData {
  version: string;
  info: {
    name: string;
    description?: string;
    author?: string;
    version: string;
    created: string;
    modified: string;
  };
  settings: FuxaEditorConfig;
  devices: Array<{
    id: string;
    name: string;
    type: string;
    connection: {
      type: "mqtt" | "api" | "websocket";
      host: string;
      port: number;
      protocol?: string;
      topics?: string[];
      apiEndpoint?: string;
    };
    tags: Array<{
      id: string;
      name: string;
      address: string;
      type: string;
      min?: number;
      max?: number;
      unit?: string;
    }>;
  }>;
  views: FuxaView[];
  alarms: Array<{
    id: string;
    name: string;
    condition: string;
    message: string;
    level: "info" | "warning" | "error" | "critical";
    enabled: boolean;
  }>;
}

// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  totalCount?: number;
}

// 分页响应类型
export interface PagedResponse<T> extends ApiResponse<T[]> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}
