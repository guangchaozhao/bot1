import { APP_CONFIG } from './app-config.js'
import {
  escapeHtml,
  formatAssistantContent,
  normalizeAssistantText,
} from './message-format.js'
import { createStorageApi } from './storage.js'

const appShell = document.getElementById('appShell')
const sidebar = document.getElementById('sidebar')
const sessionGroups = document.getElementById('sessionGroups')
const messages = document.getElementById('messages')
const chatForm = document.getElementById('chatForm')
const messageInput = document.getElementById('messageInput')
const sendButton = document.getElementById('sendButton')
const cancelButton = document.getElementById('cancelButton')
const newChatButton = document.getElementById('newChatButton')
const toggleSidebarButton = document.getElementById('toggleSidebarButton')
const collapseSidebarButton = document.getElementById('collapseSidebarButton')
const sidebarResizeHandle = document.getElementById('sidebarResizeHandle')
const sidebarScrim = document.getElementById('sidebarScrim')
const searchInput = document.getElementById('searchInput')
const shareButton = document.getElementById('shareButton')
const welcomeCard = document.getElementById('welcomeCard')
const backToBottomButton = document.getElementById('backToBottomButton')
const messageTemplate = document.getElementById('messageTemplate')
const brandButton = document.getElementById('brandButton')
const brandMark = document.getElementById('brandMark')
const newChatLabel = document.getElementById('newChatLabel')
const historyHeaderLabel = document.getElementById('historyHeaderLabel')
const accountName = document.getElementById('accountName')
const accountSubtitle = document.getElementById('accountSubtitle')
const modelTitle = document.getElementById('modelTitle')
const shareButtonLabel = document.getElementById('shareButtonLabel')
const welcomeEyebrow = document.getElementById('welcomeEyebrow')
const welcomeTitle = document.getElementById('welcomeTitle')
const welcomeDescription = document.getElementById('welcomeDescription')
const starterGrid = document.getElementById('starterGrid')
const composerHintPrimary = document.getElementById('composerHintPrimary')
const composerHintSecondary = document.getElementById('composerHintSecondary')
const deleteDialog = document.getElementById('deleteDialog')
const deleteDialogBackdrop = document.getElementById('deleteDialogBackdrop')
const deleteDialogTitle = document.getElementById('deleteDialogTitle')
const deleteDialogCopy = document.getElementById('deleteDialogCopy')
const deleteDialogCancelButton = document.getElementById('deleteDialogCancelButton')
const deleteDialogConfirmButton = document.getElementById('deleteDialogConfirmButton')

const themeToggleButton = document.getElementById('themeToggleButton')
if (themeToggleButton) {
  const themeLightIcon = themeToggleButton.querySelector('.theme-icon-light')
  const themeDarkIcon = themeToggleButton.querySelector('.theme-icon-dark')

  // Load saved theme or prefer-color-scheme
  const savedTheme = localStorage.getItem('theme') || 'light'
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark')
    themeLightIcon.style.display = 'none'
    themeDarkIcon.style.display = 'block'
  }

  themeToggleButton.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    themeLightIcon.style.display = isDark ? 'none' : 'block'
    themeDarkIcon.style.display = isDark ? 'block' : 'none'
  })
}

const ICONS = {
  rename: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>',
  delete: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 12h10l1-12" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>',
  confirm: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>',
  close: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>',
  copy: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2" /><path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /></svg>',
  success: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>',
  warning: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>',
  share: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>',
  dots: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" /></svg>',
  pin: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>',
}

const {
  api,
  brand,
  composer,
  history: historyConfig,
  messages: messageConfig,
  share: shareConfig,
  storage: storageConfig,
  ui,
  welcome,
} = APP_CONFIG

