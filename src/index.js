/**
 * Cloudflare ******************************************************************************
 * 企业微信机器人推送API - Cloudflare Worker实现
 * 作者: Your Name
 * 版本: 1.0.0
 * 日期: 2025-10-28
 * 许可证: MIT
 ******************************************************************************
 *
 * 功能说明:
 * 1. 接收HTML表单提交的数据
 * 2. 将数据格式化为企业微信机器人消息
 * 3. 支持文本和Markdown两种消息格式
 * 4. 提供请求验证机制确保安全性
 * 5. 返回友好的响应信息
 */

// 配置信息 - 这些值应该通过环境变量设置
const CONFIG = {
  // 企业微信机器人Webhook地址，格式为: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
  WECHAT_WEBHOOK_URL: '',
  
  // 请求验证密钥，用于验证请求的合法性
  VERIFICATION_TOKEN: '',
  
  // 默认消息类型，可选值: 'text' 或 'markdown'
  DEFAULT_MSG_TYPE: 'text',
  
  // 响应消息配置
  RESPONSE_MESSAGES: {
    success: '消息已成功发送到企业微信群',
    error: '发送失败，请稍后重试试',
    invalidToken: '请求验证失败，请检查验证令牌',
    missingParams: '缺少必要的参数',
    invalidMsgType: '不支持的消息类型',
    webhookNotConfigured: '企业微信Webhook地址未配置'
  }
};

/**
 * 从环境变量加载配置
 */
function loadConfig() {
  // 从环境变量获取企业微信Webhook地址
  if (typeof WECHAT_WEBHOOK_URL !== 'undefined' && WECHAT_WEBHOOK_URL) {
    CONFIG.WECHAT_WEBHOOK_URL = WECHAT_WEBHOOK_URL;
  }
  
  // 从环境变量获取验证令牌
  if (typeof VERIFICATION_TOKEN !== 'undefined' && VERIFICATION_TOKEN) {
    CONFIG.VERIFICATION_TOKEN = VERIFICATION_TOKEN;
  }
  
  // 从环境变量获取默认消息类型
  if (typeof DEFAULT_MSG_TYPE !== 'undefined' && ['text', 'markdown'].includes(DEFAULT_MSG_TYPE)) {
    CONFIG.DEFAULT_MSG_TYPE = DEFAULT_MSG_TYPE;
  }
}

/**
 * 验证请求的合法性
 * @param {Request} request - 传入的请求对象
 * @returns {boolean} - 请求是否合法
 */
async function verifyRequest(request) {
  // 如果没有配置验证令牌，则跳过验证
  if (!CONFIG.VERIFICATION_TOKEN) {
    console.warn('验证令牌未配置，跳过请求验证');
    return true;
  }
  
  try {
    // 从请求头获取验证令牌
    const requestToken = request.headers.get('X-Verification-Token');
    
    // 验证令牌是否匹配
    if (requestToken === CONFIG.VERIFICATION_TOKEN) {
      return true;
    }
    
    console.error('请求验证失败: 令牌不匹配');
    return false;
  } catch (error) {
    console.error('请求验证过程中出错:', error);
    return false;
  }
}

/**
 * 解析请求数据
 * @param {Request} request - 传入的请求对象
 * @returns {Object} - 解析后的数据对象
 */
async function parseRequestData(request) {
  const contentType = request.headers.get('content-type');
  
  if (contentType.includes('application/json')) {
    // 解析JSON格式数据
    return await request.json();
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    // 解析表单格式数据
    const formData = await request.formData();
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  } else {
    // 不支持的内容类型
    throw new Error(`不支持的内容类型: ${contentType}`);
  }
}

/**
 * 构建企业微信消息
 * @param {Object} data - 表单数据
 * @returns {Object} - 构建好的消息对象
 */
