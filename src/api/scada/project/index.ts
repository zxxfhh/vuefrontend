import { http } from "@/utils/http";
import type { Result, ResultTable, QueryTableParams } from "../../type";

/** SCADA项目 */
const button = "SCADA项目";

// ==================== 旧版API（保留兼容性） ====================

/** 分页查询 */
export const getListByPage = (data?: QueryTableParams) => {
  localStorage.setItem("button", "查询" + button);
  return http.request<ResultTable>("post", "/ScadaProject/GetListByPage", {
    data
  });
};

/** 删除 */
export const deleteByPk = (id?: string) => {
  localStorage.setItem("button", "删除" + button);
  return http.request<Result>("post", "/ScadaProject/DeleteByPk?_Id=" + id);
};

/** 查询单个*/
export const getInfoByPk = (id?: any) => {
  localStorage.setItem("button", "查询单个" + button);
  return http.request<Result>("get", "/ScadaProject/GetInfoByPk?_Id=" + id);
};

/** 批量保存/修改 */
export const saveBatch = (data?: object) => {
  localStorage.setItem("button", "保存" + button);
  return http.request<Result>("post", "/ScadaProject/SaveBatch", {
    data
  });
};

// ==================== 独立部署方案新API ====================

/**
 * 分页查询项目列表（新版）
 * @param data 查询参数
 */
export const getProjectList = (data?: {
  keyword?: string;
  status?: number;
  pageIndex?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: string;
}) => {
  localStorage.setItem("button", "查询项目列表");
  return http.request<ResultTable>("post", "/scada/project/list", { data });
};

/**
 * 获取项目元数据
 * @param id 项目ID
 */
export const getProjectMeta = (id: string | number) => {
  localStorage.setItem("button", "获取项目元数据");
  return http.request<Result>("get", `/scada/project/get-meta/${id}`);
};

/**
 * 保存项目到本地文件
 * @param data 项目数据
 */
export const saveProjectToFile = (data: {
  id?: number;
  name: string;
  description?: string;
  projectData: string;
  version?: string;
  status?: number;
  componentCount?: number;
}) => {
  localStorage.setItem("button", "保存项目到文件");
  return http.request<Result>("post", "/scada/project/save-to-file", { data });
};

/**
 * 从本地文件加载项目
 * @param filePath 文件路径
 */
export const loadProjectFromFile = (filePath: string) => {
  localStorage.setItem("button", "加载项目文件");
  return http.request<Result>("get", "/scada/project/load-from-file", {
    params: { filePath }
  });
};

/**
 * 删除项目（软删除）
 * @param id 项目ID
 */
export const deleteProject = (id: string | number) => {
  localStorage.setItem("button", "删除项目");
  return http.request<Result>("delete", `/scada/project/delete/${id}`);
};

/**
 * 导出项目为.fuxa文件
 * @param id 项目ID
 * @returns 下载URL
 */
export const exportProject = (id: string | number) => {
  return `/api/scada/project/export/${id}`;
};

/**
 * 导入.fuxa项目文件
 * @param file .fuxa文件
 */
export const importProject = (file: File) => {
  localStorage.setItem("button", "导入项目");
  const formData = new FormData();
  formData.append("file", file);
  return http.request<Result>("post", "/scada/project/import", {
    data: formData,
    headers: { "Content-Type": "multipart/form-data" }
  });
};

/**
 * 更新最后打开时间
 * @param id 项目ID
 */
export const updateLastOpenTime = (id: string | number) => {
  return http.request<Result>("post", `/scada/project/update-last-open-time/${id}`);
};

/**
 * 上传资源文件
 * @param file 文件对象
 * @param projectId 项目ID
 * @param resourceType 资源类型
 */
export const uploadResource = (
  file: File,
  projectId: number,
  resourceType: "image" | "video" | "svg"
) => {
  localStorage.setItem("button", "上传资源文件");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("projectId", projectId.toString());
  formData.append("resourceType", resourceType);
  return http.request<Result>("post", "/scada/resources/upload", {
    data: formData,
    headers: { "Content-Type": "multipart/form-data" }
  });
};

/**
 * 获取资源文件URL
 * @param projectId 项目ID
 * @param resourceType 资源类型
 * @param fileName 文件名
 */
export const getResourceUrl = (
  projectId: number,
  resourceType: "image" | "video" | "svg",
  fileName: string
) => {
  return `/api/scada/resources/get/${projectId}/${resourceType}/${fileName}`;
};

// 默认导出
export default {
  // 旧版API
  getListByPage,
  deleteByPk,
  getInfoByPk,
  saveBatch,
  // 新版API
  getProjectList,
  getProjectMeta,
  saveProjectToFile,
  loadProjectFromFile,
  deleteProject,
  exportProject,
  importProject,
  updateLastOpenTime,
  uploadResource,
  getResourceUrl
};