const SIDEBAR_WIDTH_DEFAULT = ui.sidebarWidthDefault
const SIDEBAR_WIDTH_MIN = ui.sidebarWidthMin
const SIDEBAR_WIDTH_MAX = ui.sidebarWidthMax
const WELCOME_TRANSITION_MS = ui.welcomeTransitionMs
const renderShareButtonLabel = (label = shareConfig.label) => `${ICONS.share}<span>${label}</span>`

const storage = createStorageApi({
  namespace: storageConfig.namespace,
  sidebarWidthDefault: SIDEBAR_WIDTH_DEFAULT,
  sidebarWidthMin: SIDEBAR_WIDTH_MIN,
  sidebarWidthMax: SIDEBAR_WIDTH_MAX,
})

const createId = () => storage.createId()

const createSession = () => ({
  id: createId(),
  title: historyConfig.newSessionTitle,
  preview: '',
  updatedAt: Date.now(),
  conversationId: '',
  messages: [],
})

const initialUiState = storage.loadUiState()

const state = {
  userId: storage.getUserId(),
  sessions: storage.loadSessions(),
  activeSessionId: '',
  sending: false,
  searchTerm: '',
  sidebarCollapsed: initialUiState.sidebarCollapsed,
  sidebarWidth: initialUiState.sidebarWidth || SIDEBAR_WIDTH_DEFAULT,
  requestController: null,
  editingSessionId: '',
  followOutput: true,
  welcomeVisible: true,
  welcomeHideTimer: null,
  resizingSidebar: false,
  openSessionMenuId: '',
  deleteDialogSessionId: '',
}

if (!state.sessions.length) {
  state.sessions = [createSession()]
}
state.activeSessionId = state.sessions[0].id

let deleteDialogRestoreTarget = null

const getActiveSession = () => state.sessions.find((item) => item.id === state.activeSessionId)

const applyAppConfig = () => {
  document.title = brand.documentTitle
  brandButton?.setAttribute('aria-label', brand.ariaLabel)
  brandMark.textContent = brand.brandMark
  newChatLabel.textContent = historyConfig.newChatLabel
  searchInput.placeholder = historyConfig.searchPlaceholder
  historyHeaderLabel.textContent = historyConfig.recentLabel
  accountName.textContent = brand.accountName
  accountSubtitle.textContent = brand.accountSubtitle
  modelTitle.textContent = brand.appTitle
  shareButtonLabel.textContent = shareConfig.label
  welcomeEyebrow.textContent = welcome.eyebrow
  welcomeTitle.textContent = welcome.title
  welcomeDescription.textContent = welcome.description
  messageInput.placeholder = composer.placeholder
  composerHintPrimary.textContent = composer.desktopHint
  composerHintSecondary.textContent = composer.privacyHint
  shareButton.innerHTML = renderShareButtonLabel(shareConfig.label)

  starterGrid.innerHTML = ''
  for (const prompt of welcome.starters) {
    const button = document.createElement('button')
    button.className = 'starter-card'
    button.type = 'button'
    button.dataset.prompt = prompt
    button.textContent = prompt
    starterGrid.appendChild(button)
  }
}

const formatDateTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getBucketLabel = (timestamp) => {
  const now = new Date()
  const target = new Date(timestamp)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const dayDiff = Math.floor((startOfToday - startOfTarget) / 86400000)
  const currentWeekStart = new Date(startOfToday)
  const mondayOffset = (currentWeekStart.getDay() + 6) % 7
  currentWeekStart.setDate(currentWeekStart.getDate() - mondayOffset)
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  if (dayDiff <= 0) return '今天'
  if (dayDiff === 1) return '昨天'
  if (startOfTarget >= currentWeekStart) return '本周'
  if (startOfTarget >= previousWeekStart) return '上周'
  if (startOfTarget >= currentMonthStart) return '本月'
  return `${target.getFullYear()}年${target.getMonth() + 1}月`
}

