/**
 * 项目保存/加载/导入/导出/自动保存相关工具函数
 */
import { ref, reactive, Ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { Router } from "vue-router";
import { scadaApi } from "@/api/scada";

/**
 * 保存项目到本地文件
 */
export const saveProject = async (
  loading: Ref<boolean>,
  projectInfo: any,
  projectData: any,
  canvasWidth: Ref<number>,
  canvasHeight: Ref<number>,
  gridSize: Ref<number>,
  showGrid: Ref<boolean>,
  enableSnap: Ref<boolean>,
  canvasBackgroundColor: Ref<string>,
  canvasBackgroundImage: Ref<string>,
  deviceList: Ref<any[]>,
  datasetList: Ref<any[]>,
  isSaved: Ref<boolean>,
  router: Router
) => {
  try {
    loading.value = true;

    // 1. 构建完整的项目JSON数据
    const projectJson = {
      version: projectInfo.value.Version || "1.0.0",
      info: {
        id: projectInfo.value.SnowId,
        name: projectInfo.value.Name,
        description: projectInfo.value.Description || "",
        created: projectInfo.value.CreateTime || new Date().toISOString(),
        modified: new Date().toISOString(),
        author: "current_user", // TODO: 从用户信息获取
        tags: []
      },
      settings: {
        canvasWidth: canvasWidth.value,
        canvasHeight: canvasHeight.value,
        gridSize: gridSize.value,
        showGrid: showGrid.value,
        enableSnap: enableSnap.value,
        backgroundColor: canvasBackgroundColor.value,
        backgroundImage: canvasBackgroundImage.value
      },
      views: projectData.value?.views || [{ id: "view_1", name: "主画面", components: [] }],
      devices: deviceList.value || [],
      datasets: datasetList.value || [],
      resources: {
        images: [],
        videos: [],
        svgs: []
      }
    };

    // 2. 统计组件数量
    const componentCount = projectJson.views[0]?.components?.length || 0;

    // 3. 调用API保存
    const response = await scadaApi.project.saveProjectToFile({
      id: projectInfo.value.SnowId ? Number(projectInfo.value.SnowId) : undefined,
      name: projectInfo.value.Name || "未命名项目",
      description: projectInfo.value.Description,
      projectData: JSON.stringify(projectJson, null, 2), // 格式化JSON
      version: projectInfo.value.Version,
      status: projectInfo.value.Status,
      componentCount
    });

    if (response.success) {
      // 4. 更新项目信息
      if (!projectInfo.value.SnowId) {
        projectInfo.value.SnowId = response.data.id;
        projectInfo.value.FilePath = response.data.filePath;

        // 更新路由（新建项目）
        router.replace({
          name: "ScadaEditor",
          params: { id: response.data.id }
        });
      }

      isSaved.value = true;
      ElMessage.success(
        `项目已保存 (文件大小: ${(response.data.fileSize / 1024).toFixed(2)} KB)`
      );
    } else {
      ElMessage.error(response.message || "保存失败");
    }
  } catch (error) {
    console.error("保存项目失败:", error);
    ElMessage.error("保存失败: " + (error as Error).message);
  } finally {
    loading.value = false;
  }
};

/**
 * 从本地文件加载项目
 */
export const loadProject = async (
  projectId: string,
  loading: Ref<boolean>,
  projectInfo: any,
  projectData: any,
  deviceList: Ref<any[]>,
  datasetList: Ref<any[]>,
  canvasWidth: Ref<number>,
  canvasHeight: Ref<number>,
  gridSize: Ref<number>,
  showGrid: Ref<boolean>,
  enableSnap: Ref<boolean>,
  canvasBackgroundColor: Ref<string>,
  canvasBackgroundImage: Ref<string>,
  isSaved: Ref<boolean>,
  redrawCanvas: () => void,
  nextTick: any
) => {
  try {
    loading.value = true;

    // 1. 获取项目元数据
    const metaResponse = await scadaApi.project.getProjectMeta(projectId);

    if (!metaResponse.success || !metaResponse.data) {
      ElMessage.error("项目不存在");
      return;
    }

    const meta = metaResponse.data;

    // 2. 从本地文件加载项目数据
    const fileResponse = await scadaApi.project.loadProjectFromFile(meta.FilePath);

    if (!fileResponse.success || !fileResponse.data) {
      ElMessage.error("加载项目文件失败");
      return;
    }

    // 3. 解析JSON数据
    const projectJson = JSON.parse(fileResponse.data.content);

    // 4. 恢复项目信息
    projectInfo.value = {
      SnowId: meta.Id,
      Name: projectJson.info.name,
      Description: projectJson.info.description,
      Version: projectJson.version,
      Status: meta.Status,
      FilePath: meta.FilePath,
      CreateTime: meta.CreateTime,
      UpdateTime: meta.UpdateTime
    };

    // 5. 恢复项目数据
    projectData.value = {
      views: projectJson.views || [{ id: "view_1", name: "主画面", components: [] }],
      devices: projectJson.devices || [],
      datasets: projectJson.datasets || []
    };

    deviceList.value = projectJson.devices || [];
    datasetList.value = projectJson.datasets || [];

    // 6. 恢复画布设置
    if (projectJson.settings) {
      canvasWidth.value = projectJson.settings.canvasWidth || 1920;
      canvasHeight.value = projectJson.settings.canvasHeight || 1080;
      gridSize.value = projectJson.settings.gridSize || 20;
      showGrid.value = projectJson.settings.showGrid !== false;
      enableSnap.value = projectJson.settings.enableSnap !== false;
      canvasBackgroundColor.value = projectJson.settings.backgroundColor || "#f5f5f5";
      canvasBackgroundImage.value = projectJson.settings.backgroundImage || "";
    }

    // 7. 渲染画布
    await nextTick();
    redrawCanvas();

    // 8. 更新最后打开时间
    await scadaApi.project.updateLastOpenTime(projectId);

    isSaved.value = true;
    ElMessage.success(
      `项目加载成功 (组件数: ${projectData.value.views[0]?.components?.length || 0}, ` +
      `大小: ${(fileResponse.data.size / 1024).toFixed(2)} KB)`
    );
  } catch (error) {
    console.error("加载项目失败:", error);
    ElMessage.error("加载失败: " + (error as Error).message);
  } finally {
    loading.value = false;
  }
};

/**
 * 初始化新项目
 */
export const initializeNewProject = (
  projectInfo: any,
  projectData: any,
  deviceList: Ref<any[]>,
  datasetList: Ref<any[]>,
  canvasWidth: Ref<number>,
  canvasHeight: Ref<number>,
  gridSize: Ref<number>,
  showGrid: Ref<boolean>,
  enableSnap: Ref<boolean>,
  canvasBackgroundColor: Ref<string>,
  canvasBackgroundImage: Ref<string>,
  isSaved: Ref<boolean>
) => {
  projectInfo.value = {
    SnowId: "",
    Name: "未命名项目",
    Description: "",
    Version: "1.0.0",
    Status: 0
  };

  projectData.value = {
    views: [
      {
        id: "view_1",
        name: "主画面",
        description: "",
        components: []
      }
    ],
    devices: [],
    datasets: []
  };

  deviceList.value = [];
  datasetList.value = [];

  // 默认画布设置
  canvasWidth.value = 1920;
  canvasHeight.value = 1080;
  gridSize.value = 20;
  showGrid.value = true;
  enableSnap.value = true;
  canvasBackgroundColor.value = "#f5f5f5";
  canvasBackgroundImage.value = "";

  isSaved.value = false;
};

/**
 * 处理图片上传并创建组件
 */
export const handleImageUpload = async (
  event: Event,
  projectInfo: any,
  loading: Ref<boolean>,
  addComponentToCanvas: (component: any) => void,
  position?: { x: number; y: number }
) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // 验证文件类型
  if (!file.type.startsWith("image/")) {
    ElMessage.error("请选择图片文件");
    return;
  }

  // 验证文件大小（10MB）
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error("图片大小不能超过10MB");
    return;
  }

  // 如果项目未保存，先保存项目
  if (!projectInfo.value.SnowId) {
    ElMessage.warning("请先保存项目后再上传资源");
    return;
  }

  try {
    loading.value = true;

    // 上传到服务器
    const response = await scadaApi.project.uploadResource(
      file,
      Number(projectInfo.value.SnowId),
      "image"
    );

    if (response.success) {
      const resourceData = response.data;

      // 创建图片元素获取尺寸
      const img = new Image();
      img.onload = () => {
        // 计算显示尺寸
        const maxSize = 300;
        let displayWidth = img.width;
        let displayHeight = img.height;

        if (displayWidth > maxSize || displayHeight > maxSize) {
          const ratio = Math.min(maxSize / displayWidth, maxSize / displayHeight);
          displayWidth = Math.round(displayWidth * ratio);
          displayHeight = Math.round(displayHeight * ratio);
        }

        // 创建图片组件
        const imageComponent = {
          id: `image_${Date.now()}`,
          type: "image",
          name: resourceData.fileName,
          position: position || { x: 100, y: 100 },
          size: { width: displayWidth, height: displayHeight },
          properties: {
            src: resourceData.url, // 使用服务器返回的URL
            alt: resourceData.fileName,
            objectFit: "contain"
          },
          imageData: {
            fileName: resourceData.fileName,
            filePath: resourceData.filePath,
            url: resourceData.url,
            size: resourceData.size,
            originalWidth: img.width,
            originalHeight: img.height
          }
        };

        addComponentToCanvas(imageComponent);
        ElMessage.success("图片上传成功");
      };

      img.onerror = () => {
        ElMessage.error("图片加载失败");
      };

      // 设置图片源（使用服务器URL）
      img.src = resourceData.url;
    } else {
      ElMessage.error(response.message || "上传失败");
    }
  } catch (error) {
    ElMessage.error("上传失败: " + (error as Error).message);
  } finally {
    loading.value = false;
  }
};

