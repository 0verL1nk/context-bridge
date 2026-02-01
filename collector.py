import asyncio
import aiohttp
import sqlite3
import datetime
import xml.etree.ElementTree as ET
import os
import json

DB_PATH = "data/memory/news_archive.db"
RAW_DATA_PATH = "data/raw_news.json"

SOURCES = [
    # RSS Feeds
    {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml", "type": "rss"},
    {"name": "Hacker News", "url": "https://news.ycombinator.com/rss", "type": "rss"},
    {"name": "TechCrunch", "url": "https://techcrunch.com/wp-json/wp/v2/posts?per_page=20&_embed", "type": "rss"},
    {"name": "Ars Technica", "url": "https://feeds.arstechnica.com/arstechnica/index", "type": "rss"},
    {"name": "IEEE Spectrum", "url": "https://spectrum.ieee.org/feeds/feed.rss", "type": "rss"},
    {"name": "Nvidia", "url": "https://blogs.nvidia.com/feed/", "type": "rss"},
    {"name": "Apple ML", "url": "https://machinelearning.apple.com/rss.xml", "type": "rss"},
    {"name": "Hugging Face", "url": "https://huggingface.co/blog/feed.xml", "type": "rss"},
    {"name": "SemiAnalysis", "url": "https://www.semianalysis.com/feed", "type": "rss"},
    {"name": "Wired", "url": "https://www.wired.com/feed/rss", "type": "rss"},
    {"name": "Cloudflare", "url": "https://blog.cloudflare.com/rss/", "type": "rss"},
    {"name": "VentureBeat", "url": "https://venturebeat.com/feed/", "type": "rss"},
    # Deep Tech (Crawl4AI)
    {"name": "OpenAI", "url": "https://openai.com/news", "type": "crawl"},
    {"name": "Anthropic", "url": "https://www.anthropic.com/research", "type": "crawl"},
    {"name": "DeepMind", "url": "https://deepmind.google/discover/blog/", "type": "crawl"},
    {"name": "Meta AI", "url": "https://ai.meta.com/blog/", "type": "crawl"},
    {"name": "Stability AI", "url": "https://stability.ai/news", "type": "crawl"}
]

async def check_exists(url):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT 1 FROM articles WHERE url=?", (url,))
        exists = c.fetchone() is not None
        conn.close()
        return exists
    except: return False

async def fetch(session, source):
    try:
        if source['type'] == 'rss':
            async with session.get(source['url'], timeout=15) as resp:
                content = await resp.text()
                # 简单解析逻辑（示例）
                return {"source": source['name'], "raw": content[:2000], "status": "success"}
        else:
            async with session.post("http://127.0.0.1:8000/crawl", json={"url": source['url']}, timeout=60) as resp:
                data = await resp.json()
                return {"source": source['name'], "raw": data.get('markdown', '')[:3000], "status": "success"}
    except Exception as e:
        return {"source": source['name'], "error": str(e), "status": "failed"}

async def main():
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, s) for s in SOURCES]
        results = await asyncio.gather(*tasks)
        
        # 写入临时文件供 Agent 处理
        with open(RAW_DATA_PATH, 'w') as f:
            json.dump(results, f)
        print(f"Engine Run Completed. Total sources attempted: {len(results)}")

if __name__ == "__main__":
    main_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(main_loop)
    main_loop.run_until_complete(main())
