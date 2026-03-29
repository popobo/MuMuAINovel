# 拆书导入功能完整流程文档

## 概述

拆书导入功能是一个智能化的TXT小说导入系统，能够自动解析文本内容、识别章节结构、生成项目信息、创建角色关系和世界观设定。本文档详细介绍了整个系统的工作流程和实现细节。

## 系统架构

```mermaid
graph TB
    User[用户] --> Upload[上传TXT文件]
    Upload --> API[API层]
    API --> Service[BookImportService]
    Service --> TaskManager[TaskManager]
    Service --> Parser[TXT解析器]
    Service --> PreviewGenerator[预览生成器]
    Service --> AIGenerators[AI生成器]
    Service --> DB[数据库]

    TaskManager --> DB
    Parser --> Parser
    PreviewGenerator --> AIHelpers[AI助手]
    AIGenerators --> AIHelpers
    AIHelpers --> AIProvider[AI提供商]

    style User fill:#e1f5e1
    style API fill:#fff4e1
    style Service fill:#e1f0ff
    style DB fill:#f0e1ff
```

## 核心组件

### 1. BookImportService（导入服务）
**职责**：协调整个导入流程，管理任务状态，处理用户请求

**主要功能**：
- 任务创建和管理
- 异步流程控制
- 错误处理和重试机制
- 数据持久化

### 2. TaskManager（任务管理器）
**职责**：管理导入任务的生命周期和状态

**任务状态流转**：
```mermaid
stateDiagram-v2
    [*] --> pending: 创建任务
    pending --> running: 开始处理
    running --> completed: 处理完成
    running --> failed: 处理失败
    running --> cancelled: 用户取消
    failed --> running: 重试
    completed --> [*]
    cancelled --> [*]
    failed --> [*]
```

### 3. TXT解析器（txt-parser）
**职责**：处理原始文本，识别章节结构

**处理流程**：
```mermaid
flowchart LR
    Input[TXT字节流] --> Decode[编码识别]
    Decode --> Clean[文本清洗]
    Clean --> Heading[章节标题识别]
    Heading --> StrongPattern{强标题模式}
    StrongPattern -->|识别成功| Split[按标题切分]
    StrongPattern -->|识别失败| WeakPattern[弱标题启发式]
    WeakPattern --> Fallback[窗口切分]
    Split --> Chapters[章节数据]
    Fallback --> Chapters
```

**编码识别优先级**：
1. UTF-8 BOM
2. UTF-8
3. GB18030
4. GBK
5. Big5
6. UTF-8容错模式

### 4. 预览生成器（preview-generator）
**职责**：生成导入预览，包括项目信息和章节大纲

**生成流程**：
```mermaid
flowchart TD
    Start[章节数据] --> Filter[内容过滤]
    Filter --> Validate[长度验证]
    Validate --> Build[构建基础信息]
    Build --> ProjectAI[AI项目信息生成]
    Build --> OutlineAI[AI大纲生成]
    ProjectAI --> Merge[合并结果]
    OutlineAI --> Merge
    Merge --> Preview[预览数据]

    style Filter fill:#fff3e0
    style Validate fill:#fff3e0
    style ProjectAI fill:#e8f5e8
    style OutlineAI fill:#e8f5e8
```

### 5. AI生成器（ai-generators）
**职责**：使用AI生成角色、关系、世界观和事件信息

**生成流程**：
```mermaid
flowchart TD
    Start[导入数据] --> Characters[角色和关系生成]
    Start --> World[世界观生成]
    Start --> Events[事件生成]

    Characters --> CharAI[AI分析]
    World --> WorldAI[AI分析]
    Events --> EventAI[AI分析]

    CharAI --> CharDB[写入角色表]
    WorldAI --> LocationDB[写入地点表]
    WorldAI --> OrgDB[写入组织表]
    EventAI --> EventDB[写入事件表]

    CharDB --> Relations[生成关系]
    Relations --> RelationDB[写入关系表]

    style CharAI fill:#e8f5e8
    style WorldAI fill:#e8f5e8
    style EventAI fill:#e8f5e8
```

## 完整导入流程

### 阶段一：文件上传与任务创建

```mermaid
sequenceDiagram
    participant User as 用户
    participant API as API层
    participant Service as BookImportService
    participant TaskMgr as TaskManager
    participant DB as 数据库

    User->>API: POST /api/book-import/tasks
    API->>Service: createTask()
    Service->>Service: 验证文件格式和大小
    Service->>TaskMgr: 创建任务对象
    TaskMgr->>DB: 持久化任务
    Service->>Service: 启动异步处理流程
    API-->>User: 返回task_id和状态
```

