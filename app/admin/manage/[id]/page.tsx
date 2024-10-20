'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'qrcode.react'

export default function ManageQuiz({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchQuizData = async () => {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', params.id)
        .single()

      if (quizError) {
        console.error('Error fetching quiz:', quizError)
        return
      }

      setQuiz(quizData)

      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('quiz_id', params.id)

      if (participantsError) {
        console.error('Error fetching participants:', participantsError)
      } else {
        setParticipants(participantsData)
      }

      if (quizData.status === 'in_progress') {
        fetchCurrentQuestion(quizData.current_question)
      }
    }

    fetchQuizData()

    const participantsSubscription = supabase
      .channel('participants')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants', filter: `quiz_id=eq.${params.id}` }, (payload) => {
        setParticipants((current) => [...current, payload.new])
      })
      .subscribe()

    const answersSubscription = supabase
      .channel('answers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers' }, (payload) => {
        setAnswers((current) => [...current, payload.new])
      })
      .subscribe()

    return () => {
      participantsSubscription.unsubscribe()
      answersSubscription.unsubscribe()
    }
  }, [params.id])

  // ... (rest of the component code remains the same)

  return (
    <div className="container mx-auto p-4">
      {/* ... (rest of the JSX remains the same) */}
    </div>
  )
}