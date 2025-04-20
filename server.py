#!/usr/bin/env python3
"""
简单的HTTP服务器脚本，用于在局域网内分享彩票应用
运行此脚本后，可以通过局域网内的其他设备访问
"""

import http.server
import socketserver
import socket
import webbrowser
import os
import sys
import argparse

# 命令行参数解析
parser = argparse.ArgumentParser(description='启动彩票应用本地服务器')
parser.add_argument('-p', '--port', type=int, default=8080, 
                    help='服务器端口号 (默认: 8080)')
args = parser.parse_args()

# 设置端口
PORT = args.port

# 获取本机IP地址
def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # 不需要真正连接
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

# 启动HTTP服务器
Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    '.webapp': 'application/x-web-app-manifest+json',
})

try:
    httpd = socketserver.TCPServer(("", PORT), Handler)
except OSError as e:
    if "Address already in use" in str(e):
        print(f"\n❌ 错误: 端口 {PORT} 已被占用!")
        print(f"请尝试使用其他端口，例如: python3 server.py --port 9000\n")
        sys.exit(1)
    else:
        raise e

# 获取当前目录
current_dir = os.path.basename(os.getcwd())

# 显示服务器信息
my_ip = get_ip()
print("\n======================================================")
print(" 🎯 双色球选号应用服务器已启动")
print("======================================================")
print(f" 📱 在手机上访问: http://{my_ip}:{PORT}")
print("------------------------------------------------------")
print(" 👉 第一次使用步骤:")
print(" 1. 使用手机浏览器访问上面的地址")
print(" 2. 添加到主屏幕（详见README.md的说明）")
print(" 3. 之后可离线使用，无需网络连接")
print("------------------------------------------------------")
print(" ⚠️ 请保持电脑和手机在同一Wi-Fi网络")
print(" 🛑 按 Ctrl+C 停止服务器")
print("======================================================\n")

# 自动在浏览器中打开
webbrowser.open(f'http://localhost:{PORT}')

# 启动服务器
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\n🛑 服务器已停止")
    httpd.server_close() 