**关键验证点**：
- 文件格式：仅支持.txt
- 文件大小：最大50MB
- 导入模式：append（追加）或overwrite（覆盖）

### 阶段二：文本解析与章节识别

```mermaid
flowchart TD
    Start[TXT文件] --> Bytes[读取字节流]
    Bytes --> Decode[编码识别]
    Decode --> UTF8{UTF-8?}
    UTF8 -->|是| Clean[文本清洗]
    UTF8 -->|否| GBK{GB18030?}
    GBK -->|是| Clean
    GBK -->|否| Big5{Big5?}
    Big5 -->|是| Clean
    Big5 -->|否| Fallback[容错模式]
    Fallback --> Clean

    Clean --> Normalize[规范化处理]
    Normalize --> Heading[章节标题识别]
    Heading --> AI{AI识别?}
    AI -->|成功| Pattern[使用识别模式]
    AI -->|失败| Default[默认模式]

    Pattern --> Split[章节切分]
    Default --> Split
    Split --> Chapters[章节数组]

    style Decode fill:#fff3e0
    style Clean fill:#fff3e0
    style AI fill:#e8f5e8
    style Split fill:#e1f0ff
```

**文本清洗规则**：
- 统一换行符（\r\n → \n）
- 移除BOM标记
- 全角空格转半角
- 清理多余空行（最多保留3个）

**章节识别策略**：
1. **AI智能识别**：分析样本，识别常见标题模式
2. **强标题模式**：正则匹配标准章节标题格式
3. **弱标题启发式**：独立短行 + 前后空行
4. **兜底窗口切分**：3000-5000字智能分段

### 阶段三：预览生成

```mermaid
flowchart TD
    Chapters[章节数据] --> Validate[内容验证]
    Validate --> Filter{长度检查}
    Filter -->|≥300字| Process[处理章节]
    Filter -->|<300字| Skip[跳过并警告]

    Process --> Summary[生成摘要]
    Summary --> Detect[重复检测]
    Detect --> Warn{有警告?}
    Warn -->|是| Warnings[添加警告]
    Warn -->|否| ProjectAI

    ProjectAI[AI项目信息生成] --> Sample[提取前3章]
    Sample --> CallAI[调用AI]
    CallAI --> Parse{解析成功?}
    Parse -->|是| Project[项目信息]
    Parse -->|否| FallbackP[规则推断]

    Project --> OutlineAI[AI大纲生成]
    FallbackP --> OutlineAI
    OutlineAI --> Batch[分批处理]
    Batch --> BatchAI[每批5章]
    BatchAI --> Outlines[大纲数组]

    Outlines --> Preview[预览响应]
    Warnings --> Preview
    Preview --> Persist[持久化预览]

    style Validate fill:#fff3e0
    style CallAI fill:#e8f5e8
    style BatchAI fill:#e8f5e8
```

**AI项目信息生成**：
- **输入**：前3章内容（每章2000字）
- **输出**：标题、简介、主题、类型、叙事视角、目标字数
- **提示词模板**：`BOOK_IMPORT_REVERSE_PROJECT_SUGGESTION`

**AI大纲生成**：
- **批次大小**：每批5章
- **输入**：完整章节内容
- **输出**：结构化大纲（场景、角色、情节要点）
- **提示词模板**：`BOOK_IMPORT_REVERSE_OUTLINES`

### 阶段四：用户确认与导入应用

```mermaid
sequenceDiagram
    participant User as 用户
    participant API as API层
    participant Service as BookImportService
    participant DB as 数据库
    participant AI as AI服务

    User->>API: 获取预览
    API->>Service: getPreview()
    Service-->>User: 返回预览数据

    User->>API: 确认导入
    API->>Service: applyImport()

    Service->>DB: 创建Project
    Service->>DB: 创建Outlines
    Service->>DB: 创建Chapters
    Service->>DB: 更新字数统计

    Service->>AI: 生成角色和关系
    AI->>DB: 创建Characters
    AI->>DB: 创建Relationships

    Service->>AI: 生成世界观
    AI->>DB: 创建Locations
    AI->>DB: 创建Organizations

    Service->>AI: 生成事件
    AI->>DB: 创建Events

    Service->>DB: 更新任务状态
    Service-->>API: 返回统计信息
    API-->>User: 导入完成
```

