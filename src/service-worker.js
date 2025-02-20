importScripts(
  'browser-polyfill.min.js',
  'background/moment.min.js',
  'background/apache-mime-types.js',
  'shared/default-options.js',
  'shared/context-menus.js'
);

// Log platform info
browser.runtime.getPlatformInfo().then(async platformInfo => {
  const browserInfo = browser.runtime.getBrowserInfo ? await browser.runtime.getBrowserInfo() : "Can't get browser info"
  console.info(platformInfo, browserInfo);
});

// Initialize listeners synchronously
browser.runtime.onMessage.addListener(handleMessages);
browser.contextMenus.onClicked.addListener(handleContextMenuClick);
browser.commands.onCommand.addListener(handleCommands);
browser.downloads.onChanged.addListener(handleDownloadChange);

// Create context menus when service worker starts
createMenus();

// Track active downloads
const activeDownloads = new Map();

/**
 * Handle messages from content scripts and popup
 */
async function handleMessages(message, sender, sendResponse) {
  switch (message.type) {
    case "clip":
      await handleClipRequest(message, sender.tab?.id);
      break;
    case "download":
      await handleDownloadRequest(message);
      break;
    case "offscreen-ready":
      // The offscreen document is ready - no action needed
      break;
    case "markdown-result":
      await handleMarkdownResult(message);
      break;
    case "download-complete":
      handleDownloadComplete(message);
      break;
  }
}

/**
 * Ensures the offscreen document exists
 */
async function ensureOffscreenDocumentExists() {
  // Check if offscreen document exists already
  if (typeof chrome !== 'undefined' && chrome.offscreen) {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length > 0) return;
    
    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: ['DOM_PARSER', 'CLIPBOARD'],
      justification: 'HTML to Markdown conversion'
    });
  } else {
    // Firefox doesn't support offscreen API, use a different approach
    // Firefox still allows DOM access in background scripts/service workers
    importScripts(
      'background/turndown.js',
      'background/turndown-plugin-gfm.js',
      'background/Readability.js'
    );
  }
}

/**
 * Handle clip request - Send to offscreen document or process directly in Firefox
 */
async function handleClipRequest(message, tabId) {
  if (typeof chrome !== 'undefined' && chrome.offscreen) {
    // Chrome - use offscreen document
    await ensureOffscreenDocumentExists();
    
    // Get options to pass to offscreen document
    const options = await getOptions();
    
    // Generate request ID to track this specific request
    const requestId = generateRequestId();
    
    // Send to offscreen for processing with options included
    await browser.runtime.sendMessage({
      target: 'offscreen',
      type: 'process-content',
      requestId: requestId,
      data: message,
      tabId: tabId,
      options: options  // Pass options directly
    });
  } else {
    // Firefox - process directly (Firefox allows DOM access in service workers)
    const article = await getArticleFromDom(message.dom);
    
    // Handle selection if provided
    if (message.selection && message.clipSelection) {
      article.content = message.selection;
    }
    
    // Convert article to markdown
    const { markdown, imageList } = await convertArticleToMarkdown(article);
    
    // Format title and folder
    article.title = await formatTitle(article);
    const mdClipsFolder = await formatMdClipsFolder(article);
    
    // Send results to popup
    await browser.runtime.sendMessage({
      type: "display.md",
      markdown: markdown,
      article: article,
      imageList: imageList,
      mdClipsFolder: mdClipsFolder,
      options: await getOptions()
    });
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Process markdown result from offscreen document
 */
async function handleMarkdownResult(message) {
  const { result, requestId } = message;
  
  // Forward the result to the popup
  await browser.runtime.sendMessage({
    type: "display.md",
    markdown: result.markdown,
    article: result.article,
    imageList: result.imageList,
    mdClipsFolder: result.mdClipsFolder,
    options: await getOptions()
  });
}

/**
 * Handle download request
 */
async function handleDownloadRequest(message) {
  if (typeof chrome !== 'undefined' && chrome.offscreen) {
    // Chrome - use offscreen document for download handling
    await ensureOffscreenDocumentExists();
    
    // Send download request to offscreen
    await browser.runtime.sendMessage({
      target: 'offscreen',
      type: 'download-markdown',
      markdown: message.markdown,
      title: message.title,
      tabId: message.tab.id,
      imageList: message.imageList,
      mdClipsFolder: message.mdClipsFolder,
      options: await getOptions()
    });
  } else {
    // Firefox - handle download directly
    await downloadMarkdown(
      message.markdown,
      message.title,
      message.tab.id,
      message.imageList,
      message.mdClipsFolder
    );
  }
}

/**
 * Download listener function factory
 */
function downloadListener(id, url) {
  activeDownloads.set(id, url);
  return function handleChange(delta) {
    if (delta.id === id && delta.state && delta.state.current === "complete") {
      URL.revokeObjectURL(url);
      activeDownloads.delete(id);
    }
  };
}

/**
 * Handle download change events
 */
function handleDownloadChange(delta) {
  if (activeDownloads.has(delta.id) && delta.state && delta.state.current === "complete") {
    const url = activeDownloads.get(delta.id);
    URL.revokeObjectURL(url);
    activeDownloads.delete(delta.id);
  }
}

/**
 * Handle download complete notification from offscreen
 */
function handleDownloadComplete(message) {
  const { downloadId, url } = message;
  if (downloadId && url) {
    activeDownloads.set(downloadId, url);
  }
}

/**
 * Handle context menu clicks
 */
async function handleContextMenuClick(info, tab) {
  // One of the copy to clipboard commands
  if (info.menuItemId.startsWith("copy-markdown")) {
    await copyMarkdownFromContext(info, tab);
  }
  else if (info.menuItemId == "download-markdown-alltabs" || info.menuItemId == "tab-download-markdown-alltabs") {
    await downloadMarkdownForAllTabs(info);
  }
  // One of the download commands
  else if (info.menuItemId.startsWith("download-markdown")) {
    await downloadMarkdownFromContext(info, tab);
  }
  // Copy tab as markdown link
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link-all")) {
    await copyTabAsMarkdownLinkAll(tab);
  }
  // Copy only selected tab as markdown link
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link-selected")) {
    await copySelectedTabAsMarkdownLink(tab);
  }
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link")) {
    await copyTabAsMarkdownLink(tab);
  }
  // A settings toggle command
  else if (info.menuItemId.startsWith("toggle-") || info.menuItemId.startsWith("tabtoggle-")) {
    await toggleSetting(info.menuItemId.split('-')[1]);
  }
}