function buildWechatMessage(data) {
  // 确定消息类型
  const msgType = data.msgtype || CONFIG.DEFAULT_MSG_TYPE;
  
  // 构建消息对象
  const message = {
    msgtype: msgType
  };
  
  // 根据消息类型构建不同的消息内容
  switch (msgType) {
    case 'text':
      message.text = {
        content: data.content || '',
        mentioned_list: data.mentioned_list ? data.mentioned_list.split(',') : [],
        mentioned_mobile_list: data.mentioned_mobile_list ? data.mentioned_mobile_list.split(',') : []
      };
      break;
      
    case 'markdown':
      message.markdown = {
        content: data.content || ''
      };
      break;
      
    default:
      throw new Error(`不支持的消息类型: ${msgType}`);
  }
  
  return message;
}

/**
 * 发送消息到企业微信
 * @param {Object} message - 消息对象
 * @returns {Object} - 企业微信API的响应
 */
async function sendToWechat(message) {
  // 检查Webhook地址是否配置
  if (!CONFIG.WECHAT_WEBHOOK_URL) {
    throw new Error(CONFIG.RESPONSE_MESSAGES.webhookNotConfigured);
  }
  
  try {
    // 发送POST请求到企业微信API
    const response = await fetch(CONFIG.WECHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });
    
    // 解析响应
    const result = await response.json();
    
    // 检查是否发送成功
    if (result.errcode !== 0) {
      throw new Error(`企业微信API返回错误: ${result.errmsg} (错误码: ${result.errcode})`);
    }
    
    return result;
  } catch (error) {
    console.error('发送消息到企业微信失败:', error);
    throw error;
  }
}

/**
 * 处理OPTIONS请求（CORS预检）
 * @returns {Response} - 预检响应
 */
function handleOptionsRequest() {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Verification-Token',
    'Access-Control-Max-Age': '86400'
  };
  
  return new Response(null, { headers });
}

/**
 * 处理GET请求（API文档）
 * @returns {Response} - API文档响应
 */
