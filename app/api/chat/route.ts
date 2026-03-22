import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const grokClient = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.x.ai/v1' })
const deepseekClient = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' })

type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const { model, messages }: { model: string; messages: Message[] } = await req.json()

  try {
    let content = ''

    if (model === 'claude') {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages,
      })
      content = (res.content[0] as { text: string }).text

    } else if (model === 'chatgpt') {
      const res = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages,
      })
      content = res.choices[0].message.content ?? ''

    } else if (model === 'grok') {
      const res = await grokClient.chat.completions.create({
        model: 'grok-3',
        messages,
      })
      content = res.choices[0].message.content ?? ''

    } else if (model === 'deepseek') {
      const res = await deepseekClient.chat.completions.create({
        model: 'deepseek-chat',
        messages,
      })
      content = res.choices[0].message.content ?? ''

    } else if (model === 'gemini') {
      const geminiMessages = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: geminiMessages }),
        }
      )
      const data = await res.json()
      content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }

    return NextResponse.json({ content })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
