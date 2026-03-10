@echo off
npx ts-node --transpile-only src/server.ts > start_log.txt 2>&1
