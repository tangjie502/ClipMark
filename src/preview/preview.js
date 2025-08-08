// 预览页面主要功能
class MarkdownPreview {
    constructor() {
        this.markdownContent = '';
        this.htmlContent = '';
        this.documentTitle = '未命名文档';
        this.originalUrl = '';
        this.isSourceView = false;
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadContent();
        this.updateUI();
    }
    
    // 绑定事件监听器
    bindEvents() {
        // 工具栏按钮事件
        document.getElementById('downloadMarkdownBtn').addEventListener('click', () => {
            this.downloadMarkdown();
        });
        
        document.getElementById('copyContentBtn')?.addEventListener('click', () => {
            this.copyContent();
        });
        
        document.getElementById('viewSourceBtn').addEventListener('click', () => {
            this.toggleSourceView();
        });
        
        document.getElementById('backToExtension')?.addEventListener('click', () => {
            this.backToExtension();
        });
        
        // 模态框事件
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('copySourceBtn').addEventListener('click', () => {
            this.copySource();
        });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // 点击模态框背景关闭
        document.getElementById('sourceModal').addEventListener('click', (e) => {
            if (e.target.id === 'sourceModal') {
                this.closeModal();
            }
        });
    }
    
    // 加载内容
    async loadContent() {
        try {
            this.showLoading();
            
            // 尝试从URL参数获取内容
            const urlParams = new URLSearchParams(window.location.search);
            const contentId = urlParams.get('contentId');
            
            if (contentId) {
                // 从storage获取内容
                const result = await browser.storage.local.get([`preview-${contentId}`]);
                const data = result[`preview-${contentId}`];
                
                if (data && Date.now() - data.timestamp < 10 * 60 * 1000) { // 10分钟内有效
                    this.markdownContent = data.markdown;
                    this.documentTitle = data.title || '未命名文档';
                    this.originalUrl = data.url || '';
                    
                    this.renderMarkdown();
                    this.hideLoading();
                    return;
                }
            }
            
            // 如果没有找到内容，显示空状态
            this.showEmptyState();
            
        } catch (error) {
            console.error('Error loading content:', error);
            this.showEmptyState();
        }
    }
    
    // 渲染Markdown为HTML
    renderMarkdown() {
        if (!this.markdownContent) {
            this.showEmptyState();
            return;
        }
        
        // 使用简单的Markdown渲染（可以后续集成更强大的渲染器）
        this.htmlContent = this.simpleMarkdownToHtml(this.markdownContent);
        
        const contentElement = document.getElementById('markdownContent');
        contentElement.innerHTML = this.htmlContent;
        contentElement.style.display = 'block';
        
        // 高亮代码块
        this.highlightCodeBlocks();
        
        // 处理图片加载错误
        this.setupImageErrorHandling();
        
        this.updateStatistics();
    }
    
