let options = defaultOptions;
let keyupTimeout = null;


const saveOptions = e => {
    e.preventDefault();

    options = {
        frontmatter: document.querySelector("[name='frontmatter']").value,
        backmatter: document.querySelector("[name='backmatter']").value,
        title: document.querySelector("[name='title']").value,
        disallowedChars: document.querySelector("[name='disallowedChars']").value,
        includeTemplate: document.querySelector("[name='includeTemplate']").checked,
        saveAs: document.querySelector("[name='saveAs']").checked,
        downloadImages: document.querySelector("[name='downloadImages']").checked,
        imagePrefix: document.querySelector("[name='imagePrefix']").value,
        mdClipsFolder: document.querySelector("[name='mdClipsFolder']").value,
        turndownEscape: document.querySelector("[name='turndownEscape']").checked,
        contextMenus: document.querySelector("[name='contextMenus']").checked,
        obsidianIntegration: document.querySelector("[name='obsidianIntegration']").checked,
        obsidianVault: document.querySelector("[name='obsidianVault']").value,
        obsidianFolder: document.querySelector("[name='obsidianFolder']").value,
        // Obsidian Local REST API 配置
        obsidianApiUrl: document.querySelector("[name='obsidianApiUrl']")?.value || "http://127.0.0.1:27123",
        obsidianApiKey: document.querySelector("[name='obsidianApiKey']")?.value || "",
        obsidianApiSecure: document.querySelector("[name='obsidianApiSecure']")?.checked || false,

        preserveCodeFormatting: document.querySelector("[name='preserveCodeFormatting']").checked,

        // Add table formatting options
        tableFormatting: {
            stripLinks: document.querySelector("[name='tableFormatting.stripLinks']").checked,
            stripFormatting: document.querySelector("[name='tableFormatting.stripFormatting']").checked,
            prettyPrint: document.querySelector("[name='tableFormatting.prettyPrint']").checked,
            centerText: document.querySelector("[name='tableFormatting.centerText']").checked
        },

        headingStyle: getCheckedValue(document.querySelectorAll("input[name='headingStyle']")),
        hr: getCheckedValue(document.querySelectorAll("input[name='hr']")),
        bulletListMarker: getCheckedValue(document.querySelectorAll("input[name='bulletListMarker']")),
        codeBlockStyle: getCheckedValue(document.querySelectorAll("input[name='codeBlockStyle']")),
        fence: getCheckedValue(document.querySelectorAll("input[name='fence']")),
        emDelimiter: getCheckedValue(document.querySelectorAll("input[name='emDelimiter']")),
        strongDelimiter: getCheckedValue(document.querySelectorAll("input[name='strongDelimiter']")),
        linkStyle: getCheckedValue(document.querySelectorAll("input[name='linkStyle']")),
        linkReferenceStyle: getCheckedValue(document.querySelectorAll("input[name='linkReferenceStyle']")),
        imageStyle: getCheckedValue(document.querySelectorAll("input[name='imageStyle']")),
        imageRefStyle: getCheckedValue(document.querySelectorAll("input[name='imageRefStyle']")),
        downloadMode: getCheckedValue(document.querySelectorAll("input[name='downloadMode']")),
    }

    save();
}

const save = () => {
    const spinner = document.getElementById("spinner");
    spinner.style.display = "block";
    browser.storage.sync.set(options)
        .then(() => {
            browser.contextMenus.update("toggle-includeTemplate", {
                checked: options.includeTemplate
            });
            try {
                browser.contextMenus.update("tabtoggle-includeTemplate", {
                    checked: options.includeTemplate
                });
            } catch { }
            
            browser.contextMenus.update("toggle-downloadImages", {
                checked: options.downloadImages
            });
            try {
                browser.contextMenus.update("tabtoggle-downloadImages", {
                    checked: options.downloadImages
                });
            } catch { }
        })
        .then(() => {
            document.querySelectorAll(".status").forEach(statusEl => {
                statusEl.textContent = "Options Saved 💾";
                statusEl.classList.remove('error');
                statusEl.classList.add('success');
                statusEl.style.opacity = 1;
            });
            setTimeout(() => {
                document.querySelectorAll(".status").forEach(statusEl => {
                    statusEl.style.opacity = 0;
                });
            }, 5000)
            spinner.style.display = "none";
        })
        .catch(err => {
            document.querySelectorAll(".status").forEach(statusEl => {
                statusEl.textContent = err;
                statusEl.classList.remove('success');
                statusEl.classList.add('error');
                statusEl.style.opacity = 1;
            });
            spinner.style.display = "none";
        });
}