### 阶段五：AI内容生成详解

#### 5.1 角色和关系生成

```mermaid
flowchart TD
    Start[章节大纲] --> Extract[提取角色]
    Extract --> Parse[解析结构]
    Parse --> Filter{过滤类型}
    Filter -->|character| Collect[收集角色]
    Filter -->|organization| Org[组织处理]

    Collect --> Count[统计出现次数]
    Count --> Sample[提取样本章节]
    Sample --> BuildPrompt[构建提示词]

    BuildPrompt --> CallAI[调用AI]
    CallAI --> ParseResult{解析结果}
    ParseResult -->|成功| CreateChar[创建角色]
    ParseResult -->|失败| Fallback[回退方案]

    CreateChar --> CreateRel[创建关系]
    Fallback --> CreateRel
    CreateRel --> Statistics[统计信息]

    style CallAI fill:#e8f5e8
    style CreateChar fill:#e1f0ff
    style CreateRel fill:#e1f0ff
```

**角色提取逻辑**：
1. 从大纲结构中提取 `type: "character"` 的实体
2. 统计角色在各章节的出现频率
3. 选择前20个主要角色
4. AI生成详细角色档案（外貌、性格、背景）

**关系生成策略**：
- **AI模式**：基于章节内容分析角色互动
- **回退模式**：基于共同出现频率创建关系
- **强度计算**：共同出现次数 × 10（最高60）

#### 5.2 世界观生成

```mermaid
flowchart TD
    Start[章节内容] --> ExtractOrg[提取组织]
    ExtractOrg --> FilterOrg{过滤组织}
    FilterOrg -->|organization| OrgList[组织列表]
    FilterOrg -->|character| Skip[跳过]

    OrgList --> BuildPrompt[构建提示词]
    BuildPrompt --> CallAI[调用AI]
    CallAI --> ParseAI{解析结果}

    ParseAI -->|成功| UpdateProject[更新项目世界观]
    UpdateProject --> CreateLoc[创建地点]
    CreateLoc --> CreateOrg[创建组织]
    CreateOrg --> Link[关联地点]

    ParseAI -->|失败| Warning[记录警告]

    style CallAI fill:#e8f5e8
    style CreateLoc fill:#e1f0ff
    style CreateOrg fill:#e1f0ff
```

**世界观更新字段**：
- `worldTimePeriod`：时代背景（200-500字）
- `worldLocation`：地理环境（200-500字）
- `worldAtmosphere`：氛围基调（150-400字）
- `worldRules`：核心规则（200-500字）

**地点创建**：
- 名称、类型、描述
- 气候特点、人口规模
- 重要性评分（1-100）

**组织创建**：
- 名称、类型、描述
- 领导者、规模、影响力
- 关联地点

#### 5.3 事件生成

```mermaid
flowchart TD
    Start[章节内容] --> Sample[提取前10章]
    Sample --> Titles[提取章节标题]
    Titles --> BuildPrompt[构建提示词]
    BuildPrompt --> CallAI[调用AI]

    CallAI --> ParseEvents{解析事件}
    ParseEvents -->|成功| ProcessEvent[处理事件]
    ParseEvents -->|失败| Warning[记录警告]

    ProcessEvent --> ValidateName{名称有效?}
    ValidateName -->|是| MatchLoc[匹配地点]
    ValidateName -->|否| NextEvent[下一个]

    MatchLoc --> Found{找到地点?}
    Found -->|是| CreateWithLoc[创建事件带地点]
    Found -->|否| CreateNoLoc[创建事件无地点]

    CreateWithLoc --> NextEvent
    CreateNoLoc --> NextEvent
    NextEvent --> Count[统计数量]

    style CallAI fill:#e8f5e8
    style CreateWithLoc fill:#e1f0ff
    style CreateNoLoc fill:#e1f0ff
```

**事件识别标准**：
- 推动剧情发展的重要节点
- 角色成长的关键时刻
- 世界观揭示的重大事件
- 剧情转折的核心冲突

**事件字段**：
- 名称、类型（战斗、会面、发现、转折等）
- 详细描述（200-500字）
- 故事时间、重要性评分
- 关联地点

## 错误处理与重试机制

### 错误分类

