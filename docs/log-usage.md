# 开发环境日志过滤使用指南

## 问题
在开发环境中使用拆书功能时，`temp.log` 会产生大量重复的 HTTP 请求日志，特别是：
- `GET /api/book-import/tasks/xxx 200 in 5ms` - 每3秒轮询一次
- `GET /api/projects/xxx/relationships 200 in 10ms` - 频繁的 API 调用
- Next.js 性能分析日志 - 每个请求的详细性能分解

这些日志噪音占比约 **80-90%**，严重影响查看重要业务日志。

## 解决方案

### 方法1：使用日志过滤脚本（推荐）

在启动开发服务器时使用日志过滤：

```bash
# 启动开发服务器并过滤日志
pnpm dev 2>&1 | tsx scripts/filter-logs.ts

# 或者保存到文件
pnpm dev 2>&1 | tsx scripts/filter-logs.ts | tee filtered-logs.log
```

**效果**：
- ✅ 自动过滤重复的 GET 请求日志
- ✅ 高亮显示重要的业务日志（如 `[context-aware]`、`[book-import]`）
- ✅ 每100行显示过滤统计
- ✅ 显示关键错误和警告信息

### 方法2：直接查看日志文件并过滤

如果日志已经在 `temp.log` 中：

```bash
# 查看过滤后的日志（只显示重要内容）
grep -E "\[context-aware\]|\[book-import\]|error|Error|ERROR|warn|Warn|WARN|Batch|Processing" temp.log

# 或者排除特定的重复日志
grep -v "GET /api/book-import/tasks/" temp.log | grep -v "GET /api/projects/"
```

### 方法3：实时监控重要日志

```bash
# 实时监控重要日志
tail -f temp.log | grep --line-buffered -E "\[context-aware\]|\[book-import\]|error|Error"

# 或者使用日志过滤脚本
tail -f temp.log | tsx scripts/filter-logs.ts
```

## 当前已优化的配置

1. **Prisma 日志**：只记录错误级别（除非设置 `DATABASE_DEBUG=true`）
2. **前端轮询频率**：从1.5秒改为3秒，减少50%的请求
3. **Next.js 配置**：减少不必要的 URL 记录

## 日志过滤脚本功能

`scripts/filter-logs.ts` 提供以下功能：

1. **自动过滤**：
   - 跳过 `GET /api/book-import/tasks/` 请求
   - 跳过 `GET /api/projects/` 请求
   - 跳过性能分析日志
   - 跳过缓存相关日志

2. **高亮显示**：
   - `[context-aware]` 相关日志（青色）
   - `[book-import]` 相关日志（青色）
   - 错误和警告信息
   - 批次处理信息

3. **统计信息**：
   - 每100行显示过滤统计
   - 结束时显示总体过滤比例

## 示例对比

### 使用前（原始日志）：
```
GET /api/book-import/tasks/xxx 200 in 5ms
GET /api/book-import/tasks/xxx 200 in 6ms
GET /api/book-import/tasks/xxx 200 in 4ms
[context-aware] Processing batch 1/3
GET /api/book-import/tasks/xxx 200 in 7ms
GET /api/book-import/tasks/xxx 200 in 5ms
```

### 使用后（过滤日志）：
```
[context-aware] Processing batch 1/3  (青色高亮)
[Filtered 2/3 (66.7%)]
```

## 推荐工作流

1. **日常开发**：使用过滤脚本查看实时日志
   ```bash
   pnpm dev 2>&1 | tsx scripts/filter-logs.ts
   ```

2. **调试问题**：启用完整日志
   ```bash
   DATABASE_DEBUG=true pnpm dev
   ```

3. **分析现有日志**：使用 grep 或过滤脚本
   ```bash
   cat temp.log | tsx scripts/filter-logs.ts
   ```

通过这些优化，你可以专注于重要的业务逻辑日志，而不被大量的 HTTP 请求日志干扰！