/**
 * Handle keyboard commands
 */
async function handleCommands(command) {
  const tab = await browser.tabs.getCurrent();
  
  if (command == "download_tab_as_markdown") {
    const info = { menuItemId: "download-markdown-all" };
    await downloadMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_as_markdown") {
    const info = { menuItemId: "copy-markdown-all" };
    await copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_selection_as_markdown") {
    const info = { menuItemId: "copy-markdown-selection" };
    await copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_as_markdown_link") {
    await copyTabAsMarkdownLink(tab);
  }
  else if (command == "copy_selected_tab_as_markdown_link") {
    await copySelectedTabAsMarkdownLink(tab);
  }
  else if (command == "copy_selection_to_obsidian") {
    const info = { menuItemId: "copy-markdown-obsidian" };
    await copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_to_obsidian") {
    const info = { menuItemId: "copy-markdown-obsall" };
    await copyMarkdownFromContext(info, tab);
  }
}

/**
 * Toggle extension setting
 */
async function toggleSetting(setting, options = null) {
  if (options == null) {
    await toggleSetting(setting, await getOptions());
  }
  else {
    options[setting] = !options[setting];
    await browser.storage.sync.set(options);
    if (setting == "includeTemplate") {
      browser.contextMenus.update("toggle-includeTemplate", {
        checked: options.includeTemplate
      });
      try {
        browser.contextMenus.update("tabtoggle-includeTemplate", {
          checked: options.includeTemplate
        });
      } catch { }
    }
    
    if (setting == "downloadImages") {
      browser.contextMenus.update("toggle-downloadImages", {
        checked: options.downloadImages
      });
      try {
        browser.contextMenus.update("tabtoggle-downloadImages", {
          checked: options.downloadImages
        });
      } catch { }
    }
  }
}

/**
 * Ensure content script is loaded
 */
async function ensureScripts(tabId) {
  try {
    // Check if the content script is already loaded
    const results = await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return typeof getSelectionAndDom === 'function';
      }
    });
    
    // If the function doesn't exist or the script check failed, inject the content script
    if (!results || !results[0]?.result) {
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ["/contentScript/contentScript.js"]
      });
    }
  } catch (error) {
    console.error("Failed to ensure scripts:", error);
  }
}

/**
 * Download markdown from context menu
 */