/**
 * 处理视频上传并创建组件
 */
export const handleVideoUpload = async (
  event: Event,
  projectInfo: any,
  loading: Ref<boolean>,
  addComponentToCanvas: (component: any) => void,
  position?: { x: number; y: number }
) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // 验证文件类型
  if (!file.type.startsWith("video/")) {
    ElMessage.error("请选择视频文件");
    return;
  }

  // 验证文件大小（100MB）
  if (file.size > 100 * 1024 * 1024) {
    ElMessage.error("视频大小不能超过100MB");
    return;
  }

  if (!projectInfo.value.SnowId) {
    ElMessage.warning("请先保存项目后再上传资源");
    return;
  }

  try {
    loading.value = true;

    const response = await scadaApi.project.uploadResource(
      file,
      Number(projectInfo.value.SnowId),
      "video"
    );

    if (response.success) {
      const resourceData = response.data;

      // 创建视频组件
      const videoComponent = {
        id: `video_${Date.now()}`,
        type: "video",
        name: resourceData.fileName,
        position: position || { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        properties: {
          src: resourceData.url,
          autoplay: false,
          loop: false,
          controls: true,
          muted: false
        },
        videoData: {
          fileName: resourceData.fileName,
          filePath: resourceData.filePath,
          url: resourceData.url,
          size: resourceData.size
        }
      };

      addComponentToCanvas(videoComponent);
      ElMessage.success("视频上传成功");
    } else {
      ElMessage.error(response.message || "上传失败");
    }
  } catch (error) {
    ElMessage.error("上传失败: " + (error as Error).message);
  } finally {
    loading.value = false;
  }
};

