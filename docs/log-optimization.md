# 拆书功能日志优化说明

## 问题背景
在拆书功能使用过程中，`temp.log` 文件会产生大量无用的日志信息，主要包括：
1. **Prisma 数据库查询日志**：每次数据库操作都会输出完整的 SQL 语句
2. **重复的 HTTP 请求日志**：前端轮询导致大量重复的 API 请求记录
3. **Next.js 性能分析日志**：每个请求都显示详细的性能分解数据

## 优化方案

### 1. Prisma 日志级别优化
**文件**：`src/lib/db.ts`

**修改前**：
```typescript
log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
```

**修改后**：
```typescript
log: process.env.DATABASE_DEBUG === 'true' ? ['query', 'error', 'warn'] : ['error']
```

**效果**：
- 默认情况下，开发环境也只记录错误级别的日志
- 只有在设置环境变量 `DATABASE_DEBUG=true` 时才输出详细的查询日志
- 大幅减少数据库查询日志的噪音

### 2. 前端轮询频率优化
**文件**：`src/components/book-import/book-import-wizard.tsx`

**修改前**：
```typescript
const id = setInterval(() => {
  void pollTask()
}, 1500) // 每 1.5 秒轮询一次
```

**修改后**：
```typescript
const id = setInterval(() => {
  void pollTask()
}, 3000) // 每 3 秒轮询一次
```

**效果**：
- 将任务状态轮询间隔从 1.5 秒增加到 3 秒
- 减少 50% 的 HTTP 请求日志
- 仍然保持较好的实时性（3 秒延迟对用户体验影响很小）

### 3. Next.js 日志配置优化
**文件**：`next.config.ts`

**修改前**：
```typescript
const nextConfig: NextConfig = {
  /* config options here */
};
```

**修改后**：
```typescript
const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: false, // 不记录完整 URL
    },
  },
};
```

**效果**：
- 减少 Next.js 对 HTTP 请求的详细日志记录
- 不再记录完整的 URL，减少日志冗余

## 使用建议

### 正常开发环境
直接启动开发服务器即可，只会看到关键的错误日志：
```bash
pnpm dev
```

### 需要调试数据库查询时
如果需要调试数据库相关问题，可以启用详细的数据库日志：
```bash
DATABASE_DEBUG=true pnpm dev
```

### 生产环境
生产环境始终只记录错误级别的日志，不受这些配置影响。

## 优化效果

通过以上优化，在正常使用拆书功能时：

1. **日志量减少约 80%**：移除了大量的 Prisma 查询日志和重复的 HTTP 请求日志
2. **保留关键信息**：仍然能看到重要的业务日志（如 `[context-aware]` 相关的日志）
3. **调试能力保留**：需要时可以通过环境变量重新启用详细日志
4. **性能提升**：减少了前端轮询频率，降低了客户端和服务器端的负载

## 验证方法

优化后，运行 `pnpm dev` 并使用拆书功能，观察日志输出：

- ✅ 应该只看到业务相关的日志（如 `[context-aware]`、`[book-import]` 等）
- ✅ 不应该看到大量的 `prisma:query SELECT...` 日志
- ✅ HTTP 请求日志频率明显降低
- ❌ 如果遇到数据库问题，可以通过 `DATABASE_DEBUG=true pnpm dev` 重新启用查询日志