function hideStatus() {
    this.style.opacity = 0;
}

const setCurrentChoice = result => {
    options = result;

    // if browser doesn't support the download api (i.e. Safari)
    // we have to use contentLink download mode
    if (!browser.downloads) {
        options.downloadMode = 'contentLink';
        document.querySelectorAll("[name='downloadMode']").forEach(el => el.disabled = true)
        document.querySelector('#downloadMode p').innerText = "The Downloads API is unavailable in this browser."
    }

    const downloadImages = options.downloadImages && options.downloadMode == 'downloadsApi';

    if (!downloadImages && (options.imageStyle == 'markdown' || options.imageStyle.startsWith('obsidian'))) {
        options.imageStyle = 'originalSource';
    }

    options.preserveCodeFormatting = result.preserveCodeFormatting;

    // Initialize tableFormatting with default values if it doesn't exist
    options.tableFormatting = {
        stripLinks: false, // Default to false
        stripFormatting: false,
        prettyPrint: true,
        centerText: true,
        ...options.tableFormatting  // Merge with any existing settings
    };

    document.querySelector("[name='frontmatter']").value = options.frontmatter;
    textareaInput.bind(document.querySelector("[name='frontmatter']"))();
    document.querySelector("[name='backmatter']").value = options.backmatter;
    textareaInput.bind(document.querySelector("[name='backmatter']"))();
    document.querySelector("[name='title']").value = options.title;
    document.querySelector("[name='disallowedChars']").value = options.disallowedChars;
    document.querySelector("[name='includeTemplate']").checked = options.includeTemplate;
    document.querySelector("[name='saveAs']").checked = options.saveAs;
    document.querySelector("[name='downloadImages']").checked = options.downloadImages;
    document.querySelector("[name='imagePrefix']").value = options.imagePrefix;
    document.querySelector("[name='mdClipsFolder']").value = result.mdClipsFolder;
    document.querySelector("[name='turndownEscape']").checked = options.turndownEscape;
    document.querySelector("[name='contextMenus']").checked = options.contextMenus;
    document.querySelector("[name='obsidianIntegration']").checked = options.obsidianIntegration;
    document.querySelector("[name='obsidianVault']").value = options.obsidianVault;
    document.querySelector("[name='obsidianFolder']").value = options.obsidianFolder;
    
    // 设置 Obsidian Local REST API 配置
    document.querySelector("[name='obsidianApiUrl']").value = options.obsidianApiUrl;
    document.querySelector("[name='obsidianApiKey']").value = options.obsidianApiKey;
    document.querySelector("[name='obsidianApiSecure']").checked = options.obsidianApiSecure;

    // Set preserveCodeFormatting checkbox
    document.querySelector("[name='preserveCodeFormatting']").checked = options.preserveCodeFormatting;

    // Set table formatting checkboxes
    document.querySelector("[name='tableFormatting.stripLinks']").checked = Boolean(options.tableFormatting.stripLinks);
    document.querySelector("[name='tableFormatting.stripFormatting']").checked = Boolean(options.tableFormatting.stripFormatting);
    document.querySelector("[name='tableFormatting.prettyPrint']").checked = Boolean(options.tableFormatting.prettyPrint);
    document.querySelector("[name='tableFormatting.centerText']").checked = Boolean(options.tableFormatting.centerText);

    setCheckedValue(document.querySelectorAll("[name='headingStyle']"), options.headingStyle);
    setCheckedValue(document.querySelectorAll("[name='hr']"), options.hr);
    setCheckedValue(document.querySelectorAll("[name='bulletListMarker']"), options.bulletListMarker);
    setCheckedValue(document.querySelectorAll("[name='codeBlockStyle']"), options.codeBlockStyle);
    setCheckedValue(document.querySelectorAll("[name='fence']"), options.fence);
    setCheckedValue(document.querySelectorAll("[name='emDelimiter']"), options.emDelimiter);
    setCheckedValue(document.querySelectorAll("[name='strongDelimiter']"), options.strongDelimiter);
    setCheckedValue(document.querySelectorAll("[name='linkStyle']"), options.linkStyle);
    setCheckedValue(document.querySelectorAll("[name='linkReferenceStyle']"), options.linkReferenceStyle);
    setCheckedValue(document.querySelectorAll("[name='imageStyle']"), options.imageStyle);
    setCheckedValue(document.querySelectorAll("[name='imageRefStyle']"), options.imageRefStyle);
    setCheckedValue(document.querySelectorAll("[name='downloadMode']"), options.downloadMode);

    // 确保在设置完所有选项后刷新显示状态
    refereshElements();
}