const updateSessionSummary = (session) => {
  const firstUserMessage = session.messages.find((item) => item.role === 'user')?.content?.trim()
  const lastMessage = session.messages.at(-1)?.content?.trim()

  session.title = firstUserMessage
    ? firstUserMessage.slice(0, 28)
    : historyConfig.newSessionTitle
  session.preview = lastMessage
    ? lastMessage.replace(/\s+/g, ' ').slice(0, 42)
    : ''
  session.updatedAt = Date.now()
}

const saveSessions = () => {
  storage.saveSessions(state.sessions)
}

const saveUiState = () => {
  storage.saveUiState({
    sidebarCollapsed: state.sidebarCollapsed,
    sidebarWidth: state.sidebarWidth,
  })
}

const persistSessionsSoon = (() => {
  let timer = null
  return () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      saveSessions()
      renderSessions()
    }, 120)
  }
})()

const isNearBottom = () => {
  const threshold = 72
  return messages.scrollHeight - messages.scrollTop - messages.clientHeight <= threshold
}

const updateBackToBottomState = () => {
  const hasOverflow = messages.scrollHeight > messages.clientHeight + 40
  backToBottomButton.hidden = !hasOverflow || state.followOutput
}

const scrollMessagesToBottom = (behavior = 'auto') => {
  messages.scrollTo({
    top: messages.scrollHeight,
    behavior,
  })
}

const isMobileViewport = () => window.innerWidth <= 960

const setWelcomeVisibility = (visible) => {
  window.clearTimeout(state.welcomeHideTimer)
  state.welcomeVisible = visible

  if (visible) {
    welcomeCard.hidden = false
    requestAnimationFrame(() => {
      welcomeCard.classList.remove('is-hidden')
      welcomeCard.classList.add('is-visible')
    })
    return
  }

  welcomeCard.classList.remove('is-visible')
  welcomeCard.classList.add('is-hidden')
  state.welcomeHideTimer = window.setTimeout(() => {
    if (!state.welcomeVisible) {
      welcomeCard.hidden = true
    }
  }, WELCOME_TRANSITION_MS)
}

const startRenameSession = (sessionId) => {
  state.openSessionMenuId = ''
  state.editingSessionId = sessionId
  renderSessions()
}

const finishRenameSession = (sessionId, nextTitle, { commit } = { commit: true }) => {
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session) return

  if (commit) {
    const trimmed = nextTitle.trim()
    if (trimmed) {
      session.title = trimmed.slice(0, 40)
      saveSessions()
    }
  }

  state.editingSessionId = ''
  state.openSessionMenuId = ''
  renderSessions()
}

const closeDeleteDialog = ({ restoreFocus = true } = {}) => {
  if (!deleteDialog) return

  deleteDialog.hidden = true
  deleteDialog.setAttribute('aria-hidden', 'true')
  state.deleteDialogSessionId = ''

  if (restoreFocus && deleteDialogRestoreTarget?.isConnected) {
    deleteDialogRestoreTarget.focus()
  }

  deleteDialogRestoreTarget = null
}

const confirmDeleteSession = (sessionId) => {
  state.sessions = state.sessions.filter((item) => item.id !== sessionId)
  state.openSessionMenuId = ''
  if (!state.sessions.length) {
    state.sessions = [createSession()]
  }
  if (!state.sessions.find((item) => item.id === state.activeSessionId)) {
    state.activeSessionId = state.sessions[0].id
  }
  saveSessions()
  render()
}

const openDeleteDialog = (sessionId, trigger) => {
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session || !deleteDialog) return

  state.openSessionMenuId = ''
  state.deleteDialogSessionId = sessionId
  deleteDialogRestoreTarget = trigger instanceof HTMLElement ? trigger : document.activeElement

  if (deleteDialogTitle) {
    deleteDialogTitle.textContent = '删除聊天？'
  }
  if (deleteDialogCopy) {
    deleteDialogCopy.textContent = historyConfig.deleteConfirm(session.title)
  }

  renderSessions()
  deleteDialog.hidden = false
  deleteDialog.setAttribute('aria-hidden', 'false')
  requestAnimationFrame(() => deleteDialogConfirmButton?.focus())
}

