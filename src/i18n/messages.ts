import type { AppLocale } from './config'

type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>
}

export const enMessages = {
  nav: {
    projects: 'Projects',
    signOut: 'Sign Out',
  },
  sidebar: {
    appTitle: 'Workspace',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    workspaceNav: {
      groupCreation: 'Creation tools',
      groupSystem: 'System',
      inspiration: 'Inspiration',
      promptTemplates: 'Prompt templates',
      mcpPlugins: 'MCP plugins',
      bookImport: 'Book import',
      settings: 'Settings',
    },
    project: {
      backToProjects: '← Back to Projects',
      overview: 'Overview',
      chapters: 'Chapters',
      characters: 'Characters',
      relationships: 'Relationships',
      world: 'World',
      worldLocations: 'Locations',
      worldOrganizations: 'Organizations',
      worldEvents: 'Events',
      outline: 'Outline',
      settings: 'Settings',
    },
  },
  workspace: {
    comingSoon: {
      badge: 'Coming soon',
      description:
        'This page is being ported from the classic MuMuAINovel app and is not available yet.',
    },
  },
  brand: 'MuMuAINovel',
  login: {
    tagline: 'AI-Powered Novel Writing Assistant',
    username: 'Username',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    invalidCredentials: 'Invalid credentials',
    orContinueWith: 'Or continue with',
  },
  projects: {
    countOne: '{count} project',
    countMany: '{count} projects',
    countZh: '{count} 个项目',
    title: 'My Projects',
    wizard: '✨ AI Project Wizard',
    pleaseLogin: 'Please log in',
  },
  projectCard: {
    progress: 'Progress',
    wordsCount: '{n} words',
    targetWords: 'of {n}',
    openProject: 'Open Project',
  },
  createProject: {
    cardTrigger: 'Create New Project',
    dialogTitle: 'Create New Project',
    fieldTitle: 'Title',
    fieldDescription: 'Description',
    fieldGenre: 'Genre',
    genrePlaceholder: 'Fantasy, Sci-Fi, Romance...',
    fieldTargetWords: 'Target Word Count',
    cancel: 'Cancel',
    create: 'Create',
    creating: 'Creating...',
  },
  locale: {
    label: 'Language',
    en: 'EN',
    zh: '中文',
  },
  settings: {
    pageTitle: 'API & AI settings',
    pageSubtitle:
      'Keys are stored per account in the database (server-side only). When you save a key here, chapter and wizard generation use it instead of server environment variables.',
    cardLlm: 'Text / LLM API',
    provider: 'Provider',
    apiBaseUrl: 'API base URL',
    apiKey: 'API key',
    apiKeyPlaceholder: 'Paste a new key to replace the stored one',
    apiKeyHintSaved: 'A key is already saved. Leave empty to keep it.',
    llmModel: 'Model name',
    temperature: 'Temperature',
    maxTokens: 'Max tokens',
    fetchModels: 'Fetch models',
    modelsLoaded: '{count} models loaded',
    testConnection: 'Test connection',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Settings saved',
    loadFailed: 'Failed to load settings',
    saveFailed: 'Failed to save',
    testOk: 'Connection OK ({ms} ms)',
    testFailed: 'Test failed',
    resetForm: 'Reset form to defaults',
    deleteStored: 'Remove saved API settings',
    deleteConfirm:
      'Remove all saved LLM settings for your account? Generation will fall back to server environment keys.',
    deleted: 'Saved settings removed',
    deleteFailed: 'Failed to remove settings',
    anthropicUrlHint: 'Optional. Leave empty for Anthropic’s default endpoint.',
    openAiCompatHint:
      'OpenAI-compatible endpoints (OpenAI, OpenRouter, MuMuのAPI) use the chat completions API.',
    loading: 'Loading…',
    needKeyForTest: 'Enter an API key or save settings first.',
    needKeyToSave: 'Enter an API key before saving for the first time.',
    fetchModelsAnthropicHint:
      'Anthropic does not use the OpenAI models list here; enter a model ID manually (e.g. claude-3-5-sonnet-20241022).',
  },
} as const

export type MessageTree = DeepStringRecord<typeof enMessages>