const restoreOptions = async () => {
    try {
        const result = await browser.storage.sync.get(defaultOptions);
        
        // 初始化：如果是首次使用，设置默认的Obsidian配置
        if (!result.hasOwnProperty('obsidianApiUrl')) {
            result.obsidianApiUrl = "http://127.0.0.1:27123";
            result.obsidianApiSecure = false;
            result.obsidianApiKey = "";
            result.obsidianVault = "";
            result.obsidianFolder = "";
            
            // 保存初始化后的配置
            await browser.storage.sync.set(result);
        }
        
        setCurrentChoice(result);
    } catch (error) {
        console.error('Error restoring options:', error);
    }
}

function textareaInput(){
    this.parentNode.dataset.value = this.value;
}

const show = (el, show) => {
    if (show) {
        // 显示元素
        el.style.display = 'block';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.height = 'auto';
    } else {
        // 隐藏元素
        el.style.display = 'none';
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.height = '0';
    }
}

const refereshElements = () => {
    document.getElementById("downloadModeGroup").querySelectorAll('.radio-container,.checkbox-container,.textbox-container').forEach(container => {
        show(container, options.downloadMode == 'downloadsApi')
    });

    // document.getElementById("obsidianUriGroup").querySelectorAll('.radio-container,.checkbox-container,.textbox-container').forEach(container => {
    //     show(container, options.downloadMode == 'obsidianUri')
    // });
    show(document.getElementById("mdClipsFolder"), options.downloadMode == 'downloadsApi');

    show(document.getElementById("linkReferenceStyle"), (options.linkStyle == "referenced"));

    show(document.getElementById("imageRefOptions"), (!options.imageStyle.startsWith("obsidian") && options.imageStyle != "noImage"));

    show(document.getElementById("fence"), (options.codeBlockStyle == "fenced"));

    const downloadImages = options.downloadImages && options.downloadMode == 'downloadsApi';

    show(document.getElementById("imagePrefix"), downloadImages);

    document.getElementById('markdown').disabled = !downloadImages;
    document.getElementById('base64').disabled = !downloadImages;
    document.getElementById('obsidian').disabled = !downloadImages;
    document.getElementById('obsidian-nofolder').disabled = !downloadImages;

    // Obsidian 集成配置显示逻辑
    const obsidianEnabled = options.obsidianIntegration;
    
    // 显示/隐藏 Obsidian API 配置
    const obsidianApiConfig = document.getElementById("obsidianApiConfig");
    
    if (obsidianApiConfig) {
        // 如果启用了 Obsidian 集成，显示配置项
        show(obsidianApiConfig, obsidianEnabled);
        
        // 调试信息
        console.log('Obsidian config display:', {
            obsidianEnabled,
            showApiConfig: obsidianEnabled,
            elementFound: !!obsidianApiConfig,
            currentDisplay: obsidianApiConfig.style.display,
            currentOpacity: obsidianApiConfig.style.opacity,
            currentVisibility: obsidianApiConfig.style.visibility,
            currentHeight: obsidianApiConfig.style.height
        });
        
        // 确保配置项在正确的位置显示
        if (obsidianEnabled) {
            obsidianApiConfig.style.marginTop = '16px';
            obsidianApiConfig.style.marginBottom = '16px';
        }
    } else {
        console.error('obsidianApiConfig 元素未找到！');
    }
}

