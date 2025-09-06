# ClipMark - Markdown Web Clipper

<div align="center">

![ClipMark Logo](src/icons/appicon-128x128.png)

**🚀 强大的网页剪藏工具，轻松将网页内容转换为Markdown格式**

[![Version](https://img.shields.io/badge/version-3.7.0-blue.svg)](https://github.com/tangjie502/clipmark-extension)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-orange.svg)](https://chromewebstore.google.com/detail/marksnip-markdown-web-cli/kcbaglhfgbkjdnpeokaamjjkddempipm?hl=en)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)

[✨ 特性](#-特性) • [📱 安装](#-安装) • [📖 使用指南](#-使用指南) • [🔧 开发](#-开发) • [🤝 贡献](#-贡献)

</div>

---

## 📄 项目简介

**ClipMark** 是一个功能强大的浏览器扩展，专为将网页内容转换为干净、格式化的Markdown而设计。基于优秀的 [MarkDownload](https://github.com/deathau/markdownload/) 扩展升级而来，已完全适配 **Manifest V3** 规范，符合Chrome扩展商店最新要求。

### 🎯 为什么选择 ClipMark？

- **🧠 为开发者优化**：完美支持代码块、API文档、技术规范
- **⚡ 高效批量处理**：一键转换多个网页
- **🎨 智能格式化**：自动识别表格、列表、代码
- **🔗 链接选择模式**：精准选择页面链接批量转换
- **🌙 现代化界面**：支持暗色模式，用户体验极佳

---

## ✨ 特性

### 🔥 核心功能
- **🧹 智能内容提取** - 使用Mozilla Readability.js技术
- **📝 精准Markdown转换** - 基于Turndown引擎
- **📊 表格格式化** - 可自定义的表格样式
- **💻 代码块处理** - 自动语言检测和语法高亮
- **🖼️ 图片管理** - 自动下载和路径管理
- **📑 批量处理** - 支持多URL同时转换

### 🎛️ 高级功能
- **🔗 链接选择模式** - 可视化选择页面链接进行批量转换
- **🌐 全选/取消全选** - 快速选择页面所有链接
- **📋 Obsidian集成** - 直接导入到Obsidian笔记
- **🎨 自定义模板** - 支持前后模板配置
- **⌨️ 快捷键支持** - 高效操作体验
- **🌙 暗色模式** - 护眼界面设计

### 🛠️ 技术特性
- **📱 Manifest V3** - 符合最新扩展标准
- **🔒 安全权限** - 最小权限原则
- **⚡ 高性能** - 优化的后台处理
- **🌍 多浏览器支持** - Chrome/Edge/Firefox/Safari

---


## 📦 手动安装

1. **下载源码**
   ```bash
   git clone https://github.com/tangjie502/clipmark-extension.git
   cd clipmark-extension
   ```

2. **加载扩展**
   - 打开Chrome扩展管理页面 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `src` 目录

---

## 📖 使用指南

### 🚀 快速开始

#### 1. 基础剪藏
1. 点击工具栏中的ClipMark图标 📎
2. 选择剪藏整页或选中文本
3. 在预览界面编辑Markdown内容
4. 点击"下载"保存为.md文件

#### 2. 批量处理
1. 点击批量模式图标 📑
2. 输入多个URL（每行一个）
3. 点击"全部转换"
4. 所有页面将自动转换并合并下载

#### 3. 链接选择模式
1. 在任意网页右键选择"选择页面链接进行批量转换"
2. 页面进入选择模式，链接变为可选择状态
3. 使用"全选"/"取消全选"快速操作
4. 点击"完成选择"开始批量转换

### ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt+Shift+M` | 打开ClipMark弹窗 |
| `Alt+Shift+D` | 下载当前页面为Markdown |
| `Alt+Shift+C` | 复制当前页面为Markdown |
| `Alt+Shift+L` | 复制当前页面URL为Markdown链接 |

### 🎯 右键菜单功能

#### 页面操作
- **下载标签页为Markdown** - 保存当前页面
- **下载所有标签页为Markdown** - 批量保存所有打开的标签页
- **选择页面链接进行批量转换** - 进入链接选择模式

#### 内容操作
- **下载选中内容为Markdown** - 保存选中的文本
- **复制选中内容为Markdown** - 复制到剪贴板
- **复制链接为Markdown** - 转换链接格式
- **复制图片为Markdown** - 转换图片引用

#### Obsidian集成
- **发送选中文本到Obsidian** - 直接导入选中内容
- **发送标签页到Obsidian** - 导入整个页面

---

## 🛠️ 配置选项

### 📋 模板设置
- **标题模板** - 自定义文件名格式
- **前置模板** - 添加文档头部信息
- **后置模板** - 添加文档尾部信息

### 📊 表格格式化
- **去除链接** - 清理表格中的超链接
- **去除格式** - 移除粗体、斜体等格式
- **美化打印** - 对齐表格列
- **居中文本** - 表格内容居中对齐

### 🖼️ 图片处理
- **下载图片** - 保存图片到本地
- **图片引用样式** - 多种引用格式可选
- **文件夹组织** - 自定义图片存储路径
- **Base64转换** - 将图片转换为内嵌格式

### 🔗 Obsidian集成
1. 安装 [Advanced Obsidian URI](https://vinzent03.github.io/obsidian-advanced-uri/) 插件
2. 在ClipMark设置中配置vault和文件夹
3. 使用右键菜单直接发送到Obsidian

---

## 💼 使用场景

### 👨‍💻 开发者
- **📚 API文档归档** - 保存接口文档供离线查阅或LLM辅助
- **💡 代码示例收集** - 保持语法高亮的代码片段
- **🏗️ 技术方案整理** - 构建个人技术知识库
- **📖 GitHub文档备份** - 归档README和技术文档
- **🔍 问题解决方案** - 保存Stack Overflow答案

### 🎓 学者研究
- **📄 学术论文收集** - 整理引用文献
- **🧪 方法论归档** - 保存研究方法和数据表格
- **📊 研究数据整理** - 格式化的数据和图表
- **📚 文献综述** - 构建文献收藏集
- **🎤 会议资料** - 导出会议论文和报告

### ✍️ 内容创作
- **📖 参考资料管理** - 保存创作素材和灵感
- **🎨 品牌指南收集** - 归档设计规范和风格指南
- **📝 作品集整理** - 备份发表文章用于作品展示
- **🖼️ 创意素材库** - 保存图片和创意内容
- **📋 内容策划** - 从多源头整理内容大纲

---

## 🔧 开发

### 📋 项目架构

```
ClipMark/
├── 📄 manifest.json          # 扩展配置文件
├── 🔧 service-worker.js      # 后台服务工作器
├── 📁 popup/                 # 弹窗界面
│   ├── popup.html           # 界面结构
│   ├── popup.js             # 交互逻辑
│   └── popup.css            # 样式文件
├── 📁 options/               # 设置页面
├── 📁 contentScript/         # 内容脚本
├── 📁 preview/               # 预览页面
├── 📁 offscreen/             # 离屏文档处理
├── 📁 background/            # 第三方库
│   ├── Readability.js       # Mozilla内容提取
│   ├── turndown.js          # HTML转Markdown
│   └── ...                  # 其他依赖库
├── 📁 shared/                # 共享配置
└── 📁 icons/                 # 图标资源
```

### 🛠️ 开发环境设置

1. **克隆仓库**
   ```bash
   git clone https://github.com/tangjie502/clipmark-extension.git
   cd clipmark-extension
   ```

2. **安装依赖**
   ```bash
   cd src
   npm install
   ```

3. **加载开发版本**
   - Chrome: `chrome://extensions/` → 开发者模式 → 加载已解压的扩展程序
   - Firefox: `about:debugging` → 此Firefox → 加载临时附加组件
   - 选择项目的 `src` 目录

4. **开发调试**
   - 修改代码后点击扩展管理页面的"重新加载"
   - 使用浏览器开发者工具调试

### 🔍 核心技术栈

- **📋 Manifest V3** - 现代扩展架构
- **🧠 Readability.js** - Mozilla内容提取引擎
- **🔄 Turndown.js** - HTML到Markdown转换
- **✨ CodeMirror** - 代码编辑器
- **🎨 Highlight.js** - 语法高亮
- **⚡ Service Worker** - 后台处理

---

## 🤝 贡献

我们欢迎所有形式的贡献！


### 💡 功能建议
- 在Issues中提出新功能建议
- 说明使用场景和预期效果

### 🔧 代码贡献
1. Fork项目仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建Pull Request

### 📋 开发规范
- 遵循现有代码风格
- 添加适当的注释和文档
- 确保兼容性测试通过

---

## 📚 外部依赖

ClipMark基于以下优秀的开源项目：

| 项目 | 用途 | 许可证 |
|------|------|--------|
| [Readability.js](https://github.com/mozilla/readability) | 内容提取 | Apache-2.0 |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML转Markdown | MIT |
| [CodeMirror](https://codemirror.net/) | 编辑器 | MIT |
| [Highlight.js](https://highlightjs.org/) | 语法高亮 | BSD-3-Clause |

---

## 🙏 致谢

- **[MarkDownload](https://github.com/deathau/markdownload/)** - 原始项目基础
- **[deathau](https://github.com/deathau)** - 原作者的精彩工作
- **Mozilla团队** - Readability.js技术支持
- **所有开源贡献者** - 让这个项目成为可能

---

## 📄 许可证

本项目采用 [GPL-3.0 许可证](LICENSE)。


---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个Star！⭐**

[![Stars](https://img.shields.io/github/stars/tangjie502/clipmark-extension?style=social)](https://github.com/tangjie502/clipmark-extension/stargazers)
[![Forks](https://img.shields.io/github/forks/tangjie502/clipmark-extension?style=social)](https://github.com/tangjie502/clipmark-extension/network/members)

**让知识收集更简单，让创作更高效！**

</div>

---

<div align="center">
<sub>由 💖 和 ☕ 驱动开发</sub>
</div>