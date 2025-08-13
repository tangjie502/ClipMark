/**
 * Obsidian Local REST API 服务模块
 * 提供与Obsidian的HTTP API通信功能
 */

class ObsidianApiService {
    constructor(config) {
        this.config = config;
        this.baseUrl = this.buildBaseUrl();
    }

    /**
     * 构建API基础URL
     */
    buildBaseUrl() {
        const protocol = this.config.obsidianApiSecure ? 'https' : 'http';
        const host = this.config.obsidianApiUrl.replace(/^https?:\/\//, '').split(':')[0] || '127.0.0.1';
        const port = this.config.obsidianApiPort || (this.config.obsidianApiSecure ? '27124' : '27123');
        return `${protocol}://${host}:${port}`;
    }

    /**
     * 测试API连接
     */
    async testConnection() {
        try {
            console.log('测试 Obsidian API 连接:', {
                baseUrl: this.baseUrl,
                hasApiKey: !!this.config.obsidianApiKey,
                apiKeyLength: this.config.obsidianApiKey ? this.config.obsidianApiKey.length : 0
            });

            const response = await fetch(`${this.baseUrl}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.obsidianApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Obsidian API 连接成功:', data);
                return {
                    success: true,
                    data: data,
                    message: '连接成功'
                };
            } else {
                console.error('Obsidian API 连接失败:', {
                    status: response.status,
                    statusText: response.statusText
                });
                return {
                    success: false,
                    message: `连接失败: ${response.status} ${response.statusText}`
                };
            }
        } catch (error) {
            console.error('Obsidian API 连接异常:', {
                error: error.message,
                type: error.name,
                baseUrl: this.baseUrl
            });
            return {
                success: false,
                message: `连接错误: ${error.message}`,
                details: {
                    type: error.name,
                    baseUrl: this.baseUrl
                }
            };
        }
    }

    /**
     * 创建新文件
     */
    async createFile(filePath, content, frontmatter = {}) {
        try {
            // 构建完整的文件路径
            const fullPath = this.buildFilePath(filePath);
            
            // 如果有frontmatter，添加到内容前面
            let fullContent = content;
            if (Object.keys(frontmatter).length > 0) {
                const frontmatterText = this.buildFrontmatter(frontmatter);
                fullContent = frontmatterText + '\n\n' + content;
            }

            const apiUrl = `${this.baseUrl}/vault/${encodeURIComponent(fullPath)}`;
            console.log('尝试调用 Obsidian API:', {
                url: apiUrl,
                method: 'PUT',
                hasContent: !!fullContent,
                contentLength: fullContent.length,
                config: this.config
            });

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.config.obsidianApiKey}`,
                    'Content-Type': 'text/markdown'
                },
                body: fullContent
            });

            if (response.ok) {
                return {
                    success: true,
                    message: '文件创建成功',
                    path: fullPath
                };
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Obsidian API 响应错误:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: errorData
                });
                return {
                    success: false,
                    message: `创建文件失败: ${response.status} ${response.statusText}`,
                    error: errorData
                };
            }
        } catch (error) {
            console.error('Obsidian API 调用异常:', {
                error: error.message,
                stack: error.stack,
                config: this.config,
                baseUrl: this.baseUrl
            });
            return {
                success: false,
                message: `创建文件错误: ${error.message}`,
                details: {
                    type: error.name,
                    config: this.config,
                    baseUrl: this.baseUrl
                }
            };
        }
    }

    /**
     * 追加内容到现有文件
     */
    async appendToFile(filePath, content) {
        try {
            const fullPath = this.buildFilePath(filePath);
            
            const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(fullPath)}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.obsidianApiKey}`,
                    'Content-Type': 'text/markdown'
                },
                body: content
            });

            if (response.ok) {
                return {
                    success: true,
                    message: '内容追加成功'
                };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: `追加内容失败: ${response.status} ${response.statusText}`,
                    error: errorData
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `追加内容错误: ${error.message}`
            };
        }
    }

    /**
     * 在指定位置插入内容
     */
    async insertContent(filePath, content, targetType, target, operation = 'append') {
        try {
            const fullPath = this.buildFilePath(filePath);
            
            const response = await fetch(`${this.baseUrl}/vault/${encodeURIComponent(fullPath)}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.config.obsidianApiKey}`,
                    'Content-Type': 'text/markdown',
                    'Operation': operation,
                    'Target-Type': targetType,
                    'Target': target
                },
                body: content
            });

            if (response.ok) {
                return {
                    success: true,
                    message: '内容插入成功'
                };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: `插入内容失败: ${response.status} ${response.statusText}`,
                    error: errorData
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `插入内容错误: ${error.message}`
            };
        }
    }

    /**
     * 打开文件在Obsidian中
     */
    async openFile(filePath) {
        try {
            const fullPath = this.buildFilePath(filePath);
            
            const response = await fetch(`${this.baseUrl}/open/${encodeURIComponent(fullPath)}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.obsidianApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newLeaf: true })
            });

            if (response.ok) {
                return {
                    success: true,
                    message: '文件已在Obsidian中打开'
                };
            } else {
                return {
                    success: false,
                    message: `打开文件失败: ${response.status} ${response.statusText}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `打开文件错误: ${error.message}`
            };
        }
    }

    /**
     * 构建完整的文件路径
     */
    buildFilePath(filePath) {
        let fullPath = filePath;
        
        // 如果配置了文件夹，添加到路径前面
        if (this.config.obsidianFolder) {
            fullPath = this.config.obsidianFolder + '/' + fullPath;
        }
        
        // 确保路径以.md结尾
        if (!fullPath.endsWith('.md')) {
            fullPath += '.md';
        }
        
        return fullPath;
    }

    /**
     * 构建frontmatter文本
     */
    buildFrontmatter(frontmatter) {
        const lines = ['---'];
        
        for (const [key, value] of Object.entries(frontmatter)) {
            if (value !== null && value !== undefined) {
                if (typeof value === 'string') {
                    lines.push(`${key}: ${value}`);
                } else if (Array.isArray(value)) {
                    lines.push(`${key}:`);
                    value.forEach(item => lines.push(`  - ${item}`));
                } else {
                    lines.push(`${key}: ${JSON.stringify(value)}`);
                }
            }
        }
        
        lines.push('---');
        return lines.join('\n');
    }

    /**
     * 搜索文件
     */
    async searchFiles(query, queryType = 'filename') {
        try {
            const response = await fetch(`${this.baseUrl}/search/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.obsidianApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    query_type: queryType
                })
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    data: data,
                    message: '搜索成功'
                };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: `搜索失败: ${response.status} ${response.statusText}`,
                    error: errorData
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `搜索错误: ${error.message}`
            };
        }
    }
}

// 在Service Worker环境中，类会自动在全局作用域中可用
// 不需要额外的导出语句
