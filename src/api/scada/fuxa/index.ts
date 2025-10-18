/**
 * FUXA 组态编辑器 API
 * 这是一个预留的模块，用于未来可能的 FUXA 相关功能
 */

import { http } from "@/utils/http";
import type { Result } from "../../type";

/**
 * FUXA 项目 API（预留）
 * 当前项目使用的是独立的 ScadaProject API
 */
export const fuxaProjectApi = {
  // 预留：获取 FUXA 项目列表
  getProjects: () => {
    return http.request<Result>("get", "/fuxa/projects");
  },

  // 预留：获取单个 FUXA 项目
  getProject: (id: string) => {
    return http.request<Result>("get", `/fuxa/projects/${id}`);
  },

  // 预留：创建 FUXA 项目
  createProject: (data: any) => {
    return http.request<Result>("post", "/fuxa/projects", { data });
  },

  // 预留：更新 FUXA 项目
  updateProject: (id: string, data: any) => {
    return http.request<Result>("put", `/fuxa/projects/${id}`, { data });
  },

  // 预留：删除 FUXA 项目
  deleteProject: (id: string) => {
    return http.request<Result>("delete", `/fuxa/projects/${id}`);
  }
};

export default fuxaProjectApi;
