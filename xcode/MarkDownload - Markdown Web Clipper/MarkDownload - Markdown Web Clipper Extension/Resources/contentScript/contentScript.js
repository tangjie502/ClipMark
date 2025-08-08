function notifyExtension() {
    // send a message that the content should be clipped
    browser.runtime.sendMessage({ type: "clip", dom: content});
}

function getHTMLOfDocument() {
    // make sure a title tag exists so that pageTitle is not empty and
    // a filename can be genarated.
    if (document.head.getElementsByTagName('title').length == 0) {
        let titleEl = document.createElement('title');
        // prepate a good default text (the text displayed in the window title)
        titleEl.innerText = document.title;
        document.head.append(titleEl);
    }

    // if the document doesn't have a "base" element make one
    // this allows the DOM parser in future steps to fix relative uris

    let baseEls = document.head.getElementsByTagName('base');
    let baseEl;

    if (baseEls.length > 0) {
        baseEl = baseEls[0];
    } else {
        baseEl = document.createElement('base');
        document.head.append(baseEl);
    }

    // make sure the 'base' element always has a good 'href`
    // attribute so that the DOMParser generates usable
    // baseURI and documentURI properties when used in the
    // background context.

    let href = baseEl.getAttribute('href');

    if (!href || !href.startsWith(window.location.origin)) {
        baseEl.setAttribute('href', window.location.href);
    }

    // remove the hidden content from the page
    removeHiddenNodes(document.body);

    // get the content of the page as a string
    return document.documentElement.outerHTML;
}

// code taken from here: https://www.reddit.com/r/javascript/comments/27bcao/anyone_have_a_method_for_finding_all_the_hidden/
function removeHiddenNodes(root) {
    let nodeIterator, node,i = 0;

    nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT, function(node) {
      let nodeName = node.nodeName.toLowerCase();
      if (nodeName === "script" || nodeName === "style" || nodeName === "noscript" || nodeName === "math") {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.offsetParent === void 0) {
        return NodeFilter.FILTER_ACCEPT;
      }
      let computedStyle = window.getComputedStyle(node, null);
      if (computedStyle.getPropertyValue("visibility") === "hidden" || computedStyle.getPropertyValue("display") === "none") {
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    while ((node = nodeIterator.nextNode()) && ++i) {
      if (node.parentNode instanceof HTMLElement) {
        node.parentNode.removeChild(node);
      }
    }
    return root
  }

// code taken from here: https://stackoverflow.com/a/5084044/304786
function getHTMLOfSelection() {
    var range;
    if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        return range.htmlText;
    } else if (window.getSelection) {
        var selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let content = '';
            for (let i = 0; i < selection.rangeCount; i++) {
                range = selection.getRangeAt(0);
                var clonedSelection = range.cloneContents();
                var div = document.createElement('div');
                div.appendChild(clonedSelection);
                content += div.innerHTML;
            }
            return content;
        } else {
            return '';
        }
    } else {
        return '';
    }
}

function getSelectionAndDom() {
    try {
      const dom = getHTMLOfDocument();
      const selection = getHTMLOfSelection();
      
      if (!dom) {
        console.error('Failed to get document HTML');
        return null;
      }
      
      return {
        selection: selection,
        dom: dom
      };
    } catch (error) {
      console.error('Error in getSelectionAndDom:', error);
      return null;
    }
  }

// This function must be called in a visible page, such as a browserAction popup
// or a content script. Calling it in a background page has no effect!
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

function downloadMarkdown(filename, text) {
    let datauri = `data:text/markdown;base64,${text}`;
    var link = document.createElement('a');
    link.download = filename;
    link.href = datauri;
    link.click();
}

function downloadImage(filename, url) {

    /* Link with a download attribute? CORS says no.
    var link = document.createElement('a');
    link.download = filename.substring(0, filename.lastIndexOf('.'));
    link.href = url;
    link.click();
    */

    /* Try via xhr? Blocked by CORS.
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {

        var file = new Blob([xhr.response], {type: 'application/octet-stream'});
        var link = document.createElement('a');
        link.download = filename;//.substring(0, filename.lastIndexOf('.'));
        link.href = window.URL.createObjectURL(file);

        link.click();
    }
    xhr.send();
    */

    /* draw on canvas? Inscure operation
    let img = new Image();
    img.src = url;
    img.onload = () => {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        var link = document.createElement('a');
        const ext = filename.substring(filename.lastIndexOf('.'));
        link.download = filename;
        link.href = canvas.toDataURL(`image/png`);

        link.click();
    }
    */
}

