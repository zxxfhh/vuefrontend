import * as project from "./project";
import { fuxaProjectApi } from "./fuxa";

// SCADA API 统一导出
export const scadaApi = {
  project: {
    // 原有项目相关 API
    getProject: project.getInfoByPk,
    exportProject: (id: string) => {
      // 临时实现，实际需要后端支持
      console.log("导出项目:", id);
      return Promise.resolve({ data: {} });
    },
    runProject: (id: string) => {
      // 临时实现，实际需要后端支持
      console.log("运行项目:", id);
      return Promise.resolve({ data: {} });
    },
    stopProject: (id: string) => {
      // 临时实现，实际需要后端支持
      console.log("停止项目:", id);
      return Promise.resolve({ data: {} });
    },
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
