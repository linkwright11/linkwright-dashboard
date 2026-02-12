'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Message = {
  id: string
  created_at: string
  speaker: string
  message_text: string
}

type Conversation = {
  id: string
  created_at: string
  customer_name?: string
  customer_phone: string
  transcript: string
  duration_seconds: number
  status?: string
  messages?: Message[]
}

export default function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCall, setSelectedCall] = useState<Conversation | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [user, setUser] = useState<any>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const router = useRouter()

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark'
    setTheme(savedTheme)
  }, [])

  useEffect(() => {
    checkUser()
  }, [])

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
      setShowWelcome(true)
      fetchConversations()
      
      setTimeout(() => {
        setShowWelcome(false)
      }, 3000)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    let filtered = conversations

    if (statusFilter !== 'all') {
      filtered = filtered.filter(conv => 
        (conv.status || 'completed') === statusFilter
      )
    }

    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(conv => 
        conv.customer_phone.includes(searchTerm) ||
        conv.transcript.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredConversations(filtered)
  }, [searchTerm, statusFilter, conversations])

  async function fetchConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching conversations:', error)
    } else {
      setConversations(data || [])
      setFilteredConversations(data || [])
    }
    setLoading(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await fetchConversations()
    setTimeout(() => setRefreshing(false), 500)
  }

  async function fetchMessages(conversationId: string) {
    setLoadingMessages(true)
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    setLoadingMessages(false)

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }
    
    return data || []
  }

  async function selectCall(call: Conversation) {
    if (selectedCall?.id === call.id) return
    
    setSelectedCall(call)
    const messages = await fetchMessages(call.id)
    
    setSelectedCall({
      ...call,
      messages
    })
  }

  function getCallsToday() {
    const today = new Date().toDateString()
    return conversations.filter(conv => 
      new Date(conv.created_at).toDateString() === today
    ).length
  }

  function getStatusCount(status: string) {
    return conversations.filter(conv => (conv.status || 'completed') === status).length
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'
      }`}>
        <div className={theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}>Loading...</div>
      </div>
    )
  }

  const colors = theme === 'dark' ? {
    bg: 'bg-[#0a0a0a]',
    text: 'text-zinc-100',
    textSecondary: 'text-zinc-400',
    textTertiary: 'text-zinc-500',
    border: 'border-zinc-800/50',
    cardBg: 'bg-zinc-900/50',
    cardHover: 'hover:bg-zinc-900/80',
    inputBg: 'bg-zinc-900',
    buttonBg: 'bg-zinc-900',
  } : {
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textTertiary: 'text-gray-400',
    border: 'border-gray-200',
    cardBg: 'bg-white',
    cardHover: 'hover:bg-gray-50',
    inputBg: 'bg-white',
    buttonBg: 'bg-white',
  }

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} transition-colors duration-200`}>
      {/* Welcome Toast */}
      {showWelcome && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-amber-500 text-zinc-900 px-6 py-3 rounded-lg shadow-lg font-semibold">
            👋 {getGreeting()}, Troy!
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`border-b ${colors.border} ${colors.bg} sticky top-0 z-10 backdrop-blur-sm transition-colors duration-200`}>
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <img 
                src="/logo.png" 
                alt="LinkWright" 
                className="h-8 object-contain object-left"
              />
              <p className={`text-[10px] ${colors.textTertiary} mt-0.5 uppercase tracking-wider transition-colors duration-200`}>
                Call Manager
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 ${colors.cardBg} border ${colors.border} rounded-lg transition-colors`}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 ${colors.cardHover} rounded-lg transition-colors disabled:opacity-50`}
                title="Refresh"
              >
                <svg 
                  className={`w-5 h-5 ${colors.textSecondary} ${refreshing ? 'animate-spin' : ''} transition-colors duration-200`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className={`px-4 py-2 ${colors.buttonBg} border ${colors.border} rounded-lg text-sm ${colors.textSecondary} hover:${colors.text} transition-colors duration-200`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${colors.cardBg} border ${colors.border} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text} transition-colors duration-200`}>{getCallsToday()}</p>
                <p className={`text-xs ${colors.textTertiary} uppercase tracking-wide transition-colors duration-200`}>Calls Today</p>
              </div>
            </div>
          </div>

          <div className={`${colors.cardBg} border ${colors.border} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text} transition-colors duration-200`}>{getStatusCount('completed')}</p>
                <p className={`text-xs ${colors.textTertiary} uppercase tracking-wide transition-colors duration-200`}>Booked</p>
              </div>
            </div>
          </div>

          <div className={`${colors.cardBg} border ${colors.border} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text} transition-colors duration-200`}>{getStatusCount('in_progress')}</p>
                <p className={`text-xs ${colors.textTertiary} uppercase tracking-wide transition-colors duration-200`}>Needs Callback</p>
              </div>
            </div>
          </div>

          <div className={`${colors.cardBg} border ${colors.border} rounded-xl p-4 transition-colors duration-200`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${theme === 'dark' ? 'bg-zinc-700/10' : 'bg-gray-200'} rounded-lg transition-colors duration-200`}>
                <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-600'} transition-colors duration-200`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className={`text-2xl font-bold ${colors.text} transition-colors duration-200`}>{getStatusCount('escalated')}</p>
                <p className={`text-xs ${colors.textTertiary} uppercase tracking-wide transition-colors duration-200`}>No Action</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-amber-500 text-zinc-900'
                  : `${colors.buttonBg} ${colors.textSecondary} hover:${colors.text}`
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-green-500 text-zinc-900'
                  : `${colors.buttonBg} ${colors.textSecondary} hover:${colors.text}`
              }`}
            >
              Booked
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'in_progress'
                  ? 'bg-yellow-500 text-zinc-900'
                  : `${colors.buttonBg} ${colors.textSecondary} hover:${colors.text}`
              }`}
            >
              Callback
            </button>
            <button
              onClick={() => setStatusFilter('escalated')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'escalated'
                  ? `${theme === 'dark' ? 'bg-zinc-700 text-zinc-200' : 'bg-gray-300 text-gray-900'}`
                  : `${colors.buttonBg} ${colors.textSecondary} hover:${colors.text}`
              }`}
            >
              No Action
            </button>
          </div>
          
          <div className="flex-1">
            <div className="relative">
              <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.textTertiary} transition-colors duration-200`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search calls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${colors.inputBg} border ${colors.border} rounded-lg pl-10 pr-4 py-2 text-sm ${colors.text} placeholder-${colors.textTertiary} focus:outline-none focus:border-amber-500/50 transition-colors duration-200`}
              />
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Call List */}
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`${colors.cardBg} border ${colors.border} rounded-xl p-4 animate-pulse transition-colors duration-200`}>
                    <div className={`h-5 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'} rounded w-32 mb-2 transition-colors duration-200`}></div>
                    <div className={`h-4 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'} rounded w-24 transition-colors duration-200`}></div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className={`p-4 ${colors.cardBg} rounded-full mb-4 transition-colors duration-200`}>
                  <svg className={`w-12 h-12 ${theme === 'dark' ? 'text-zinc-700' : 'text-gray-400'} transition-colors duration-200`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <p className={`${colors.textTertiary} text-sm transition-colors duration-200`}>No calls found</p>
              </div>
            ) : (
              filteredConversations.map((call) => {
                const status = call.status || 'completed'
                const isSelected = selectedCall?.id === call.id
                
                return (
                  <button
                    key={call.id}
                    onClick={() => selectCall(call)}
                    className={`w-full text-left ${colors.cardBg} border rounded-xl p-4 transition-all ${
                      isSelected 
                        ? 'border-amber-500 bg-amber-500/5' 
                        : `${colors.border} ${colors.cardHover}`
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
  {call.customer_name && (
    <div className="flex items-center gap-2 mb-1">
      <svg className={`w-4 h-4 ${colors.textTertiary} transition-colors duration-200`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-zinc-100' : 'text-gray-900'} transition-colors duration-200`}>{call.customer_name}</span>
    </div>
  )}
  <div className="flex items-center gap-2">
    <svg className={`w-4 h-4 ${colors.textTertiary} transition-colors duration-200`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
    <span className={`text-sm ${colors.textSecondary} transition-colors duration-200`}>{call.customer_phone}</span>
  </div>
</div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium uppercase tracking-wide ${
                        status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                        theme === 'dark' ? 'bg-zinc-700/20 text-zinc-400' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {status === 'completed' ? 'Booked' :
                         status === 'in_progress' ? 'Callback' :
                         'No Action'}
                      </span>
                    </div>
                    
                    <p className={`text-xs ${colors.textTertiary} mb-2 transition-colors duration-200`}>
                      {new Date(call.created_at).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    
                    <p className={`text-sm ${colors.textSecondary} line-clamp-2 mb-2 transition-colors duration-200`}>{call.transcript}</p>
                    
                    <p className={`text-xs ${colors.textTertiary} transition-colors duration-200`}>
                      {Math.floor(call.duration_seconds / 60)}:{(call.duration_seconds % 60).toString().padStart(2, '0')}
                    </p>
                  </button>
                )
              })
            )}
          </div>

          {/* Transcript Panel */}
          <div className={`${theme === 'dark' ? 'bg-zinc-900/30' : 'bg-white'} border ${colors.border} rounded-xl p-6 lg:sticky lg:top-24 lg:h-[calc(100vh-12rem)] lg:overflow-y-auto transition-colors duration-200`}>
            {!selectedCall ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="p-4 bg-amber-500/10 rounded-full mb-4">
                  <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className={`${colors.textSecondary} transition-colors duration-200`}>Select a call to view the transcript</p>
              </div>
            ) : (
              <div>
                <div className={`mb-6 pb-4 border-b ${colors.border} transition-colors duration-200`}>
  {selectedCall.customer_name && (
    <h3 className={`text-lg font-semibold ${colors.text} mb-1 transition-colors duration-200`}>{selectedCall.customer_name}</h3>
  )}
  <p className={`text-sm ${colors.textSecondary} transition-colors duration-200 mb-1`}>{selectedCall.customer_phone}</p>
  <p className={`text-sm ${colors.textTertiary} transition-colors duration-200`}>
                    {new Date(selectedCall.created_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {loadingMessages ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-zinc-800/50' : 'bg-gray-100'} animate-pulse transition-colors duration-200`}>
                        <div className={`h-4 ${theme === 'dark' ? 'bg-zinc-700' : 'bg-gray-200'} rounded w-3/4 transition-colors duration-200`}></div>
                      </div>
                    ))}
                  </div>
                ) : selectedCall.messages && selectedCall.messages.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCall.messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.speaker === 'ai' 
                            ? 'bg-amber-500/10 border border-amber-500/20' 
                            : theme === 'dark' ? 'bg-zinc-800/50' : 'bg-gray-100'
                        } transition-colors duration-200`}
                      >
                        <p className={`text-xs font-medium mb-1 ${
                          message.speaker === 'ai' ? 'text-amber-400' : colors.textSecondary
                        } transition-colors duration-200`}>
                          {message.speaker === 'ai' ? 'AI Assistant' : 'Customer'}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'} transition-colors duration-200`}>{message.message_text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`${colors.textTertiary} text-center py-8 transition-colors duration-200`}>No transcript available</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}