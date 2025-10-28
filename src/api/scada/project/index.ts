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
  return http.request<Result>("post", "/ScadaProject/DeleteById?projectId=" + id);
};

/** 批量保存/修改 */
export const saveBatch = (data?: object) => {
  localStorage.setItem("button", "保存" + button);
  return http.request<Result>("post", "/ScadaProject/SaveBatch", {
    data
  });
};


// ==================== 后端ScadaProjectController对应的API ====================

/**
 * 上传Base64图片（用于缩略图）
 * 参考: AttachFileController.UploadBybBase64
 */
export const uploadBase64Image = (base64String: string, imageType: string) => {
  localStorage.setItem("button", "上传Base64图片");
  return http.request<Result>("post", "/AttachFile/UploadBybBase64", {
    data: {
      Base64String: base64String,
      ImageType: imageType
    }
  });
};

/**
 * 保存组态项目数据
 * 参考: ScadaProjectController.SaveProjectData
 */
export const saveProjectData = (data: {
  ProjectId: number;
  ContentData?: string;
  Thumbnail?: string;
}) => {
  localStorage.setItem("button", "保存组态数据");
  return http.request<Result>("post", "/ScadaProject/SaveProjectData", {
    data
  });
};

/**
 * 发布/取消发布项目
 * 参考: ScadaProjectController.DashPublish
 */
export const dashPublish = (projectId: number, status: number) => {
  localStorage.setItem("button", status === 1 ? "发布项目" : "取消发布");
  return http.request<Result>("get", `/ScadaProject/DashPublish?projectId=${projectId}&status=${status}`);
};

/**
 * 根据项目ID获取组态数据信息
 * 参考: ScadaProjectController.GetDataInfo
 */
export const getDataInfo = (projectId: number) => {
  localStorage.setItem("button", "获取组态数据");
  return http.request<Result>("get", `/ScadaProject/GetDataInfo?projectId=${projectId}`);
};


// 默认导出
export default {
  getListByPage,
  deleteByPk,
  saveBatch,
  uploadBase64Image,
  saveProjectData,
  dashPublish,
  getDataInfo
};