/**
 * 处理SVG上传
 */
export const handleSvgUpload = async (
  event: Event,
  projectInfo: any,
  loading: Ref<boolean>
) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // 验证文件类型
  if (!file.name.toLowerCase().endsWith(".svg")) {
    ElMessage.error("请选择SVG文件");
    return;
  }

  // 验证文件大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("SVG文件大小不能超过5MB");
    return;
  }

  if (!projectInfo.value.SnowId) {
    ElMessage.warning("请先保存项目后再上传资源");
    return;
  }

  try {
    loading.value = true;

    const response = await scadaApi.project.uploadResource(
      file,
      Number(projectInfo.value.SnowId),
      "svg"
    );

    if (response.success) {
      ElMessage.success(`SVG上传成功：${response.data.fileName}`);
      // SVG上传后可以在组件库中使用
    } else {
      ElMessage.error(response.message || "上传失败");
    }
  } catch (error) {
    ElMessage.error("上传失败: " + (error as Error).message);
  } finally {
    loading.value = false;
  }
};

/**
 * 导出项目为.fuxa文件
 */
export const handleExportProject = (projectInfo: any) => {
  if (!projectInfo.value.SnowId) {
    ElMessage.warning("请先保存项目");
    return;
  }

  // 直接下载文件
  const url = scadaApi.project.exportProject(projectInfo.value.SnowId);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectInfo.value.Name}_${Date.now()}.fuxa`;
  link.click();

  ElMessage.success("项目导出中...");
};

/**
 * 导入.fuxa项目文件
 */
export const handleImportProject = (loading: Ref<boolean>, router: Router) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".fuxa,.zip";

  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      loading.value = true;

      // 确认导入
      await ElMessageBox.confirm(
        `确定要导入项目"${file.name}"吗？当前项目数据将被清空。`,
        "导入项目",
        { type: "warning" }
      );

      // 调用API导入
      const response = await scadaApi.project.importProject(file);

      if (response.success) {
        ElMessage.success("导入成功，正在加载项目...");

        // 跳转到新导入的项目
        router.push({
          name: "ScadaEditor",
          params: { id: response.data.id }
        });

        // 重新加载页面
        window.location.reload();
      } else {
        ElMessage.error(response.message || "导入失败");
      }
    } catch (error: any) {
      if (error !== "cancel") {
        ElMessage.error("导入失败: " + error.message);
      }
    } finally {
      loading.value = false;
    }
  };

  input.click();
};

/**
 * 创建自动保存配置
 */
export const createAutoSaveConfig = () => {
  return reactive({
    enabled: true,
    interval: 5 * 60 * 1000, // 5分钟
    timerId: null as number | null
  });
};

/**
 * 启动自动保存
 */
export const startAutoSave = (
  autoSaveConfig: any,
  isSaved: Ref<boolean>,
  projectInfo: any,
  saveProjectFn: () => void
) => {
  if (!autoSaveConfig.enabled) return;

  // 清除旧定时器
  if (autoSaveConfig.timerId) {
    clearInterval(autoSaveConfig.timerId);
  }

  // 启动新定时器
  autoSaveConfig.timerId = setInterval(() => {
    // 只有在有未保存的修改且项目已有ID时才自动保存
    if (!isSaved.value && projectInfo.value.SnowId) {
      console.log("自动保存中...");
      saveProjectFn();
    }
  }, autoSaveConfig.interval) as unknown as number;
};

/**
 * 停止自动保存
 */
export const stopAutoSave = (autoSaveConfig: any) => {
  if (autoSaveConfig.timerId) {
    clearInterval(autoSaveConfig.timerId);
    autoSaveConfig.timerId = null;
  }
};

/**
 * 监听离开页面前提示
 */
export const handleBeforeUnload = (isSaved: Ref<boolean>) => {
  return (event: BeforeUnloadEvent) => {
    if (!isSaved.value) {
      event.preventDefault();
      event.returnValue = "当前项目有未保存的修改，确定要离开吗？";
      return event.returnValue;
    }
  };
};
