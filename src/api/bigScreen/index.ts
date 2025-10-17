import { http } from "@/utils/http";
import type { Result, ResultTable, QueryTableParams } from "@/api/type";

const button = "电路图";
// 平台概括
export const getScreenPtgk = (data?: any) => {
  localStorage.setItem("button", "查询" + button + "平台概括");
  return http.request<Result>("get", "/Screen/GetScreenPtgk", {
    data
  });
};
// 平台运行情况
export const getScreenRun = (data?: any) => {
  localStorage.setItem("button", "查询" + button + "平台运行情况");
  return http.request<Result>("get", "/Screen/GetScreenRun", {
    data
  });
};
// 平台用电分析
export const getToDayElecByDev = (data?: any) => {
  localStorage.setItem("button", "查询" + button + "平台用电分析");
  return http.request<Result>("get", "/Screen/GetToDayElecByDev", {
    data
  });
};
// 平台根据当日事件记录
export const getToDayEvent = (data?: any) => {
  localStorage.setItem("button", "查询" + button + "当日事件记录");
  return http.request<Result>("get", "/Screen/GetToDayEvent", {
    data
  });
};
// 根据建筑id获取当前用电设备
export const getElecMeterList = (id?: any, datacategory = "1") => {
  localStorage.setItem("button", "查询" + button + "当前用电设备");
  return http.request<Result>(
    "post",
    `/HtkDevice/GetElecMeterList?buildid=${id}&datacategory=${datacategory}`
  );
};
// 根据设备id获取参数
export const GetParamSelectByDeviceId = (id?: any) => {
  localStorage.setItem("button", "查询" + button + "设备id获取参数");
  return http.request<Result>(
    "get",
    "/HtkDeviceparam/GetParamSelectBy?devid=" + id
  );
};
// 根据设备id获取参数类型
export const getParamTypeSelect = (devtype: any = "1") => {
  localStorage.setItem("button", "查询" + button + "根据设备id获取参数类型");
  return http.request<Result>(
    "get",
    "/HtkDeviceparam/GetParamTypeSelect?devtype=" + devtype
  );
};

export type DataChartSelect = {
  starttime?: string; // 开始时间
  endtime?: string; // 结束时间
  DeviceIds: Array<string>; // 设备ID集合
  ParamCodes?: Array<string>; // 参数ID
  ParamTypeName?: string; // 参数类别
  //   ParamCount?: any; // 参数类别
  DataSort?: any; //排序
  BuildId: string;
  DeptId: string;
};

export type ChartSelect = {
  CollectDate: string;
};
// 根据二级建筑查询变电所信息
export const GetDistributionInfo = (id?: any) => {
  localStorage.setItem("button", "查询" + button + "变电所信息");
  return http.request<Result>(
    "get",
    "/HtkPdfzt/GetDistributionInfo?buildid=" + id
  );
};
// 根据二级建筑查询变电所信息
export const GetScreenYaoXinList = (id?: any) => {
  localStorage.setItem("button", "查询" + button + "遥信设备当前状态");
  return http.request<Result>(
    "get",
    "/Screen/GetScreenYaoXinList?buildid=" + id
  );
};
// 根据二级建筑ID和设备类型查找设备参数当前状态
export const GetListByIconType = (data?: {
  buildid: string;
  icontype: string;
}) => {
  localStorage.setItem(
    "button",
    "查询" + button + "根据二级建筑ID和设备类型查找设备参数当前状态"
  );
  return http.request<Result>(
    "post",
    `/HtkDeviceparam/GetListByIconType?buildid=${data.buildid}&icontype=${data.icontype}`
  );
};
// 根据条件查询曲线
export const GetDataChartBy = (data?: any) => {
  localStorage.setItem("button", "查询" + button + "根据条件查询曲线");
  return http.request<Result>("post", "/HtkRecordData/GetDataChartBy", {
    data
  });
};
// 根据条件查询月用电曲线
export const GetElectricDataChart = (data?: DataChartSelect) => {
  localStorage.setItem("button", "查询" + button + "根据条件查询月用电曲线");
  return http.request<Result>(
    "post",
    "/HtkRecordDataReportDay/GetDataChartBy",
    {
      data
    }
  );
};
// 获取瓦片图参数数据
export const GetMapDataByBid = (id?: any) => {
  localStorage.setItem("button", "获取瓦片图参数数据");
  return http.request<Result>(
    "get",
    "/BuildinfoWapianMap/GetMapDataByBid?_BuildId=" + id
  );
};
// 根据建筑名称联动视频
export const GetVideoByBuild = (buildid?: any) => {
  localStorage.setItem("button", "切换建筑联动视频");
  return http.request<Result>(
    "get",
    "BuildinfoPipeMap/GetVideoByBuild?buildid=" + buildid
  );
};

// 热门游戏排名和房间使用情况接口
export const GetRedemptionStatisticsListByPage = (data?: ChartSelect) => {
  localStorage.setItem(
    "button",
    "查询" + button + "热门游戏排名和房间使用情况接口"
  );
  return http.request<Result>(
    "post",
    "/RedemptionStatistics/GetRedemptionStatisticsListByPage",
    {
      data
    }
  );
};

//StatisticBookMonth/GetListByPage 图书借阅排名列表
export const StatisticBookMonthListByPage = (data?: QueryTableParams) => {
  localStorage.setItem("button", "查询" + button + "图书借阅排名列表");
  return http.request<ResultTable>(
    "post",
    "/StatisticBookMonth/GetListByPage",
    { data }
  );
};
// 图书类型借阅排名
export const GetCategoriesStatisticList = (data?: ChartSelect) => {
  localStorage.setItem("button", "查询" + button + "图书借阅类型排名");
  return http.request<Result>(
    "post",
    "/StatisticBookMonth/GetCategoriesStatisticList",
    { data }
  );
};

