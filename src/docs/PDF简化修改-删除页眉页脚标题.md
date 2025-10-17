# PDF简化修改 - 删除页眉、页脚、图表标题

## 🎯 修改目标

根据用户要求，删除PDF中的以下元素：
1. **页眉** - 删除新页面的页眉信息
2. **图表标题** - 删除每个图表上方的标题文字
3. **页码（居中）** - 删除页面底部的页码信息
4. **导出时间（右侧）** - 删除页面底部的导出时间

## 🔧 修改内容

### 1. unitOverviewReport 修改

#### 删除页眉和图表标题
**修改位置：** `src/views/reportForms/unitOverviewReport/utils/hook.tsx`

**修改前：**
```typescript
// 检查是否需要新页面
if (currentPositionY > pdfHeight - 150) {
  pdf.addPage();
  currentPositionY = 30;

  // 在新页添加页眉
  pdf.setFillColor(240, 240, 240);
  pdf.rect(0, 0, pdfWidth, 15, "F");
  await addChineseText(pdf, `单位概览报表 - 详细图表`, pdfWidth / 2, 10, {
    fontSize: 10,
    align: "center",
    color: [100, 100, 100]
  });
  currentPositionY = 30;
}

// 增加图表前的间距
currentPositionY += 15;

// 图表标题
await addChineseText(pdf, chart.title, margin, currentPositionY, {
  fontSize: 16,
  color: "#2c3e50"
});
currentPositionY += 12;
```

**修改后：**
```typescript
// 检查是否需要新页面
if (currentPositionY > pdfHeight - 150) {
  pdf.addPage();
  currentPositionY = 30;
}

// 增加图表前的间距
currentPositionY += 15;
```

#### 删除页脚（页码和导出时间）
**修改前：**
```typescript
// 添加页脚
const pageCount = pdf.getNumberOfPages();
for (let i = 1; i <= pageCount; i++) {
  pdf.setPage(i);

  // 绘制页脚分隔线
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.5);
  pdf.line(margin, pdfHeight - 15, pdfWidth - margin, pdfHeight - 15);

  // 添加页码（居中）
  await addChineseText(pdf, `第 ${i} 页 / 共 ${pageCount} 页`, pdfWidth / 2, pdfHeight - 10, {
    fontSize: 9,
    align: "center",
    color: [120, 120, 120]
  });

  // 添加导出时间（右侧）
  await addChineseText(pdf, `导出时间：${dayjs().format("YYYY-MM-DD HH:mm")}`, pdfWidth - margin, pdfHeight - 10, {
    fontSize: 8,
    align: "right",
    color: [150, 150, 150]
  });

  // 添加报表名称（左侧）
  await addChineseText(pdf, "单位概览报表", margin, pdfHeight - 10, {
    fontSize: 8,
    align: "left",
    color: [150, 150, 150]
  });
}
```

**修改后：**
```typescript
// 页脚已删除
```

### 2. newEnergyReport 修改

#### 删除图表标题
**修改位置：** `src/views/reportForms/newEnergyReport/utils/hook.tsx`

**修改前：**
```typescript
// 增加图表前的间距
currentPositionY += 15;

// 图表标题 - 使用更好的样式
await addChineseText(pdf, chart.title, margin, currentPositionY, {
  fontSize: 16,
  color: "#2c3e50"
});
currentPositionY += 12; // 增加标题后的间距
```

**修改后：**
```typescript
// 增加图表前的间距
currentPositionY += 15;
```

#### 删除页脚
**修改前：**
```typescript
// 添加页脚
await addChineseText(pdf2, `导出日期: ${dayjs().format("YYYY-MM-DD")}`, pageWidth / 2, pageHeight - 10, {
  fontSize: 8,
  align: "center",
  color: [100, 100, 100]
});
```

**修改后：**
```typescript
// 页脚已删除
```

## 📊 修改效果对比

### 修改前 vs 修改后

