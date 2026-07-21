#!/bin/bash

# Ajax Modifier Chrome Extension 打包脚本

echo "📦 开始打包 Ajax Modifier Chrome 扩展..."

# 清理旧的打包文件
rm -rf dist/
mkdir -p dist

# 创建临时打包目录
TEMP_DIR="dist/ajax-modifier-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TEMP_DIR"

# 复制必要的文件
echo "📁 复制文件..."

# 根目录文件
cp manifest.json "$TEMP_DIR/"
cp content.js "$TEMP_DIR/"
cp service_worker.js "$TEMP_DIR/"
cp devtools.html "$TEMP_DIR/"
cp devtools.js "$TEMP_DIR/"
cp popupDev.html "$TEMP_DIR/"
cp popupSusFresh.html "$TEMP_DIR/"

# images 目录
cp -r images "$TEMP_DIR/"

# iframe 目录（只包含必要的文件）
mkdir -p "$TEMP_DIR/iframe/dist"
cp iframe/index.html "$TEMP_DIR/iframe/"
cp -r iframe/dist/* "$TEMP_DIR/iframe/dist/"

# pageScripts 目录
mkdir -p "$TEMP_DIR/pageScripts"
cp pageScripts/main.js "$TEMP_DIR/pageScripts/"

# 创建 zip 包
echo "🗜️  创建 zip 包..."
cd dist
zip -r "ajax-modifier-extension.zip" "$(basename $TEMP_DIR)"
cd ..

# 清理临时目录
rm -rf "$TEMP_DIR"

echo ""
echo "✅ 打包完成！"
echo ""
echo "📍 输出文件: dist/ajax-modifier-extension.zip"
echo ""
echo "📖 安装说明："
echo "1. 解压 zip 文件"
echo "2. 打开 Chrome 浏览器，访问 chrome://extensions/"
echo "3. 开启右上角的「开发者模式」"
echo "4. 点击「加载已解压的扩展程序」"
echo "5. 选择解压后的目录"
echo ""
