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
    case "download-images":
      await handleImageDownloads(message);
      break;
    case "download-images-content-script":
      await handleImageDownloadsContentScript(message);
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
    case "execute-script-in-tab":
      await executeScriptInTab(message.tabId, message.code);
      break;

    case "get-tab-content":
      await getTabContentForOffscreen(message.tabId, message.selection, message.requestId);
      break;
      
    case "batch-links-selected":
      await handleBatchLinksSelected(message);
      break;
      
    case "start-link-selection-from-popup":
      await startLinkSelectionFromPopup(message);
      break;
      
    case "extract-for-preview":
      await extractContentForPreview(message, sendResponse);
      break;

    case "forward-get-article-content":
      await forwardGetArticleContent(message.tabId, message.selection, message.originalRequestId);
      break;

    case "execute-content-download":
      await executeContentDownload(message.tabId, message.filename, message.content);
      break;
  }
  
  // 返回 true 表示我们会异步处理响应
  return true;
}

/**
 * Execute script in tab  - helper function for offscreen document
 * @param {number} tabId - Tab ID to execute script in
 * @param {string} codeString - Code to execute in the tab
 */ 
async function executeScriptInTab(tabId, codeString) {
  try {
    await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: (code) => {
        return eval(code);
      },
      args: [codeString]
    });
  } catch (error) {
    console.error("Failed to execute script in tab:", error);
  }
}

/**
 * Get tab content for offscreen document
 * @param {number} tabId - Tab ID to get content from
 *  @param {boolean} selection - Whether to get selection or full content
 * @param {string} requestId - Request ID to track this specific request
 */
async function getTabContentForOffscreen(tabId, selection, requestId) {
  try {
    console.log(`Getting tab content for ${tabId}`);
    await ensureScripts(tabId);
    
    const results = await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        if (typeof getSelectionAndDom === 'function') {
          return getSelectionAndDom();
        }
        console.warn('getSelectionAndDom not found');
        return null;
      }
    });
    
    console.log(`Script execution results for tab ${tabId}:`, results);
    
    if (results && results[0]?.result) {
      console.log(`Sending content result for tab ${tabId}`);
      await browser.runtime.sendMessage({
        type: 'article-content-result',
        requestId: requestId,
        article: {
          dom: results[0].result.dom,
          selection: selection ? results[0].result.selection : null
        }
      });
    } else {
      throw new Error(`Failed to get content from tab ${tabId} - getSelectionAndDom returned null`);
    }
  } catch (error) {
    console.error(`Error getting tab content for ${tabId}:`, error);
    await browser.runtime.sendMessage({
      type: 'article-content-result',
      requestId: requestId,
      error: error.message
    });
  }
}


/**
 * Forward get article content to offscreen document
 * @param {number} tabId - Tab ID to forward content from
 * @param {boolean} selection - Whether to get selection or full content
 * @param {string} originalRequestId - Original request ID to track this specific request
 * */
async function forwardGetArticleContent(tabId, selection, originalRequestId) {
  try {
    await ensureScripts(tabId);
    
    const results = await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        if (typeof getSelectionAndDom === 'function') {
          return getSelectionAndDom();
        }
        return null;
      }
    });
    
    if (results && results[0]?.result) {
      // Forward the DOM data to the offscreen document for processing
      await browser.runtime.sendMessage({
        type: 'article-dom-data',
        requestId: originalRequestId,
        dom: results[0].result.dom,
        selection: selection ? results[0].result.selection : null
      });
    } else {
      throw new Error('Failed to get content from tab');
    }
  } catch (error) {
    console.error("Error forwarding article content:", error);
  }
}

/**
 * Execute content download, helper function for offscreen document
 * @param {number} tabId - Tab ID to execute download in
 * @param {string} filename - Filename for download
 * @param {string} base64Content - Base64 encoded content to download
 */