| 元素 | 修改前 | 修改后 |
|------|--------|--------|
| **页眉** | ✅ 显示"单位概览报表 - 详细图表" | ❌ 已删除 |
| **图表标题** | ✅ 显示图表名称（如"月总电量"） | ❌ 已删除 |
| **页码** | ✅ 显示"第 X 页 / 共 Y 页" | ❌ 已删除 |
| **导出时间** | ✅ 显示"导出时间：YYYY-MM-DD HH:mm" | ❌ 已删除 |
| **页脚分隔线** | ✅ 显示灰色分隔线 | ❌ 已删除 |
| **报表名称** | ✅ 显示"单位概览报表" | ❌ 已删除 |

### 视觉效果变化

#### 优点
- ✅ **更简洁的布局**：去除了多余的文字信息
- ✅ **更大的内容空间**：图表和表格有更多显示空间
- ✅ **更专注的内容**：用户注意力集中在数据本身
- ✅ **更干净的外观**：减少了视觉干扰元素

#### 注意事项
- ⚠️ **无页码信息**：多页PDF时用户无法知道当前页数
- ⚠️ **无导出时间**：无法知道PDF的生成时间
- ⚠️ **无图表标识**：需要通过图表内容判断图表类型

## 🎯 适用场景

### 适合使用简化版的场景
- **内部使用**：团队内部查看数据，不需要正式格式
- **快速预览**：临时查看数据趋势和概况
- **打印输出**：减少墨水使用，更环保
- **移动设备**：在小屏幕上查看时更清晰

### 可能需要完整版的场景
- **正式报告**：需要提交给上级或客户的正式文档
- **存档备份**：需要记录生成时间的历史数据
- **多页文档**：需要页码导航的长文档
- **外部分享**：需要完整信息的对外文档

## 🔄 如何恢复完整版

如果需要恢复页眉、页脚、图表标题等元素，可以：

### 方法1：代码回滚
```bash
# 使用git恢复到修改前的版本
git checkout HEAD~1 -- src/views/reportForms/unitOverviewReport/utils/hook.tsx
git checkout HEAD~1 -- src/views/reportForms/newEnergyReport/utils/hook.tsx
```

### 方法2：手动添加
重新添加被删除的代码段：
- 页眉：在新页面添加时恢复页眉绘制代码
- 图表标题：在图表渲染前恢复标题添加代码
- 页脚：在PDF保存前恢复页脚循环代码

### 方法3：配置选项
可以添加配置参数来控制是否显示这些元素：
```typescript
const pdfOptions = {
  showHeader: false,    // 是否显示页眉
  showTitle: false,     // 是否显示图表标题
  showFooter: false,    // 是否显示页脚
  showPageNumber: false // 是否显示页码
};
```

## 📝 使用说明

### 当前状态
- **unitOverviewReport**：已删除页眉、图表标题、页脚
- **newEnergyReport**：已删除图表标题、页脚

### 生成的PDF特点
1. **纯内容展示**：只包含图表和表格数据
2. **无额外信息**：没有页码、时间、标题等元素
3. **简洁布局**：更多空间用于数据展示
4. **快速浏览**：减少视觉干扰，专注数据内容

### 文件命名
PDF文件名仍然包含时间信息：
- `单位概览报表_YYYY-MM.pdf`
- `光伏发电数据报表_YYYYMMDD_简化版.pdf`

## 🎉 总结

通过删除页眉、图表标题、页码和导出时间，PDF报表变得更加：

- ✅ **简洁明了**：去除冗余信息，突出核心数据
- ✅ **空间利用**：更多空间用于图表和表格显示
- ✅ **视觉清爽**：减少文字干扰，提升阅读体验
- ✅ **打印友好**：减少墨水使用，更适合打印

现在的PDF专注于数据展示，为用户提供更纯粹的数据查看体验！🚀

---

**修改状态**：✅ 已完成  
**影响范围**：unitOverviewReport + newEnergyReport  
**视觉效果**：🎨 简洁化