const inputChange = e => {
    if (e) {
        let key = e.target.name;
        let value = e.target.value;
        if (key == "import-file") {
            fr = new FileReader();
            fr.onload = (ev) => {
                let lines = ev.target.result;
                options = JSON.parse(lines);
                setCurrentChoice(options);
                browser.contextMenus.removeAll()
                createMenus()
                save();            
                refereshElements();
            };
            fr.readAsText(e.target.files[0])
        }
        else {
            if (e.target.type == "checkbox") value = e.target.checked;
            
            // Handle nested table formatting options
            if (key.startsWith('tableFormatting.')) {
                const optionName = key.split('.')[1];
                options.tableFormatting = options.tableFormatting || {};
                options.tableFormatting[optionName] = value;
            } else {
                options[key] = value;
            }
 
            if (key == "contextMenus") {
                if (value) { createMenus() }
                else { browser.contextMenus.removeAll() }
            }
    
            save();
            refereshElements();
        }
    }
 }

const inputKeyup = (e) => {
    if (keyupTimeout) clearTimeout(keyupTimeout);
    keyupTimeout = setTimeout(inputChange, 500, e);
}

const buttonClick = (e) => {
    if (e.target.id == "import") {
        document.getElementById("import-file").click();
    }
    else if (e.target.id == "export") {
    
        const json = JSON.stringify(options, null, 2);
        var blob = new Blob([json], { type: "text/json" });
        var url = URL.createObjectURL(blob);
        var d = new Date();

        var datestring = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
        browser.downloads.download({
            url: url,
            saveAs: true,
            filename: `ClipMark-export-${datestring}.json`
        });
    }
}

const loaded = async () => {
    // 初始化所有容器的高度（简化版本）
    document.querySelectorAll('.radio-container,.checkbox-container,.textbox-container,.button-container').forEach(container => {
        // 简单设置高度为auto，让内容自然展开
        container.style.height = 'auto';
        console.log(`容器 ${container.id || container.className} 初始化完成`);
    });

    await restoreOptions();

    document.querySelectorAll('input,textarea,button').forEach(input => {
        if (input.tagName == "TEXTAREA" || input.type == "text") {
            input.addEventListener('keyup', inputKeyup);
        }
        else if (input.tagName == "BUTTON") {
            input.addEventListener('click', buttonClick);
        }
        else input.addEventListener('change', inputChange);
    })
}

// 移除重复的事件监听器，改为在initializeOptionsPage中统一处理
document.querySelectorAll(".save").forEach(el => el.addEventListener("click", saveOptions));
document.querySelectorAll(".status").forEach(el => el.addEventListener("click", hideStatus));
document.querySelectorAll(".input-sizer > textarea").forEach(el => el.addEventListener("input", textareaInput));

// 刷新和关闭功能
let hasUnsavedChanges = false;
let lastSavedData = null;

// 检测表单更改
function trackFormChanges() {
    const formElements = [
        ...document.querySelectorAll('input'),
        ...document.querySelectorAll('textarea'),
        ...document.querySelectorAll('select')
    ];
    
    formElements.forEach(element => {
        element.addEventListener('input', () => {
            hasUnsavedChanges = checkForChanges();
            updateUIState();
        });
        element.addEventListener('change', () => {
            hasUnsavedChanges = checkForChanges();
            updateUIState();
        });
    });
}

// 检查当前表单数据是否与最后保存的数据不同
function checkForChanges() {
    if (!lastSavedData) return false;
    
    const currentData = getCurrentFormData();
    return JSON.stringify(currentData) !== JSON.stringify(lastSavedData);
}

