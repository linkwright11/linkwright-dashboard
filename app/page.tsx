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
  customer_phone: string
  transcript: string
  duration_seconds: number
  messages?: Message[]
}

export default function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [user, setUser] = useState<any>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
      setShowWelcome(true)
      fetchConversations()
      
      // Hide welcome message after 3 seconds
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
    if (searchTerm.trim() === '') {
      setFilteredConversations(conversations)
    } else {
      const filtered = conversations.filter(conv => 
        conv.customer_phone.includes(searchTerm) ||
        conv.transcript.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredConversations(filtered)
    }
  }, [searchTerm, conversations])

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

  async function toggleExpand(conversationId: string) {
    if (expandedId === conversationId) {
      setExpandedId(null)
    } else {
      const messages = await fetchMessages(conversationId)
      
      setConversations(prevConvs => 
        prevConvs.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages } 
            : conv
        )
      )
      
      setExpandedId(conversationId)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      {/* Welcome Toast */}
      {showWelcome && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-amber-500 text-zinc-900 px-6 py-3 rounded-lg shadow-lg font-semibold">
            👋 Welcome back, Troy!
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10 backdrop-blur-sm bg-zinc-950/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="inline-block bg-white rounded-lg px-4 py-2 mb-1">
                <img 
                  src="/logo.png" 
                  alt="LinkWright" 
                  className="h-10"
                />
              </div>
              <p className="text-sm text-zinc-400">AI Receptionist Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-left sm:text-right">
                <p className="text-sm text-zinc-400">Troy Wright</p>
                <p className="text-xs text-zinc-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 hover:text-amber-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 animate-fade-in">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-amber-500/50 transition-all hover:scale-105">
            <p className="text-sm text-zinc-400 mb-1">Total Calls</p>
            <p className="text-4xl font-bold text-amber-500">{conversations.length}</p>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-green-500/50 transition-all hover:scale-105">
            <p className="text-sm text-zinc-400 mb-1">Answered</p>
            <p className="text-4xl font-bold text-green-500">{conversations.length}</p>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-red-500/50 transition-all hover:scale-105">
            <p className="text-sm text-zinc-400 mb-1">Escalated</p>
            <p className="text-4xl font-bold text-red-500">0</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 animate-fade-in-delay">
          <input
            type="text"
            placeholder="Search by phone number or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Calls List */}
        <div className="animate-fade-in-delay-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-zinc-100">Recent Calls</h2>
            {searchTerm && (
              <p className="text-sm text-zinc-400">
                {filteredConversations.length} result{filteredConversations.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 animate-pulse">
                  <div className="flex justify-between mb-3">
                    <div>
                      <div className="h-6 bg-zinc-700 rounded w-32 mb-2"></div>
                      <div className="h-4 bg-zinc-700 rounded w-24"></div>
                    </div>
                    <div className="h-8 bg-zinc-700 rounded w-24"></div>
                  </div>
                  <div className="h-4 bg-zinc-700 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-6 bg-zinc-800 rounded-full mb-4">
                <svg className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                {searchTerm ? 'No calls found' : 'No calls yet'}
              </h3>
              <p className="text-zinc-500">
                {searchTerm ? 'Try a different search term' : 'Your calls will appear here once your AI starts answering'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-4 py-2 bg-amber-500 text-zinc-900 rounded-lg hover:bg-amber-400 transition-colors font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConversations.map((call, index) => {
                const isExpanded = expandedId === call.id
                
                return (
                  <div 
                    key={call.id}
                    onClick={() => toggleExpand(call.id)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 sm:p-6 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer animate-slide-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-zinc-100">{call.customer_phone}</p>
                        <p className="text-sm text-zinc-400">
                          {new Date(call.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 sm:text-right">
                        <span className="inline-block px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm font-medium whitespace-nowrap">
                          Completed
                        </span>
                        <p className="text-sm text-zinc-400 whitespace-nowrap">
                          {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-zinc-400 text-sm mb-3">{call.transcript}</p>
                    
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-700 animate-fade-in">
                        <p className="text-sm text-zinc-400 mb-4 font-semibold">Full Conversation:</p>
                        
                        {loadingMessages ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="p-4 rounded-lg bg-zinc-700 animate-pulse">
                                <div className="h-4 bg-zinc-600 rounded w-3/4"></div>
                              </div>
                            ))}
                          </div>
                        ) : call.messages && call.messages.length > 0 ? (
                          <div className="space-y-3">
                            {call.messages.map((message, msgIndex) => (
                              <div 
                                key={message.id}
                                className={`p-4 rounded-lg animate-slide-in ${
                                  message.speaker === 'ai' 
                                    ? 'bg-amber-500/10 border border-amber-500/20' 
                                    : 'bg-blue-500/10 border border-blue-500/20'
                                }`}
                                style={{ animationDelay: `${msgIndex * 100}ms` }}
                              >
                                <p className={`text-xs font-semibold mb-2 ${
                                  message.speaker === 'ai' ? 'text-amber-500' : 'text-blue-400'
                                }`}>
                                  {message.speaker === 'ai' ? '🤖 LinkWright AI' : '👤 Customer'}
                                </p>
                                <p className="text-zinc-100">{message.message_text}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-zinc-500 text-center py-4">No messages found for this conversation</p>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-zinc-500 text-center">
                      {isExpanded ? '▲ Click to collapse' : '▼ Click to view full conversation'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}