async function downloadMarkdownFromContext(info, tab) {
  await ensureScripts(tab.id);
  
  if (typeof chrome !== 'undefined' && chrome.offscreen) {
    // Chrome - use offscreen document
    await ensureOffscreenDocumentExists();
    
    await browser.runtime.sendMessage({
      target: 'offscreen',
      type: 'process-context-menu',
      action: 'download',
      info: info,
      tabId: tab.id,
      options: await getOptions()
    });
  } else {
    // Firefox - process directly
    const article = await getArticleFromContent(tab.id, info.menuItemId == "download-markdown-selection");
    const title = await formatTitle(article);
    const { markdown, imageList } = await convertArticleToMarkdown(article);
    const mdClipsFolder = await formatMdClipsFolder(article);
    await downloadMarkdown(markdown, title, tab.id, imageList, mdClipsFolder);
  }
}

/**
 * Copy markdown from context menu
 */
async function copyMarkdownFromContext(info, tab) {
  await ensureScripts(tab.id);
  
  if (typeof chrome !== 'undefined' && chrome.offscreen) {
    // Chrome - use offscreen document
    await ensureOffscreenDocumentExists();
    
    await browser.runtime.sendMessage({
      target: 'offscreen',
      type: 'process-context-menu',
      action: 'copy',
      info: info,
      tabId: tab.id,
      options: await getOptions()
    });
  } else {
    try {
      // Firefox - handle directly
      const platformOS = navigator.platform;
      var folderSeparator = "";
      if(platformOS.indexOf("Win") === 0){
        folderSeparator = "\\";
      } else {
        folderSeparator = "/";
      }

      if (info.menuItemId == "copy-markdown-link") {
        const options = await getOptions();
        options.frontmatter = options.backmatter = '';
        const article = await getArticleFromContent(tab.id, false);
        const { markdown } = turndown(`<a href="${info.linkUrl}">${info.linkText || info.selectionText}</a>`, { ...options, downloadImages: false }, article);
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: (markdownText) => {
            if (typeof copyToClipboard === 'function') {
              copyToClipboard(markdownText);
            } else {
              // Fallback clipboard implementation
              const textarea = document.createElement('textarea');
              textarea.value = markdownText;
              textarea.style.position = 'fixed';
              textarea.style.left = '-999999px';
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
          },
          args: [markdown]
        });
      }
      else if (info.menuItemId == "copy-markdown-image") {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: (imageUrl) => {
            if (typeof copyToClipboard === 'function') {
              copyToClipboard(`![](${imageUrl})`);
            } else {
              // Fallback clipboard implementation
              const textarea = document.createElement('textarea');
              textarea.value = `![](${imageUrl})`;
              textarea.style.position = 'fixed';
              textarea.style.left = '-999999px';
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
          },
          args: [info.srcUrl]
        });
      }
      else if(info.menuItemId == "copy-markdown-obsidian") {
        const article = await getArticleFromContent(tab.id, true);
        const title = article.title;
        const options = await getOptions();
        const obsidianVault = options.obsidianVault;
        const obsidianFolder = await formatObsidianFolder(article);
        const { markdown } = await convertArticleToMarkdown(article, false);
        
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: (markdownText) => {
            if (typeof copyToClipboard === 'function') {
              copyToClipboard(markdownText);
            } else {
              // Fallback clipboard implementation
              const textarea = document.createElement('textarea');
              textarea.value = markdownText;
              textarea.style.position = 'fixed';
              textarea.style.left = '-999999px';
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
          },
          args: [markdown]
        });
        
        await browser.tabs.update({
          url: `obsidian://advanced-uri?vault=${encodeURIComponent(obsidianVault)}&clipboard=true&mode=new&filepath=${encodeURIComponent(obsidianFolder + generateValidFileName(title))}`
        });
      }
      else if(info.menuItemId == "copy-markdown-obsall") {
        const article = await getArticleFromContent(tab.id, false);
        const title = article.title;
        const options = await getOptions();
        const obsidianVault = options.obsidianVault;
        const obsidianFolder = await formatObsidianFolder(article);
        const { markdown } = await convertArticleToMarkdown(article, false);
        
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: (markdownText) => {
            if (typeof copyToClipboard === 'function') {
              copyToClipboard(markdownText);
            } else {
              // Fallback clipboard implementation
              const textarea = document.createElement('textarea');
              textarea.value = markdownText;
              textarea.style.position = 'fixed';
              textarea.style.left = '-999999px';
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
          },
          args: [markdown]
        });
        
        await browser.tabs.update({
          url: `obsidian://advanced-uri?vault=${encodeURIComponent(obsidianVault)}&clipboard=true&mode=new&filepath=${encodeURIComponent(obsidianFolder + generateValidFileName(title))}`
        });
      }
      else {
        const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-selection");
        const { markdown } = await convertArticleToMarkdown(article, false);
        
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: (markdownText) => {
            if (typeof copyToClipboard === 'function') {
              copyToClipboard(markdownText);
            } else {
              // Fallback clipboard implementation
              const textarea = document.createElement('textarea');
              textarea.value = markdownText;
              textarea.style.position = 'fixed';
              textarea.style.left = '-999999px';
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
          },
          args: [markdown]
        });
      }
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  }
}

