
// default variables
var selectedText = null;
var imageList = null;
var mdClipsFolder = '';

const progressUI = {
    container: document.getElementById('progressContainer'),
    bar: document.getElementById('progressBar'),
    count: document.getElementById('progressCount'),
    status: document.getElementById('progressStatus'),
    currentUrl: document.getElementById('currentUrl'),
    
    show() {
        this.container.style.display = 'flex';
    },
    
    hide() {
        this.container.style.display = 'none';
    },
    
    reset() {
        this.bar.style.width = '0%';
        this.count.textContent = '0/0';
        this.status.textContent = '正在处理网址...';
        this.currentUrl.textContent = '';
    },
    
    updateProgress(current, total, url) {
        const percentage = (current / total) * 100;
        this.bar.style.width = `${percentage}%`;
        this.count.textContent = `${current}/${total}`;
        this.currentUrl.textContent = url;
    },
    
    setStatus(status) {
        this.status.textContent = status;
    }
};

// 全局变量
let extractedContent = {
    markdown: '',
    html: '',
    title: '',
    selection: '',
    hasSelection: false
};

// 初始化界面
async function initializeUI() {
    // 隐藏操作按钮，直到有内容
    hideActionButtons();
    
    // 检查是否有存储的提取内容
    await checkForStoredContent();
}

// 隐藏操作按钮
function hideActionButtons() {
    const secondaryActions = document.getElementById('secondaryActions');
    const selectionActions = document.getElementById('selectionActions');
    
    if (secondaryActions) {
        secondaryActions.style.display = 'none';
    }
    if (selectionActions) {
        selectionActions.style.display = 'none';
    }
}

// 显示操作按钮
function showActionButtons() {
    const secondaryActions = document.getElementById('secondaryActions');
    const selectionActions = document.getElementById('selectionActions');
    
    // 显示主要操作按钮
    secondaryActions.style.display = 'block';
    
    // 如果有选中内容，显示选择相关按钮
    if (extractedContent.hasSelection) {
        selectionActions.style.display = 'block';
    } else {
        selectionActions.style.display = 'none';
    }
}

// 设置事件监听器
document.getElementById("batchSelect").addEventListener("click", startPageLinkSelection);
document.getElementById("preview").addEventListener("click", openPreview);
document.getElementById("download").addEventListener("click", download);
document.getElementById("downloadSelection").addEventListener("click", downloadSelection);

document.getElementById("copy").addEventListener("click", copyToClipboard);
document.getElementById("copySelection").addEventListener("click", copySelectionToClipboard);

document.getElementById("batchProcess").addEventListener("click", showBatchProcess);
document.getElementById("convertUrls").addEventListener("click", handleBatchConversion);
document.getElementById("cancelBatch").addEventListener("click", hideBatchProcess);
document.getElementById("selectFromPage").addEventListener("click", startPageLinkSelection);

// 大批量处理界面事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 只有当元素存在时才添加监听器
    const cancelLargeBatchBtn = document.getElementById("cancelLargeBatch");
    const toggleLogBtn = document.getElementById("toggleLog");
    const pauseResumeBtn = document.getElementById("pauseResumeBatch");
    const completeBatchBtn = document.getElementById("completeBatch");
    
    if (cancelLargeBatchBtn) {
        cancelLargeBatchBtn.addEventListener("click", cancelLargeBatchProcess);
    }
    if (toggleLogBtn) {
        toggleLogBtn.addEventListener("click", toggleBatchLog);
    }
    if (pauseResumeBtn) {
        pauseResumeBtn.addEventListener("click", pauseResumeLargeBatch);
    }
    if (completeBatchBtn) {
        completeBatchBtn.addEventListener("click", completeLargeBatch);
    }
});

// 链接选择功能集成
document.addEventListener('DOMContentLoaded', async () => {
    // 批量链接处理现在直接在 service worker 中完成，不需要在弹窗中检查
    await checkForStoredContent();
});

// 注意：消息监听器在文件后面统一处理

function showBatchProcess(e) {
    e.preventDefault();
    document.getElementById("container").style.display = 'none';
    document.getElementById("batchContainer").style.display = 'flex';
}

function hideBatchProcess(e) {
    e.preventDefault();
    document.getElementById("container").style.display = 'flex';
    document.getElementById("batchContainer").style.display = 'none';
}

// 注意：批量链接处理现在直接在 service worker 中完成，不需要弹窗处理

// 填充批量处理URL文本框
function fillBatchUrls(urlText) {
    const urlTextarea = document.getElementById("urlList");
    if (urlTextarea) {
        urlTextarea.value = urlText;
    }
}

// 批量链接选择现在直接在 service worker 中处理完成

// 大批量处理全局变量
let largeBatchState = {
    isActive: false,
    isPaused: false,
    isCancelled: false,
    startTime: null,
    totalUrls: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    currentBatch: 0,
    estimatedTimeRemaining: 0,
    progressPollingInterval: null
};

