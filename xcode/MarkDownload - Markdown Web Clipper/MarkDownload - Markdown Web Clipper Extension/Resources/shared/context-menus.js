// create the context menus
async function createMenus() {
  const options = await getOptions();

  browser.contextMenus.removeAll();

  if (options.contextMenus) {

    // tab menu (chrome does not support this)
    try {
      browser.contextMenus.create({
        id: "download-markdown-tab",
        title: "下载标签页为 Markdown",
        contexts: ["tab"]
      }, () => { });

      browser.contextMenus.create({
        id: "tab-download-markdown-alltabs",
        title: "下载所有标签页为 Markdown",
        contexts: ["tab"]
      }, () => { });

      browser.contextMenus.create({
        id: "copy-tab-as-markdown-link-tab",
        title: "复制标签页网址为 Markdown 链接",
        contexts: ["tab"]
      }, () => { });

      browser.contextMenus.create({
        id: "copy-tab-as-markdown-link-all-tab",
        title: "复制所有标签页网址为 Markdown 链接列表",
        contexts: ["tab"]
      }, () => { });

      browser.contextMenus.create({
        id: "copy-tab-as-markdown-link-selected-tab",
        title: "复制选中标签页网址为 Markdown 链接列表",
        contexts: ["tab"]
      }, () => { });

      browser.contextMenus.create({
        id: "tab-separator-1",
        type: "separator",
        contexts: ["tab"]
      }, () => { });

      browser.contextMenus.create({
        id: "tabtoggle-includeTemplate",
        type: "checkbox",
        title: "包含前后模板",
        contexts: ["tab"],
        checked: options.includeTemplate
      }, () => { });

      browser.contextMenus.create({
        id: "tabtoggle-downloadImages",
        type: "checkbox",
        title: "下载图片",
        contexts: ["tab"],
        checked: options.downloadImages
      }, () => { });
    } catch {

    }
    // add the download all tabs option to the page context menu as well
    browser.contextMenus.create({
      id: "download-markdown-alltabs",
      title: "下载所有标签页为 Markdown",
      contexts: ["all"]
    }, () => { });
    browser.contextMenus.create({
      id: "separator-0",
      type: "separator",
      contexts: ["all"]
    }, () => { });
    
    // 链接选择功能菜单项
    browser.contextMenus.create({
      id: "start-link-selection",
      title: "📎 选择页面链接进行批量处理",
      contexts: ["all"]
    }, () => { });
    browser.contextMenus.create({
      id: "separator-link-selection",
      type: "separator",
      contexts: ["all"]
    }, () => { });

    // download actions
    browser.contextMenus.create({
      id: "download-markdown-selection",
      title: "下载选中内容为 Markdown",
      contexts: ["selection"]
    }, () => { });
    browser.contextMenus.create({
      id: "download-markdown-all",
      title: "下载标签页为 Markdown",
      contexts: ["all"]
    }, () => { });

    browser.contextMenus.create({
      id: "separator-1",
      type: "separator",
      contexts: ["all"]
    }, () => { });

    // copy to clipboard actions
    browser.contextMenus.create({
      id: "copy-markdown-selection",
      title: "复制选中内容为 Markdown",
      contexts: ["selection"]
    }, () => { });
    browser.contextMenus.create({
      id: "copy-markdown-link",
      title: "复制链接为 Markdown",
      contexts: ["link"]
    }, () => { });
    browser.contextMenus.create({
      id: "copy-markdown-image",
      title: "复制图片为 Markdown",
      contexts: ["image"]
    }, () => { });
    browser.contextMenus.create({
      id: "copy-markdown-all",
      title: "复制标签页为 Markdown",
      contexts: ["all"]
    }, () => { });
    browser.contextMenus.create({
      id: "copy-tab-as-markdown-link",
      title: "复制标签页网址为 Markdown 链接",
      contexts: ["all"]
    }, () => { });
    browser.contextMenus.create({
      id: "copy-tab-as-markdown-link-all",
      title: "复制所有标签页网址为 Markdown 链接列表",
      contexts: ["all"]
    }, () => { });
    browser.contextMenus.create({
      id: "copy-tab-as-markdown-link-selected",
      title: "复制选中标签页网址为 Markdown 链接列表",
      contexts: ["all"]
    }, () => { });
  
    browser.contextMenus.create({
      id: "separator-2",
      type: "separator",
      contexts: ["all"]
    }, () => { });

    if(options.obsidianIntegration){
      // copy to clipboard actions
      browser.contextMenus.create({
        id: "copy-markdown-obsidian",
        title: "发送选中文本到 Obsidian",
        contexts: ["selection"]
      }, () => { });
      browser.contextMenus.create({
        id: "copy-markdown-obsall",
        title: "发送标签页到 Obsidian",
        contexts: ["all"]
      }, () => { });
    }
    browser.contextMenus.create({
      id: "separator-3",
      type: "separator",
      contexts: ["all"]
    }, () => { });

    // options
    browser.contextMenus.create({
      id: "toggle-includeTemplate",
      type: "checkbox",
      title: "包含前后模板",
      contexts: ["all"],
      checked: options.includeTemplate
    }, () => { });

    browser.contextMenus.create({
      id: "toggle-downloadImages",
      type: "checkbox",
      title: "下载图片",
      contexts: ["all"],
      checked: options.downloadImages
    }, () => { });
  }
}