export const zhMessages = {
  nav: {
    projects: '项目',
    signOut: '退出登录',
  },
  sidebar: {
    appTitle: '工作台',
    collapseSidebar: '收起侧边栏',
    expandSidebar: '展开侧边栏',
    workspaceNav: {
      groupCreation: '创作工具',
      groupSystem: '系统设置',
      inspiration: '灵感',
      promptTemplates: '提示词管理',
      mcpPlugins: 'MCP 插件',
      bookImport: '拆书导入',
      settings: '设置',
    },
    project: {
      backToProjects: '← 返回项目列表',
      overview: '概览',
      chapters: '章节',
      characters: '角色',
      relationships: '关系',
      world: '世界观',
      worldLocations: '地点',
      worldOrganizations: '组织',
      worldEvents: '事件',
      outline: '大纲',
      settings: '设置',
    },
  },
  workspace: {
    comingSoon: {
      badge: '即将推出',
      description: '该功能正在从经典版 MuMuAINovel 迁移中，暂未开放。',
    },
  },
  brand: 'MuMuAINovel',
  login: {
    tagline: 'AI 辅助小说创作',
    username: '用户名',
    password: '密码',
    signIn: '登录',
    signingIn: '登录中…',
    invalidCredentials: '账号或密码错误',
    orContinueWith: '或使用以下方式继续',
  },
  projects: {
    countOne: '{count} 个项目',
    countMany: '{count} 个项目',
    countZh: '{count} 个项目',
    title: '我的项目',
    wizard: '✨ AI 项目向导',
    pleaseLogin: '请先登录',
  },
  projectCard: {
    progress: '进度',
    wordsCount: '{n} 字',
    targetWords: '共 {n} 字',
    openProject: '打开项目',
  },
  createProject: {
    cardTrigger: '新建项目',
    dialogTitle: '新建项目',
    fieldTitle: '标题',
    fieldDescription: '简介',
    fieldGenre: '类型',
    genrePlaceholder: '奇幻、科幻、言情…',
    fieldTargetWords: '目标字数',
    cancel: '取消',
    create: '创建',
    creating: '创建中…',
  },
  locale: {
    label: '语言',
    en: 'EN',
    zh: '中文',
  },
  settings: {
    pageTitle: 'API 与 AI 设置',
    pageSubtitle:
      '密钥仅保存在服务端数据库、按账号隔离。保存后，章节与向导生成会优先使用此处配置，而不是服务器环境变量。',
    cardLlm: '文本 / 大模型 API',
    provider: '服务商',
    apiBaseUrl: 'API 地址（Base URL）',
    apiKey: 'API 密钥',
    apiKeyPlaceholder: '粘贴新密钥以替换已保存的密钥',
    apiKeyHintSaved: '已保存过密钥。留空表示不修改。',
    llmModel: '模型名称',
    temperature: '温度',
    maxTokens: '最大 token',
    fetchModels: '获取模型列表',
    modelsLoaded: '已加载 {count} 个模型',
    testConnection: '测试连接',
    save: '保存',
    saving: '保存中…',
    saved: '已保存设置',
    loadFailed: '加载设置失败',
    saveFailed: '保存失败',
    testOk: '连接成功（{ms} ms）',
    testFailed: '测试失败',
    resetForm: '表单恢复默认',
    deleteStored: '删除已保存的 API 设置',
    deleteConfirm:
      '确定删除当前账号下所有已保存的大模型配置？删除后将回退为服务器环境变量中的密钥。',
    deleted: '已删除保存的设置',
    deleteFailed: '删除失败',
    anthropicUrlHint: '可选，留空则使用 Anthropic 官方地址。',
    openAiCompatHint:
      'OpenAI 兼容接口（OpenAI、OpenRouter、MuMuのAPI）使用 Chat Completions API。',
    loading: '加载中…',
    needKeyForTest: '请先填写 API 密钥或先保存设置。',
    needKeyToSave: '首次保存前请填写 API 密钥。',
    fetchModelsAnthropicHint:
      'Anthropic 不使用此处的 OpenAI 模型列表；请直接填写模型 ID（如 claude-3-5-sonnet-20241022）。',
  },
} satisfies MessageTree

const byLocale: Record<AppLocale, MessageTree> = {
  en: enMessages as MessageTree,
  zh: zhMessages,
}

export function getMessageTree(locale: AppLocale): MessageTree {
  return byLocale[locale]
}