let largeBatchUI = {
    container: document.getElementById('largeBatchContainer'),
    completedCount: document.getElementById('completedCount'),
    totalCount: document.getElementById('totalCount'),
    successCount: document.getElementById('successCount'),
    errorCount: document.getElementById('errorCount'),
    progressBar: document.getElementById('largeProgressBar'),
    progressStatus: document.getElementById('largeProgressStatus'),
    progressPercent: document.getElementById('largeProgressPercent'),
    currentUrl: document.getElementById('currentProcessingUrl'),
    elapsedTime: document.getElementById('elapsedTime'),
    estimatedTime: document.getElementById('estimatedTime'),
    batchLog: document.getElementById('batchLog'),
    cancelButton: document.getElementById('cancelLargeBatch'),
    pauseResumeButton: document.getElementById('pauseResumeBatch'),
    completeButton: document.getElementById('completeBatch')
};

// 大批量处理函数
function showLargeBatchProgress(totalUrls) {
    // 切换到大批量处理界面
    document.body.classList.add('large-batch-mode');
    document.getElementById("container").style.display = 'none';
    document.getElementById("batchContainer").style.display = 'none';
    largeBatchUI.container.style.display = 'flex';
    
    // 初始化状态
    largeBatchState.isActive = true;
    largeBatchState.isPaused = false;
    largeBatchState.isCancelled = false;
    largeBatchState.startTime = Date.now();
    largeBatchState.totalUrls = totalUrls;
    largeBatchState.completed = 0;
    largeBatchState.successful = 0;
    largeBatchState.failed = 0;
    
    // 初始化UI
    updateLargeBatchUI();
    addBatchLogEntry('开始大批量处理...', 'info');
    
    // 开始计时器
    startBatchTimer();
}

function updateLargeBatchUI() {
    if (!largeBatchUI.container) return;
    
    // 更新统计数据
    largeBatchUI.completedCount.textContent = largeBatchState.completed;
    largeBatchUI.totalCount.textContent = largeBatchState.totalUrls;
    largeBatchUI.successCount.textContent = largeBatchState.successful;
    largeBatchUI.errorCount.textContent = largeBatchState.failed;
    
    // 更新进度条
    const percent = largeBatchState.totalUrls > 0 
        ? Math.round((largeBatchState.completed / largeBatchState.totalUrls) * 100) 
        : 0;
    largeBatchUI.progressBar.style.width = `${percent}%`;
    largeBatchUI.progressPercent.textContent = `${percent}%`;
    
    // 更新状态文本
    if (largeBatchState.isCancelled) {
        largeBatchUI.progressStatus.textContent = '已取消';
    } else if (largeBatchState.isPaused) {
        largeBatchUI.progressStatus.textContent = '已暂停';
    } else if (largeBatchState.completed >= largeBatchState.totalUrls) {
        largeBatchUI.progressStatus.textContent = '处理完成';
        largeBatchUI.completeButton.style.display = 'inline-block';
    } else {
        largeBatchUI.progressStatus.textContent = `正在处理第 ${largeBatchState.completed + 1} 个URL...`;
    }
}

function addBatchLogEntry(message, type = 'info') {
    if (!largeBatchUI.batchLog) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    
    largeBatchUI.batchLog.appendChild(entry);
    largeBatchUI.batchLog.scrollTop = largeBatchUI.batchLog.scrollHeight;
    
    // 限制日志条目数量
    const entries = largeBatchUI.batchLog.children;
    if (entries.length > 100) {
        largeBatchUI.batchLog.removeChild(entries[0]);
    }
}

function startBatchTimer() {
    const timer = setInterval(() => {
        if (!largeBatchState.isActive || largeBatchState.isCancelled) {
            clearInterval(timer);
            return;
        }
        
        const elapsed = Math.round((Date.now() - largeBatchState.startTime) / 1000);
        largeBatchUI.elapsedTime.textContent = `已用时: ${formatTime(elapsed)}`;
        
        // 计算预计剩余时间
        if (largeBatchState.completed > 0) {
            const avgTimePerUrl = elapsed / largeBatchState.completed;
            const remaining = (largeBatchState.totalUrls - largeBatchState.completed) * avgTimePerUrl;
            largeBatchUI.estimatedTime.textContent = `预计剩余: ${formatTime(Math.round(remaining))}`;
        }
    }, 1000);
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
}

function cancelLargeBatchProcess() {
    if (confirm('确定要取消批量处理吗？已处理的内容将被保留。')) {
        largeBatchState.isCancelled = true;
        largeBatchState.isActive = false;
        
        // 停止进度轮询
        if (largeBatchState.progressPollingInterval) {
            clearInterval(largeBatchState.progressPollingInterval);
            largeBatchState.progressPollingInterval = null;
        }
        
        // 通知service worker取消处理
        browser.runtime.sendMessage({
            type: 'cancel-large-batch'
        });
        
        addBatchLogEntry('用户取消了批量处理', 'info');
        updateLargeBatchUI();
        
        // 延迟显示完成按钮
        setTimeout(() => {
            largeBatchUI.completeButton.style.display = 'inline-block';
            largeBatchUI.completeButton.textContent = '查看已处理内容';
        }, 1000);
    }
}