async function executeContentDownload(tabId, filename, base64Content) {
  try {
    await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: (filename, content) => {
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
    console.error("Failed to execute download script:", error);
  }
}

/**
 * Handle image downloads from offscreen document (Downloads API method)
 */
async function handleImageDownloads(message) {
  const { imageList, mdClipsFolder, title, options } = message;
  
  try {
    console.log('Service worker handling image downloads:', Object.keys(imageList).length, 'images');
    
    // Calculate the destination path for images
    const destPath = mdClipsFolder + title.substring(0, title.lastIndexOf('/'));
    const adjustedDestPath = destPath && !destPath.endsWith('/') ? destPath + '/' : destPath;
    
    // Download each image
    for (const [src, filename] of Object.entries(imageList)) {
      try {
        console.log('Downloading image:', src, '->', filename);
        
        const imgId = await browser.downloads.download({
          url: src,
          filename: adjustedDestPath ? adjustedDestPath + filename : filename,
          saveAs: false
        });

        // Track the download
        activeDownloads.set(imgId, src);
        
        console.log('Image download started:', imgId, filename);
      } catch (imgErr) {
        console.error('Failed to download image:', src, imgErr);
        // Continue with other images even if one fails
      }
    }
    
    console.log('All image downloads initiated');
  } catch (error) {
    console.error('Error handling image downloads:', error);
  }
}

/**
 * Handle image downloads for content script method
 */
async function handleImageDownloadsContentScript(message) {
  const { imageList, tabId, options } = message;
  
  try {
    console.log('Service worker handling image downloads via content script');
    
    // For content script method, we need to convert images to data URIs
    // and trigger downloads through the content script
    for (const [src, filename] of Object.entries(imageList)) {
      try {
        // Fetch the image in the service worker context (has proper CORS permissions)
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          // Send the image data to content script for download
          await browser.scripting.executeScript({
            target: { tabId: tabId },
            func: (filename, dataUri) => {
              const link = document.createElement('a');
              link.download = filename;
              link.href = dataUri;
              link.click();
            },
            args: [filename, reader.result]
          });
        };
        
        reader.readAsDataURL(blob);
        console.log('Image processed for content script download:', filename);
      } catch (imgErr) {
        console.error('Failed to process image for content script:', src, imgErr);
      }
    }
  } catch (error) {
    console.error('Error handling content script image downloads:', error);
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
 * Enhanced download listener to handle image downloads
 */
function handleDownloadChange(delta) {
  if (activeDownloads.has(delta.id)) {
    if (delta.state && delta.state.current === "complete") {
      console.log('Download completed:', delta.id);
      const url = activeDownloads.get(delta.id);
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      activeDownloads.delete(delta.id);
    } else if (delta.state && delta.state.current === "interrupted") {
      console.error('Download interrupted:', delta.id, delta.error);
      const url = activeDownloads.get(delta.id);
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      activeDownloads.delete(delta.id);
    }
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
  else if (info.menuItemId === "download-markdown-alltabs" || info.menuItemId === "tab-download-markdown-alltabs") {
    await downloadMarkdownForAllTabs(info);
  }
  // One of the download commands
  else if (info.menuItemId.startsWith("download-markdown")) {
    await downloadMarkdownFromContext(info, tab);
  }
  // Copy all tabs as markdown links
  else if (info.menuItemId === "copy-tab-as-markdown-link-all") {
    await copyTabAsMarkdownLinkAll(tab);
  }
  // Copy only selected tabs as markdown links
  else if (info.menuItemId === "copy-tab-as-markdown-link-selected") {
    await copySelectedTabAsMarkdownLink(tab);
  }
  // Copy single tab as markdown link
  else if (info.menuItemId === "copy-tab-as-markdown-link") {
    await copyTabAsMarkdownLink(tab);
  }
  // Start link selection mode
  else if (info.menuItemId === "start-link-selection") {
    await startLinkSelectionMode(tab);
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
* Replace placeholder strings with article info
*/
function textReplace(string, article, disallowedChars = null) {
  // Replace values from article object
  for (const key in article) {
    if (article.hasOwnProperty(key) && key != "content") {
      let s = (article[key] || '') + '';
      if (s && disallowedChars) s = generateValidFileName(s, disallowedChars);

      string = string.replace(new RegExp('{' + key + '}', 'g'), s)
        .replace(new RegExp('{' + key + ':kebab}', 'g'), s.replace(/ /g, '-').toLowerCase())
        .replace(new RegExp('{' + key + ':snake}', 'g'), s.replace(/ /g, '_').toLowerCase())
        .replace(new RegExp('{' + key + ':camel}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toLowerCase()))
        .replace(new RegExp('{' + key + ':pascal}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toUpperCase()));
    }
  }

  // Replace date formats
  const now = new Date();
  const dateRegex = /{date:(.+?)}/g;
  const matches = string.match(dateRegex);
  if (matches && matches.forEach) {
    matches.forEach(match => {
      const format = match.substring(6, match.length - 1);
      const dateString = moment(now).format(format);
      string = string.replaceAll(match, dateString);
    });
  }

  // Replace keywords
  const keywordRegex = /{keywords:?(.*)?}/g;
  const keywordMatches = string.match(keywordRegex);
  if (keywordMatches && keywordMatches.forEach) {
    keywordMatches.forEach(match => {
      let seperator = match.substring(10, match.length - 1);
      try {
        seperator = JSON.parse(JSON.stringify(seperator).replace(/\\\\/g, '\\'));
      }
      catch { }
      const keywordsString = (article.keywords || []).join(seperator);
      string = string.replace(new RegExp(match.replace(/\\/g, '\\\\'), 'g'), keywordsString);
    });
  }

  // Replace anything left in curly braces
  const defaultRegex = /{(.*?)}/g;
  string = string.replace(defaultRegex, '');

  return string;
}

/**
* Generate valid filename
*/
function generateValidFileName(title, disallowedChars = null) {
  if (!title) return title;
  else title = title + '';
  // Remove < > : " / \ | ? * 
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  // And non-breaking spaces
  var name = title.replace(illegalRe, "").replace(new RegExp('\u00A0', 'g'), ' ');
  
  if (disallowedChars) {
    for (let c of disallowedChars) {
      if (`[\\^$.|?*+()`.includes(c)) c = `\\${c}`;
      name = name.replace(new RegExp(c, 'g'), '');
    }
  }
  
  return name;
}

async function formatTitle(article, providedOptions = null) {
  const options = providedOptions || defaultOptions;
  let title = textReplace(options.title, article, options.disallowedChars + '/');
  title = title.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
  return title;
}

/**
 * Ensure content script is loaded
 */
async function ensureScripts(tabId) {
  try {
      // First check if scripts are already loaded
      const results = await browser.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
              return typeof getSelectionAndDom === 'function' && typeof browser !== 'undefined';
          }
      });
      
      // If either script is missing, inject both in correct order
      if (!results || !results[0]?.result) {
          await browser.scripting.executeScript({
              target: { tabId: tabId },
              files: [
                  "/browser-polyfill.min.js",
                  "/contentScript/contentScript.js"
              ]
          });
      }

      // Verify injection was successful
      const verification = await browser.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
              return {
                  hasPolyfill: typeof browser !== 'undefined',
                  hasContentScript: typeof getSelectionAndDom === 'function'
              };
          }
      });

      if (!verification[0]?.result?.hasPolyfill || !verification[0]?.result?.hasContentScript) {
          throw new Error('Script injection verification failed');
      }

  } catch (error) {
      console.error("Failed to ensure scripts:", error);
      throw error; // Re-throw to handle in calling function
  }
}

/**
 * Download markdown from context menu
 */
async function downloadMarkdownFromContext(info, tab) {
  await ensureScripts(tab.id);
  
  if (typeof chrome !== 'undefined' && chrome.offscreen) {
    await ensureOffscreenDocumentExists();
    
    // Create a promise to wait for completion
    const processComplete = new Promise((resolve, reject) => {
      const messageListener = (message) => {
        if (message.type === 'process-complete' && message.tabId === tab.id) {
          browser.runtime.onMessage.removeListener(messageListener);
          if (message.error) {
            reject(new Error(message.error));
          } else {
            resolve();
          }
        }
      };
      
      browser.runtime.onMessage.addListener(messageListener);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        browser.runtime.onMessage.removeListener(messageListener);
        reject(new Error(`Timeout processing tab ${tab.id}`));
      }, 30000);
    });
    
    // Send message to offscreen
    await browser.runtime.sendMessage({
      target: 'offscreen',
      type: 'process-context-menu',
      action: 'download',
      info: info,
      tabId: tab.id,
      options: await getOptions()
    });
    
    // Wait for completion
    await processComplete;
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
    const options = await getOptions();  // Get options first
    const article = await getArticleFromContent(tab.id, false, options);
    const title = await formatTitle(article, options);
    
    if (typeof chrome !== 'undefined' && chrome.offscreen) {
      await ensureOffscreenDocumentExists();
      await browser.runtime.sendMessage({
        target: 'offscreen',
        type: 'copy-to-clipboard',
        text: `[${title}](${article.baseURI})`,
        options: options
      });
    } else {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(text);
          } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
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
    const tabs = await browser.tabs.query({
      currentWindow: true
    });
    
    const links = [];
    for (const currentTab of tabs) {
      await ensureScripts(currentTab.id);
      const article = await getArticleFromContent(currentTab.id, false, options);
      const title = await formatTitle(article, options);
      const link = `${options.bulletListMarker} [${title}](${article.baseURI})`;
      links.push(link);
    }
    
    const markdown = links.join('\n');
    
    if (typeof chrome !== 'undefined' && chrome.offscreen) {
      await ensureOffscreenDocumentExists();
      await browser.runtime.sendMessage({
        target: 'offscreen',
        type: 'copy-to-clipboard',
        text: markdown,
        options: options
      });
    } else {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
          if (typeof copyToClipboard === 'function') {
            copyToClipboard(text);
          } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
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
async function getArticleFromContent(tabId, selection = false, options = null) {
  try {
    // For Chrome: orchestrate through offscreen document
    if (typeof chrome !== 'undefined' && chrome.offscreen) {
      await ensureOffscreenDocumentExists();
      
      // Get options if not provided
      if (!options) {
        options = await getOptions();
      }
      
      // Generate a unique request ID
      const requestId = generateRequestId();
      
      // Create a promise that will be resolved when the result comes back
      const resultPromise = new Promise((resolve, reject) => {
        const messageListener = (message) => {
          if (message.type === 'article-result' && message.requestId === requestId) {
            browser.runtime.onMessage.removeListener(messageListener);
            if (message.error) {
              reject(new Error(message.error));
            } else {
              resolve(message.article);
            }
          }
        };
        
        // Set timeout
        setTimeout(() => {
          browser.runtime.onMessage.removeListener(messageListener);
          reject(new Error('Timeout getting article content'));
        }, 30000);
        
        browser.runtime.onMessage.addListener(messageListener);
      });
      
      // Request the article from offscreen document
      await browser.runtime.sendMessage({
        target: 'offscreen',
        type: 'get-article-content',
        tabId: tabId,
        selection: selection,
        requestId: requestId,
        options: options
      });
      
      const article = await resultPromise;
      if (!article) {
        throw new Error('Failed to get article content');
      }
      return article;
    } 
    else {
      // For Firefox: direct execution
      await ensureScripts(tabId);
      
      const results = await browser.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          if (typeof getSelectionAndDom === 'function') {
            return getSelectionAndDom();
          }
          return null;
        }
      });
      
      if (!results?.[0]?.result) {
        throw new Error('Failed to get DOM content');
      }
      
      const article = await getArticleFromDom(results[0].result.dom, options);
      
      if (selection && results[0].result.selection) {
        article.content = results[0].result.selection;
      }
      
      return article;
    }
  } catch (error) {
    console.error("Error in getArticleFromContent:", error);
    throw error; // Re-throw to handle in calling function
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

/**
 * Start link selection mode in the current tab
 */
async function startLinkSelectionMode(tab) {
  try {
    // Ensure content scripts are loaded
    await ensureScripts(tab.id);
    
    // Send message to content script to start link selection
    const response = await browser.tabs.sendMessage(tab.id, {
      type: "start-link-selection"
    });
    
    if (response && response.success) {
      console.log('Link selection mode started successfully');
    } else {
      console.error('Failed to start link selection mode');
    }
    
  } catch (error) {
    console.error('Error starting link selection mode:', error);
  }
}

/**
 * Handle batch links selected from content script
 */
async function handleBatchLinksSelected(message) {
  try {
    const selectedLinks = message.links;
    
    if (!selectedLinks || selectedLinks.length === 0) {
      console.log('No links selected');
      return;
    }
    
    console.log(`Processing ${selectedLinks.length} selected links`);
    
    // Create a formatted list of URLs for the batch processor
    const urlText = selectedLinks.map(link => {
      // If the link has a title, format as markdown link
      if (link.text && link.text.trim()) {
        return `[${link.text.trim()}](${link.url})`;
      } else {
        // Just return the URL
        return link.url;
      }
    }).join('\n');
    
    // Get the current active tab to send the batch processing data to popup
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      // Store the selected URLs for the popup to access
      await browser.storage.local.set({
        'batch-selected-links': {
          urlText: urlText,
          timestamp: Date.now()
        }
      });
      
      // Try to notify popup if it's open (this will fail silently if popup is closed)
      try {
        await browser.runtime.sendMessage({
          type: "batch-links-ready",
          urlText: urlText
        });
      } catch (error) {
        // Popup is not open, that's fine - data is stored for later
        console.log('Popup not open, data stored for later use');
      }
    }
    
  } catch (error) {
    console.error('Error handling batch links selected:', error);
  }
}

/**
 * Start link selection from popup request
 */
async function startLinkSelectionFromPopup(message) {
  try {
    const tab = await browser.tabs.get(message.tabId);
    await startLinkSelectionMode(tab);
  } catch (error) {
    console.error('Error starting link selection from popup:', error);
  }
}

/**
 * Extract content for preview
 */
async function extractContentForPreview(message, sendResponse) {
  try {
    const tab = await browser.tabs.get(message.tabId);
    
    // 确保content scripts已加载
    await ensureScripts(tab.id);
    
    // 立即发送成功响应给popup
    sendResponse({ success: true });
    
    // 创建一个临时的消息监听器来捕获内容
    const contentPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        browser.runtime.onMessage.removeListener(messageListener);
        reject(new Error('内容提取超时'));
      }, 30000);
      
      const messageListener = (msg, sender, sendResponse) => {
        if (msg.type === 'display.md' && sender.tab?.id === tab.id) {
          clearTimeout(timeout);
          browser.runtime.onMessage.removeListener(messageListener);
          resolve(msg);
        }
      };
      
      browser.runtime.onMessage.addListener(messageListener);
    });
    
    // 触发内容提取
    await browser.tabs.sendMessage(tab.id, { 
      type: "get-article-content", 
      selection: false 
    });
    
    // 等待内容提取完成
    const contentData = await contentPromise;
    
    // 发送提取的内容给popup
    await browser.runtime.sendMessage({
      type: "content-extracted",
      markdown: contentData.markdown,
      html: contentData.html || '',
      title: contentData.article?.title || '未命名文档',
      selection: contentData.selection || '',
      url: tab.url
    });
    
  } catch (error) {
    console.error('Error extracting content for preview:', error);
    
    // 发送错误响应给popup
    sendResponse({ success: false, error: error.message });
    
    // 发送错误消息给popup
    try {
      await browser.runtime.sendMessage({
        type: "content-extracted",
        error: error.message
      });
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
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