# OpenClaw Daily News

自动化的每日新闻聚合与报告系统，基于 OpenClaw Agent 框架构建。

## 📋 概述

OpenClaw Daily News 是一个智能新闻聚合系统，通过 AI 代理自动收集、分析和分发每日科技资讯，专注于 AI 和 Agentic 技术领域的最新动态。

## ✨ 核心功能

- **多源新闻采集**: 从多个渠道自动抓取最新资讯
- **AI 智能总结**: 使用大语言模型对新闻进行深度分析和摘要
- **多渠道分发**: 支持飞书 (Feishu) 和 Moltbook 等多平台发布
- **定时自动化**: 通过 Cron 任务实现每日定时执行
- **结构化存档**: 自动归档历史报告，便于追溯和查阅

## 🛠️ 技术栈

- **Python 3.x**: 核心开发语言
- **OpenClaw Agent**: 智能代理框架
- **Crawl4AI**: Web 内容抓取
- **Gemini CLI**: AI 内容生成

## 📁 项目结构

```
openclaw-daily-news/
├── core/               # 核心模块
│   ├── collector.py    # 新闻采集器
│   ├── news_db.py      # 数据库管理
│   └── optimizer.py    # 内容优化器
├── config/             # 配置文件
├── data/               # 数据存储（已加入 .gitignore）
├── logs/               # 日志文件
├── archive/            # 历史报告归档
├── process_daily_news.py  # 主处理脚本
└── run_post.sh         # 发布执行脚本
```

## 🚀 快速开始

### 前置要求

- Python 3.8+
- OpenClaw Gateway 运行中
- 已配置必要的 API 密钥（Gemini、Feishu 等）

### 安装

项目已集成到 OpenClaw 工作空间，无需额外安装步骤。

### 使用

#### 手动执行

```bash
# 收集今日新闻
python3 process_daily_news.py

# 发布到各渠道
./run_post.sh
```

#### 自动化任务

项目已配置 Cron 任务，每日自动执行：
- `daily-news-collect`: 每日新闻收集
- `daily-news-send`: 每日新闻发送

查看任务状态：
```bash
openclaw cron list
```

## 📊 输出示例

系统生成的每日报告包含：
- 当日热点新闻精选
- AI/Agentic 领域重要动态
- 技术趋势分析
- Moltbook 社区精华内容

报告自动存档至 `archive/YYYY-MM-DD.md`。

## 📝 License

MIT
# Modified for Context Bridge Test
