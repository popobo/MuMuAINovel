# MuMuAINovel - 快速开始指南

## 🚀 5分钟快速启动

### 1. 安装依赖

```bash
cd new-mumuainovel
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少配置以下内容：

```env
# 数据库
DATABASE_URL="postgresql://mumuai:mumuai_password@localhost:5432/mumuai_novel?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="any-random-string-here"

# 本地认证（开发用）
LOCAL_AUTH_ENABLED=true
LOCAL_AUTH_USERNAME=admin
LOCAL_AUTH_PASSWORD=admin123

# AI 配置（至少配置一个）
OPENAI_API_KEY="sk-..."
DEFAULT_AI_PROVIDER=openai
DEFAULT_MODEL=gpt-4o-mini
```

### 3. 启动数据库

```bash
docker-compose up -d
```

### 4. 初始化数据库

```bash
pnpm exec prisma migrate dev
```

### 5. 启动应用

```bash
pnpm dev
```

访问 http://localhost:3000

### 6. 登录

使用默认账户：
- 用户名：`admin`
- 密码：`admin123`

## 📝 使用流程

### 创建新项目（AI 辅助）

1. 点击 "✨ AI Project Wizard"
2. 按照向导填写信息：
   - **步骤1**：输入小说标题和描述
   - **步骤2**：选择类型、视角、目标字数
   - **步骤3**：设置主角数量
   - **步骤4**：AI 生成大纲和角色

3. 点击 "✨ Create Project with AI"
4. 等待 AI 生成完成

### 手动创建项目

1. 在项目列表页点击 "Create New Project"
2. 填写项目信息
3. 点击创建

### 写作章节

1. 进入项目详情页
2. 点击侧边栏 "Chapters"
3. 点击 "+ New Chapter"
4. 填写章节标题和摘要
5. 进入章节编辑器

### 富文本编辑器功能

编辑器支持以下功能：

#### 文本格式
- **标题**：H1, H2, H3
- **样式**：粗体、斜体、下划线、删除线
- **对齐**：左对齐、居中、右对齐

#### 列表和引用
- 无序列表
- 有序列表
- 引用块

#### 媒体
- 插入链接
- 插入图片

#### 编辑操作
- 撤销/重做
- 实时字数统计
- 自动保存提示

#### AI 辅助
- **AI Generate**：使用 AI 生成章节内容
- **Focus Mode**：专注模式，无干扰写作

### 管理角色

1. 进入项目详情页
2. 点击侧边栏 "Characters"
3. 查看角色卡片列表
4. 点击 "+ Add Character" 创建新角色
5. 填写角色详细信息：
   - 姓名
   - 描述
   - 性格
   - 背景
   - 外貌

### 查看大纲

1. 进入项目详情页
2. 点击侧边栏 "Outline"
3. 查看所有章节大纲
4. 添加故事笔记

### 项目设置

1. 进入项目详情页
2. 点击侧边栏 "Settings"
3. 修改项目信息
4. 配置 AI 设置
5. 调整写作目标

## ⌨️ 快捷键

编辑器支持以下快捷键（在编辑器内）：

- `Cmd/Ctrl + B`：粗体
- `Cmd/Ctrl + I`：斜体
- `Cmd/Ctrl + U`：下划线
- `Cmd/Ctrl + Z`：撤销
- `Cmd/Ctrl + Shift + Z`：重做

## 🤖 AI 功能

### AI 项目向导
- 自动生成故事大纲
- 创建详细角色档案
- 提供情节建议

### AI 章节生成
- 基于章节摘要生成内容
- 考虑前文上下文
- 保持故事连贯性

### AI 提供商支持
- OpenAI (GPT-4, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet)
- Google (Gemini)

## 📊 统计功能

### 项目统计
- 总字数
- 目标字数
- 完成百分比
- 章节数量
- 角色数量

### 章节统计
- 章节字数
- 写作状态
- 实时字数更新

## 🎨 界面特色

- **响应式设计**：支持桌面和移动设备
- **暗色模式**：护眼的深色主题
- **专注模式**：无干扰写作环境
- **侧边栏导航**：快速切换功能
- **实时预览**：即时查看编辑效果

## 🔧 常见问题

### 数据库连接失败

确保 PostgreSQL 容器正在运行：
```bash
docker-compose ps
```

### AI 生成失败

检查环境变量中的 API 密钥是否正确配置。

### 无法保存内容

确保数据库迁移已完成：
```bash
pnpm exec prisma migrate dev
```

## 📚 下一步

- 阅读 [完整文档](README.md)
- 查看 [API 文档](docs/)
- 探索更多功能

## 💡 提示

- 定期保存内容
- 使用章节摘要帮助 AI 生成更好的内容
- 在专注模式下提高写作效率
- 利用 AI 生成大纲来规划故事结构

享受你的创作之旅！✨
