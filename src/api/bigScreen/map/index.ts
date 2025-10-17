import { http } from "@/utils/http";
import type { Result, ResultTable, QueryTableParams } from "../../type";
/** 设备 */
/** 分页查询 */
const button = "驾驶舱";
export const getListByPage = (data?: QueryTableParams) => {
  localStorage.setItem("button", "查询" + button + "地图点位");
  return http.request<ResultTable>(
    "post",
    "/BuildinfoWapianMap/GetListByPage",
    {
      data
    }
  );
};
/** 删除 */
export const deleteByPk = (id?: string) => {
  localStorage.setItem("button", "删除" + button + "地图点位");
  return http.request<Result>(
    "post",
    "/BuildinfoWapianMap/DeleteByPk?_BuildId=" + id
  );
};
/** 查询单个*/
export const GetInfoByPk = (id?: any) => {
  localStorage.setItem("button", "查询单个" + button + "地图点位");
  return http.request<Result>(
    "get",
    "/BuildinfoWapianMap/GetInfoByPk?_BuildId=" + id
  );
};
/** 查询瓦片报警*/
export const GetScreenWaPian = () => {
  localStorage.setItem("button", "查询" + button + "瓦片报警");
  return http.request<Result>("get", "/Screen/GetScreenWaPian");
};
/** 批量保存/修改 */
export const saveBatch = (data?: object) => {
  localStorage.setItem("button", "保存修改" + button + "地图点位");
  return http.request<Result>("post", "/BuildinfoWapianMap/SaveBatch", {
    data
  });
};
/** 新增 */
export const insert = (data?: object) => {
  return http.request<Result>("post", "/BuildinfoWapianMap/InsertBuild", {
    data
  });
};
/** 修改 */
export const update = (data?: object) => {
  return http.request<Result>("post", "/BuildinfoWapianMap/UpdateBuild", {
    data
  });
};

export default {
  getListByPage,
  GetScreenWaPian,
  deleteByPk,
  GetInfoByPk,
  saveBatch,
  insert,
  update
};
