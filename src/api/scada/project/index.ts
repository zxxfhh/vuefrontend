import { http } from "@/utils/http";
import type { Result, ResultTable, QueryTableParams } from "../../type";

/** SCADA项目 */
const button = "SCADA项目";

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

export default {
  getListByPage,
  deleteByPk,
  getInfoByPk,
  saveBatch
};