const renderSessions = () => {
  sessionGroups.innerHTML = ''

  const keyword = state.searchTerm.trim().toLowerCase()
  const filtered = [...state.sessions]
    .filter((session) => {
      if (!keyword) return true
      const haystack = [
        session.title,
        session.preview,
        ...session.messages.map((item) => item.content),
      ].join(' ').toLowerCase()
      return haystack.includes(keyword)
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)

  if (!filtered.length) {
    const empty = document.createElement('div')
    empty.className = 'empty-state'
    empty.textContent = historyConfig.emptySearchMessage
    sessionGroups.appendChild(empty)
    return
  }

  const buckets = new Map()
  const pinnedItems = []

  for (const session of filtered) {
    if (session.isPinned) {
      pinnedItems.push(session)
      continue
    }
    const label = getBucketLabel(session.updatedAt)
    if (!buckets.has(label)) {
      buckets.set(label, [])
    }
    buckets.get(label).push(session)
  }

  const finalBuckets = new Map()
  if (pinnedItems.length > 0) {
    finalBuckets.set('置顶', pinnedItems)
  }
  for (const [k, v] of buckets) {
    finalBuckets.set(k, v)
  }

  for (const [label, items] of finalBuckets.entries()) {
    const group = document.createElement('section')
    group.className = 'session-group'

    const heading = document.createElement('div')
    heading.className = 'session-group-label'
    heading.textContent = label
    group.appendChild(heading)

    for (const session of items) {
      const card = document.createElement('article')
      card.className = `session-card${session.id === state.activeSessionId ? ' active' : ''}`
      card.dataset.sessionId = session.id
      const menuOpen = state.openSessionMenuId === session.id
      if (state.editingSessionId === session.id) {
        card.classList.add('editing')
        card.innerHTML = `
          <div class="session-card-editing">
            <input
              class="session-title-input"
              data-rename-input="${session.id}"
              type="text"
              maxlength="40"
              value="${escapeHtml(session.title)}"
            />
            <span class="session-card-edit-actions">
              <button class="session-menu-button" type="button" data-action="rename-save" data-session-id="${session.id}" aria-label="保存">${ICONS.confirm}</button>
              <button class="session-menu-button" type="button" data-action="rename-cancel" data-session-id="${session.id}" aria-label="取消">${ICONS.close}</button>
            </span>
            <span class="session-card-preview">${escapeHtml(session.preview || historyConfig.emptyPreview)}</span>
            <span class="session-card-time">${formatDateTime(session.updatedAt)}</span>
          </div>
        `
      } else {
        card.innerHTML = `
          <button class="session-card-main" type="button" data-session-open="${session.id}" title="${escapeHtml(session.title)}">
            <span class="session-card-title">${escapeHtml(session.title)}</span>
            <span class="session-card-preview">${escapeHtml(session.preview || historyConfig.emptyPreview)}</span>
            <span class="session-card-time">${formatDateTime(session.updatedAt)}</span>
          </button>
          <span class="session-card-actions${menuOpen ? ' open' : ''}">
            <button class="session-menu-button session-menu-trigger" type="button" data-action="toggle-menu" data-session-id="${session.id}" aria-label="更多操作" title="更多操作">${ICONS.dots}</button>
            <span class="session-actions-drawer">
              <button class="session-action-btn menu-item" type="button" data-action="rename" data-session-id="${session.id}" aria-label="重命名" title="重命名">
                ${ICONS.rename}<span>重命名</span>
              </button>
              <button class="session-action-btn menu-item" type="button" data-action="pin" data-session-id="${session.id}" aria-label="${session.isPinned ? '取消置顶' : '置顶'}" title="${session.isPinned ? '取消置顶' : '置顶'}">
                ${ICONS.pin}<span>${session.isPinned ? '取消置顶' : '置顶'}</span>
              </button>
              <button class="session-action-btn menu-item danger" type="button" data-action="delete" data-session-id="${session.id}" aria-label="删除" title="删除">
                ${ICONS.delete}<span>删除</span>
              </button>
            </span>
          </span>
        `

        card.querySelector('[data-session-open]').addEventListener('click', () => {
          state.activeSessionId = session.id
          state.openSessionMenuId = ''
          state.followOutput = true
          render()
          if (window.innerWidth <= 960) {
            sidebar.classList.remove('open')
          }
        })
      }

      group.appendChild(card)
    }

    sessionGroups.appendChild(group)
  }

  const activeInput = sessionGroups.querySelector('[data-rename-input]')
  if (activeInput) {
    requestAnimationFrame(() => {
      activeInput.focus()
      activeInput.select()
    })
  }
}

const renderMessages = () => {
  const session = getActiveSession()
  const shouldStick = state.followOutput || isNearBottom()
  const previousScrollTop = messages.scrollTop
  messages.innerHTML = ''

  if (!session || !session.messages.length) {
    state.followOutput = true
    setWelcomeVisibility(true)
    updateBackToBottomState()
    return
  }

  setWelcomeVisibility(false)

  for (const item of session.messages) {
    const fragment = messageTemplate.content.cloneNode(true)
    const article = fragment.querySelector('.message')
    const content = fragment.querySelector('.message-content')
    const copyButton = fragment.querySelector('.copy-action')
    const retryButton = fragment.querySelector('.retry-action')

    article.classList.add(item.role)
    if (item.kind === 'error') article.classList.add('error')
    if (item.kind === 'loading') article.classList.add('loading')
    if (item.kind === 'streaming') article.classList.add('streaming')

  const displayContent = item.kind === 'loading' && !item.content
      ? messageConfig.loading
      : item.content

    if (item.role === 'assistant') {
      content.innerHTML = formatAssistantContent(displayContent)
    } else {
      content.textContent = displayContent
    }

    copyButton.addEventListener('click', async (event) => {
      event.stopPropagation()
      try {
        await navigator.clipboard.writeText(item.content)
        copyButton.innerHTML = ICONS.success
        window.setTimeout(() => {
          copyButton.innerHTML = ICONS.copy
        }, 900)
      } catch {
        copyButton.innerHTML = ICONS.warning
        window.setTimeout(() => {
          copyButton.innerHTML = ICONS.copy
        }, 900)
      }
    })

    retryButton.addEventListener('click', async (event) => {
      event.stopPropagation()
      if (!item.sourcePrompt || state.sending) return
      await sendMessage(item.sourcePrompt)
    })

    if (item.kind === 'loading') {
      copyButton.style.visibility = 'hidden'
      retryButton.style.visibility = 'hidden'
    }

    if (item.role !== 'assistant' || item.kind === 'streaming') {
      retryButton.style.display = 'none'
    }

    if (item.kind === 'streaming') {
      copyButton.style.visibility = 'hidden'
    }

    messages.appendChild(fragment)
  }

  if (shouldStick) {
    requestAnimationFrame(() => {
      scrollMessagesToBottom()
      state.followOutput = true
      updateBackToBottomState()
    })
  } else {
    requestAnimationFrame(() => {
      messages.scrollTop = previousScrollTop
      updateBackToBottomState()
    })
  }
}

const renderLayoutState = () => {
  appShell.style.setProperty('--sidebar-width', `${state.sidebarWidth}px`)
  appShell.classList.toggle('sidebar-collapsed', state.sidebarCollapsed && window.innerWidth > 960)
}

const render = () => {
  renderLayoutState()
  renderSessions()
  renderMessages()
}

const appendMessage = (session, message) => {
  session.messages.push(message)
  updateSessionSummary(session)
  saveSessions()
  render()
}

const upsertAssistantMessage = (sessionId, messageId, updater) => {
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session) return null

  let target = session.messages.find((item) => item.id === messageId)
  if (!target) {
    target = {
      id: messageId,
      role: 'assistant',
      content: '',
      kind: 'streaming',
    }
    session.messages.push(target)
  }

  updater(target)
  updateSessionSummary(session)
  persistSessionsSoon()
  renderMessages()
  return target
}

