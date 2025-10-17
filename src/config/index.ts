import axios from "axios";
import type { App } from "vue";

let config: object = {};
const { VITE_PUBLIC_PATH } = import.meta.env;

const setConfig = (cfg?: unknown) => {
  config = Object.assign(config, cfg);
};

const getConfig = (key?: string): PlatformConfigs => {
  if (typeof key === "string") {
    const arr = key.split(".");
    if (arr && arr.length) {
      let data = config;
      arr.forEach(v => {
        if (data && typeof data[v] !== "undefined") {
          data = data[v];
        } else {
          data = null;
        }
      });
      return data;
    }
  }
  return config;
};

/** 获取项目动态全局配置 */
export const getPlatformConfig = async (app: App): Promise<undefined> => {
  app.config.globalProperties.$config = getConfig();
  return new Promise((resolve, reject) => {
    fetch(`${VITE_PUBLIC_PATH}platform-config.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("🚀 ~ returnnewPromise ~ data:", data);
        let $config = app.config.globalProperties.$config;
        // 自动注入项目配置
        if (app && $config && typeof data === "object") {
          $config = Object.assign($config, data);
          app.config.globalProperties.$config = $config;
          // 设置全局配置
          setConfig($config);
        }
        resolve($config);
        // 在这里可以使用从服务器获取的数据
      })
      .catch(error => {
        throw "请在public文件夹下添加serverConfig.json配置文件";
        reject(error);
      });
  });
  // return axios({
  //   method: "get",
  //   url: `${VITE_PUBLIC_PATH}platform-config.json`
  // })
  //   .then(({ data: config }) => {
  //     let $config = app.config.globalProperties.$config;
  //     // 自动注入系统配置
  //     if (app && $config && typeof config === "object") {
  //       $config = Object.assign($config, config);
  //       app.config.globalProperties.$config = $config;
  //       // 设置全局配置
  //       setConfig($config);
  //     }
  //     return $config;
  //   })
  //   .catch(() => {
  //     throw "请在public文件夹下添加platform-config.json配置文件";
  //   });
};

/** 本地响应式存储的命名空间 */
const responsiveStorageNameSpace = () => getConfig().ResponsiveStorageNameSpace;

export { getConfig, setConfig, responsiveStorageNameSpace };
