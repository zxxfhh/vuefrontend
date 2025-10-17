// SCADA组态系统类型定义
import type { QueryTableParams } from "@/api/type";

// 导出QueryTableParams类型供hook.tsx使用
export type { QueryTableParams };

export interface ScadaProjectFormItemProps {
  title?: string;
  SnowId?: string | number;
  ProjectName: string;
  Description?: string;
  ProjectStatus: number;
  Version?: string;
  Thumbnail?: string;
  UnitId?: number;
  ExpandJson?: string;
}

export interface ScadaProjectItem {
  SnowId: string | number;
  ProjectName: string;
  Description?: string;
  ProjectStatus: number;
  Version?: string;
  Thumbnail?: string;
  IsDeleted: number;
  UnitId: number;
  ExpandJson?: string;
  CreateTime?: string;
  UpdateTime?: string;
  CreateBy?: string;
  UpdateBy?: string;
}

export interface ScadaProjectFormProps {
  formInline: ScadaProjectFormItemProps;
}
