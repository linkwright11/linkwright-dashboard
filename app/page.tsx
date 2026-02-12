'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching conversations:', error)
    } else {
      setConversations(data || [])
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
      // Collapse
      setExpandedId(null)
    } else {
      // Expand and fetch messages
      const messages = await fetchMessages(conversationId)
      
      // Update the conversation with messages
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

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-amber-500">LinkWright</h1>
              <p className="text-sm text-zinc-400">AI Receptionist Dashboard</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Troy Wright</p>
              <p className="text-xs text-zinc-500">troy@linkwright.co.uk</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-amber-500/50 transition-all">
            <p className="text-sm text-zinc-400 mb-1">Total Calls Today</p>
            <p className="text-4xl font-bold text-amber-500">{conversations.length}</p>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-green-500/50 transition-all">
            <p className="text-sm text-zinc-400 mb-1">Answered</p>
            <p className="text-4xl font-bold text-green-500">{conversations.length}</p>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-red-500/50 transition-all">
            <p className="text-sm text-zinc-400 mb-1">Escalated</p>
            <p className="text-4xl font-bold text-red-500">0</p>
          </div>
        </div>

        {/* Calls List */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-zinc-100">Recent Calls</h2>
          
          {loading ? (
            <div className="text-center py-12 text-zinc-400">Loading calls...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">No calls yet</div>
          ) : (
            <div className="space-y-4">
              {conversations.map((call) => {
                const isExpanded = expandedId === call.id
                
                return (
                  <div 
                    key={call.id}
                    onClick={() => toggleExpand(call.id)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
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
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm font-medium">
                          Completed
                        </span>
                        <p className="text-sm text-zinc-400 mt-1">
                          {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                        </p>
                      </div>
                    </div>
                    
                    {/* Summary */}
                    <p className="text-zinc-400 text-sm mb-3">{call.transcript}</p>
                    
                    {/* Expandable full conversation */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-700">
                        <p className="text-sm text-zinc-400 mb-4 font-semibold">Full Conversation:</p>
                        
                        {loadingMessages ? (
                          <p className="text-zinc-500 text-center py-4">Loading conversation...</p>
                        ) : call.messages && call.messages.length > 0 ? (
                          <div className="space-y-3">
                            {call.messages.map((message) => (
                              <div 
                                key={message.id}
                                className={`p-4 rounded-lg ${
                                  message.speaker === 'ai' 
                                    ? 'bg-amber-500/10 border border-amber-500/20' 
                                    : 'bg-blue-500/10 border border-blue-500/20'
                                }`}
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
                    
                    {/* Click hint */}
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