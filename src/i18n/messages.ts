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
    project: {
      backToProjects: '← Back to Projects',
      overview: 'Overview',
      chapters: 'Chapters',
      characters: 'Characters',
      relationships: 'Relationships',
      world: 'World',
      outline: 'Outline',
      settings: 'Settings',
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
    project: {
      backToProjects: '← 返回项目列表',
      overview: '概览',
      chapters: '章节',
      characters: '角色',
      relationships: '关系',
      world: '世界观',
      outline: '大纲',
      settings: '设置',
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
} satisfies MessageTree

const byLocale: Record<AppLocale, MessageTree> = {
  en: enMessages as MessageTree,
  zh: zhMessages,
}

export function getMessageTree(locale: AppLocale): MessageTree {
  return byLocale[locale]
}