const replaceLoadingMessage = (sessionId, nextMessage) => {
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session) return

  const loadingIndex = session.messages.findIndex((item) => item.kind === 'loading' || item.kind === 'streaming')
  if (loadingIndex === -1) {
    session.messages.push(nextMessage)
  } else {
    session.messages.splice(loadingIndex, 1, nextMessage)
  }

  updateSessionSummary(session)
  saveSessions()
  render()
}

const replaceMessageById = (sessionId, messageId, nextMessage) => {
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session) return

  const index = session.messages.findIndex((item) => item.id === messageId)
  if (index === -1) {
    replaceLoadingMessage(sessionId, nextMessage)
    return
  }

  session.messages.splice(index, 1, nextMessage)
  updateSessionSummary(session)
  saveSessions()
  render()
}

const setSending = (nextValue) => {
  state.sending = nextValue
  sendButton.hidden = nextValue
  sendButton.disabled = nextValue
  cancelButton.hidden = !nextValue
}

const autoResizeTextarea = () => {
  messageInput.style.height = 'auto'
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 220)}px`
}

const sendMessage = async (overridePrompt = '') => {
  const session = getActiveSession()
  const content = (overridePrompt || messageInput.value).trim()
  if (!session || !content || state.sending) return

  state.followOutput = true
  const assistantMessageId = createId()
  let streamedRawText = ''

  appendMessage(session, {
    id: createId(),
    role: 'user',
    content,
    kind: 'plain',
  })

  appendMessage(session, {
    id: assistantMessageId,
    role: 'assistant',
    content: '',
    kind: 'loading',
    sourcePrompt: content,
  })

  messageInput.value = ''
  autoResizeTextarea()
  setSending(true)

  try {
    const controller = new AbortController()
    state.requestController = controller

    const response = await fetch(api.chatStreamEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        userId: state.userId,
        conversationId: session.conversationId,
        message: content,
      }),
    })

    if (!response.ok || !response.body) {
      throw new Error('流式请求失败')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    const applyEventBlock = (block) => {
      const lines = block.split(/\r?\n/)
      let eventName = ''
      const dataLines = []

      for (const line of lines) {
        if (!line) continue
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
          continue
        }
        if (line.startsWith('data:')) {
          let dataLine = line.slice(5)
          if (dataLine.startsWith(' ')) {
            dataLine = dataLine.slice(1)
          }
          dataLines.push(dataLine)
        }
      }

      if (!dataLines.length) return

      let payload = null
      try {
        payload = JSON.parse(dataLines.join('\n'))
      } catch {
        return
      }

      if (eventName === 'delta') {
        const text = typeof payload?.text === 'string' ? payload.text : ''
        if (!text) return
        streamedRawText += text
        if (payload?.conversationId) {
          session.conversationId = payload.conversationId
        }
        upsertAssistantMessage(session.id, assistantMessageId, (target) => {
          target.kind = 'streaming'
          target.content = normalizeAssistantText(streamedRawText, { streaming: true })
          target.sourcePrompt = content
        })
        return
      }

      if (eventName === 'done') {
        const doneText = typeof payload?.text === 'string' && payload.text.trim()
          ? payload.text
          : ''
        const text = doneText || streamedRawText || messageConfig.emptyReply
        if (payload?.conversationId) {
          session.conversationId = payload.conversationId
        }
        replaceMessageById(session.id, assistantMessageId, {
          id: assistantMessageId,
          role: 'assistant',
          content: text,
          kind: 'plain',
          sourcePrompt: content,
        })
        streamedRawText = text
        return
      }

      if (eventName === 'error') {
        throw new Error(payload?.error || '流式请求失败')
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split(/\r?\n\r?\n/)
      buffer = blocks.pop() ?? ''

      for (const block of blocks) {
        applyEventBlock(block)
      }
    }

    const tailText = decoder.decode()
    if (tailText) {
      buffer += tailText
    }
    if (buffer.trim()) {
      applyEventBlock(buffer)
    }

    if (!streamedRawText.trim()) {
      replaceMessageById(session.id, assistantMessageId, {
        id: assistantMessageId,
        role: 'assistant',
        content: messageConfig.emptyReply,
        kind: 'error',
        sourcePrompt: content,
      })
    }
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError'
    const partialContent = streamedRawText.trim()
      || session.messages.find((item) => item.id === assistantMessageId)?.content?.trim()
      || ''
    replaceMessageById(session.id, assistantMessageId, {
      id: assistantMessageId,
      role: 'assistant',
      content: isAbort
        ? (partialContent || messageConfig.canceled)
        : `${messageConfig.requestFailedPrefix}${error instanceof Error ? error.message : '未知错误'}`,
      kind: isAbort ? 'plain' : 'error',
      sourcePrompt: content,
    })
  } finally {
    state.requestController = null
    setSending(false)
    messageInput.focus()
  }
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  await sendMessage()
})

messageInput.addEventListener('input', autoResizeTextarea)
messageInput.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !isMobileViewport()) {
    event.preventDefault()
    await sendMessage()
  }
})

newChatButton.addEventListener('click', () => {
  const session = createSession()
  state.sessions.unshift(session)
  state.activeSessionId = session.id
  state.followOutput = true
  saveSessions()
  render()
  messageInput.focus()
})

toggleSidebarButton.addEventListener('click', () => {
  sidebar.classList.toggle('open')
})

sidebarScrim?.addEventListener('click', () => {
  sidebar.classList.remove('open')
})

collapseSidebarButton.addEventListener('click', () => {
  if (window.innerWidth <= 960) {
    sidebar.classList.remove('open')
    return
  }

  state.sidebarCollapsed = !state.sidebarCollapsed
  saveUiState()
  renderLayoutState()
})

sidebarResizeHandle?.addEventListener('pointerdown', (event) => {
  if (window.innerWidth <= 960 || state.sidebarCollapsed) return

  state.resizingSidebar = true
  document.body.style.cursor = 'col-resize'
  sidebarResizeHandle.setPointerCapture?.(event.pointerId)

  const move = (nextEvent) => {
    if (!state.resizingSidebar) return
    state.sidebarWidth = Math.max(
      SIDEBAR_WIDTH_MIN,
      Math.min(SIDEBAR_WIDTH_MAX, Math.round(nextEvent.clientX)),
    )
    renderLayoutState()
  }

  const stop = () => {
    state.resizingSidebar = false
    document.body.style.cursor = ''
    saveUiState()
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('pointercancel', stop)
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop, { once: true })
  window.addEventListener('pointercancel', stop, { once: true })
})

searchInput.addEventListener('input', () => {
  state.searchTerm = searchInput.value
  renderSessions()
})

cancelButton.addEventListener('click', () => {
  state.requestController?.abort()
})

shareButton.addEventListener('click', async () => {
  const sharePayload = {
    title: shareConfig.title,
    text: shareConfig.text,
    url: window.location.href,
  }

  try {
    if (navigator.share) {
      await navigator.share(sharePayload)
      return
    }

    await navigator.clipboard.writeText(window.location.href)
    shareButton.innerHTML = renderShareButtonLabel(shareConfig.copiedLabel)
    window.setTimeout(() => {
      shareButton.innerHTML = renderShareButtonLabel(shareConfig.label)
    }, 1000)
  } catch {
    shareButton.innerHTML = renderShareButtonLabel(shareConfig.failedLabel)
    window.setTimeout(() => {
      shareButton.innerHTML = renderShareButtonLabel(shareConfig.label)
    }, 1000)
  }
})

sessionGroups.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]')
  if (!target) return

  event.stopPropagation()
  const action = target.dataset.action
  const sessionId = target.dataset.sessionId
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session) return

  if (action === 'toggle-menu') {
    state.openSessionMenuId = state.openSessionMenuId === sessionId ? '' : sessionId
    renderSessions()
    return
  }

  if (action === 'pin') {
    session.isPinned = !session.isPinned
    state.openSessionMenuId = ''
    saveSessions()
    render()
    return
  }

  if (action === 'rename') {
    startRenameSession(sessionId)
    return
  }

  if (action === 'rename-save') {
    const input = sessionGroups.querySelector(`[data-rename-input="${sessionId}"]`)
    finishRenameSession(sessionId, input?.value || session.title, { commit: true })
    return
  }

  if (action === 'rename-cancel') {
    finishRenameSession(sessionId, session.title, { commit: false })
    return
  }

  if (action === 'delete') {
    openDeleteDialog(sessionId, target)
  }
})

sessionGroups.addEventListener('keydown', (event) => {
  const input = event.target.closest('[data-rename-input]')
  if (!input) return

  const sessionId = input.dataset.renameInput
  if (event.key === 'Enter') {
    event.preventDefault()
    finishRenameSession(sessionId, input.value, { commit: true })
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    finishRenameSession(sessionId, input.value, { commit: false })
  }
})

sessionGroups.addEventListener('focusout', (event) => {
  const input = event.target.closest('[data-rename-input]')
  if (!input) return

  const card = input.closest('.session-card')
  if (card?.contains(event.relatedTarget)) return

  finishRenameSession(input.dataset.renameInput, input.value, { commit: true })
})

messages.addEventListener('scroll', () => {
  state.followOutput = isNearBottom()
  updateBackToBottomState()
})

backToBottomButton.addEventListener('click', () => {
  state.followOutput = true
  scrollMessagesToBottom('smooth')
  updateBackToBottomState()
})

starterGrid.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-prompt]')
  if (!button) return

  const prompt = button.dataset.prompt || ''
  await sendMessage(prompt)
})

window.addEventListener('storage', () => {
  state.sessions = storage.loadSessions()
  const uiState = storage.loadUiState()
  state.sidebarCollapsed = uiState.sidebarCollapsed
  state.sidebarWidth = uiState.sidebarWidth || SIDEBAR_WIDTH_DEFAULT
  if (!state.sessions.find((item) => item.id === state.activeSessionId)) {
    state.activeSessionId = state.sessions[0]?.id || ''
  }
  render()
})

window.addEventListener('keydown', (event) => {
  if (!deleteDialog?.hidden && event.key === 'Escape') {
    closeDeleteDialog()
    return
  }

  if (event.key === 'Escape' && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open')
  }
})

window.addEventListener('resize', () => {
  if (window.innerWidth > 960) {
    sidebar.classList.remove('open')
  }
})

window.addEventListener('click', (event) => {
  if (!event.target.closest('.session-card-actions')) {
    if (state.openSessionMenuId) {
      state.openSessionMenuId = ''
      renderSessions()
    }
  }
})

deleteDialogBackdrop?.addEventListener('click', () => {
  closeDeleteDialog()
})

deleteDialogCancelButton?.addEventListener('click', () => {
  closeDeleteDialog()
})

deleteDialogConfirmButton?.addEventListener('click', () => {
  const sessionId = state.deleteDialogSessionId
  if (!sessionId) return
  closeDeleteDialog({ restoreFocus: false })
  confirmDeleteSession(sessionId)
})

autoResizeTextarea()
applyAppConfig()
render()