// 获取当前表单数据
function getCurrentFormData() {
    return {
        frontmatter: document.querySelector("[name='frontmatter']")?.value || '',
        backmatter: document.querySelector("[name='backmatter']")?.value || '',
        title: document.querySelector("[name='title']")?.value || '',
        disallowedChars: document.querySelector("[name='disallowedChars']")?.value || '',
        includeTemplate: document.querySelector("[name='includeTemplate']")?.checked || false,
        saveAs: document.querySelector("[name='saveAs']")?.checked || false,
        downloadImages: document.querySelector("[name='downloadImages']")?.checked || false,
        imagePrefix: document.querySelector("[name='imagePrefix']")?.value || '',
        mdClipsFolder: document.querySelector("[name='mdClipsFolder']")?.value || '',
        turndownEscape: document.querySelector("[name='turndownEscape']")?.checked || false,
        contextMenus: document.querySelector("[name='contextMenus']")?.checked || false,
        obsidianIntegration: document.querySelector("[name='obsidianIntegration']")?.checked || false,
        obsidianVault: document.querySelector("[name='obsidianVault']")?.value || '',
        obsidianFolder: document.querySelector("[name='obsidianFolder']")?.value || '',
        preserveCodeFormatting: document.querySelector("[name='preserveCodeFormatting']")?.checked || false,
        tableFormatting: {
            stripLinks: document.querySelector("[name='tableFormatting.stripLinks']")?.checked || false,
            stripFormatting: document.querySelector("[name='tableFormatting.stripFormatting']")?.checked || false,
            prettyPrint: document.querySelector("[name='tableFormatting.prettyPrint']")?.checked || false,
            centerText: document.querySelector("[name='tableFormatting.centerText']")?.checked || false
        },
        headingStyle: getCheckedValue(document.querySelectorAll("input[name='headingStyle']")),
        hr: getCheckedValue(document.querySelectorAll("input[name='hr']")),
        bulletListMarker: getCheckedValue(document.querySelectorAll("input[name='bulletListMarker']")),
        codeBlockStyle: getCheckedValue(document.querySelectorAll("input[name='codeBlockStyle']")),
        fence: getCheckedValue(document.querySelectorAll("input[name='fence']")),
        emDelimiter: getCheckedValue(document.querySelectorAll("input[name='emDelimiter']")),
        strongDelimiter: getCheckedValue(document.querySelectorAll("input[name='strongDelimiter']")),
        linkStyle: getCheckedValue(document.querySelectorAll("input[name='linkStyle']")),
        linkReferenceStyle: getCheckedValue(document.querySelectorAll("input[name='linkReferenceStyle']")),
        imageStyle: getCheckedValue(document.querySelectorAll("input[name='imageStyle']")),
        imageRefStyle: getCheckedValue(document.querySelectorAll("input[name='imageRefStyle']")),
        downloadMode: getCheckedValue(document.querySelectorAll("input[name='downloadMode']")),
        obsidianApiUrl: document.querySelector("[name='obsidianApiUrl']")?.value || "http://127.0.0.1:27123",
        obsidianApiKey: document.querySelector("[name='obsidianApiKey']")?.value || "",
        obsidianApiSecure: document.querySelector("[name='obsidianApiSecure']")?.checked || false
    };
}

// 更新UI状态
function updateUIState() {
    const refreshBtn = document.getElementById('refreshBtn');
    const closeBtn = document.getElementById('closeBtn');
    
    if (hasUnsavedChanges) {
        // 添加视觉提示表示有未保存的更改
        refreshBtn.style.boxShadow = '0 0 0 2px rgba(255, 193, 7, 0.5)';
        closeBtn.style.boxShadow = '0 0 0 2px rgba(255, 193, 7, 0.5)';
        refreshBtn.title = '⚠️ 有未保存的更改 - 点击刷新';
        closeBtn.title = '⚠️ 有未保存的更改 - 点击关闭';
    } else {
        refreshBtn.style.boxShadow = '';
        closeBtn.style.boxShadow = '';
        refreshBtn.title = '刷新页面';
        closeBtn.title = '关闭页面';
    }
}

// 刷新按钮功能
function handleRefresh() {
    if (hasUnsavedChanges) {
        const confirmRefresh = confirm(
            '您有未保存的更改！\n\n' +
            '点击"确定"丢弃更改并刷新页面\n' +
            '点击"取消"返回继续编辑\n\n' +
            '建议先保存设置再刷新。'
        );
        
        if (!confirmRefresh) {
            return;
        }
    }
    
    // 显示刷新状态
    const refreshBtn = document.getElementById('refreshBtn');
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '🔄 刷新中...';
    refreshBtn.disabled = true;
    
    // 延迟一点时间让用户看到反馈
    setTimeout(() => {
        window.location.reload();
    }, 300);
}

