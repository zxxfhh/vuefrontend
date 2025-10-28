// SCADA组态系统类型定义
import type { QueryTableParams } from "@/api/type";

// 导出QueryTableParams类型供hook.tsx使用
export type { QueryTableParams };

export interface ScadaProjectFormItemProps {
  SnowId?: string | number;
  ProjectName: string;
  ProjectDesc?: string;
  ProjectStatus: number;
  Thumbnail?: string;
  UnitId?: number;
  ExpandJson?: string;
}

export interface ScadaProjectItem {
  SnowId: string | number;
  ProjectName: string;
  ProjectDesc?: string;
  ProjectStatus: number;
  Thumbnail?: string;
  UnitId: number;
  ExpandJson?: string;
  CreateId?: string;
  CreateTime?: string;
  CreateName?: string;
  UpdateId?: string;
  UpdateTime?: string;
  UpdateName?: string;
}

export interface ScadaProjectFormProps {
  formInline: ScadaProjectFormItemProps;
}