(function loadPageContextScript(){
    var s = document.createElement('script');
    s.src = browser.runtime.getURL('contentScript/pageContext.js');
    (document.head||document.documentElement).appendChild(s);
})()

// ========================================
// 链接选择功能 (Link Selection Feature)
// ========================================

// 防止重复声明
if (typeof window.marksnipLinkSelector !== 'undefined') {
                console.log('ClipMark: Link selector already exists, skipping initialization');
} else {

// 链接选择状态管理
const linkSelector = window.marksnipLinkSelector = {
    isActive: false,
    selectedLinks: new Set(),
    allSelectableLinks: [],
    floatingPanel: null,
    
    // CSS类名常量
    CSS_CLASSES: {
        selectable: 'marksnip-selectable-link',
        selected: 'marksnip-selected-link',
        overlay: 'marksnip-selection-overlay',
        panel: 'marksnip-floating-panel'
    },
    
    // 启用链接选择模式
    enable() {
        if (this.isActive) return
        
        this.isActive = true
        this.selectedLinks.clear()
        
        // 添加全局样式
        this.addStyles()
        
        // 标注所有可选链接
        this.markSelectableLinks()
        
        // 创建浮动面板
        this.createFloatingPanel()
        
        // 添加事件监听器
        this.addEventListeners()
        
        // 添加页面遮罩
        this.addPageOverlay()
        
            
    },
    
    // 禁用链接选择模式
    disable() {
        if (!this.isActive) return
        
        this.isActive = false
        
        // 移除事件监听器
        this.removeEventListeners()
        
        // 清理DOM
        this.cleanup()
        
            
    },
    
    // 添加CSS样式
    addStyles() {
        if (document.getElementById('marksnip-link-selector-styles')) return
        
        const style = document.createElement('style')
        style.id = 'marksnip-link-selector-styles'
        style.textContent = `
            /* 可选链接样式 */
            .${this.CSS_CLASSES.selectable} {
                position: relative;
                outline: 2px dashed #007acc !important;
                outline-offset: 2px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
            }
            
            .${this.CSS_CLASSES.selectable}:hover {
                outline: 2px solid #007acc !important;
                background-color: rgba(0, 122, 204, 0.1) !important;
            }
            
            /* 已选择链接样式 */
            .${this.CSS_CLASSES.selected} {
                outline: 3px solid #28a745 !important;
                background-color: rgba(40, 167, 69, 0.2) !important;
                position: relative !important;
            }
            
            .${this.CSS_CLASSES.selected}::after {
                content: "✓";
                position: absolute !important;
                top: -10px !important;
                right: -10px !important;
                background: #28a745 !important;
                color: white !important;
                border-radius: 50% !important;
                width: 20px !important;
                height: 20px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 12px !important;
                font-weight: bold !important;
                z-index: 999999 !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
            }
            
            /* 页面遮罩 */
            .${this.CSS_CLASSES.overlay} {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.3) !important;
                z-index: 999990 !important;
                pointer-events: none !important;
            }
            
            /* 浮动面板样式 */
            .${this.CSS_CLASSES.panel} {
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                background: white !important;
                border: 2px solid #007acc !important;
                border-radius: 8px !important;
                padding: 16px !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
                z-index: 1000000 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                font-size: 14px !important;
                min-width: 200px !important;
                user-select: none !important;
            }
            
            .${this.CSS_CLASSES.panel} h3 {
                margin: 0 0 12px 0 !important;
                color: #007acc !important;
                font-size: 16px !important;
                font-weight: 600 !important;
            }
            
            .${this.CSS_CLASSES.panel} .count {
                margin: 8px 0 !important;
                color: #333 !important;
                font-weight: 500 !important;
            }
            
            .${this.CSS_CLASSES.panel} button {
                background: #28a745 !important;
                color: white !important;
                border: none !important;
                padding: 8px 16px !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                transition: background 0.2s ease !important;
                margin-right: 8px !important;
            }
            
            .${this.CSS_CLASSES.panel} button:hover {
                background: #218838 !important;
            }
            
            .${this.CSS_CLASSES.panel} button:disabled {
                background: #6c757d !important;
                cursor: not-allowed !important;
            }
            
            .${this.CSS_CLASSES.panel} .cancel-btn {
                background: #dc3545 !important;
            }
            
            .${this.CSS_CLASSES.panel} .cancel-btn:hover {
                background: #c82333 !important;
            }
            
            .${this.CSS_CLASSES.panel} .select-all-btn {
                background: #28a745 !important;
                color: white !important;
            }
            
            .${this.CSS_CLASSES.panel} .select-all-btn:hover {
                background: #218838 !important;
            }
            
            .${this.CSS_CLASSES.panel} .unselect-all-btn {
                background: #6c757d !important;
                color: white !important;
            }
            
            .${this.CSS_CLASSES.panel} .unselect-all-btn:hover {
                background: #5a6268 !important;
            }
            
            .${this.CSS_CLASSES.panel} .select-all-btn:disabled {
                background: #6c757d !important;
                cursor: not-allowed !important;
                opacity: 0.6 !important;
            }
            
            .${this.CSS_CLASSES.panel} .unselect-all-btn:disabled {
                background: #6c757d !important;
                cursor: not-allowed !important;
                opacity: 0.6 !important;
            }
        `
        
        document.head.appendChild(style)
    },
    
    // 标注所有可选择的链接
    markSelectableLinks() {
        this.allSelectableLinks = []
        const links = document.querySelectorAll('a[href]')
        
        links.forEach(link => {
            // 过滤掉不需要的链接
            const href = link.getAttribute('href')
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                link.classList.add(this.CSS_CLASSES.selectable)
                this.allSelectableLinks.push(link)
            }
        })
        
            
    },
    
    // 添加页面遮罩
    addPageOverlay() {
        const overlay = document.createElement('div')
        overlay.className = this.CSS_CLASSES.overlay
        document.body.appendChild(overlay)
    },
    
    // 创建浮动面板
    createFloatingPanel() {
        if (this.floatingPanel) return
        
        const panel = document.createElement('div')
        panel.className = this.CSS_CLASSES.panel
        const modifierKey = this.getModifierKeyName()
        panel.innerHTML = `
            <h3>🔗 链接选择器</h3>
            <div class="count">已选择: <span id="selected-count">0</span> 个链接</div>
            <div style="font-size: 12px; color: #666; margin: 8px 0;">
                按住 <strong>${modifierKey}</strong> + 点击链接进行选择<br>
                再次点击可取消选择，按 <strong>ESC</strong> 退出
            </div>
            <div style="margin-top: 12px;">
                <button id="select-all-links" class="select-all-btn">全选</button>
                <button id="unselect-all-links" class="unselect-all-btn">取消全选</button>
            </div>
            <div style="margin-top: 8px;">
                <button id="finish-selection" disabled>选择完毕</button>
                <button id="cancel-selection" class="cancel-btn">取消</button>
            </div>
        `
        
        document.body.appendChild(panel)
        this.floatingPanel = panel
        
        // 绑定按钮事件
        panel.querySelector('#finish-selection').addEventListener('click', () => {
            this.finishSelection()
        })
        
        panel.querySelector('#cancel-selection').addEventListener('click', () => {
            this.disable()
        })
        
        panel.querySelector('#select-all-links').addEventListener('click', () => {
            this.selectAllLinks()
        })
        
        panel.querySelector('#unselect-all-links').addEventListener('click', () => {
            this.unselectAllLinks()
        })
    },
    
    // 更新浮动面板显示
    updatePanel() {
        if (!this.floatingPanel) return
        
        const countElement = this.floatingPanel.querySelector('#selected-count')
        const finishButton = this.floatingPanel.querySelector('#finish-selection')
        const selectAllButton = this.floatingPanel.querySelector('#select-all-links')
        const unselectAllButton = this.floatingPanel.querySelector('#unselect-all-links')
        
        const selectedCount = this.selectedLinks.size
        const totalCount = this.allSelectableLinks.length
        
        countElement.textContent = selectedCount
        finishButton.disabled = selectedCount === 0
        
        // 根据选择状态更新按钮可用性
        selectAllButton.disabled = selectedCount === totalCount
        unselectAllButton.disabled = selectedCount === 0
        
        // 更新按钮文本以显示状态
        selectAllButton.textContent = selectedCount === totalCount ? '已全选' : `全选 (${totalCount})`
        unselectAllButton.textContent = selectedCount === 0 ? '取消全选' : `取消全选 (${selectedCount})`
    },
    
    // 事件监听器
    handleClick: null,
    handleKeyDown: null,
    handleKeyUp: null,
    
    // 添加事件监听器
    addEventListeners() {
        // 点击事件处理器
        this.handleClick = (e) => {
            // 检查是否按下了修饰键
            const isModified = this.isMacOS() ? e.metaKey : e.ctrlKey
            
            if (!isModified) return
            
            const target = e.target.closest('a[href]')
            if (!target || !target.classList.contains(this.CSS_CLASSES.selectable)) return
            
            e.preventDefault()
            e.stopPropagation()
            
            this.toggleLinkSelection(target)
        }
        
        // 键盘事件处理器  
        this.handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.disable()
            }
        }
        
        // 添加监听器
        document.addEventListener('click', this.handleClick, true)
        document.addEventListener('keydown', this.handleKeyDown, true)
    },
    
    // 移除事件监听器
    removeEventListeners() {
        if (this.handleClick) {
            document.removeEventListener('click', this.handleClick, true)
        }
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown, true)
        }
    },
    
    // 切换链接选择状态
    toggleLinkSelection(link) {
        if (this.selectedLinks.has(link)) {
            // 取消选择
            this.selectedLinks.delete(link)
            link.classList.remove(this.CSS_CLASSES.selected)
        } else {
            // 选择
            this.selectedLinks.add(link)
            link.classList.add(this.CSS_CLASSES.selected)
        }
        
        this.updatePanel()
    },
    
    // 全选所有链接
    selectAllLinks() {
        this.allSelectableLinks.forEach(link => {
            if (!this.selectedLinks.has(link)) {
                this.selectedLinks.add(link)
                link.classList.add(this.CSS_CLASSES.selected)
            }
        })
        
        this.updatePanel()
            
    },
    
    // 取消全选所有链接
    unselectAllLinks() {
        this.selectedLinks.forEach(link => {
            link.classList.remove(this.CSS_CLASSES.selected)
        })
        
        this.selectedLinks.clear()
        this.updatePanel()

    },
    
    // 完成选择
    finishSelection() {
        const selectedUrls = Array.from(this.selectedLinks).map(link => ({
            url: link.href,
            text: link.textContent.trim()
        }))
        
        // 发送选中的链接到扩展
        browser.runtime.sendMessage({
            type: "batch-links-selected",
            links: selectedUrls
        })
        
        this.disable()
    },
    
    // 清理DOM
    cleanup() {
        // 移除样式
        const style = document.getElementById('marksnip-link-selector-styles')
        if (style) style.remove()
        
        // 移除所有标记
        this.allSelectableLinks.forEach(link => {
            link.classList.remove(this.CSS_CLASSES.selectable, this.CSS_CLASSES.selected)
        })
        
        // 移除遮罩
        const overlay = document.querySelector(`.${this.CSS_CLASSES.overlay}`)
        if (overlay) overlay.remove()
        
        // 移除浮动面板
        if (this.floatingPanel) {
            this.floatingPanel.remove()
            this.floatingPanel = null
        }
        
        // 清空状态
        this.allSelectableLinks = []
        this.selectedLinks.clear()
    },
    
    // 检测操作系统
    isMacOS() {
        return navigator.platform.toUpperCase().indexOf('MAC') >= 0
    },
    
    // 获取修饰键名称（用于显示提示）
    getModifierKeyName() {
        return this.isMacOS() ? 'Command' : 'Ctrl'
    }
}

// 监听来自扩展的消息
if (!window.marksnipMessageListenerAdded) {
    window.marksnipMessageListenerAdded = true;
    
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "start-link-selection") {
            (window.marksnipLinkSelector || linkSelector).enable()
            return Promise.resolve({success: true})
        }
        
        // 对于其他消息类型，返回false表示不处理
        return false
    })
}

} // 结束防重复声明的if语句
