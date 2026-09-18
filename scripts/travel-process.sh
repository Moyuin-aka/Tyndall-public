#!/bin/bash
# ⚠️  LEGACY — 照片处理已迁移至 CMS 浏览器端 (Tyndall-backend/src/storage/travelPhoto.ts)
# 以及 R2 直传管线。本脚本保留用于特殊批量补档场景。
#
# 用法：
#   ./scripts/travel-process.sh                        # 处理当前目录
#   ./scripts/travel-process.sh jiuzhaigou-2025-07     # 处理指定旅行文件夹（名称）
#   ./scripts/travel-process.sh /path/to/trip          # 处理任意路径
#
# 依赖：exif-catcher 已安装并在 PATH 中
# 安装：cargo install --git https://github.com/Moyuin-aka/EXIF-Catcher

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRAVEL_ROOT="$(cd "$SCRIPT_DIR/../src/content/travel" && pwd)"

# 解析目标目录
if [ -z "$1" ]; then
  TRIP_DIR="$(pwd)"
elif [ -d "$1" ]; then
  TRIP_DIR="$(realpath "$1")"
else
  # 当作文件夹名处理
  TRIP_DIR="$TRAVEL_ROOT/$1"
fi

if [ ! -d "$TRIP_DIR" ]; then
  echo "❌ 找不到目录：$TRIP_DIR"
  exit 1
fi

TRIP_NAME="$(basename "$TRIP_DIR")"

# 检查是否有可处理的图片
IMG_COUNT=$(find "$TRIP_DIR" -maxdepth 1 \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.heic" -o -iname "*.heif" \) | wc -l | tr -d ' ')

if [ "$IMG_COUNT" -eq 0 ]; then
  echo "⚠️  $TRIP_NAME：没有找到可处理的图片（jpg/png/heic）"
  exit 0
fi

echo "📷  $TRIP_NAME：发现 $IMG_COUNT 张原图，开始处理…"

cd "$TRIP_DIR"
exif-catcher --in-place -q 80 -y

WEBP_COUNT=$(find "$TRIP_DIR/img" -name "*.webp" 2>/dev/null | wc -l | tr -d ' ')
echo "✅  $TRIP_NAME：$WEBP_COUNT 张照片已转换为 WebP，exif.json 已生成"
