"use client"

import * as React from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type SpeechRecognitionCtor = new () => {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: { item: (index: number) => { transcript: string } }[] }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type VoiceMicButtonProps = {
  ticketId?: string
  onTranscript?: (text: string) => void
  onExecuted?: (message: string) => void
}

export function VoiceMicButton({ ticketId, onTranscript, onExecuted }: VoiceMicButtonProps) {
  const t = useT()
  const [listening, setListening] = React.useState(false)
  const [supported, setSupported] = React.useState(false)
  const recognitionRef = React.useRef<InstanceType<SpeechRecognitionCtor> | null>(null)

  React.useEffect(() => {
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  const runExecute = async (transcript: string) => {
    onTranscript?.(transcript)
    const { result } = await apiCall<{ message: string; executed: boolean }>('/api/helpdesk/voice-execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transcript, ticketId }),
    })
    if (result?.message) onExecuted?.(result.message)
  }

  const toggleListen = () => {
    if (!supported) return

    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'pl-PL'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? ''
      if (text.trim()) void runExecute(text.trim())
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  if (!supported) {
    return (
      <span className="text-xs text-muted-foreground">
        {t('helpdesk.voice.unsupported', 'Voice input requires a browser with Web Speech API.')}
      </span>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={listening ? 'destructive' : 'outline'}
      onClick={toggleListen}
      data-helpdesk-voice-mic=""
    >
      {listening ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
      {listening
        ? t('helpdesk.voice.stop', 'Stop')
        : t('helpdesk.voice.start', 'Voice command')}
    </Button>
  )
}
