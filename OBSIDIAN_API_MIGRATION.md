# Obsidian 集成迁移指南

## 概述

ClipMark 现在支持两种 Obsidian 集成方式：

1. **Obsidian Local REST API（推荐）** - 使用 Obsidian 内置的 REST API
2. **Advanced Obsidian URI（传统方式）** - 使用第三方插件

## 新增功能

### Obsidian Local REST API 集成

#### 优势
- ✅ 无需安装第三方插件
- ✅ 更稳定可靠
- ✅ 支持更多功能（搜索、文件操作等）
- ✅ 直接文件创建，无需剪贴板
- ✅ 支持 frontmatter 自动生成

#### 配置要求
1. 在 Obsidian 中安装并启用 "Local REST API" 插件
2. 在插件设置中获取 API 密钥
3. 确保 Obsidian 正在运行

#### 配置步骤
1. 打开 ClipMark 设置页面
2. 选择 "Obsidian 集成" 选项
3. 选择 "Obsidian Local REST API（推荐）"
4. 填写配置信息：
   - API 服务器地址：`http://127.0.0.1:27123`（HTTP）或 `https://127.0.0.1:27124`（HTTPS）
   - 端口号：`27123`（HTTP）或 `27124`（HTTPS）
   - API 密钥：在 Obsidian 设置中获取
   - 仓库名称：指定目标仓库
   - 文件夹名称：指定目标文件夹

### 传统 Advanced Obsidian URI 集成

#### 说明
- 继续支持原有的 Advanced Obsidian URI 方式
- 作为备选方案，当 REST API 不可用时自动回退
- 配置方式保持不变

## 迁移步骤

### 从 Advanced Obsidian URI 迁移到 REST API

1. **安装 Local REST API 插件**
   - 在 Obsidian 中打开设置
   - 进入 "社区插件" → "浏览"
   - 搜索 "Local REST API" 并安装
   - 启用插件

2. **获取 API 密钥**
   - 在 Local REST API 插件设置中
   - 复制显示的 API 密钥

3. **配置 ClipMark**
   - 打开 ClipMark 设置
   - 选择 "Obsidian Local REST API（推荐）"
   - 填写 API 配置信息
   - 保存设置

4. **测试连接**
   - 使用右键菜单发送内容到 Obsidian
   - 检查是否成功创建文件

### 配置示例

#### REST API 配置
```yaml
API 服务器地址: http://127.0.0.1:27123
端口号: 27123
使用 HTTPS: false
API 密钥: your-api-key-here
仓库名称: MyVault
文件夹名称: Clippers
```

#### 传统 URI 配置
```yaml
仓库名称: MyVault
文件夹名称: Clippers
```

## 功能对比

| 功能 | REST API | Advanced URI |
|------|----------|--------------|
| 文件创建 | ✅ 直接创建 | ⚠️ 通过剪贴板 |
| Frontmatter | ✅ 自动生成 | ❌ 不支持 |
| 文件搜索 | ✅ 支持 | ❌ 不支持 |
| 文件操作 | ✅ 完整支持 | ❌ 不支持 |
| 稳定性 | ✅ 高 | ⚠️ 中等 |
| 依赖插件 | ❌ 无需 | ✅ 需要 |
| 配置复杂度 | ⚠️ 中等 | ✅ 简单 |

## 故障排除

### 常见问题

#### 1. 连接失败
- 确保 Obsidian 正在运行
- 检查端口号是否正确
- 验证 API 密钥是否有效
- 检查防火墙设置

#### 2. 权限错误
- 确认 Local REST API 插件已启用
- 检查 API 密钥是否正确
- 验证仓库路径是否存在

#### 3. 文件创建失败
- 检查目标文件夹是否存在
- 确认文件名是否包含非法字符
- 验证 Obsidian 是否有写入权限

### 回退方案

如果 REST API 配置失败，ClipMark 会自动回退到传统的 Advanced Obsidian URI 方式，确保功能连续性。

## 技术细节

### API 端点使用

- **创建文件**: `PUT /vault/{filename}`
- **追加内容**: `POST /vault/{filename}`
- **插入内容**: `PATCH /vault/{filename}`
- **打开文件**: `POST /open/{filename}`
- **搜索文件**: `POST /search/`

### 安全考虑

- 使用 Bearer Token 认证
- 支持 HTTP 和 HTTPS 协议
- 建议在生产环境使用 HTTPS

## 更新日志

### v3.7.0+
- 新增 Obsidian Local REST API 支持
- 保留 Advanced Obsidian URI 兼容性
- 改进错误处理和用户反馈
- 优化配置界面

## 支持

如果您在使用过程中遇到问题，请：

1. 检查配置是否正确
2. 查看浏览器控制台错误信息
3. 确认 Obsidian 和插件状态
4. 参考故障排除部分

---

**注意**: 建议在生产环境中使用 HTTPS 协议以确保数据传输安全。