function handleGetRequest() {
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>企业微信机器人推送API</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css" rel="stylesheet">
  </head>
  <body class="bg-gray-50 text-gray-800">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <header class="mb-8 text-center">
        <h1 class="text-4xl font-bold text-blue-600 mb-2">企业微信微信机器人推送API</h1>
        <p class="text-gray-600">基于Cloudflare Worker的企业微信微信机器人机器人推送接口</p>
      </header>
      
      <main class="bg-white rounded-lg shadow-md p-6 mb-8">
        <section class="mb-6">
          <h2 class="text-2xl font-bold mb-4 text-blue-700">
            <i class="fa fa-info-circle mr-2"></i>API说明
          </h2>
          <p class="mb-4">
            本API提供了一个简单的接口，用于将HTML表单数据推送到企业微信群聊。
            支持文本和Markdown两种消息格式，并提供了请求验证机制确保安全性。
          </p>
        </section>
        
        <section class="mb-6">
          <h2 class="text-2xl font-bold mb-4 text-blue-700">
            <i class="fa fa-endpoint mr-2"></i>API端点
          </h2>
          <div class="bg-gray-100 p-4 rounded-md font-mono">
            POST /
          </div>
        </section>
        
        <section class="mb-6">
          <h2 class="text-2xl font-bold mb-4 text-blue-700">
            <i class="fa fa-params mr-2"></i>请求参数
          </h2>
          
          <h3 class="text-xl font-semibold mb-2">表单数据</h3>
          <table class="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr class="bg-gray-100">
                <th class="py-2 px-4 border-b text-left">参数名</th>
                <th class="py-2 px-4 border-b text-left">类型</th>
                <th class="py-2 px-4 border-b text-left">是否必填</th>
                <th class="py-2 px-4 border-b text-left">描述</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="py-2 px-4 border-b font-medium">content</td>
                <td class="py-2 px-4 border-b">string</td>
                <td class="py-2 px-4 border-b text-red-600">是</td>
                <td class="py-2 px-4 border-b">消息内容</td>
              </tr>
              <tr>
                <td class="py-2 px-4 border-b font-medium">msgtype</td>
                <td class="py-2 px-4 border-b">string</td>
                <td class="py-2 px-4 border-b text-green-600">否</td>
                <td class="py-2 px-4 border-b">消息类型，可选值: text, markdown，默认为text</td>
              </tr>
              <tr>
                <td class="py-2 px-4 border-b font-medium">mentioned_list</td>
                <td class="py-2 px-4 border-b">string</td>
                <td class="py-2 px-4 border-b text-green-600">否</td>
                <td class="py-2 px-4 border-b">
                  userid的列表，提醒群中的指定成员，用逗号分隔。@all表示提醒所有人
                </td>
              </tr>
              <tr>
                <td class="py-2 px-4 border-b font-medium">mentioned_mobile_list</td>
                <td class="py-2 px-4 border-b">string</td>
                <td class="py-2 px-4 border-b text-green-600">否</td>
                <td class="py-2 px-4 border-b">
                  手机号列表，提醒手机号对应的群成员，用逗号分隔。@all表示提醒所有人
                </td>
              </tr>
            </tbody>
          </table>
          
          <h3 class="text-xl font-semibold mt-6 mb-2">请求头</h3>
          <table class="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr class="bg-gray-100">
                <th class="py-2 px-4 border-b text-left">头部名称</th>
                <th class="py-2 px-4 border-b text-left">是否必填</th>
                <th class="py-2 px-4 border-b text-left">描述</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="py-2 px-4 border-b font-medium">X-Verification-Token</td>
                <td class="py-2 px-4 border-b">可选</td>
                <td class="py-2 px-4 border-b">
                  请求验证令牌，如果配置了验证令牌，则必须提供此头部
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        
        <section class="mb-6">
          <h2 class="text-2xl font-bold mb-4 text-blue-700">
            <i class="fa fa-exchange mr-2"></i>响应格式
          </h2>
          
          <h3 class="text-xl font-semibold mb-2">成功响应</h3>
          <div class="bg-gray-100 p-4 rounded-md font-mono">
            {
              "success": true,
              "message": "消息已成功发送到企业微信群",
              "data": {
                "errcode": 0,
                "errmsg": "ok"
              }
            }
          </div>
          
          <h3 class="text-xl font-semibold mt-4 mb-2">错误响应</h3>
          <div class="bg-gray-100 p-4 rounded-md font-mono">
            {
              "success": false,
              "message": "错误信息描述",
              "error": {
                "code": "ERROR_CODE",
                "details": "详细错误信息（如果有）"
              }
            }
          </div>
        </section>
        
        <section class="mb-6">
          <h2 class="text-2xl font-bold mb-4 text-blue-700">
            <i class="fa fa-code mr-2"></i>使用示例
          </h2>
          
          <h3 class="text-xl font-semibold mb-2">HTML表单示例</h3>
          <div class="bg-gray-100 p-4 rounded-md font-mono overflow-x-auto">
            &lt;form id="wechatForm" method="POST" action="YOUR_API_URL"&gt;
              &lt;div class="mb-4"&gt;
                &lt;label for="content" class="block mb-2"&gt;消息内容&lt;/label&gt;
                &lt;textarea id="content" name="content" required 
                  class="w-full p-2 border rounded"&gt;&lt;/textarea&gt;
              &lt;/div&gt;
              
              &lt;div class="mb-4"&gt;
                &lt;label for="msgtype" class="block mb-2"&gt;消息类型&lt;/label&gt;
                &lt;select id="msgtype" name="msgtype" 
                  class="w-full p-2 border rounded"&gt;
                  &lt;option value="text"&gt;文本&lt;/option&gt;
                  &lt;option value="markdown"&gt;Markdown&lt;/option&gt;
                &lt;/select&gt;
              &lt;/div&gt;
              
              &lt;div class="mb-4"&gt;
                &lt;label for="mentioned_mobile_list" class="block mb-2"&gt;
                  提醒手机号（用逗号分隔，@all表示所有人）
                &lt;/label&gt;
                &lt;input type="text" id="mentioned_mobile_list" 
                  name="mentioned_mobile_list" class="w-full p-2 border rounded"&gt;
              &lt;/div&gt;
              
              &lt;button type="submit" class="bg-blue-500 text-white py-2 px-4 rounded"&gt;
                发送消息
              &lt;/button&gt;
            &lt;/form&gt;
            
            &lt;script&gt;
              document.getElementById('wechatForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(this);
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                
                try {
                  submitButton.disabled = true;
                  submitButton.textContent = '发送中...';
                  
                  const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                      'X-Verification-Token': 'YOUR_VERIFICATION_TOKEN'
                    }
                  });
                  
                  const result = await response.json();
                  
                  if (result.success) {
                    alert('消息发送成功！');
                    this.reset();
                  } else {
                    alert('发送失败: ' + result.message);
                  }
                } catch (error) {
                  alert('发送过程中出错: ' + error.message);
                } finally {
                  submitButton.disabled = false;
                  submitButton.textContent = originalText;
                }
              });
            &lt;/script&gt;
          </div>
          
          <h3 class="text-xl font-semibold mt-6 mb-2">JavaScript Fetch示例</h3>
          <div class="bg-gray-100 p-4 rounded-md font-mono overflow-x-auto">
            async function sendWechatMessage() {
              const apiUrl = 'YOUR_API_URL';
              const verificationToken = 'YOUR_VERIFICATION_TOKEN';
              
              const data = {
                content: '这是一条测试消息',
                msgtype: 'text',
                mentioned_mobile_list: '@all'
              };
              
              try {
                const response = await fetch(apiUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Verification-Token': verificationToken
                  },
                  body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                  console.log('消息发送成功:', result.data);
                  return true;
                } else {
                  console.error('发送失败:', result.message);
                  return false;
                }
              } catch (error) {
                console.error('发送过程中出错:', error);
                return false;
              }
            }
            
            // 调用函数
            sendWechatMessage();
          </div>
          
          <h3 class="text-xl font-semibold mt-6 mb-2">cURL示例</h3>
          <div class="bg-gray-100 p-4 rounded-md font-mono overflow-x-auto">
            # 文本消息
            curl -X POST "YOUR_API_URL" \
              -H "Content-Type: application/json" \
              -H "X-Verification-Token: YOUR_VERIFICATION_TOKEN" \
              -d '{
                "content": "这是一条测试消息",
                "msgtype": "text",
                "mentioned_mobile_list": "@all"
              }'
            
            # Markdown消息
            curl -X POST "YOUR_API_URL" \
              -H "Content-Type: application/json" \
              -H "X-Verification-Token: YOUR_VERIFICATION_TOKEN" \
              -d '{
                "content": "# 标题\n\n这是一条**Markdown**格式的消息\n\n> 引用内容",
                "msgtype": "markdown"
              }'
          </div>
        </section>
        
        <section class="mb-6">
          <h2 class="text-2xl font-bold mb-4 text-blue-700">
            <i class="fa fa-exclamation-triangle mr-2"></i>错误码说明
          </h2>
          <table class="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr class="bg-gray-100">
                <th class="py-2 px-4 border-b text-left">错误码</th>
                <th class="py-2 px-4 border-b text-left">描述</th>
                <th class="py-2 px-4 border-b text-left">解决方案</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="py-2 px-4 border-b font-medium">INVALID_TOKEN</td>
                <td class="py-2 px-4 border-b">请求验证失败</td>
                <td class="py-2 px-4 border-b">检查X-Verification-Token请求头是否正确</td>
              </tr>
              <tr>
                <td class="py-2 px-4 border-b font-medium">MISSING_PARAMS</td>
                <td class="py-2 px-4 border-b">缺少必要的参数</td>
                <td class="py-2 px-4 border-b">确保content参数已提供</td>
              </tr>
              <tr>
                <td class="py-2 px-4 border-b font-medium">INVALID_MSG_TYPE</td>
                <td class="py-2 px-4 border-b">不支持的消息类型</td>
                <td class="py-2 px-4 border-b">使用text或markdown作为消息类型</td>
              </tr>
              <tr>
                <td class="py-2 px-4 border-b font-medium">WEBHOOK_NOT_CONFIGURED</td>
                <td class="py-2 px-4 border-b">企业微信Webhook地址未配置</td>
                <td class="py-2 px-4 border-b">在Cloudflare Worker中配置WECHAT_WEBHOOK_URL环境变量</td>
              </tr>
              <tr>
                <td class="py-2 px-4 border-b font-medium">WECHAT_API_ERROR</td>
                <td class="py-2 px-4 border-b">企业微信API返回错误</td>
                <td class="py-2 px-4 border-b">检查错误详情，确保Webhook地址正确且消息格式合法</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
      
      <footer class="text-center text-gray-500 text-sm">
        <p>&copy; 2025 企业微信机器人推送API | 基于Cloudflare Worker构建</p>
      </footer>
    </div>
  </body>
  </html>
  `;
  
  return new Response(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}

/**
 * 处理POST请求（发送消息）
 * @param {Request} request - 传入的请求对象
 * @returns {Response} - 处理结果响应
 */
async function handlePostRequest(request) {
  try {
    // 验证请求
    const isRequestValid = await verifyRequest(request);
    if (!isRequestValid) {
      return new Response(JSON.stringify({
        success: false,
        message: CONFIG.RESPONSE_MESSAGES.invalidToken,
        error: {
          code: 'INVALID_TOKEN'
        }
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 解析请求数据
    const data = await parseRequestData(request);
    
    // 检查必要参数
    if (!data.content) {
      return new Response(JSON.stringify({
        success: false,
        message: CONFIG.RESPONSE_MESSAGES.missingParams,
        error: {
          code: 'MISSING_PARAMS',
          details: 'content参数是必需的'
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 构建消息
    let message;
    try {
      message = buildWechatMessage(data);
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: CONFIG.RESPONSE_MESSAGES.invalidMsgType,
        error: {
          code: 'INVALID_MSG_TYPE',
          details: error.message
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 发送消息到企业微信
    const result = await sendToWechat(message);
    
    // 返回成功响应
    return new Response(JSON.stringify({
      success: true,
      message: CONFIG.RESPONSE_MESSAGES.success,
      data: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('处理POST请求时出错:', error);
    
    // 确定错误类型和消息
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = CONFIG.RESPONSE_MESSAGES.error;
    let statusCode = 500;
    
    if (error.message === CONFIG.RESPONSE_MESSAGES.webhookNotConfigured) {
      errorCode = 'WEBHOOK_NOT_CONFIGURED';
      errorMessage = error.message;
      statusCode = 500;
    } else if (error.message.includes('企业微信API返回错误')) {
      errorCode = 'WECHAT_API_ERROR';
      errorMessage = error.message;
      statusCode = 502;
    }
    
    // 返回错误响应
    return new Response(JSON.stringify({
      success: false,
      message: errorMessage,
      error: {
        code: errorCode,
        details: error.message
      }
    }), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * 主请求处理函数
 * @param {Request} request - 传入的请求对象
 * @returns {Response} - 处理结果响应
 */
async function handleRequest(request) {
  // 加载配置
  loadConfig();
  
  // 处理OPTIONS请求（CORS预检）
  if (request.method === 'OPTIONS') {
    return handleOptionsRequest();
  }
  
  // 处理GET请求（API文档）
  if (request.method === 'GET') {
    return handleGetRequest();
  }
  
  // 处理POST请求（发送消息）
  if (request.method === 'POST') {
    return handlePostRequest(request);
  }
  
  // 不支持的HTTP方法
  return new Response(JSON.stringify({
    success: false,
    message: `不支持的HTTP方法: ${request.method}`,
    error: {
      code: 'METHOD_NOT_ALLOWED'
    }
  }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Allow': 'GET, POST, OPTIONS'
    }
  });
}

// 注册fetch事件监听器
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
