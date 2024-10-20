'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'

export default function Quiz({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [results, setResults] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const participantId = searchParams.get('participant')

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

      if (quizData.status === 'in_progress') {
        fetchCurrentQuestion(quizData.current_question)
      }
    }

    fetchQuizData()

    const quizSubscription = supabase
      .channel('quizzes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quizzes', filter: `id=eq.${params.id}` }, (payload) => {
        setQuiz(payload.new)
        if (payload.new.status === 'in_progress') {
          fetchCurrentQuestion(payload.new.current_question)
        }
      })
      .subscribe()

    return () => {
      quizSubscription.unsubscribe()
    }
  }, [params.id])

  const fetchCurrentQuestion = async (questionNumber: number) => {
    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .select('*, options(*)')
      .eq('quiz_id', params.id)
      .eq('id', questionNumber)
      .single()

    if (questionError) {
      console.error('Error fetching question:', questionError)
      return
    }

    setCurrentQuestion(questionData)
    setSelectedOption(null)
    setShowAnswer(false)
  }

  const submitAnswer = async () => {
    if (selectedOption === null) return

    const { error } = await supabase
      .from('answers')
      .insert({
        participant_id: participantId,
        question_id: currentQuestion.id,
        selected_option: selectedOption
      })

    if (error) {
      console.error('Error submitting answer:', error)
    }
  }

  if (!quiz) {
    return <div>Loading...</div>
  }

  if (quiz.status === 'waiting') {
    return <div>Waiting for the quiz to start...</div>
  }

  if (quiz.status === 'finished') {
    if (!results) {
      return <div>Calculating results...</div>
    }

    return (
      <div>
        <h2>Quiz Results</h2>
        <p>Your Score: {results.score} out of {results.totalQuestions}</p>
        <p>Ranking: {results.ranking} out of {results.totalParticipants}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{quiz.name}</h1>
      {currentQuestion && (
        <div>
          <h2 className="text-xl mb-2">{currentQuestion.question_text}</h2>
          {currentQuestion.options.map((option: any, index: number) => (
            <Button
              key={option.id}
              onClick={() => setSelectedOption(index)}
              className={`mb-2 ${selectedOption === index ? 'bg-blue-500' : ''}`}
              disabled={showAnswer}
            >
              {option.option_text}
            </Button>
          ))}
          {!showAnswer && (
            <Button onClick={submitAnswer} disabled={selectedOption === null}>
              Submit Answer
            </Button>
          )}
          {showAnswer && (
            <div>
              <p>Correct Answer: {currentQuestion.options[currentQuestion.correct_answer].option_text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}