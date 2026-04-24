export const APP_CONFIG = {
  brand: {
    documentTitle: '内部话术培训助手',
    appTitle: '内部话术培训助手',
    ariaLabel: '内部话术培训助手',
    brandMark: 'B',
    accountName: '哗哗',
    accountSubtitle: '个人帐号',
  },
  storage: {
    namespace: 'bot1_training_assistant',
  },
  api: {
    chatStreamEndpoint: '/api/chat/stream',
  },
  ui: {
    sidebarWidthDefault: 260,
    sidebarWidthMin: 236,
    sidebarWidthMax: 420,
    welcomeTransitionMs: 240,
  },
  history: {
    recentLabel: '最近',
    newChatLabel: '新聊天',
    newSessionTitle: '新聊天',
    searchPlaceholder: '搜索聊天',
    emptySearchMessage: '没有匹配的聊天记录',
    emptyPreview: '还没有消息',
    deleteConfirm: (title) => `确定删除“${title}”吗？`,
  },
  welcome: {
    eyebrow: 'Training Workspace',
    title: '内部话术培训助手',
    description: '可以直接问开场白、报价逻辑、邀约到店、异议处理、材料要求和跟进方法。',
    starters: [
      '新人第一次加到客户微信，第一句怎么说？',
      '客户问能不能零首付，我该怎么回？',
      '客户说太远不想来店里，怎么继续推进？',
      '客户问只带身份证行不行，这种问题怎么说更稳？',
    ],
  },
  composer: {
    placeholder: '有问题，尽管问',
    desktopHint: '桌面端 Enter 发送，移动端回车换行',
    privacyHint: '聊天记录只保存在当前浏览器',
  },
  share: {
    label: '分享',
    copiedLabel: '已复制链接',
    failedLabel: '分享失败',
    title: '内部话术培训助手',
    text: '内部话术培训助手',
  },
  messages: {
    loading: '正在思考...',
    emptyReply: '我这边暂时没有拿到有效回复，请你换个问法再试一次。',
    canceled: '已取消本次回答。',
    requestFailedPrefix: '请求失败：',
  },
}
