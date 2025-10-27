# 企业微信机器人推送API

基于Cloudflare Worker实现的企业微信机器人推送API，支持通过HTML表单或HTTP请求将消息推送到企业微信群聊。

![企业微信机器人推送API](https://picsum.photos/id/0/1200/600)

## 功能特点

- ✅ **简单易用**：提供直观的API接口，支持表单提交和JSON请求
- ✅ **多种消息类型**：支持文本和Markdown两种消息格式
- ✅ **安全可靠**：提供请求验证机制，防止未授权访问
- ✅ **跨域支持**：支持跨域请求，方便前端页面直接调用
- ✅ **详细文档**：自带API文档页面，方便查阅和测试
- ✅ **示例代码**：提供完整的HTML示例页面，快速上手

## 快速开始

### 1. 准备工作

#### 1.1 创建企业微信机器人

1. 打开企业微信客户端，进入需要添加机器人的群聊
2. 点击群聊右上角的"..."图标，选择"添加机器人"
3. 选择"新创建一个机器人"，设置机器人名称和头像
4. 创建成功后，复制机器人的Webhook地址（格式：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY`）

#### 1.2 准备Cloudflare账号

1. 注册或登录[Cloudflare](https://www.cloudflare.com/)账号
2. 安装[Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)工具

### 2. 部署到Cloudflare Worker

#### 2.1 克隆项目

```bash
git clone https://github.com/yourusername/wechat-robot-api.git
cd wechat-robot-api
```

#### 2.2 配置环境变量

创建`.env`文件：

```env
# 企业微信机器人Webhook地址
WECHAT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY

# 请求验证令牌（可选）
VERIFICATION_TOKEN=your_secure_token

# 默认消息类型（text或markdown）
DEFAULT_MSG_TYPE=text
```

#### 2.3 部署到Cloudflare

```bash
# 登录Cloudflare
wrangler login

# 部署到Cloudflare Worker
wrangler deploy
```

部署成功后，Wrangler会输出你的API的URL地址，例如：`https://wechat-robot-api.your-account.workers.dev`

## 使用指南

### 1. API端点

```
POST /
```

### 2. 请求参数

#### 2.1 表单数据

| 参数名 | 类型 | 是否必填 | 描述 |
|--------|------|----------|------|
| content | string | 是 | 消息内容 |
| msgtype | string | 否 | 消息类型，可选值: text, markdown，默认为text |
| mentioned_list | string | 否 | userid的列表，提醒群中的指定成员，用逗号分隔。@all表示提醒所有人 |
| mentioned_mobile_list | string | 否 | 手机号列表，提醒手机号对应的群成员，用逗号分隔。@all表示提醒所有人 |

#### 2.2 请求头

| 头部名称 | 是否必填 | 描述 |
|----------|----------|------|
| X-Verification-Token | 可选 | 请求验证令牌，如果配置了验证令牌，则必须提供此头部 |

### 3. 响应格式

#### 3.1 成功响应

```json
{
  "success": true,
  "message": "消息已成功发送到企业微信群",
  "data": {
    "errcode": 0,
    "errmsg": "ok"
  }
}
```

#### 3.2 错误响应

```json
{
  "success": false,
  "message": "错误信息描述",
  "error": {
    "code": "ERROR_CODE",
    "details": "详细错误信息（如果有）"
  }
}
```

### 4. 使用示例

#### 4.1 HTML表单示例

```html
<form id="wechatForm" method="POST" action="YOUR_API_URL">
  <div class="mb-4">
    <label for="content" class="block mb-2">消息内容</label>
    <textarea id="content" name="content" required 
      class="w-full p-2 border rounded"></textarea>
  </div>
  
  <div class="mb-4">
    <label for="msgtype" class="block mb-2">消息类型</label>
    <select id="msgtype" name="msgtype" 
      class="w-full p-2 border rounded">
      <option value="text">文本</option>
      <option value="markdown">Markdown</option>
    </select>
  </div>
  
  <div class="mb-4">
    <label for="mentioned_mobile_list" class="block mb-2">
      提醒手机号（用逗号分隔，@all表示所有人）
    </label>
    <input type="text" id="mentioned_mobile_list" 
      name="mentioned_mobile_list" class="w-full p-2 border rounded">
  </div>
  
  <button type="submit" class="bg-blue-500 text-white py-2 px-4 rounded">
    发送消息
  </button>
</form>

<script>
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
</script>
```

#### 4.2 JavaScript Fetch示例

```javascript
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
```

#### 4.3 cURL示例

```bash
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
```

### 5. 错误码说明

| 错误码 | 描述 | 解决方案 |
|--------|------|----------|
| INVALID_TOKEN | 请求验证失败 | 检查X-Verification-Token请求头是否正确 |
| MISSING_PARAMS | 缺少必要的参数 | 确保content参数已提供 |
| INVALID_MSG_TYPE | 不支持的消息类型 | 使用text或markdown作为消息类型 |
| WEBHOOK_NOT_CONFIGURED | 企业微信Webhook地址未配置 | 在Cloudflare Worker中配置WECHAT_WEBHOOK_URL环境变量 |
| WECHAT_API_ERROR | 企业微信API返回错误 | 检查错误详情，确保Webhook地址正确且消息格式合法 |

## 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| WECHAT_WEBHOOK_URL | 企业微信机器人Webhook地址 | 无 |
| VERIFICATION_TOKEN | 请求验证令牌，用于验证请求的合法性 | 无 |
| DEFAULT_MSG_TYPE | 默认消息类型，可选值: 'text' 或 'markdown' | 'text' |

### 安全考虑

1. **验证令牌**：建议配置VERIFICATION_TOKEN环境变量，并在请求中使用X-Verification-Token头进行验证，防止未授权访问。

2. **Webhook地址保密**：企业微信机器人的Webhook地址包含敏感信息，不应泄露给未授权人员。通过Cloudflare Worker中转可以避免直接暴露Webhook地址。

3. **输入验证**：API会对输入进行基本验证，但在生产环境中，建议在客户端也进行输入验证，确保消息内容符合预期。

## 本地开发

### 1. 安装依赖

```bash
npm install -g wrangler
```

### 2. 本地运行

```bash
wrangler dev
```

本地服务器启动后，可以通过`http://localhost:8787`访问API。

### 3. 测试

可以使用Postman、curl或示例HTML页面测试API功能。

## 示例页面

项目提供了一个完整的示例HTML页面，可以直接打开使用：

```bash
open src/example.html
```

示例页面包含以下功能：
- 消息发送表单
- Markdown预览
- 示例消息模板
- 响应结果展示

## 企业微信机器人消息格式

### 文本消息

```json
{
  "msgtype": "text",
  "text": {
    "content": "广州今日天气：29度，大部分多云，降雨概率：60%",
    "mentioned_list": ["wangqing", "@all"],
    "mentioned_mobile_list": ["13800001111", "@all"]
  }
}
```

### Markdown消息

```json
{
  "msgtype": "markdown",
  "markdown": {
    "content": "实时新增用户反馈<font color=\"warning\">132例</font>，请相关同事注意。\n> 类型:<font color=\"comment\">用户反馈</font>\n> 普通用户反馈:<font color=\"comment\">117例</font>\n> VIP用户反馈:<font color=\"comment\">15例</font>"
  }
}
```

支持的Markdown语法：
- 标题：`# 标题1`、`## 标题2`、`### 标题3`等
- 加粗：`**加粗文本**`
- 链接：`[链接文字](链接地址)`
- 引用：`> 引用内容`
- 行内代码：`` `代码片段` ``
- 字体颜色：`<font color="warning">橙红色</font>`、`<font color="info">绿色</font>`、`<font color="comment">灰色</font>`

## 常见问题

### Q1: 如何获取企业微信机器人的Webhook地址？

A1: 在企业微信群聊中添加机器人后，系统会自动生成Webhook地址。具体步骤：
1. 进入群聊 -> 点击右上角"..." -> 添加机器人 -> 新创建一个机器人
2. 创建成功后，复制Webhook地址

### Q2: 为什么消息发送失败？

A2: 可能的原因：
1. Webhook地址配置错误
2. 消息内容超过长度限制（文本消息最多2048字节，Markdown消息最多4096字节）
3. 网络连接问题
4. 企业微信API限制（每个机器人每分钟最多发送20条消息）

### Q3: 如何@群成员？

A3: 可以通过以下两种方式@群成员：
1. 使用`mentioned_list`参数，传入成员的userid列表
2. 使用`mentioned_mobile_list`参数，传入成员的手机号列表

使用`@all`可以@群里所有成员。

### Q4: 如何在前端页面中直接调用API？

A4: API支持跨域请求，可以在前端页面中直接使用fetch或axios等工具调用。示例代码：

```javascript
async function sendMessage() {
  const apiUrl = 'YOUR_API_URL';
  const content = document.getElementById('messageInput').value;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Verification-Token': 'YOUR_VERIFICATION_TOKEN'
      },
      body: JSON.stringify({
        content: content,
        msgtype: 'text'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('消息发送成功！');
    } else {
      alert('发送失败: ' + result.message);
    }
  } catch (error) {
    alert('发送过程中出错: ' + error.message);
  }
}
```

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系：your.email@example.com