/**
 * Copy tab as markdown link
 */
async function copyTabAsMarkdownLink(tab) {
  try {
    await ensureScripts(tab.id);
    const article = await getArticleFromContent(tab.id);
    const title = await formatTitle(article);
    
    if (typeof chrome !== 'undefined' && chrome.offscreen) {
      // Chrome - use offscreen document for clipboard operations
      await ensureOffscreenDocumentExists();
      await browser.runtime.sendMessage({
        target: 'offscreen',
        type: 'copy-to-clipboard',
        text: `[${title}](${article.baseURI})`,
        options: await getOptions()
      });
    } else {
      // Firefox - use content script
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (linkText) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(linkText);
          } else {
            // Fallback clipboard method
            const textarea = document.createElement('textarea');
            textarea.value = linkText;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }
        },
        args: [`[${title}](${article.baseURI})`]
      });
    }
  } catch (error) {
    console.error("Failed to copy as markdown link:", error);
  }
}

/**
 * Copy all tabs as markdown links
 */
async function copyTabAsMarkdownLinkAll(tab) {
  try {
    const options = await getOptions();
    options.frontmatter = options.backmatter = '';
    
    const tabs = await browser.tabs.query({
      currentWindow: true
    });
    
    const links = [];
    for (const currentTab of tabs) {
      await ensureScripts(currentTab.id);
      const article = await getArticleFromContent(currentTab.id);
      const title = await formatTitle(article);
      const link = `${options.bulletListMarker} [${title}](${article.baseURI})`;
      links.push(link);
    }
    
    const markdown = links.join(`\n`);
    
    if (typeof chrome !== 'undefined' && chrome.offscreen) {
      // Chrome - use offscreen document for clipboard operations
      await ensureOffscreenDocumentExists();
      await browser.runtime.sendMessage({
        target: 'offscreen',
        type: 'copy-to-clipboard',
        text: markdown,
        options: await getOptions()
      });
    } else {
      // Firefox - use content script
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (markdownText) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(markdownText);
          } else {
            // Fallback clipboard method
            const textarea = document.createElement('textarea');
            textarea.value = markdownText;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }
        },
        args: [markdown]
      });
    }
  } catch (error) {
    console.error("Failed to copy all tabs as markdown links:", error);
  }
}

/**
 * Copy selected tabs as markdown links
 */
async function copySelectedTabAsMarkdownLink(tab) {
  try {
    const options = await getOptions();
    options.frontmatter = options.backmatter = '';
    
    const tabs = await browser.tabs.query({
      currentWindow: true,
      highlighted: true
    });

    const links = [];
    for (const selectedTab of tabs) {
      await ensureScripts(selectedTab.id);
      const article = await getArticleFromContent(selectedTab.id);
      const title = await formatTitle(article);
      const link = `${options.bulletListMarker} [${title}](${article.baseURI})`;
      links.push(link);
    }

    const markdown = links.join(`\n`);
    
    if (typeof chrome !== 'undefined' && chrome.offscreen) {
      // Chrome - use offscreen document for clipboard operations
      await ensureOffscreenDocumentExists();
      await browser.runtime.sendMessage({
        target: 'offscreen',
        type: 'copy-to-clipboard',
        text: markdown,
        options: await getOptions()
      });
    } else {
      // Firefox - use content script
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (markdownText) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(markdownText);
          } else {
            // Fallback clipboard method
            const textarea = document.createElement('textarea');
            textarea.value = markdownText;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }
        },
        args: [markdown]
      });
    }
  } catch (error) {
    console.error("Failed to copy selected tabs as markdown links:", error);
  }
}

/**
 * Download markdown for all tabs
 */
async function downloadMarkdownForAllTabs(info) {
  const tabs = await browser.tabs.query({
    currentWindow: true
  });
  
  for (const tab of tabs) {
    await downloadMarkdownFromContext(info, tab);
  }
}

/**
 * Get article from content of the tab
 */
