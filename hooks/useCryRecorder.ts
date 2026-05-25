'use client'

import { useCallback, useRef, useState } from 'react'

export type CryResult = {
  probable_cause:     string
  confidence:         'high' | 'medium' | 'low'
  confidence_pct:     number
  reasoning:          string
  suggestions:        string[]
  when_to_call_doctor: string
  disclaimer:         string
}

type RecorderState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

const MAX_DURATION_MS = 15_000

export function useCryRecorder() {
  const [state,    setState]   = useState<RecorderState>('idle')
  const [seconds,  setSeconds] = useState(0)
  const [result,   setResult]  = useState<CryResult | null>(null)
  const [error,    setError]   = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopRef      = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopRecording = useCallback(() => {
    if (timerRef.current)   clearInterval(timerRef.current)
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
    mediaRecorderRef.current?.stop()
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    setResult(null)
    setSeconds(0)
    setState('recording')
    chunksRef.current = []

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone permission denied. Please allow microphone access and try again.')
      setState('error')
      return
    }

    // Prefer webm/opus; fall back to whatever the browser supports
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/ogg')
      ? 'audio/ogg'
      : 'audio/mp4'

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      setState('processing')

      const blob = new Blob(chunksRef.current, { type: mimeType })

      // Encode to base64
      const arrayBuffer = await blob.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuffer)
      let binary = ''
      uint8.forEach((b) => (binary += String.fromCharCode(b)))
      const audio_b64 = btoa(binary)

      // Normalise mime_type to one the API accepts
      const apiMime = (
        mimeType.startsWith('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        mimeType.startsWith('audio/webm')             ? 'audio/webm' :
        mimeType.startsWith('audio/ogg')              ? 'audio/ogg'  :
        'audio/mp4'
      ) as 'audio/webm' | 'audio/webm;codecs=opus' | 'audio/ogg' | 'audio/mp4'

      try {
        const res = await fetch('/api/ai/cry', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ audio_b64, mime_type: apiMime }),
        })

        const data = await res.json() as CryResult & { error?: string }

        if (!res.ok) {
          setError(data.error ?? 'Analysis failed. Please try again.')
          setState('error')
          return
        }

        setResult(data)
        setState('done')
      } catch {
        setError('Network error. Please check your connection and try again.')
        setState('error')
      }
    }

    recorder.start(100) // collect in 100ms chunks

    // Tick the seconds counter
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)

    // Auto-stop at 15s
    autoStopRef.current = setTimeout(() => {
      stopRecording()
    }, MAX_DURATION_MS)
  }, [stopRecording])

  function reset() {
    setState('idle')
    setResult(null)
    setError(null)
    setSeconds(0)
  }

  return { state, seconds, result, error, startRecording, stopRecording, reset }
}