// 图书借阅排名
export const GetBookStatisticList = (data?: ChartSelect) => {
  localStorage.setItem("button", "查询" + button + "图书借阅类型排名");
  return http.request<Result>(
    "post",
    "/StatisticBookMonth/GetBookStatisticList",
    { data }
  );
};
// 从业人员年龄范围统计
export const GetStaffAgeList = (data?: ChartSelect) => {
  localStorage.setItem("button", "查询" + button + "从业人员年龄范围统计");
  return http.request<Result>("post", "/StatisticStaffMonth/GetStaffAgeList", {
    data
  });
};
//罪犯分类兑换占比
export const GetZFZMListByPage = (data?: ChartSelect) => {
  localStorage.setItem("button", "查询" + button + "罪犯分类兑换占比");
  return http.request<Result>(
    "post",
    "/StatisticStaffMonth/GetZFZMListByPage",
    { data }
  );
};
// 异常签到记录
export const GetAbnormalListByPage = (data?: QueryTableParams) => {
  localStorage.setItem("button", "查询" + button + "异常签到记录");
  return http.request<ResultTable>("post", "/EventSign/GetAbnormalListByPage", {
    data
  });
};

// 异常签到记录
export const ErrorEventSignGetList = (data?: QueryTableParams) => {
  localStorage.setItem("button", "查询" + button + "异常签到记录");
  return http.request<ResultTable>("post", "/EventSignError/GetListByPage", {
    data
  });
};

// 设置异常签到记录
export const EventSignErrorSetSave = (data: any) => {
  localStorage.setItem("button", "查询" + button + "设置异常签到记录");
  return http.request<Result>("post", "/EventSignErrorSet/Save", { data });
};

// 查询异常签到记录设置
export const EventSignErrorSetList = (data?: QueryTableParams) => {
  localStorage.setItem("button", "查询" + button + "查询异常签到记录设置");
  return http.request<ResultTable>("post", "/EventSignErrorSet/GetListByPage", {
    data
  });
};

// 导出异常签到记录
export const GetSignErrorHbExcel = (params: any) => {
  localStorage.setItem("button", "查询" + button + "查询异常签到记录设置");
  return http.request<Result>("post", "/EventSignError/GetSignErrorHbExcel", {
    params
  });
};
// 签到人数统计
export const GetAllRealTimePeopleNumList = () => {
  localStorage.setItem("button", "查询" + button + "签到人数统计");
  return http.request<ResultTable>(
    "post",
    "/EventSign/GetAllRealTimePeopleNumList"
  );
};
export const GetSelfPortraitByStaffCode = (StaffCode?: any) => {
  localStorage.setItem("button", "查询" + button + "签到人数统计");
  return http.request<Result>(
    "get",
    "/Staffinfo/GetSelfPortraitByStaffCode?StaffCode=" + StaffCode
  );
};
//积分消费情况排名
export const GetPointsSpendingListByPage = (data?: any) => {
  localStorage.setItem("button", "查询" + button + "积分消费情况排名");
  return http.request<Result>(
    "post",
    "/RedemptionStatistics/GetPointsSpendingListByPage",
    { data }
  );
};

//人员年龄排名
export const GetAgeDeviceList = (data?: any) => {
  localStorage.setItem("button", "查询" + button + "年龄使用房间排名");
  return http.request<Result>("post", "/StatisticStaffMonth/GetAgeDeviceList", {
    data
  });
};

//房间消费情况
export const GetRoomUsageStatisticsListByPage = (data?: any) => {
  localStorage.setItem("button", "查询" + button + "积分消费情况排名");
  return http.request<Result>(
    "post",
    "/RedemptionStatistics/GetRoomUsageStatisticsListByPage",
    { data }
  );
};

//月度积分消费情况
export const GetPointsSpendingList = (data?: ChartSelect) => {
  localStorage.setItem("button", "查询" + button + "月度积分消费情况");
  return http.request<Result>(
    "post",
    "/RedemptionStatistics/GetPointsSpendingList",
    { data }
  );
};

//项目兑换记录列表
export const GetPointsExchangeList = (data?: QueryTableParams) => {
  localStorage.setItem("button", "查询" + button + "项目兑换记录列表");
  return http.request<ResultTable>(
    "post",
    "/RedemptionStatistics/GetListByPage",
    { data }
  );
};

export const GetListByUserPermissions = (data?: QueryTableParams) => {
  localStorage.setItem("button", "查询" + button + "建筑权限");
  return http.request<ResultTable>(
    "post",
    "/Buildinfo/GetListByUserPermissions",
    { data }
  );
};

export default {
  getScreenPtgk,
  getScreenRun,
  getToDayElecByDev,
  GetScreenYaoXinList,
  getToDayEvent,
  getParamTypeSelect,
  GetMapDataByBid,
  GetVideoByBuild,
  GetRedemptionStatisticsListByPage,
  GetPointsExchangeList,
  GetPointsSpendingList,
  GetRoomUsageStatisticsListByPage,
  GetPointsSpendingListByPage,
  StatisticBookMonthListByPage,
  GetCategoriesStatisticList,
  GetBookStatisticList,
  GetStaffAgeList,
  GetListByUserPermissions,
  GetZFZMListByPage,
  GetAbnormalListByPage,
  GetAllRealTimePeopleNumList,
  GetSelfPortraitByStaffCode,
  GetAgeDeviceList,
  ErrorEventSignGetList,
  EventSignErrorSetSave,
  EventSignErrorSetList,
  GetSignErrorHbExcel
};