// 关闭按钮功能
function handleClose() {
    if (hasUnsavedChanges) {
        const confirmClose = confirm(
            '您有未保存的更改！\n\n' +
            '点击"确定"丢弃更改并关闭页面\n' +
            '点击"取消"返回继续编辑\n\n' +
            '建议先保存设置再关闭。'
        );
        
        if (!confirmClose) {
            return;
        }
    }
    
    // 尝试关闭窗口
    try {
        // 对于扩展选项页面，通常在新标签页中打开
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    } catch (error) {
        // 如果无法关闭窗口，导航到扩展管理页面或显示消息

        
        // 尝试导航到chrome扩展页面（仅Chrome）
        if (navigator.userAgent.includes('Chrome')) {
            try {
                window.location.href = 'chrome://extensions/';
                return;
            } catch (e) {
                // 忽略错误，继续下一步
            }
        }
        
        // 显示消息提示用户手动关闭
        alert('请手动关闭此标签页');
    }
}

// 修改原有的save函数，更新最后保存的数据
const originalSave = save;
window.save = function() {
    const spinner = document.getElementById("spinner");
    spinner.style.display = "block";
    
    browser.storage.sync.set(options)
        .then(() => {
            browser.contextMenus.update("toggle-includeTemplate", {
                checked: options.includeTemplate
            });
            try {
                browser.contextMenus.update("tabtoggle-includeTemplate", {
                    checked: options.includeTemplate
                });
            } catch { }
            
            browser.contextMenus.update("toggle-downloadImages", {
                checked: options.downloadImages
            });
            try {
                browser.contextMenus.update("tabtoggle-downloadImages", {
                    checked: options.downloadImages
                });
            } catch { }
        })
        .then(() => {
            document.querySelectorAll(".status").forEach(statusEl => {
                statusEl.textContent = "设置已保存 💾";
                statusEl.classList.remove('error');
                statusEl.classList.add('success');
                statusEl.style.opacity = 1;
            });
            setTimeout(() => {
                document.querySelectorAll(".status").forEach(statusEl => {
                    statusEl.style.opacity = 0;
                });
            }, 5000);
            spinner.style.display = "none";
            
            // 保存成功后更新最后保存的数据
            lastSavedData = getCurrentFormData();
            hasUnsavedChanges = false;
            updateUIState();
        })
        .catch(err => {
            document.querySelectorAll(".status").forEach(statusEl => {
                statusEl.textContent = err;
                statusEl.classList.remove('success');
                statusEl.classList.add('error');
                statusEl.style.opacity = 1;
            });
            spinner.style.display = "none";
            console.error('Save failed:', err);
        });
};

/**
 * 绑定测试按钮事件
 */
function bindTestButtonEvent() {
    const testConnectionBtn = document.getElementById('testObsidianConnection');
    if (testConnectionBtn) {
        console.log('找到测试按钮，绑定事件');
        testConnectionBtn.addEventListener('click', async () => {
            console.log('测试按钮被点击');
            await testObsidianConnection();
        });
    } else {
        console.warn('测试按钮未找到，将在下次刷新时重试');
        // 如果按钮还没创建，稍后重试
        setTimeout(bindTestButtonEvent, 1000);
    }
}

/**
 * 测试 Obsidian API 连接
 */
