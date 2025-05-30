# 中国福利彩票双色球智能选号系统

一个带有动画效果的中国福利彩票双色球选号工具。

## 功能特点

- 可视化的双色球选号系统，带有精美动画效果
- 模拟真实的彩票摇奖过程
- 随机生成符合规则的双色球号码（6个红球 + 1个蓝球）
- 响应式设计，适配不同设备
- 支持添加到手机主屏幕，像原生应用一样使用
- **完全离线工作**，添加到主屏幕后无需网络连接

## 如何在电脑上使用

1. 在浏览器中打开 `index.html` 文件
2. 点击"开始选号"按钮开始随机选号过程
3. 观看动画效果，等待系统选出您的幸运号码
4. 如需重新选号，请点击"重新开始"按钮

## 如何在手机上使用（离线方式）

### 第一步：从电脑分享到手机（只需一次）

1. 确保电脑和手机在同一Wi-Fi网络下
2. 在电脑上运行 `server.py` 脚本启动本地服务器：
   ```
   python3 server.py
   ```
   
   默认使用8080端口。如果该端口被占用，可以指定其他端口：
   ```
   python3 server.py --port 9000
   ```
   
   或使用简短形式：
   ```
   python3 server.py -p 9000
   ```

3. 脚本会显示一个URL（例如：http://192.168.1.100:8080 或您指定的端口）
4. 在手机浏览器中访问该URL

### 第二步：添加到主屏幕（只需一次）

#### iOS 设备（iPhone/iPad）
1. 使用Safari浏览器打开上述URL
2. 点击底部的"分享"按钮（方框加箭头图标）
3. 在弹出的选项中滚动并点击"添加到主屏幕"
4. 输入应用名称（例如"双色球选号"）然后点击"添加"
5. 现在应用图标会出现在您的主屏幕上

#### Android 设备
1. 使用Chrome浏览器打开上述URL
2. 点击右上角的菜单按钮（三个点）
3. 选择"添加到主屏幕"选项
4. 输入应用名称然后点击"添加"
5. 现在应用图标会出现在您的主屏幕上

### 第三步：离线使用

1. 完成上述步骤后，您可以断开Wi-Fi或关闭电脑上的服务器
2. 直接从手机主屏幕点击应用图标打开
3. 应用将完全离线工作，无需任何网络连接

## 生成应用图标
1. 打开 `create_icon.html` 文件
2. 点击"下载图标"按钮
3. 将下载的图标放入项目文件夹，并命名为 `icon-192.png`

## 技术说明

- 使用纯 HTML、CSS 和 JavaScript 构建
- 不依赖任何外部库
- 使用 CSS 动画和 JavaScript 动态效果
- 针对移动设备优化，支持添加到主屏幕功能
- 使用Service Worker实现完全离线功能

## 彩票规则说明

双色球是中国福利彩票的一种玩法：
- 红球：从1-33中选择6个号码
- 蓝球：从1-16中选择1个号码

**注意：** 本工具仅供娱乐，不构成任何购彩建议。彩票有风险，请理性购买。 