function toggleBatchLog() {
    const log = largeBatchUI.batchLog;
    const button = document.getElementById('toggleLog');
    
    if (log.style.display === 'none' || !log.style.display) {
        log.style.display = 'block';
        button.textContent = '收起';
    } else {
        log.style.display = 'none';
        button.textContent = '展开';
    }
}

function pauseResumeLargeBatch() {
    largeBatchState.isPaused = !largeBatchState.isPaused;
    const button = largeBatchUI.pauseResumeButton;
    
    if (largeBatchState.isPaused) {
        button.textContent = '继续';
        addBatchLogEntry('批量处理已暂停', 'info');
        // 通知service worker暂停
        browser.runtime.sendMessage({
            type: 'pause-large-batch'
        });
    } else {
        button.textContent = '暂停';
        addBatchLogEntry('批量处理已恢复', 'info');
        // 通知service worker恢复
        browser.runtime.sendMessage({
            type: 'resume-large-batch'
        });
    }
    
    updateLargeBatchUI();
}

function completeLargeBatch() {
    largeBatchState.isActive = false;
    
    // 停止进度轮询
    if (largeBatchState.progressPollingInterval) {
        clearInterval(largeBatchState.progressPollingInterval);
    }
    
    // 返回正常界面
    document.body.classList.remove('large-batch-mode');
    document.getElementById("container").style.display = 'flex';
    largeBatchUI.container.style.display = 'none';
    
    // 重置状态
    largeBatchState = {
        isActive: false,
        isPaused: false,
        isCancelled: false,
        startTime: null,
        totalUrls: 0,
        completed: 0,
        successful: 0,
        failed: 0,
        progressPollingInterval: null
    };
}

// 检查是否有存储的提取内容
async function checkForStoredContent() {
    try {
        const result = await browser.storage.local.get(['extracted-content', 'large-batch-start', 'large-batch-progress']);
        
        // 检查是否有提取的内容
        if (result['extracted-content']) {
            const data = result['extracted-content'];
            // 检查数据是否过期（5分钟）
            if (Date.now() - data.timestamp < 5 * 60 * 1000) {
                // 数据仍然有效，自动显示内容
                handleExtractedContent(data);
                // 清除已使用的数据
                await browser.storage.local.remove(['extracted-content']);
            } else {
                // 清除过期数据
                await browser.storage.local.remove(['extracted-content']);
            }
        }
        
        // 检查是否有大批量处理启动信号
        if (result['large-batch-start']) {
            const batchData = result['large-batch-start'];
            // 检查数据是否过期（1分钟）
            if (Date.now() - batchData.timestamp < 60 * 1000) {
                // 显示大批量处理界面
                showLargeBatchProgress(batchData.totalUrls);
                // 清除启动信号
                await browser.storage.local.remove(['large-batch-start']);
                
                // 开始监听进度更新
                startLargeBatchProgressPolling();
            } else {
                // 清除过期数据
                await browser.storage.local.remove(['large-batch-start']);
            }
        }
        
        // 检查是否有正在进行的批量处理任务
        if (result['large-batch-progress']) {
            const progressData = result['large-batch-progress'];
            // 检查进度数据是否仍然有效（不超过30秒）
            if (Date.now() - progressData.timestamp < 30 * 1000) {
                // 如果还没有显示大批量处理界面，则显示它
                if (!largeBatchState.isActive) {
                    showLargeBatchProgress(progressData.total);
                    // 立即更新进度状态
                    largeBatchState.completed = progressData.completed;
                    largeBatchState.successful = progressData.successful;
                    largeBatchState.failed = progressData.failed;
                    updateLargeBatchUI();
                    
                    // 开始监听进度更新
                    startLargeBatchProgressPolling();
                }
            } else {
                // 清除过期的进度数据
                await browser.storage.local.remove(['large-batch-progress']);
            }
        }
        
        // 额外检查：查询service worker中的批量处理状态
        try {
            const batchStatus = await browser.runtime.sendMessage({ type: 'get-batch-status' });
            if (batchStatus && batchStatus.isActive && !largeBatchState.isActive) {
                // 如果service worker中有活跃的批量处理，但popup中没有显示，则显示它
                showLargeBatchProgress(batchStatus.totalUrls || 1);
                largeBatchState.completed = batchStatus.completed || 0;
                largeBatchState.successful = batchStatus.successful || 0;
                largeBatchState.failed = batchStatus.failed || 0;
                updateLargeBatchUI();
                
                // 开始监听进度更新
                startLargeBatchProgressPolling();
            }
        } catch (error) {
            console.error('Error querying batch status from service worker:', error);
        }
    } catch (error) {
        console.error('Error checking stored content:', error);
    }
}