async function testObsidianConnection() {
    try {
        const testBtn = document.getElementById('testObsidianConnection');
        const resultDiv = document.getElementById('connectionTestResult');
        
        if (!testBtn || !resultDiv) {
            console.error('测试按钮或结果区域未找到');
            return;
        }
        
        // 禁用按钮，显示加载状态
        testBtn.disabled = true;
        testBtn.textContent = '🔄 测试中...';
        resultDiv.style.display = 'none';
        
        // 获取当前配置
        const options = getCurrentFormData();
        
        console.log('开始测试连接，配置:', {
            apiUrl: options.obsidianApiUrl,
            apiSecure: options.obsidianApiSecure,
            hasApiKey: !!options.obsidianApiKey
        });
        
        // 发送测试消息到 service worker
        console.log('发送测试消息到 service worker...');
        console.log('消息内容:', { type: 'test-obsidian-connection', options: options });
        
        console.log('准备发送消息到 service worker...');
        
        // 尝试最简单的方式
        let result;
        try {
            console.log('发送消息...');
            result = await browser.runtime.sendMessage({
                type: 'test-obsidian-connection',
                options: options
            });
            console.log('sendMessage 直接返回:', result);
        } catch (error) {
            console.error('sendMessage 出错:', error);
            throw error;
        }
        
        console.log('最终结果:', result);
        console.log('响应类型:', typeof result);
        console.log('响应是否为空:', result === null || result === undefined);
        console.log('响应是否有 success 属性:', result && result.hasOwnProperty('success'));
        
        // 检查结果是否有效
        if (!result) {
            throw new Error('未收到有效的测试结果');
        }
        
        // 显示结果
        resultDiv.style.display = 'block';
        if (result.success) {
            resultDiv.innerHTML = `
                <div style="color: #4caf50; padding: 8px; background: #e8f5e8; border-radius: 4px; border: 1px solid #4caf50;">
                    ✅ ${result.message}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="color: #f44336; padding: 8px; background: #ffebee; border-radius: 4px; border: 1px solid #f44336;">
                    ❌ ${result.message}
                    ${result.details ? `<br><small>详细信息: ${JSON.stringify(result.details)}</small>` : ''}
                </div>
            `;
        }
        
    } catch (error) {
        console.error('连接测试失败:', error);
        
        const resultDiv = document.getElementById('connectionTestResult');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div style="color: #f44336; padding: 8px; background: #ffebee; border-radius: 4px; border: 1px solid #f44336;">
                    ❌ 测试失败: ${error.message}
                </div>
            `;
        }
    } finally {
        // 恢复按钮状态
        const testBtn = document.getElementById('testObsidianConnection');
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.textContent = '🔗 测试 Obsidian 连接';
        }
    }
}

// 页面加载完成后初始化
function initializeOptionsPage() {
    // 初始化追踪状态
    lastSavedData = getCurrentFormData();
    hasUnsavedChanges = false;
    updateUIState();
    trackFormChanges();
    
    // 绑定按钮事件
    const refreshBtn = document.getElementById('refreshBtn');
    const closeBtn = document.getElementById('closeBtn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', handleClose);
    }
    
    // 绑定 Obsidian 集成启用/禁用事件
    const obsidianIntegrationCheckbox = document.querySelector('[name="obsidianIntegration"]');
    if (obsidianIntegrationCheckbox) {
        obsidianIntegrationCheckbox.addEventListener('change', () => {
            console.log('Obsidian integration toggled:', obsidianIntegrationCheckbox.checked);
            refereshElements();
            trackFormChanges();
        });
    }
    
    // 监听页面卸载事件，提醒用户保存未保存的更改
    window.addEventListener('beforeunload', (event) => {
        if (hasUnsavedChanges) {
            const message = '您有未保存的更改，确定要离开吗？';
            event.returnValue = message;
            return message;
        }
    });
    
    // 延迟绑定测试按钮事件，确保元素已创建
    setTimeout(() => {
        bindTestButtonEvent();
    }, 500);
}

// 在DOM加载完成后初始化
document.addEventListener("DOMContentLoaded", async () => {
    await loaded(); // 原有的初始化函数
    initializeOptionsPage(); // 新的初始化函数
    
    // 延迟刷新显示状态，确保所有元素都已正确初始化
    setTimeout(() => {
        console.log('延迟刷新显示状态...');
        refereshElements();
    }, 100);
});

/// https://www.somacon.com/p143.php
// return the value of the radio button that is checked
// return an empty string if none are checked, or
// there are no radio buttons
function getCheckedValue(radioObj) {
    if (!radioObj)
        return "";
    var radioLength = radioObj.length;
    if (radioLength == undefined)
        if (radioObj.checked)
            return radioObj.value;
        else
            return "";
    for (var i = 0; i < radioLength; i++) {
        if (radioObj[i].checked) {
            return radioObj[i].value;
        }
    }
    return "";
}

// set the radio button with the given value as being checked
// do nothing if there are no radio buttons
// if the given value does not exist, all the radio buttons
// are reset to unchecked
function setCheckedValue(radioObj, newValue) {
    if (!radioObj)
        return;
    var radioLength = radioObj.length;
    if (radioLength == undefined) {
        radioObj.checked = (radioObj.value == newValue.toString());
        return;
    }
    for (var i = 0; i < radioLength; i++) {
        radioObj[i].checked = false;
        if (radioObj[i].value == newValue.toString()) {
            radioObj[i].checked = true;
        }
    }
}