```mermaid
flowchart TD
    Error[错误发生] --> Classify{错误类型}

    Classify -->|网络错误| Retry[重试3次]
    Classify -->|AI解析错误| Retry
    Classify -->|文件格式错误| Fatal[致命错误]
    Classify -->|验证错误| Fatal
    Classify -->|部分失败| Partial[部分继续]

    Retry --> Success{成功?}
    Success -->|是| Continue[继续流程]
    Success -->|否| Fallback[降级处理]

    Partial --> Warn[记录警告]
    Warn --> Continue

    Fatal --> Stop[终止任务]
    Fallback --> Continue

    style Retry fill:#fff3e0
    style Fallback fill:#ffe1e1
    style Stop fill:#ffe1e1
```

### 重试策略

**AI调用重试**：
- 最大重试次数：3次
- 重试间隔：指数退避
- 失败后降级：规则推断

**章节大纲重试**：
- 单批失败不影响其他批次
- 失败批次使用规则大纲占位
- 用户可手动重试失败章节

## 数据库持久化

### 任务表（BookImportTask）

```mermaid
erDiagram
    BookImportTask ||--o{ BookImportTaskChapter : contains
    BookImportTask {
        string id PK
        string taskId UK
        string userId FK
        string filename
        string status
        int progress
        text message
        text error
        json preview
        boolean cancelled
        string importedProjectId FK
        json failedSteps
        datetime createdAt
        datetime updatedAt
    }

    BookImportTaskChapter {
        string id PK
        string taskId FK
        int chapterNumber
        string title
        text content
        text summary
        string outlineTitle
        text outlineContent
        json outlineStructure
        string status
        text error
        datetime createdAt
        datetime updatedAt
    }
```

### 项目关系图

```mermaid
erDiagram
    Project ||--o{ Chapter : contains
    Project ||--o{ Outline : contains
    Project ||--o{ Character : contains
    Project ||--o{ Location : contains
    Project ||--o{ Organization : contains
    Project ||--o{ Event : contains

    Character ||--o{ Relationship : has
    Relationship }o--|| Character : relates_to

    Event }o--|| Location : occurs_at
    Organization }o--|| Location : based_at

    Project {
        string id PK
        string userId FK
        string title
        text description
        text theme
        string genre
        int targetWords
        int currentWords
        string status
        text worldTimePeriod
        text worldLocation
        text worldAtmosphere
        text worldRules
    }
```

## 性能优化

### 内存管理
- 流式处理大文件
- 分批处理章节（每批5章）
- 及时释放已处理数据

### 并发控制
- 单用户单任务处理
- 任务队列管理
- 资源限制保护

### 缓存策略
- 任务状态内存缓存
- 数据库持久化备份
- 预览数据分页加载

## 统计信息

导入完成后返回的统计数据包括：

```typescript
{
  chapters: number,           // 章节数量
  outlines: number,          // 大纲数量
  generated_world_building: number,  // 世界观元素数量
  generated_careers: number,  // 职业数量
  generated_entities: number, // 实体总数
  generated_events: number    // 事件数量
}
```

## 警告系统

### 警告级别
- **info**：信息性提示
- **warning**：需要注意的问题
- **error**：严重的错误

### 常见警告代码
- `chapters_filtered_too_short`：过短章节被过滤
- `chapter_too_long`：章节内容过长
- `duplicate_chapter_title`：重复章节标题
- `outline_ai_partial_failed`：部分大纲生成失败

## 扩展性设计

### 新增AI生成步骤
1. 在 `ai-generators.ts` 添加生成函数
2. 在 `prompts.ts` 添加提示词模板
3. 在 `applyImport()` 中调用新函数
4. 更新统计信息

### 支持新的文件格式
1. 扩展文件验证逻辑
2. 添加专用解析器
3. 统一章节数据结构
4. 更新错误处理

## 总结

拆书导入功能通过智能AI处理和多层容错机制，实现了从TXT文件到完整小说项目的自动化转换。系统具有良好的扩展性和稳定性，能够处理各种格式的文本内容，为用户提供便捷的创作辅助工具。

**核心优势**：
- 🤖 AI智能识别和生成
- 🔄 完善的错误处理和重试
- 📊 详细的进度反馈
- 🎯 精准的章节切分
- 🌍 丰富的世界观生成
- 👥 完整的角色关系网络
- ⚡ 重要事件提取

**技术亮点**：
- 流式处理大文件
- 分批AI调用优化
- 内存数据库双缓存
- 智能降级策略
- 完善的单元测试覆盖