// 轮询大批量处理进度更新
function startLargeBatchProgressPolling() {
    if (largeBatchState.progressPollingInterval) {
        clearInterval(largeBatchState.progressPollingInterval);
    }
    
    largeBatchState.progressPollingInterval = setInterval(async () => {
        if (!largeBatchState.isActive || largeBatchState.isCancelled) {
            clearInterval(largeBatchState.progressPollingInterval);
            return;
        }
        
        try {
            const result = await browser.storage.local.get(['large-batch-progress']);
            if (result['large-batch-progress']) {
                const progressData = result['large-batch-progress'];
                
                // 检查数据是否太旧（超过5秒）
                if (Date.now() - progressData.timestamp < 5000) {
                    // 更新UI状态
                    largeBatchState.completed = progressData.completed;
                    largeBatchState.successful = progressData.successful;
                    largeBatchState.failed = progressData.failed;
                    
                    // 更新界面显示
                    updateLargeBatchUI();
                    
                    // 更新当前处理的URL
                    if (progressData.currentUrl && largeBatchUI.currentUrl) {
                        largeBatchUI.currentUrl.textContent = progressData.currentUrl;
                    }
                    
                    // 添加日志条目
                    if (progressData.status) {
                        if (progressData.status.includes('Error') || progressData.status.includes('失败')) {
                            addBatchLogEntry(progressData.status, 'error');
                        } else if (progressData.status.includes('完成')) {
                            addBatchLogEntry(progressData.status, 'success');
                            // 处理完成，停止轮询
                            largeBatchState.isActive = false;
                        } else if (progressData.status.includes('取消')) {
                            addBatchLogEntry(progressData.status, 'info');
                            // 处理已取消，停止轮询
                            largeBatchState.isActive = false;
                            largeBatchState.isCancelled = true;
                            updateLargeBatchUI();
                        } else {
                            addBatchLogEntry(progressData.status, 'info');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error polling large batch progress:', error);
        }
    }, 1000); // 每秒检查一次
}

// 打开预览页面
async function openPreview(e) {
    e.preventDefault();
    
    if (!extractedContent.markdown) {
        alert('请先提取内容');
        return;
    }
    
    try {
        // 生成唯一的内容ID
        const contentId = Date.now().toString();
        
        // 存储内容到local storage
        await browser.storage.local.set({
            [`preview-${contentId}`]: {
                markdown: extractedContent.markdown,
                title: extractedContent.title,
                url: extractedContent.originalUrl || '',
                timestamp: Date.now()
            }
        });
        
        // 打开预览页面
        const previewUrl = browser.runtime.getURL(`preview/preview.html?contentId=${contentId}`);
        browser.tabs.create({ url: previewUrl });
        
        // 关闭弹窗
        window.close();
        
    } catch (error) {
        console.error('Open preview error:', error);
        alert('打开预览失败');
    }
}

// 更新预览状态
function updatePreviewStatus(title, description) {
    document.getElementById('previewStatus').style.display = 'flex';
    document.getElementById('contentSummary').style.display = 'none';
    
    const statusTitle = document.querySelector('.status-title');
    const statusDesc = document.querySelector('.status-desc');
    
    if (statusTitle) statusTitle.textContent = title;
    if (statusDesc) statusDesc.textContent = description;
}

// 显示内容摘要
function showContentSummary(content) {
    document.getElementById('previewStatus').style.display = 'none';
    document.getElementById('contentSummary').style.display = 'block';
    
    // 更新摘要信息
    document.getElementById('summarySize').textContent = `${content.markdown.length} 字符`;
    
    // 生成预览文本（取前200字符）
    const previewText = content.markdown
        .replace(/#+\s/g, '') // 移除标题标记
        .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
        .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
        .replace(/`(.*?)`/g, '$1') // 移除行内代码标记
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
        .substring(0, 200);
        
    document.getElementById('summaryPreview').textContent = previewText + (content.markdown.length > 200 ? '...' : '');
    
    // 显示操作按钮
    showActionButtons();
}

// 启动页面链接选择
async function startPageLinkSelection(e) {
    e.preventDefault();
    
    try {
        // 获取当前活动标签页
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
            showError('无法获取当前标签页', false);
            return;
        }
        
        const url = tabs[0].url;
        
        // 检查是否为受保护的页面
        const isRestrictedUrl = url.startsWith('chrome://') || 
                              url.startsWith('chrome-extension://') || 
                              url.startsWith('moz-extension://') || 
                              url.startsWith('edge://') || 
                              url.startsWith('about:') || 
                              url.startsWith('file://');
        
        if (isRestrictedUrl) {
            showError(new Error('无法在此页面上使用链接选择功能\n\n' +
                              '请在普通网页上使用此功能。'), false);
            return;
        }
        
        const currentTab = tabs[0];
        
        // 向service worker发送启动链接选择的请求
        await browser.runtime.sendMessage({
            type: "start-link-selection-from-popup",
            tabId: currentTab.id
        });
        
        // 关闭popup让用户在页面上进行选择
        window.close();
        
    } catch (error) {
        console.error('Error starting link selection:', error);
        showError('启动链接选择失败', false);
    }
}

const defaultOptions = {
    includeTemplate: false,
    clipSelection: true,
    downloadImages: false
}

// Function to parse markdown links
function parseMarkdownLink(text) {
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
    const match = text.match(markdownLinkRegex);
    if (match) {
        return {
            title: match[1].trim(),
            url: match[2].trim()
        };
    }
    return null;
}

// Function to validate and normalize URL
function normalizeUrl(url) {
    // Add https:// if no protocol specified
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    
    try {
        const urlObj = new URL(url);
        return urlObj.href;
    } catch (e) {
        return null;
    }
}

// Function to process URLs from textarea
function processUrlInput(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const urlObjects = [];

    for (const line of lines) {
        // Try to parse as markdown link first
        const mdLink = parseMarkdownLink(line);
        
        if (mdLink) {
            const normalizedUrl = normalizeUrl(mdLink.url);
            if (normalizedUrl) {
                urlObjects.push({
                    title: mdLink.title,
                    url: normalizedUrl
                });
            }
        } else if (line) {
            // Try as regular URL
            const normalizedUrl = normalizeUrl(line);
            if (normalizedUrl) {
                urlObjects.push({
                    title: null, // Will be extracted from page
                    url: normalizedUrl
                });
            }
        }
    }

    return urlObjects;
}

async function handleBatchConversion(e) {
    e.preventDefault();
    
    const urlText = document.getElementById("urlList").value;
    const urlObjects = processUrlInput(urlText);
    
    if (urlObjects.length === 0) {
        showError("Please enter valid URLs or markdown links (one per line)", false);
        return;
    }

    document.getElementById("spinner").style.display = 'block';
    document.getElementById("convertUrls").style.display = 'none';
    progressUI.show();
    progressUI.reset();
    
    try {
        const tabs = [];
        const total = urlObjects.length;
        let current = 0;
        const collectedMarkdown = []; // 收集所有转换的 markdown
        
    
        
        // Create and load all tabs
        for (const urlObj of urlObjects) {
            current++;
            progressUI.updateProgress(current, total, `Loading: ${urlObj.url}`);
            
    
            const tab = await browser.tabs.create({ 
                url: urlObj.url, 
                active: false 
            });
            
            if (urlObj.title) {
                tab.customTitle = urlObj.title;
            }
            
            tabs.push(tab);
            
            // Wait for tab load
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Timeout loading ${urlObj.url}`));
                }, 30000);
                
                function listener(tabId, info) {
                    if (tabId === tab.id && info.status === 'complete') {
                        clearTimeout(timeout);
                        browser.tabs.onUpdated.removeListener(listener);
                
                        resolve();
                    }
                }
                browser.tabs.onUpdated.addListener(listener);
            });

            // Ensure scripts are injected
            await browser.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["/browser-polyfill.min.js", "/contentScript/contentScript.js"]
            });
        }

        // Reset progress for processing phase
        current = 0;
        progressUI.setStatus('Converting pages to Markdown...');
        
        // Process each tab and collect markdown
        for (const tab of tabs) {
            try {
                current++;
                progressUI.updateProgress(current, total, `Converting: ${tab.url}`);
          
                
                const displayMdPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout waiting for markdown generation'));
                    }, 30000);

                    function messageListener(message) {
                        if (message.type === "display.md") {
                            clearTimeout(timeout);
                            browser.runtime.onMessage.removeListener(messageListener);
                    
                            
                            const title = tab.customTitle || message.article.title || tab.url;
                            const markdown = message.markdown || '';
                            
                            // 收集markdown内容，不直接下载
                            collectedMarkdown.push({
                                title: title,
                                url: tab.url,
                                markdown: markdown
                            });
                            
                            resolve();
                        }
                    }
                    
                    browser.runtime.onMessage.addListener(messageListener);
                });

                await clipSite(tab.id);
                await displayMdPromise;
                // 移除下载调用，改为收集内容
                // await sendDownloadMessage(extractedContent.markdown);

            } catch (error) {
                console.error(`Error processing tab ${tab.id}:`, error);
                progressUI.setStatus(`Error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Show error briefly
                
                // 即使出错也添加占位符，保持处理连续性
                collectedMarkdown.push({
                    title: `Error: ${tab.url}`,
                    url: tab.url,
                    markdown: `# Error\n\n无法转换此页面: ${error.message}\n\nURL: ${tab.url}\n\n---\n\n`
                });
            }
        }

        // Clean up tabs
        progressUI.setStatus('Merging documents...');
    
        await Promise.all(tabs.map(tab => browser.tabs.remove(tab.id)));

        // 合并所有 markdown 内容
        const mergedMarkdown = mergeMarkdownDocuments(collectedMarkdown);
        const mergedTitle = `批量转换文档集合 (${collectedMarkdown.length}个文档)`;
        
        // 跳转到预览界面而不是关闭
        await openBatchPreview(mergedMarkdown, mergedTitle);
        
        progressUI.setStatus('Complete!');


    } catch (error) {
        console.error('Batch processing error:', error);
        progressUI.setStatus(`Error: ${error.message}`);
        document.getElementById("spinner").style.display = 'none';
        document.getElementById("convertUrls").style.display = 'block';
    }
}

// 合并多个 markdown 文档为一个文档
function mergeMarkdownDocuments(markdownArray) {
    if (markdownArray.length === 0) {
        return '# 批量转换结果\n\n暂无内容\n';
    }
    
    // 创建目录
    let toc = '# 批量转换文档集合\n\n## 目录\n\n';
    let content = '\n\n---\n\n';
    
    markdownArray.forEach((doc, index) => {
        const sectionNum = index + 1;
        const cleanTitle = doc.title.replace(/[#]/g, ''); // 移除可能的markdown标题符号
        
        // 添加到目录
        toc += `${sectionNum}. [${cleanTitle}](#section-${sectionNum})\n`;
        
        // 添加内容部分
        content += `## ${sectionNum}. ${cleanTitle} {#section-${sectionNum}}\n\n`;
        content += `**来源：** ${doc.url}\n\n`;
        
        if (doc.markdown && doc.markdown.trim()) {
            // 调整内容中的标题级别，避免与主标题冲突
            const adjustedMarkdown = doc.markdown.replace(/^(#{1,6})/gm, (match, hashes) => {
                return '##' + hashes; // 在现有标题前添加两个#
            });
            content += adjustedMarkdown;
        } else {
            content += '*内容为空或转换失败*';
        }
        
        content += '\n\n---\n\n';
    });
    
    // 添加统计信息
    const stats = `\n\n## 转换统计\n\n- **文档数量：** ${markdownArray.length}\n- **转换时间：** ${new Date().toLocaleString()}\n- **成功转换：** ${markdownArray.filter(doc => doc.markdown && doc.markdown.trim()).length}\n\n`;
    
    return toc + content + stats;
}

// 打开批量预览界面
async function openBatchPreview(mergedMarkdown, title) {
    try {
        // 生成唯一的内容ID
        const contentId = `batch-${Date.now()}`;
        
        // 存储合并后的内容到local storage
        await browser.storage.local.set({
            [`preview-${contentId}`]: {
                markdown: mergedMarkdown,
                title: title,
                url: '批量转换',
                timestamp: Date.now(),
                isBatch: true  // 标记这是批量转换结果
            }
        });
        
        // 打开预览页面
        const previewUrl = browser.runtime.getURL(`preview/preview.html?contentId=${contentId}`);
        await browser.tabs.create({ url: previewUrl });
        
        // 关闭弹窗
        window.close();
        
    } catch (error) {
        console.error('Open batch preview error:', error);
        alert('打开预览失败: ' + error.message);
    }
}

const checkInitialSettings = options => {
    if (options.includeTemplate)
        document.querySelector("#includeTemplate").classList.add("checked");

    if (options.downloadImages)
        document.querySelector("#downloadImages").classList.add("checked");

    if (options.clipSelection)
        document.querySelector("#selected").classList.add("checked");
    else
        document.querySelector("#document").classList.add("checked");
}

const toggleClipSelection = options => {
    options.clipSelection = !options.clipSelection;
    document.querySelector("#selected").classList.toggle("checked");
    document.querySelector("#document").classList.toggle("checked");
    browser.storage.sync.set(options).then(() => clipSite()).catch((error) => {
        console.error(error);
    });
}

const toggleIncludeTemplate = options => {
    options.includeTemplate = !options.includeTemplate;
    document.querySelector("#includeTemplate").classList.toggle("checked");
    browser.storage.sync.set(options).then(() => {
        return browser.contextMenus.update("toggle-includeTemplate", {
            checked: options.includeTemplate
        });
    }).then(() => {
        // Try to update tab context menu if it exists
        return browser.contextMenus.update("tabtoggle-includeTemplate", {
            checked: options.includeTemplate
        }).catch(err => {
            // Silently ignore if this menu doesn't exist
            console.debug("Tab context menu not available:", err.message);
        });
    }).then(() => {
        return clipSite();
    }).catch((error) => {
        console.error(error);
    });
}

const toggleDownloadImages = options => {
    options.downloadImages = !options.downloadImages;
    document.querySelector("#downloadImages").classList.toggle("checked");
    browser.storage.sync.set(options).then(() => {
        return browser.contextMenus.update("toggle-downloadImages", {
            checked: options.downloadImages
        });
    }).then(() => {
        // Try to update tab context menu if it exists
        return browser.contextMenus.update("tabtoggle-downloadImages", {
            checked: options.downloadImages
        }).catch(err => {
            // Silently ignore if this menu doesn't exist
            console.debug("Tab context menu not available:", err.message);
        });
    }).catch((error) => {
        console.error("Error updating options or menus:", error);
    });
}

const showOrHideClipOption = selection => {
    if (selection) {
        document.getElementById("clipOption").style.display = "flex";
    }
    else {
        document.getElementById("clipOption").style.display = "none";
    }
}

// Updated clipSite function to use scripting API
const clipSite = id => {
    // If no id is provided, get the active tab's id first
    if (!id) {
        return browser.tabs.query({
            currentWindow: true,
            active: true
        }).then(tabs => {
            if (tabs && tabs.length > 0) {
                // 检查是否为受保护的页面
                const url = tabs[0].url;
                const isRestrictedUrl = url.startsWith('chrome://') || 
                                      url.startsWith('chrome-extension://') || 
                                      url.startsWith('moz-extension://') || 
                                      url.startsWith('edge://') || 
                                      url.startsWith('about:') || 
                                      url.startsWith('file://');
                
                if (isRestrictedUrl) {
                    throw new Error('无法在此页面上使用ClipMark扩展\n\n' +
                                  '请在普通网页上使用此扩展。');
                }
                
                return clipSite(tabs[0].id);
            }
            throw new Error("No active tab found");
        });
    }

    // Rest of the function remains the same
    return browser.scripting.executeScript({
        target: { tabId: id },
        func: () => {
            if (typeof getSelectionAndDom === 'function') {
                return getSelectionAndDom();
            }
            return null;
        }
    })
    .then((result) => {
        if (result && result[0]?.result) {
            showOrHideClipOption(result[0].result.selection);
            let message = {
                type: "clip",
                dom: result[0].result.dom,
                selection: result[0].result.selection
            }
            return browser.storage.sync.get(defaultOptions).then(options => {
                browser.runtime.sendMessage({
                    ...message,
                    ...options
                });
            }).catch(err => {
                console.error(err);
                showError(err)
                return browser.runtime.sendMessage({
                    ...message,
                    ...defaultOptions
                });
            });
        }
    }).catch(err => {
        console.error(err);
        showError(err)
    });
}

// Inject the necessary scripts - updated for Manifest V3
browser.storage.sync.get(defaultOptions).then(options => {
    checkInitialSettings(options);
    
    // Set up event listeners (unchanged)
    document.getElementById("selected").addEventListener("click", (e) => {
        e.preventDefault();
        toggleClipSelection(options);
    });
    document.getElementById("document").addEventListener("click", (e) => {
        e.preventDefault();
        toggleClipSelection(options);
    });
    document.getElementById("includeTemplate").addEventListener("click", (e) => {
        e.preventDefault();
        toggleIncludeTemplate(options);
    });
    document.getElementById("downloadImages").addEventListener("click", (e) => {
        e.preventDefault();
        toggleDownloadImages(options);
    });
    
    return browser.tabs.query({
        currentWindow: true,
        active: true
    });
}).then((tabs) => {
    var id = tabs[0].id;
    var url = tabs[0].url;
    
    // 检查是否为受保护的页面
    const isRestrictedUrl = url.startsWith('chrome://') || 
                          url.startsWith('chrome-extension://') || 
                          url.startsWith('moz-extension://') || 
                          url.startsWith('edge://') || 
                          url.startsWith('about:') || 
                          url.startsWith('file://');
    
    if (isRestrictedUrl) {
        showError(new Error('无法在此页面上使用ClipMark扩展\n\n' +
                          '请在普通网页上使用此扩展，例如：\n' +
                          '• 新闻网站\n' +
                          '• 博客文章\n' +
                          '• 文档页面\n\n' +
                          '系统页面（chrome://、about: 等）不支持扩展功能。'), false);
        return;
    }
    
    // Use scripting API instead of executeScript
    browser.scripting.executeScript({
        target: { tabId: id },
        files: ["/browser-polyfill.min.js"]
    })
    .then(() => {
        return browser.scripting.executeScript({
            target: { tabId: id },
            files: ["/contentScript/contentScript.js"]
        });
    }).then(() => {
                        console.info("Successfully injected ClipMark content script");
        return clipSite(id);
    }).catch((error) => {
        console.error(error);
        showError(error);
    });
});

// listen for notifications from the background page
browser.runtime.onMessage.addListener(notify);

//function to send the download message to the background page
function sendDownloadMessage(text) {
    if (text != null) {

        return browser.tabs.query({
            currentWindow: true,
            active: true
        }).then(tabs => {
            var message = {
                type: "download",
                markdown: text,
                title: document.getElementById("title").value,
                tab: tabs[0],
                imageList: imageList,
                mdClipsFolder: mdClipsFolder
            };
            return browser.runtime.sendMessage(message);
        });
    }
}

// Download event handler - updated to use promises
async function download(e) {
    e.preventDefault();
    
    if (!extractedContent.markdown) {
        alert('请先提取内容');
        return;
    }
    
    try {
        await sendDownloadMessage(extractedContent.markdown);
        window.close();
    } catch (error) {
        console.error("Error sending download message:", error);
    }
}

// Download selection handler - updated to use promises
async function downloadSelection(e) {
    e.preventDefault();
    
    if (!extractedContent.hasSelection || !extractedContent.selection) {
        alert('没有选中的内容');
        return;
    }
    
    try {
        await sendDownloadMessage(extractedContent.selection);
    } catch (error) {
        console.error("Error sending selection download message:", error);
    }
}

// Function to handle copying text to clipboard
function copyToClipboard(e) {
    e.preventDefault();
    
    if (!extractedContent.markdown) {
        alert('请先提取内容');
        return;
    }
    
    navigator.clipboard.writeText(extractedContent.markdown).then(() => {
        showCopySuccess();
    }).catch(err => {
        console.error("Error copying text: ", err);
    });
}

function copySelectionToClipboard(e) {
    e.preventDefault();
    
    if (!extractedContent.hasSelection || !extractedContent.selection) {
        alert('没有选中的内容');
        return;
    }
    
    navigator.clipboard.writeText(extractedContent.selection).then(() => {
        showCopySuccess();
    }).catch(err => {
        console.error("Error copying selection: ", err);
    });
}

function showCopySuccess() {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'copy-success';
    statusDiv.textContent = 'Copied!';
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
        statusDiv.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(statusDiv);
        }, 300);
    }, 1000);
}

//function that handles messages from the injected script into the site
function notify(message) {
    // message for displaying markdown
    if (message.type == "display.md") {

        // 更新提取的内容
        extractedContent.markdown = message.markdown;
        extractedContent.title = message.article.title;
        extractedContent.html = message.html || '';
        extractedContent.selection = message.selection || '';
        extractedContent.hasSelection = !!(message.selection && message.selection.trim());
        
        document.getElementById("title").value = message.article.title;
        imageList = message.imageList;
        mdClipsFolder = message.mdClipsFolder;
        
        // 显示内容摘要
        showContentSummary(extractedContent);
        
        // show the hidden elements
        document.getElementById("container").style.display = 'flex';
        document.getElementById("spinner").style.display = 'none';
        
        // focus the download button
        document.getElementById("download").focus();
    }
}

function showError(err, useEditor = true) {
    // show the hidden elements
    document.getElementById("container").style.display = 'flex';
    document.getElementById("spinner").style.display = 'none';
    
    console.error('Error:', err);
    
    // 检查是否为URL限制错误
    const isUrlRestrictionError = err.message && (
        err.message.includes('无法在此页面上使用ClipMark扩展') ||
        err.message.includes('请在普通网页上使用') ||
        err.message.includes('受保护的页面')
    );
    
    if (isUrlRestrictionError) {
        // 为URL限制错误显示特殊的友好界面
        showUrlRestrictionMessage(err.message);
    } else if (useEditor) {
        // 在新的UI中显示其他错误
        updatePreviewStatus('提取失败', `错误: ${err}`);
    } else {
        // 批量处理错误
        console.error('Batch processing error:', err);
        // 也在UI中显示批量处理错误
        updatePreviewStatus('批量处理失败', `错误: ${err.message || err}`);
    }
}

function showUrlRestrictionMessage(message) {
    // 创建友好的URL限制提示界面
    const previewContent = `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 16px;">🚫</div>
            <h3 style="color: #333; margin-bottom: 16px;">页面不支持</h3>
            <p style="line-height: 1.6; margin-bottom: 24px;">${message.replace(/\n/g, '<br>')}</p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h4 style="color: #495057; margin-bottom: 12px;">💡 建议操作：</h4>
                <ul style="text-align: left; color: #6c757d; line-height: 1.8;">
                    <li>打开一个普通网页（如新闻、博客、文档页面）</li>
                    <li>然后再次点击ClipMark扩展图标</li>
                    <li>或者尝试使用右键菜单功能</li>
                </ul>
            </div>
            <button id="openSamplePage" style="
                background: #007bff; 
                color: white; 
                border: none; 
                padding: 12px 24px; 
                border-radius: 6px; 
                cursor: pointer;
                font-size: 14px;
                margin-right: 12px;
            ">打开示例页面</button>
            <button id="closePopup" style="
                background: #6c757d; 
                color: white; 
                border: none; 
                padding: 12px 24px; 
                border-radius: 6px; 
                cursor: pointer;
                font-size: 14px;
            ">关闭</button>
        </div>
    `;
    
    // 显示在预览区域
    updatePreviewStatus('页面限制', previewContent);
    
    // 绑定按钮事件
    setTimeout(() => {
        const openSampleBtn = document.getElementById('openSamplePage');
        const closeBtn = document.getElementById('closePopup');
        
        if (openSampleBtn) {
            openSampleBtn.addEventListener('click', () => {
                // 打开一个示例页面
                browser.tabs.create({ 
                    url: 'https://example.com',
                    active: true 
                }).then(() => {
                    window.close();
                }).catch(err => {
                    console.error('Failed to open sample page:', err);
                });
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                window.close();
            });
        }
    }, 100);
}

// 更新消息监听器以处理新的提取内容响应
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "content-extracted") {
        // 处理提取的内容
        handleExtractedContent(message);
        return Promise.resolve({success: true});
    } else if (message.type === "batch-processing-error") {
        // 处理批量处理错误
        console.log('收到批量处理错误:', message.message);
        showError(new Error(message.message), false);
        return Promise.resolve({success: true});
    }
    
    // 对于其他消息类型，返回false表示不处理
    return false;
});

// 处理提取的内容
function handleExtractedContent(data) {
    if (data.error) {
        // 处理错误情况
        console.error('Content extraction error:', data.error);
        updatePreviewStatus('提取失败', `错误: ${data.error}`);
        return;
    }
    
    extractedContent.markdown = data.markdown || '';
    extractedContent.html = data.html || '';
    extractedContent.title = data.title || '未命名文档';
    extractedContent.selection = data.selection || '';
    extractedContent.hasSelection = !!(data.selection && data.selection.trim());
    extractedContent.originalUrl = data.url || '';
    
    // 更新标题输入框
    const titleInput = document.getElementById('title');
    if (titleInput && !titleInput.value) {
        titleInput.value = extractedContent.title;
    }
    
    // 显示内容摘要
    showContentSummary(extractedContent);
}

// 初始化界面
initializeUI();
