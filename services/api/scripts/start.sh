#!/bin/sh

# 执行 Drizzle 数据库迁移
node dist/service/drizzle/run-migrations.js

# 启动应用
node dist/main.js
