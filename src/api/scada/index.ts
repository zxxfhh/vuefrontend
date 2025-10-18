import * as project from "./project";
import { fuxaProjectApi } from "./fuxa";

// SCADA API 统一导出
export const scadaApi = {
  project: {
    // 完整导出所有项目API（旧版+新版）
    ...project.default
  },

  fuxa: {
    // FUXA 组态编辑器相关 API
    ...fuxaProjectApi
  },

  component: {
    // 组件相关 API - 临时实现
    getComponents: (viewId: string) => {
      console.log("获取组件列表:", viewId);
      return Promise.resolve({ data: [] });
    },
    updateComponents: (components: any[]) => {
      console.log("更新组件:", components);
      return Promise.resolve({ data: components });
    }
  }
};

// 向后兼容导出
export default scadaApi;

// 直接导出 FUXA API
export { fuxaProjectApi } from "./fuxa";
export * from "./fuxa/types";
