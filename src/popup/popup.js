
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
        this.status.textContent = 'Processing URLs...';
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

const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
// set up event handlers
const cm = CodeMirror.fromTextArea(document.getElementById("md"), {
    theme: darkMode ? "xq-dark" : "xq-light",
    mode: "markdown",
    lineWrapping: true
});
cm.on("cursorActivity", (cm) => {
    const somethingSelected = cm.somethingSelected();
    var downloadSelectionButton = document.getElementById("downloadSelection");
    var copySelectionButton = document.getElementById("copySelection");

    if (somethingSelected) {
        if(downloadSelectionButton.style.display != "block") downloadSelectionButton.style.display = "block";
        if(copySelectionButton.style.display != "block") copySelectionButton.style.display = "block";
    }
    else {
        if(downloadSelectionButton.style.display != "none") downloadSelectionButton.style.display = "none";
        if(copySelectionButton.style.display != "none") copySelectionButton.style.display = "none";
    }
});
document.getElementById("download").addEventListener("click", download);
document.getElementById("downloadSelection").addEventListener("click", downloadSelection);

document.getElementById("copy").addEventListener("click", copyToClipboard);
document.getElementById("copySelection").addEventListener("click", copySelectionToClipboard);

document.getElementById("batchProcess").addEventListener("click", showBatchProcess);
document.getElementById("convertUrls").addEventListener("click", handleBatchConversion);
document.getElementById("cancelBatch").addEventListener("click", hideBatchProcess);
document.getElementById("selectFromPage").addEventListener("click", startPageLinkSelection);

// 链接选择功能集成
document.addEventListener('DOMContentLoaded', async () => {
    await checkForStoredLinks();
});

// 监听来自service worker的消息
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "batch-links-ready") {
        // 自动填充链接并切换到批量处理界面
        fillBatchUrls(message.urlText);
        showBatchProcess({ preventDefault: () => {} });
        sendResponse({success: true});
    }
    return true;
});

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

// 检查是否有存储的链接数据
async function checkForStoredLinks() {
    try {
        const result = await browser.storage.local.get(['batch-selected-links']);
        if (result['batch-selected-links']) {
            const data = result['batch-selected-links'];
            // 检查数据是否过期（5分钟）
            if (Date.now() - data.timestamp < 5 * 60 * 1000) {
                // 数据仍然有效，显示提示
                showLinkSelectionNotification(data.urlText);
            } else {
                // 清除过期数据
                await browser.storage.local.remove(['batch-selected-links']);
            }
        }
    } catch (error) {
        console.error('Error checking stored links:', error);
    }
}

// 填充批量处理URL文本框
function fillBatchUrls(urlText) {
    const urlTextarea = document.getElementById("urlList");
    if (urlTextarea) {
        urlTextarea.value = urlText;
    }
}

