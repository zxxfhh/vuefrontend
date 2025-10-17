// SCADA 相关类型定义

/** SCADA 项目 */
export interface ScadaProject {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: "active" | "inactive" | "running";
  config?: Record<string, any>;
}

/** SCADA 组件 */
export interface ScadaComponent {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  visible?: boolean;
  locked?: boolean;
  style?: Record<string, any>;
  properties?: Record<string, any>;
  events?: Record<string, any>;
  dataBindings?: Record<string, any>;
}

/** 组件类型 */
export type ComponentType =
  | "text"
  | "button"
  | "input"
  | "image"
  | "shape"
  | "chart"
  | "gauge"
  | "switch"
  | "slider"
  | "progress"
  | "table"
  | "container";

/** 数据源配置 */
export interface DataSource {
  id: string;
  name: string;
  type: "mqtt" | "websocket" | "http" | "database";
  config: Record<string, any>;
  status?: "connected" | "disconnected" | "error";
}

/** 事件配置 */
export interface EventConfig {
  id: string;
  name: string;
  type: "click" | "change" | "timer" | "data";
  trigger: Record<string, any>;
  actions: EventAction[];
}

/** 事件动作 */
export interface EventAction {
  id: string;
  type: "popup" | "data" | "animation";
  config: Record<string, any>;
}

/** 画布状态 */
export interface CanvasState {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  mode: InteractionMode;
  selectedComponents: string[];
  hoveredComponent?: string;
}

/** 视口状态 */
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

/** 交互模式 */
export type InteractionMode =
  | "select"
  | "pan"
  | "draw"
  | "text"
  | "line"
  | "rectangle"
  | "circle";

/** 点坐标 */
export interface Point {
  x: number;
  y: number;
}

/** 边界框 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