    // 简单的Markdown转HTML功能
    simpleMarkdownToHtml(markdown) {
        let html = markdown
            // 处理代码块
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            // 处理行内代码
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // 处理标题（增加4-6级标题支持）
            .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
            .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // 处理粗体
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // 处理斜体
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // 处理图片（支持带title的格式）
            .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (match, alt, src, title) => {
                const titleAttr = title ? ` title="${title}"` : '';
                return `<img src="${src}" alt="${alt}"${titleAttr} style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 16px 0;">`;
            })
            // 处理链接（支持带title的格式）
            .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (match, text, url, title) => {
                const titleAttr = title ? ` title="${title}"` : '';
                return `<a href="${url}" target="_blank"${titleAttr}>${text}</a>`;
            })
            // 处理引用
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
            // 处理删除线
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            // 处理无序列表
            .replace(/^[\*\-\+] (.*$)/gm, '<li>$1</li>')
            // 处理有序列表
            .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
            // 处理水平线
            .replace(/^---$/gm, '<hr>')
            .replace(/^\*\*\*$/gm, '<hr>')
            .replace(/^___$/gm, '<hr>')
            // 处理段落
            .replace(/\n\n/g, '</p><p>')
            // 处理换行
            .replace(/\n/g, '<br>');
            
        // 包装列表项为无序列表
        html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        // 处理连续的列表（避免多个ul标签）
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        
        // 包装段落
        if (html && !html.startsWith('<')) {
            html = '<p>' + html + '</p>';
        }
        
        return html;
    }
    
    // 代码高亮
    highlightCodeBlocks() {
        if (typeof hljs !== 'undefined') {
            const codeBlocks = document.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                hljs.highlightBlock(block);
            });
        }
    }
    
    // 设置图片错误处理
    setupImageErrorHandling() {
        const images = document.querySelectorAll('#markdownContent img');
        images.forEach(img => {
            img.addEventListener('error', () => {
                // 创建错误占位符
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    display: inline-block;
                    padding: 20px;
                    margin: 16px 0;
                    border: 2px dashed #dc3545;
                    border-radius: 8px;
                    color: #dc3545;
                    background-color: #f8d7da;
                    text-align: center;
                    max-width: 100%;
                    font-size: 14px;
                `;
                
                errorDiv.innerHTML = `
                    <div style="margin-bottom: 8px;">🖼️ 图片加载失败</div>
                    <div style="font-size: 12px; color: #721c24;">
                        ${img.alt || '未知图片'}
                    </div>
                    <div style="font-size: 11px; color: #721c24; margin-top: 4px; word-break: break-all;">
                        ${img.src}
                    </div>
                `;
                
                // 替换原图片
                img.parentNode.replaceChild(errorDiv, img);
            });
            
            // 添加加载状态
            img.addEventListener('load', () => {
                img.style.opacity = '1';
            });
            
            // 初始状态为透明，加载完成后显示
            img.style.opacity = '0.7';
            img.style.transition = 'opacity 0.3s ease';
        });
    }
    
    // 切换源码视图
    toggleSourceView() {
        this.isSourceView = !this.isSourceView;
        
        const previewContent = document.getElementById('markdownPreview');
        const sourceView = document.getElementById('sourceView');
        const sourceContent = document.getElementById('sourceContent');
        const viewSourceBtn = document.getElementById('viewSourceBtn');
        
        if (this.isSourceView) {
            previewContent.style.display = 'none';
            sourceView.style.display = 'block';
            sourceContent.textContent = this.markdownContent;
            viewSourceBtn.innerHTML = '📄 预览模式';
        } else {
            previewContent.style.display = 'block';
            sourceView.style.display = 'none';
            viewSourceBtn.innerHTML = '👁️ 查看源码';
        }
    }
    
    // 下载Markdown文件
    downloadMarkdown() {
        if (!this.markdownContent) return;
        
        const blob = new Blob([this.markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `${this.documentTitle}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateStatus('Markdown 文件下载完成');
    }
    
    // 下载纯文本文件
    downloadText() {
        if (!this.markdownContent) return;
        
        // 移除Markdown标记，保留纯文本
        const plainText = this.markdownContent
            .replace(/#+\s/g, '') // 移除标题标记
            .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
            .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
            .replace(/`(.*?)`/g, '$1') // 移除行内代码标记
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // 移除图片，保留alt文本
            .replace(/^> /gm, '') // 移除引用标记
            .replace(/^- /gm, '') // 移除无序列表标记
            .replace(/^\d+\. /gm, '') // 移除有序列表标记
            .replace(/```[\s\S]*?```/g, '') // 移除代码块
            .replace(/\n{3,}/g, '\n\n'); // 减少多余换行
        
        const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `${this.documentTitle}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateStatus('文本文件下载完成');
    }
    
    // 复制内容到剪贴板
    async copyContent() {
        if (!this.markdownContent) {
            this.updateStatus('没有可复制的内容');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(this.markdownContent);
            this.updateStatus('内容已复制到剪贴板');
        } catch (error) {
            // 降级到传统方法
            try {
                const textarea = document.createElement('textarea');
                textarea.value = this.markdownContent;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.updateStatus('内容已复制到剪贴板');
            } catch (fallbackError) {
                console.error('Failed to copy to clipboard:', fallbackError);
                this.updateStatus('复制失败');
            }
        }
    }
    
    // 刷新内容
    async refreshContent() {
        this.updateStatus('正在刷新内容...');
        await this.loadContent();
        this.updateStatus('内容刷新完成');
    }
    
    // 返回扩展
    backToExtension() {
        if (browser.runtime && browser.runtime.openOptionsPage) {
            browser.runtime.openOptionsPage();
        } else {
            // 尝试打开扩展弹窗（虽然通常不能直接打开）
            window.close();
        }
    }
    
    // 显示源码模态框
    showSourceModal() {
        const modal = document.getElementById('sourceModal');
        const textarea = document.getElementById('sourceTextarea');
        
        textarea.value = this.markdownContent;
        modal.style.display = 'flex';
    }
    
    // 关闭模态框
    closeModal() {
        const modal = document.getElementById('sourceModal');
        modal.style.display = 'none';
    }
    
    // 复制源码
    async copySource() {
        const textarea = document.getElementById('sourceTextarea');
        
        try {
            await navigator.clipboard.writeText(this.markdownContent);
            this.updateStatus('源码已复制到剪贴板');
            
            // 临时改变按钮文本
            const btn = document.getElementById('copySourceBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ 已复制';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
            
        } catch (error) {
            // 兜底方案
            textarea.select();
            document.execCommand('copy');
            this.updateStatus('源码已复制到剪贴板');
        }
    }
    
    // 更新页面UI
    updateUI() {
        document.getElementById('documentTitle').textContent = this.documentTitle;
        document.getElementById('lastUpdated').textContent = '刚刚更新';
        
        if (this.originalUrl) {
            document.title = `${this.documentTitle} - ClipMark 预览`;
        }
    }
    
    // 更新统计信息
    updateStatistics() {
        const wordCount = this.markdownContent.length;
        const lineCount = this.markdownContent.split('\n').length;
        
        // 可选更新元素（如果存在的话）
        const documentSizeEl = document.getElementById('documentSize');
        const wordCountEl = document.getElementById('wordCount');
        const lineCountEl = document.getElementById('lineCount');
        
        if (documentSizeEl) documentSizeEl.textContent = `${wordCount} 字符`;
        if (wordCountEl) wordCountEl.textContent = `字数: ${wordCount}`;
        if (lineCountEl) lineCountEl.textContent = `行数: ${lineCount}`;
    }
    
    // 显示加载状态
    showLoading() {
        document.getElementById('loadingState').style.display = 'flex';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('markdownContent').style.display = 'none';
    }
    
    // 隐藏加载状态
    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
    }
    
    // 显示空状态
    showEmptyState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('markdownContent').style.display = 'none';
    }
    
    // 更新状态栏
    updateStatus(message) {
        const statusEl = document.getElementById('processingStatus');
        if (statusEl) {
            statusEl.textContent = message;
            
            // 3秒后恢复默认状态
            setTimeout(() => {
                const currentStatusEl = document.getElementById('processingStatus');
                if (currentStatusEl) {
                    currentStatusEl.textContent = '就绪';
                }
            }, 3000);
        } else {
            // 如果没有状态栏，在控制台显示消息
            console.log('Preview Status:', message);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.markdownPreview = new MarkdownPreview();
});

// 监听来自扩展的消息
if (typeof browser !== 'undefined') {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'preview-content-update') {
            // 更新预览内容
            if (window.markdownPreview) {
                window.markdownPreview.markdownContent = message.markdown;
                window.markdownPreview.documentTitle = message.title || '未命名文档';
                window.markdownPreview.originalUrl = message.url || '';
                window.markdownPreview.renderMarkdown();
                window.markdownPreview.updateUI();
                window.markdownPreview.hideLoading();
            }
        }
        return true;
    });
}