// 显示链接选择提示
function showLinkSelectionNotification(urlText) {
    // 在批量处理按钮旁边添加一个小提示
    const batchButton = document.getElementById("batchProcess");
    if (batchButton && !document.getElementById('link-selection-indicator')) {
        const indicator = document.createElement('span');
        indicator.id = 'link-selection-indicator';
        indicator.innerHTML = ' 🔗';
        indicator.title = '有已选择的链接可用于批量处理';
        indicator.style.cssText = `
            color: #28a745;
            font-size: 16px;
            cursor: pointer;
        `;
        
        indicator.addEventListener('click', () => {
            fillBatchUrls(urlText);
            showBatchProcess({ preventDefault: () => {} });
            indicator.remove();
        });
        
        batchButton.parentNode.insertBefore(indicator, batchButton.nextSibling);
        
        // 5秒后自动移除提示
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 5000);
    }
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
        
        console.log('Starting batch conversion...');
        
        // Create and load all tabs
        for (const urlObj of urlObjects) {
            current++;
            progressUI.updateProgress(current, total, `Loading: ${urlObj.url}`);
            
            console.log(`Creating tab for ${urlObj.url}`);
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
                        console.log(`Tab ${tabId} loaded`);
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
        
        // Process each tab
        for (const tab of tabs) {
            try {
                current++;
                progressUI.updateProgress(current, total, `Converting: ${tab.url}`);
                console.log(`Processing tab ${tab.id}`);
                
                const displayMdPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout waiting for markdown generation'));
                    }, 30000);

                    function messageListener(message) {
                        if (message.type === "display.md") {
                            clearTimeout(timeout);
                            browser.runtime.onMessage.removeListener(messageListener);
                            console.log(`Received markdown for tab ${tab.id}`);
                            
                            if (tab.customTitle) {
                                message.article.title = tab.customTitle;
                            }
                            
                            cm.setValue(message.markdown);
                            document.getElementById("title").value = message.article.title;
                            imageList = message.imageList;
                            mdClipsFolder = message.mdClipsFolder;
                            
                            resolve();
                        }
                    }
                    
                    browser.runtime.onMessage.addListener(messageListener);
                });

                await clipSite(tab.id);
                await displayMdPromise;
                await sendDownloadMessage(cm.getValue());

            } catch (error) {
                console.error(`Error processing tab ${tab.id}:`, error);
                progressUI.setStatus(`Error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Show error briefly
            }
        }

        // Clean up tabs
        progressUI.setStatus('Cleaning up...');
        console.log('Cleaning up tabs...');
        await Promise.all(tabs.map(tab => browser.tabs.remove(tab.id)));

        progressUI.setStatus('Complete!');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Show completion briefly
        
        console.log('Batch conversion complete');
        hideBatchProcess(e);
        window.close();

    } catch (error) {
        console.error('Batch processing error:', error);
        progressUI.setStatus(`Error: ${error.message}`);
        document.getElementById("spinner").style.display = 'none';
        document.getElementById("convertUrls").style.display = 'block';
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
        console.info("Successfully injected MarkSnip content script");
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
    try {
        await sendDownloadMessage(cm.getValue());
        window.close();
    } catch (error) {
        console.error("Error sending download message:", error);
    }
}

// Download selection handler - updated to use promises
async function downloadSelection(e) {
    e.preventDefault();
    if (cm.somethingSelected()) {
        try {
            await sendDownloadMessage(cm.getSelection());
        } catch (error) {
            console.error("Error sending selection download message:", error);
        }
    }
}

// Function to handle copying text to clipboard
function copyToClipboard(e) {
    e.preventDefault();
    const text = cm.getValue();
    navigator.clipboard.writeText(text).then(() => {
        showCopySuccess();
    }).catch(err => {
        console.error("Error copying text: ", err);
    });
}

function copySelectionToClipboard(e) {
    e.preventDefault();
    if (cm.somethingSelected()) {
        const selectedText = cm.getSelection();
        navigator.clipboard.writeText(selectedText).then(() => {
            showCopySuccess();
        }).catch(err => {
            console.error("Error copying selection: ", err);
        });
    }
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

        // set the values from the message
        //document.getElementById("md").value = message.markdown;
        cm.setValue(message.markdown);
        document.getElementById("title").value = message.article.title;
        imageList = message.imageList;
        mdClipsFolder = message.mdClipsFolder;
        
        // show the hidden elements
        document.getElementById("container").style.display = 'flex';
        document.getElementById("spinner").style.display = 'none';
         // focus the download button
        document.getElementById("download").focus();
        cm.refresh();
    }
}

function showError(err, useEditor = true) {
    // show the hidden elements
    document.getElementById("container").style.display = 'flex';
    document.getElementById("spinner").style.display = 'none';
    
    if (useEditor) {
        // Original behavior - show error in CodeMirror
        cm.setValue(`Error clipping the page\n\n${err}`);
    } else {
        // Batch processing error - show in CodeMirror but don't disrupt UI
        const currentContent = cm.getValue();
        cm.setValue(`${currentContent}\n\nError: ${err}`);
    }
}
