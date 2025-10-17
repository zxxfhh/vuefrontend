<template>
  <div class="data-binding-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <h4>数据绑定管理</h4>
      <el-button-group size="small">
        <el-button @click="activeTab = 'dataSources'">数据源</el-button>
        <el-button @click="activeTab = 'dataSets'">数据集</el-button>
        <el-button @click="activeTab = 'bindings'">组件绑定</el-button>
      </el-button-group>
    </div>

    <!-- 数据源管理 -->
    <div v-if="activeTab === 'dataSources'" class="tab-content">
      <div class="section-header">
        <span>数据源列表</span>
        <el-button
          type="primary"
          size="small"
          @click="showDataSourceDialog = true"
        >
          <el-icon><Plus /></el-icon>
          添加数据源
        </el-button>
      </div>

      <div class="data-sources-list">
        <div
          v-for="dataSource in dataSources"
          :key="dataSource.id"
          class="data-source-item"
        >
          <div class="source-info">
            <div class="source-name">{{ dataSource.name }}</div>
            <div class="source-type">
              {{ getDataSourceTypeName(dataSource.type) }}
            </div>
            <div class="source-status" :class="`status-${dataSource.status}`">
              {{ getStatusText(dataSource.status) }}
            </div>
          </div>
          <div class="source-actions">
            <el-button size="small" @click="editDataSource(dataSource)"
              >编辑</el-button
            >
            <el-button
              size="small"
              :type="dataSource.status === 'connected' ? 'warning' : 'success'"
              @click="toggleDataSourceConnection(dataSource.id)"
            >
              {{ dataSource.status === "connected" ? "断开" : "连接" }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="removeDataSource(dataSource.id)"
              >删除</el-button
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 数据集管理 -->
    <div v-if="activeTab === 'dataSets'" class="tab-content">
      <div class="section-header">
        <span>数据集列表</span>
        <el-button
          type="primary"
          size="small"
          @click="showDataSetDialog = true"
        >
          <el-icon><Plus /></el-icon>
          添加数据集
        </el-button>
      </div>

      <div class="data-sets-list">
        <div
          v-for="dataSet in dataSets"
          :key="dataSet.id"
          class="data-set-item"
        >
          <div class="set-info">
            <div class="set-name">{{ dataSet.name }}</div>
            <div class="set-description">{{ dataSet.description }}</div>
            <div class="set-status">
              <el-tag :type="dataSet.isActive ? 'success' : 'info'">
                {{ dataSet.isActive ? "运行中" : "未激活" }}
              </el-tag>
              <span class="refresh-interval"
                >{{ dataSet.refreshInterval }}ms</span
              >
            </div>
          </div>
          <div class="set-actions">
            <el-button size="small" @click="editDataSet(dataSet)"
              >编辑</el-button
            >
            <el-button
              size="small"
              :type="dataSet.isActive ? 'warning' : 'success'"
              @click="toggleDataSetStatus(dataSet.id)"
            >
              {{ dataSet.isActive ? "停用" : "激活" }}
            </el-button>
            <el-button size="small" @click="previewDataSet(dataSet)"
              >预览</el-button
            >
            <el-button
              size="small"
              type="danger"
              @click="removeDataSet(dataSet.id)"
              >删除</el-button
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 组件绑定管理 -->
    <div v-if="activeTab === 'bindings'" class="tab-content">
      <div class="section-header">
        <span>组件绑定</span>
        <el-button
          type="primary"
          size="small"
          @click="showBindingDialog = true"
        >
          <el-icon><Plus /></el-icon>
          添加绑定
        </el-button>
      </div>

      <div class="component-bindings-list">
        <div
          v-for="binding in componentBindings"
          :key="binding.componentId"
          class="binding-item"
        >
          <div class="binding-info">
            <div class="component-name">
              组件: {{ getComponentName(binding.componentId) }}
            </div>
            <div class="bindings-count">
              绑定数量: {{ binding.bindings.length }}
            </div>
          </div>
          <div class="binding-actions">
            <el-button size="small" @click="editComponentBinding(binding)"
              >编辑</el-button
            >
            <el-button size="small" @click="testBinding(binding.componentId)"
              >测试</el-button
            >
            <el-button
              size="small"
              type="danger"
              @click="removeComponentBinding(binding.componentId)"
              >删除</el-button
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 数据源配置对话框 -->
    <el-dialog
      v-model="showDataSourceDialog"
      title="数据源配置"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="dataSourceForm" label-width="100px" size="small">
        <el-form-item label="数据源名称" required>
          <el-input
            v-model="dataSourceForm.name"
            placeholder="请输入数据源名称"
          />
        </el-form-item>

        <el-form-item label="数据源类型" required>
          <el-select
            v-model="dataSourceForm.type"
            @change="onDataSourceTypeChange"
          >
            <el-option label="静态数据" value="static" />
            <el-option label="REST API" value="api" />
            <el-option label="MQTT" value="mqtt" />
            <el-option label="WebSocket" value="websocket" />
            <el-option label="数据库" value="database" />
          </el-select>
        </el-form-item>

        <!-- 静态数据配置 -->
        <template v-if="dataSourceForm.type === 'static'">
          <el-form-item label="静态数据">
            <el-input
              v-model="dataSourceForm.staticDataJson"
              type="textarea"
              :rows="8"
              placeholder="请输入JSON格式的静态数据"
            />
          </el-form-item>
        </template>

        <!-- API配置 -->
        <template v-if="dataSourceForm.type === 'api'">
          <el-form-item label="API地址" required>
            <el-input
              v-model="dataSourceForm.apiUrl"
              placeholder="https://api.example.com"
            />
          </el-form-item>
          <el-form-item label="认证类型">
            <el-select v-model="dataSourceForm.authType">
              <el-option label="无认证" value="" />
              <el-option label="Bearer Token" value="bearer" />
              <el-option label="Basic Auth" value="basic" />
              <el-option label="API Key" value="apikey" />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="dataSourceForm.authType === 'bearer'"
            label="Token"
          >
            <el-input v-model="dataSourceForm.token" type="password" />
          </el-form-item>
          <el-form-item
            v-if="dataSourceForm.authType === 'basic'"
            label="用户名"
          >
            <el-input v-model="dataSourceForm.username" />
          </el-form-item>
          <el-form-item v-if="dataSourceForm.authType === 'basic'" label="密码">
            <el-input v-model="dataSourceForm.password" type="password" />
          </el-form-item>
          <el-form-item
            v-if="dataSourceForm.authType === 'apikey'"
            label="API Key"
          >
            <el-input v-model="dataSourceForm.apiKey" type="password" />
          </el-form-item>
        </template>

        <!-- MQTT配置 -->
        <template v-if="dataSourceForm.type === 'mqtt'">
          <el-form-item label="MQTT Broker" required>
            <el-input
              v-model="dataSourceForm.mqttBroker"
              placeholder="mqtt://localhost:1883"
            />
          </el-form-item>
          <el-form-item label="用户名">
            <el-input v-model="dataSourceForm.mqttUsername" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="dataSourceForm.mqttPassword" type="password" />
          </el-form-item>
          <el-form-item label="主题列表">
            <el-input
              v-model="dataSourceForm.mqttTopics"
              placeholder="topic1,topic2,topic3"
            />
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDataSourceDialog = false">取消</el-button>
          <el-button type="primary" @click="saveDataSource">保存</el-button>
          <el-button type="success" @click="testDataSourceConnection"
            >测试连接</el-button
          >
        </div>
      </template>
    </el-dialog>

    <!-- 数据集配置对话框 -->
    <el-dialog
      v-model="showDataSetDialog"
      title="数据集配置"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="dataSetForm" label-width="100px" size="small">
        <el-form-item label="数据集名称" required>
          <el-input v-model="dataSetForm.name" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="dataSetForm.description"
            type="textarea"
            :rows="2"
          />
        </el-form-item>

        <el-form-item label="数据源" required>
          <el-select
            v-model="dataSetForm.dataSourceId"
            placeholder="选择数据源"
          >
            <el-option
              v-for="ds in dataSources.filter(ds => ds.status === 'connected')"
              :key="ds.id"
              :label="ds.name"
              :value="ds.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="查询路径">
          <el-input
            v-model="dataSetForm.query"
            placeholder="API路径或SQL查询"
          />
        </el-form-item>

        <el-form-item label="刷新间隔">
          <el-input-number
            v-model="dataSetForm.refreshInterval"
            :min="1000"
            :step="1000"
            controls-position="right"
          />
          <span class="unit">毫秒</span>
        </el-form-item>

        <el-form-item label="数据转换脚本">
          <el-input
            v-model="dataSetForm.transformScript"
            type="textarea"
            :rows="6"
            placeholder="// JavaScript转换脚本，例如：&#10;return data.map(item => ({&#10;  ...item,&#10;  temperature: item.temp * 1.8 + 32&#10;}));"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDataSetDialog = false">取消</el-button>
          <el-button type="primary" @click="saveDataSet">保存</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 组件绑定配置对话框 -->
    <el-dialog
      v-model="showBindingDialog"
      title="组件绑定配置"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="bindingForm" label-width="100px" size="small">
        <el-form-item label="选择组件" required>
          <el-select
            v-model="bindingForm.componentId"
            placeholder="选择要绑定的组件"
          >
            <el-option
              v-for="comp in availableComponents"
              :key="comp.id"
              :label="`${comp.name} (${comp.type})`"
              :value="comp.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 绑定列表 -->
      <div class="bindings-config">
        <div class="section-title">属性绑定配置</div>

        <div
          v-for="(binding, index) in bindingForm.bindings"
          :key="index"
          class="binding-config-item"
        >
          <el-card shadow="never">
            <div class="binding-item-header">
              <span>绑定 {{ index + 1 }}</span>
              <el-button
                size="small"
                type="danger"
                @click="removeBinding(index)"
                >删除</el-button
              >
            </div>

            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="组件属性">
                  <el-select v-model="binding.property" placeholder="选择属性">
                    <el-option label="可见性" value="visible" />
                    <el-option label="文本内容" value="text" />
                    <el-option label="背景色" value="backgroundColor" />
                    <el-option label="文字颜色" value="color" />
                    <el-option label="透明度" value="opacity" />
                    <el-option label="数值" value="value" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="数据集">
                  <el-select
                    v-model="binding.datasetId"
                    placeholder="选择数据集"
                  >
                    <el-option
                      v-for="ds in dataSets.filter(ds => ds.isActive)"
                      :key="ds.id"
                      :label="ds.name"
                      :value="ds.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="数据字段">
                  <el-input
                    v-model="binding.fieldName"
                    placeholder="字段名，如：temperature"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="绑定类型">
                  <el-select v-model="binding.bindingType">
                    <el-option label="直接绑定" value="direct" />
                    <el-option label="表达式" value="expression" />
                    <el-option label="脚本" value="script" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="格式化">
                  <el-input
                    v-model="binding.format"
                    placeholder=".2f 或 #,##0.00"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="8">
                <el-form-item label="更新触发">
                  <el-select v-model="binding.updateTrigger">
                    <el-option label="总是更新" value="always" />
                    <el-option label="值改变时" value="changed" />
                    <el-option label="手动更新" value="manual" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item
              v-if="binding.bindingType === 'expression'"
              label="表达式"
            >
              <el-input
                v-model="binding.expression"
                placeholder="value > 100 ? 'red' : 'green'"
              />
            </el-form-item>

            <el-form-item
              v-if="binding.bindingType === 'script'"
              label="脚本代码"
            >
              <el-input
                v-model="binding.script"
                type="textarea"
                :rows="4"
                placeholder="// JavaScript代码&#10;if (value > 100) {&#10;  return 'red';&#10;} else {&#10;  return 'green';&#10;}"
              />
            </el-form-item>
          </el-card>
        </div>

        <el-button style="width: 100%; margin-top: 10px" @click="addBinding">
          <el-icon><Plus /></el-icon>
          添加绑定
        </el-button>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showBindingDialog = false">取消</el-button>
          <el-button type="primary" @click="saveComponentBinding"
            >保存绑定</el-button
          >
        </div>
      </template>
    </el-dialog>

    <!-- 数据预览对话框 -->
    <el-dialog v-model="showDataPreview" title="数据预览" width="600px">
      <div class="data-preview">
        <pre>{{ JSON.stringify(previewData, null, 2) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import {
  dataBindingManager,
  type DataSource,
  type DataSet,
  type ComponentBinding,
  type PropertyBinding
} from "../core/DataBindingManager";

// 响应式数据
const activeTab = ref("dataSources");
const dataSources = computed(() => dataBindingManager.dataSources.value);
const dataSets = computed(() => dataBindingManager.dataSets.value);
const componentBindings = computed(
  () => dataBindingManager.componentBindings.value
);

// 对话框显示状态
const showDataSourceDialog = ref(false);
const showDataSetDialog = ref(false);
const showBindingDialog = ref(false);
const showDataPreview = ref(false);

// 表单数据
const dataSourceForm = ref({
  id: "",
  name: "",
  type: "static",
  // 静态数据
  staticDataJson: "",
  // API配置
  apiUrl: "",
  authType: "",
  token: "",
  username: "",
  password: "",
  apiKey: "",
  // MQTT配置
  mqttBroker: "",
  mqttUsername: "",
  mqttPassword: "",
  mqttTopics: ""
});

const dataSetForm = ref({
  id: "",
  name: "",
  description: "",
  dataSourceId: "",
  query: "",
  refreshInterval: 5000,
  transformScript: ""
});

const bindingForm = ref({
  componentId: "",
  bindings: [] as PropertyBinding[]
});

const previewData = ref(null);

// 可用组件列表（需要从项目数据获取）
const availableComponents = ref([]);

// 获取数据源类型名称
const getDataSourceTypeName = (type: string) => {
  const names = {
    static: "静态数据",
    api: "REST API",
    mqtt: "MQTT",
    websocket: "WebSocket",
    database: "数据库"
  };
  return names[type] || type;
};

// 获取状态文本
const getStatusText = (status: string) => {
  const texts = {
    connected: "已连接",
    disconnected: "未连接",
    connecting: "连接中",
    error: "连接错误"
  };
  return texts[status] || status;
};

// 获取组件名称
const getComponentName = (componentId: string) => {
  // 这里需要从项目数据中查找组件名称
  return componentId;
};

// 数据源类型变化
const onDataSourceTypeChange = () => {
  // 重置相关配置
  dataSourceForm.value.staticDataJson = "";
  dataSourceForm.value.apiUrl = "";
  dataSourceForm.value.mqttBroker = "";
};

// 编辑数据源
const editDataSource = (dataSource: DataSource) => {
  dataSourceForm.value = {
    id: dataSource.id,
    name: dataSource.name,
    type: dataSource.type,
    staticDataJson: JSON.stringify(
      dataSource.config.static?.data || [],
      null,
      2
    ),
    apiUrl: dataSource.config.api?.baseUrl || "",
    authType: dataSource.config.api?.authentication?.type || "",
    token: dataSource.config.api?.authentication?.token || "",
    username: dataSource.config.api?.authentication?.username || "",
    password: dataSource.config.api?.authentication?.password || "",
    apiKey: dataSource.config.api?.authentication?.apiKey || "",
    mqttBroker: dataSource.config.mqtt?.broker || "",
    mqttUsername: dataSource.config.mqtt?.username || "",
    mqttPassword: dataSource.config.mqtt?.password || "",
    mqttTopics: dataSource.config.mqtt?.topics?.join(",") || ""
  };
  showDataSourceDialog.value = true;
};

// 保存数据源
const saveDataSource = async () => {
  try {
    const form = dataSourceForm.value;

    // 构建配置对象
    const config: any = {};

    if (form.type === "static") {
      config.static = {
        data: JSON.parse(form.staticDataJson)
      };
    } else if (form.type === "api") {
      config.api = {
        baseUrl: form.apiUrl,
        headers: {},
        authentication: form.authType
          ? {
              type: form.authType,
              token: form.token,
              username: form.username,
              password: form.password,
              apiKey: form.apiKey
            }
          : undefined
      };
    } else if (form.type === "mqtt") {
      config.mqtt = {
        broker: form.mqttBroker,
        username: form.mqttUsername,
        password: form.mqttPassword,
        topics: form.mqttTopics.split(",").filter(t => t.trim())
      };
    }

    const dataSource = {
      id: form.id || `ds_${Date.now()}`,
      name: form.name,
      type: form.type as any,
      config,
      status: "disconnected" as any
    };

    if (form.id) {
      // 更新现有数据源
      const index = dataBindingManager.dataSources.value.findIndex(
        ds => ds.id === form.id
      );
      if (index >= 0) {
        dataBindingManager.dataSources.value[index] = dataSource;
      }
    } else {
      // 添加新数据源
      dataBindingManager.addDataSource(dataSource);
    }

    showDataSourceDialog.value = false;
    ElMessage.success("数据源保存成功");
  } catch (error) {
    ElMessage.error("数据源保存失败: " + (error as Error).message);
  }
};

// 测试数据源连接
const testDataSourceConnection = async () => {
  try {
    const form = dataSourceForm.value;
    const tempId = `test_${Date.now()}`;

    // 创建临时数据源进行测试
    const testDataSource = {
      id: tempId,
      name: form.name,
      type: form.type as any,
      config: {},
      status: "disconnected" as any
    };

    await dataBindingManager.connectDataSource(tempId);
    ElMessage.success("连接测试成功");
  } catch (error) {
    ElMessage.error("连接测试失败: " + (error as Error).message);
  }
};

// 切换数据源连接状态
const toggleDataSourceConnection = async (dataSourceId: string) => {
  const dataSource = dataSources.value.find(ds => ds.id === dataSourceId);
  if (!dataSource) return;

  if (dataSource.status === "connected") {
    dataSource.status = "disconnected";
    ElMessage.info(`数据源 "${dataSource.name}" 已断开连接`);
  } else {
    await dataBindingManager.connectDataSource(dataSourceId);
  }
};

// 删除数据源
const removeDataSource = async (dataSourceId: string) => {
  try {
    await ElMessageBox.confirm("确定要删除此数据源吗？", "确认删除", {
      type: "warning"
    });

    const index = dataBindingManager.dataSources.value.findIndex(
      ds => ds.id === dataSourceId
    );
    if (index >= 0) {
      dataBindingManager.dataSources.value.splice(index, 1);
      ElMessage.success("数据源删除成功");
    }
  } catch {
    // 用户取消删除
  }
};

// 编辑数据集
const editDataSet = (dataSet: DataSet) => {
  dataSetForm.value = {
    id: dataSet.id,
    name: dataSet.name,
    description: dataSet.description,
    dataSourceId: dataSet.dataSourceId,
    query: dataSet.query as string,
    refreshInterval: dataSet.refreshInterval,
    transformScript: dataSet.transformScript || ""
  };
  showDataSetDialog.value = true;
};

// 保存数据集
const saveDataSet = () => {
  const form = dataSetForm.value;

  const dataSet = {
    id: form.id || `dataset_${Date.now()}`,
    name: form.name,
    description: form.description,
    dataSourceId: form.dataSourceId,
    query: form.query,
    refreshInterval: form.refreshInterval,
    fields: [],
    transformScript: form.transformScript
  };

  if (form.id) {
    // 更新现有数据集
    const index = dataBindingManager.dataSets.value.findIndex(
      ds => ds.id === form.id
    );
    if (index >= 0) {
      Object.assign(dataBindingManager.dataSets.value[index], dataSet);
    }
  } else {
    // 添加新数据集
    dataBindingManager.addDataSet(dataSet);
  }

  showDataSetDialog.value = false;
  ElMessage.success("数据集保存成功");
};

// 切换数据集状态
const toggleDataSetStatus = (dataSetId: string) => {
  const dataSet = dataSets.value.find(ds => ds.id === dataSetId);
  if (!dataSet) return;

  if (dataSet.isActive) {
    dataBindingManager.deactivateDataSet(dataSetId);
  } else {
    dataBindingManager.activateDataSet(dataSetId);
  }
};

// 预览数据集
const previewDataSet = (dataSet: DataSet) => {
  previewData.value = dataSet.lastData;
  showDataPreview.value = true;
};

// 删除数据集
const removeDataSet = async (dataSetId: string) => {
  try {
    await ElMessageBox.confirm("确定要删除此数据集吗？", "确认删除", {
      type: "warning"
    });

    dataBindingManager.deactivateDataSet(dataSetId);
    const index = dataBindingManager.dataSets.value.findIndex(
      ds => ds.id === dataSetId
    );
    if (index >= 0) {
      dataBindingManager.dataSets.value.splice(index, 1);
      ElMessage.success("数据集删除成功");
    }
  } catch {
    // 用户取消删除
  }
};

// 编辑组件绑定
const editComponentBinding = (binding: ComponentBinding) => {
  bindingForm.value = {
    componentId: binding.componentId,
    bindings: [...binding.bindings]
  };
  showBindingDialog.value = true;
};

// 添加绑定
const addBinding = () => {
  bindingForm.value.bindings.push({
    property: "",
    datasetId: "",
    fieldName: "",
    bindingType: "direct",
    updateTrigger: "always"
  });
};

// 删除绑定
const removeBinding = (index: number) => {
  bindingForm.value.bindings.splice(index, 1);
};

// 保存组件绑定
const saveComponentBinding = () => {
  const form = bindingForm.value;

  if (!form.componentId) {
    ElMessage.warning("请选择组件");
    return;
  }

  dataBindingManager.bindComponent(form.componentId, form.bindings);

  showBindingDialog.value = false;
  ElMessage.success("组件绑定保存成功");
};

// 测试绑定
const testBinding = (componentId: string) => {
  // 手动触发一次绑定更新
  dataBindingManager.updateComponentBindings?.(componentId);
  ElMessage.success("绑定测试已触发");
};

// 删除组件绑定
const removeComponentBinding = async (componentId: string) => {
  try {
    await ElMessageBox.confirm("确定要删除此组件的所有绑定吗？", "确认删除", {
      type: "warning"
    });

    const index = dataBindingManager.componentBindings.value.findIndex(
      cb => cb.componentId === componentId
    );
    if (index >= 0) {
      dataBindingManager.componentBindings.value.splice(index, 1);
      ElMessage.success("组件绑定删除成功");
    }
  } catch {
    // 用户取消删除
  }
};

// 组件生命周期
onMounted(() => {
  // 初始化可用组件列表
  // 这里需要从项目数据中获取
});

onUnmounted(() => {
  // 清理资源
});
</script>

<style scoped lang="scss">
.data-binding-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;

  h4 {
    margin: 0;
    color: var(--el-text-color-primary);
  }
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  span {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

// 数据源列表样式
.data-sources-list {
  .data-source-item {
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
    background: white;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .source-info {
      flex: 1;

      .source-name {
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .source-type {
        font-size: 12px;
        color: var(--el-text-color-regular);
        margin-bottom: 4px;
      }

      .source-status {
        font-size: 12px;

        &.status-connected {
          color: var(--el-color-success);
        }

        &.status-disconnected {
          color: var(--el-color-info);
        }

        &.status-error {
          color: var(--el-color-danger);
        }

        &.status-connecting {
          color: var(--el-color-warning);
        }
      }
    }

    .source-actions {
      display: flex;
      gap: 8px;
    }
  }
}

// 数据集列表样式
.data-sets-list {
  .data-set-item {
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
    background: white;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .set-info {
      flex: 1;

      .set-name {
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .set-description {
        font-size: 12px;
        color: var(--el-text-color-regular);
        margin-bottom: 8px;
      }

      .set-status {
        display: flex;
        align-items: center;
        gap: 8px;

        .refresh-interval {
          font-size: 12px;
          color: var(--el-text-color-placeholder);
        }
      }
    }

    .set-actions {
      display: flex;
      gap: 8px;
    }
  }
}

// 组件绑定列表样式
.component-bindings-list {
  .binding-item {
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
    background: white;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .binding-info {
      flex: 1;

      .component-name {
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .bindings-count {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }

    .binding-actions {
      display: flex;
      gap: 8px;
    }
  }
}

// 绑定配置样式
.bindings-config {
  .section-title {
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--el-border-color);
  }

  .binding-config-item {
    margin-bottom: 16px;

    .binding-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      span {
        font-weight: 500;
        color: var(--el-text-color-primary);
      }
    }
  }
}

// 数据预览样式
.data-preview {
  pre {
    background: #f5f7fa;
    padding: 12px;
    border-radius: 4px;
    font-size: 12px;
    max-height: 400px;
    overflow-y: auto;
  }
}

// 表单样式
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.unit {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

:deep(.el-card .el-card__body) {
  padding: 12px;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}
</style>