async function getArticleFromContent(tabId, selection = false) {
  try {
    // For Chrome: orchestrate through offscreen document
    if (typeof chrome !== 'undefined' && chrome.offscreen) {
      await ensureOffscreenDocumentExists();
      
      // Generate a unique request ID
      const requestId = generateRequestId();
      
      // Create a promise that will be resolved when the result comes back
      const resultPromise = new Promise((resolve, reject) => {
        const messageListener = (message) => {
          if (message.type === 'article-result' && message.requestId === requestId) {
            browser.runtime.onMessage.removeListener(messageListener);
            resolve(message.article);
          }
        };
        
        // Set timeout to prevent hanging
        setTimeout(() => {
          browser.runtime.onMessage.removeListener(messageListener);
          reject(new Error('Timeout getting article content'));
        }, 30000); // 30 second timeout
        
        browser.runtime.onMessage.addListener(messageListener);
      });
      
      // Request the article from offscreen document
      await browser.runtime.sendMessage({
        target: 'offscreen',
        type: 'get-article-content',
        tabId: tabId,
        selection: selection,
        requestId: requestId,
        options: await getOptions()
      });
      
      return await resultPromise;
    } 
    else {
      // For Firefox: direct execution
      await ensureScripts(tabId);
      
      // Run the content script function to get the details
      const results = await browser.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          if (typeof getSelectionAndDom === 'function') {
            return getSelectionAndDom();
          }
          return null;
        }
      });
      
      // Make sure we got a valid result
      if (results && results[0]?.result) {
        const article = await getArticleFromDom(results[0].result.dom);
        
        // If we're to grab the selection, and we've selected something,
        // replace the article content with the selection
        if (selection && results[0].result.selection) {
          article.content = results[0].result.selection;
        }
        
        return article;
      }
      return null;
    }
  } catch (error) {
    console.error("Error in getArticleFromContent:", error);
    return null;
  }
}

/**
 * Download markdown for a tab
 * This function orchestrates with the offscreen document in Chrome
 * or handles directly in Firefox
 */
async function downloadMarkdown(markdown, title, tabId, imageList = {}, mdClipsFolder = '') {
  const options = await getOptions();
  
  if (typeof chrome !== 'undefined' && chrome.offscreen && options.downloadMode === 'downloadsApi') {
    // Chrome with downloads API - use offscreen document
    await ensureOffscreenDocumentExists();
    
    await browser.runtime.sendMessage({
      target: 'offscreen',
      type: 'download-markdown',
      markdown: markdown,
      title: title,
      tabId: tabId,
      imageList: imageList,
      mdClipsFolder: mdClipsFolder,
      options: await getOptions()
    });
  } 
  else if (options.downloadMode === 'downloadsApi' && browser.downloads) {
    // Firefox with downloads API - handle directly
    try {
      // Create blob URL
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      
      if (mdClipsFolder && !mdClipsFolder.endsWith('/')) mdClipsFolder += '/';
      
      // Start download
      const id = await browser.downloads.download({
        url: url,
        filename: mdClipsFolder + title + ".md",
        saveAs: options.saveAs
      });
      
      // Add download listener
      browser.downloads.onChanged.addListener(downloadListener(id, url));
      
      // Handle images if needed
      if (options.downloadImages) {
        const destPath = mdClipsFolder + title.substring(0, title.lastIndexOf('/'));
        if (destPath && !destPath.endsWith('/')) destPath += '/';
        
        for (const [src, filename] of Object.entries(imageList)) {
          const imgId = await browser.downloads.download({
            url: src,
            filename: destPath ? destPath + filename : filename,
            saveAs: false
          });
          
          browser.downloads.onChanged.addListener(downloadListener(imgId, src));
        }
      }
    } catch (err) {
      console.error("Download failed", err);
    }
  }
  else {
    // Content link mode - use content script
    try {
      await ensureScripts(tabId);
      const filename = mdClipsFolder + generateValidFileName(title, options.disallowedChars) + ".md";
      const base64Content = base64EncodeUnicode(markdown);
      
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        func: (filename, content) => {
          // Implementation of downloadMarkdown in content script
          const decoded = atob(content);
          const dataUri = `data:text/markdown;base64,${btoa(decoded)}`;
          const link = document.createElement('a');
          link.download = filename;
          link.href = dataUri;
          link.click();
        },
        args: [filename, base64Content]
      });
    } catch (error) {
      console.error("Failed to execute script:", error);
    }
  }
}

// Add polyfill for String.prototype.replaceAll if needed
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(str, newStr) {
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
      return this.replace(str, newStr);
    }
    return this.replace(new RegExp(str, 'g'), newStr);
  };
}