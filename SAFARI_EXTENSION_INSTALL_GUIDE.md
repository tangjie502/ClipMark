# Safari扩展安装和体验指南

## 📋 前提条件

要在Safari中体验ClipMark扩展，您需要：
- macOS 10.14 或更高版本
- Safari 14 或更高版本
- Xcode 13 或更高版本（免费）

## 🔧 步骤1：安装Xcode

### 方法1：通过Mac App Store（推荐）
1. 打开 **Mac App Store**
2. 搜索 "Xcode"
3. 点击 **获取** 并等待下载安装完成（约10-15GB）

### 方法2：通过Apple Developer网站
1. 访问 https://developer.apple.com/xcode/
2. 下载Xcode安装包
3. 双击安装

### 验证Xcode安装
```bash
# 在终端中运行，确保输出Xcode路径
xcode-select --print-path
```

如果输出类似 `/Applications/Xcode.app/Contents/Developer`，说明安装成功。

## 🔨 步骤2：构建Safari扩展

### 2.1 打开Xcode项目
1. 启动 **Xcode**
2. 选择 **Open a project or file**
3. 导航到您的项目文件夹：
   ```
   /Users/tangjie/code/jie/markdownload-extension-updated/xcode/MarkDownload - Markdown Web Clipper/
   ```
4. 选择 `MarkDownload - Markdown Web Clipper.xcodeproj` 文件

### 2.2 配置开发者账号（如需要）
1. 在Xcode中，选择项目导航器中的项目文件
2. 在 **Signing & Capabilities** 选项卡中
3. 如果没有开发者账号，选择 **Personal Team**（免费）
4. 或者登录您的Apple ID

### 2.3 构建项目
1. 在Xcode顶部，确保选择了正确的Scheme：
   - **MarkDownload - Markdown Web Clipper**
2. 目标选择：**My Mac**
3. 点击 **▶️ 播放按钮** 或按 `Cmd + R` 构建并运行

### 预期结果
- Xcode会编译项目
- 自动启动 "MarkDownload - Markdown Web Clipper" 应用
- 应用会显示扩展状态

## 🌐 步骤3：在Safari中启用扩展

### 3.1 运行主应用
当Xcode构建完成后：
1. **MarkDownload - Markdown Web Clipper** 应用会自动启动
2. 应用界面会显示当前扩展状态
3. 如果扩展未启用，会提示您去Safari设置中启用

### 3.2 在Safari中启用
1. 打开 **Safari 浏览器**
2. 在菜单栏选择 **Safari > 偏好设置...** 或按 `Cmd + ,`
3. 点击 **扩展** 选项卡
4. 在左侧列表中找到 **MarkDownload - Markdown Web Clipper Extension**
5. ✅ **勾选** 启用扩展
6. 关闭偏好设置窗口

### 3.3 验证安装
在Safari工具栏应该能看到：
- ClipMark图标（看起来像一个剪贴板/下载图标）
- 点击图标应该打开扩展弹窗

## 🚀 步骤4：体验扩展功能

### 4.1 基本使用
1. **访问任意网页**（如新闻文章、博客等）
2. **点击工具栏中的ClipMark图标**
3. 在弹窗中可以：
   - 查看提取的内容预览
   - 点击 **下载** 保存Markdown文件
   - 点击 **复制** 复制到剪贴板
   - 点击 **预览** 查看格式化效果

### 4.2 选择内容剪贴
1. **选择网页中的部分文字**
2. 点击ClipMark图标
3. 扩展会优先处理您选择的内容

### 4.3 批量链接处理
1. 在扩展弹窗中点击 **批量处理** 按钮
2. 输入多个URL（每行一个）
3. 点击 **开始处理**
4. 系统会批量转换并下载

### 4.4 使用快捷键
- `Alt + Shift + M`：打开扩展弹窗
- `Alt + Shift + D`：直接下载当前页面
- `Alt + Shift + C`：复制当前页面到剪贴板
- `Alt + Shift + L`：复制页面链接

### 4.5 右键菜单
在网页上右键，应该能看到ClipMark相关选项：
- "剪贴整个页面"
- "剪贴选择的内容"
- "复制为Markdown链接"

### 4.6 设置选项
1. 右键点击ClipMark图标
2. 选择 **扩展选项...**
3. 或在Safari偏好设置的扩展页面点击扩展名称
4. 调整：
   - 输出格式选项
   - 文件命名规则
   - 图片处理选项
   - 自定义模板等

## 🔧 故障排除

### 扩展图标不显示
1. 确保在Safari偏好设置中已启用扩展
2. 重启Safari浏览器
3. 重新构建Xcode项目

### 扩展无法下载文件
1. 检查Safari的下载权限设置
2. 在Safari偏好设置 > 网站 > 下载 中允许扩展下载

### 功能不正常
1. 查看Safari的开发者控制台（开发 > 显示Web检查器）
2. 检查控制台是否有错误信息
3. 重新构建并安装扩展

### 扩展被Safari阻止
1. 在系统偏好设置 > 安全性与隐私中允许应用运行
2. 确保Xcode项目签名正确

## 📝 测试建议

推荐测试页面：
1. **新闻网站**：如BBC、CNN等（测试文章提取）
2. **技术博客**：如GitHub、Medium等（测试代码块处理）
3. **多媒体页面**：测试图片处理功能
4. **复杂布局页面**：测试内容提取准确性

## 💡 开发提示

如果您想要修改扩展功能：
1. 修改 `Resources/` 目录下的文件
2. 在Xcode中重新构建项目
3. 在Safari中禁用然后重新启用扩展
4. 或者重启Safari以加载最新更改

## ✅ 完成确认

当您能够成功：
- ✅ 在Safari工具栏看到ClipMark图标
- ✅ 点击图标打开功能弹窗
- ✅ 成功剪贴网页内容为Markdown
- ✅ 使用快捷键和右键菜单功能

说明Safari扩展已经成功安装和配置！🎉