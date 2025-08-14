// Debug script to test Obsidian API connection with detailed logging
(async () => {
  try {
    console.log('=== 开始调试 Obsidian API 连接 ===');
    
    // 检查必要的 API 是否可用
    console.log('检查 browser API:', typeof browser !== 'undefined' ? '可用' : '不可用');
    console.log('检查 chrome API:', typeof chrome !== 'undefined' ? '可用' : '不可用');
    
    // 尝试从存储中获取配置
    console.log('尝试从存储中获取配置...');
    let options = null;
    
    if (typeof browser !== 'undefined' && browser.storage) {
      try {
        const result = await browser.storage.sync.get(null);
        options = result;
        console.log('从 browser.storage 获取配置成功:', Object.keys(result).length, '个配置项');
      } catch (storageError) {
        console.error('从 browser.storage 获取配置失败:', storageError);
      }
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const result = await new Promise((resolve, reject) => {
          chrome.storage.sync.get(null, (items) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(items);
            }
          });
        });
        options = result;
        console.log('从 chrome.storage 获取配置成功:', Object.keys(result).length, '个配置项');
      } catch (storageError) {
        console.error('从 chrome.storage 获取配置失败:', storageError);
      }
    } else {
      console.error('无法访问存储 API');
    }
    
    if (options) {
      console.log('配置内容:', {
        apiUrl: options.obsidianApiUrl,
        hasApiKey: !!options.obsidianApiKey,
        apiKeyLength: options.obsidianApiKey ? options.obsidianApiKey.length : 0,
        apiSecure: options.obsidianApiSecure
      });
      
      // 构建测试消息
      const testMessage = {
        type: 'test-obsidian-connection',
        options: options
      };
      
      console.log('准备发送测试消息:', testMessage);
      
      // 尝试发送消息到 service worker
      if (typeof browser !== 'undefined' && browser.runtime) {
        console.log('使用 browser.runtime.sendMessage 发送消息...');
        try {
          const response = await browser.runtime.sendMessage(testMessage);
          console.log('browser.runtime.sendMessage 响应:', response);
        } catch (error) {
          console.error('browser.runtime.sendMessage 失败:', error);
        }
      } else if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('使用 chrome.runtime.sendMessage 发送消息...');
        try {
          const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(testMessage, (response) => {
              console.log('chrome.runtime.sendMessage 回调被调用');
              console.log('响应:', response);
              console.log('chrome.runtime.lastError:', chrome.runtime.lastError);
              
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
          console.log('chrome.runtime.sendMessage 响应:', response);
        } catch (error) {
          console.error('chrome.runtime.sendMessage 失败:', error);
        }
      } else {
        console.error('无法访问 runtime API');
      }
    } else {
      console.error('无法获取配置，跳过测试');
    }
    
    console.log('=== 调试完成 ===');
  } catch (error) {
    console.error('调试过程中发生错误:', error);
  }
})();