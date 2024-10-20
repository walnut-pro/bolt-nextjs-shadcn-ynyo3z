'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabaseClient'
import QRCode from 'qrcode.react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ManageQuiz({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [quizResults, setQuizResults] = useState<any[]>([])
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

    const quizSubscription = supabase
      .channel('quizzes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quizzes', filter: `id=eq.${params.id}` }, (payload) => {
        setQuiz(payload.new)
        if (payload.new.status === 'in_progress') {
          fetchCurrentQuestion(payload.new.current_question)
        }
      })
      .subscribe()

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
      quizSubscription.unsubscribe()
      participantsSubscription.unsubscribe()
      answersSubscription.unsubscribe()
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
    setAnswers([])
  }

  const startQuiz = async () => {
    try {
      console.log('クイズ開始処理を開始します');
      console.log('クイズID:', params.id);

      const { data: firstQuestion, error: firstQuestionError } = await supabase
        .from('questions')
        .select('id')
        .eq('quiz_id', params.id)
        .order('id', { ascending: true })
        .limit(1)
        .single()

      if (firstQuestionError) {
        console.error('最初の質問の取得エラー:', firstQuestionError)
        return
      }

      console.log('最初の質問:', firstQuestion);

      const { data: updatedQuiz, error: updateError } = await supabase
        .from('quizzes')
        .update({ status: 'in_progress', current_question: firstQuestion.id })
        .eq('id', params.id)
        .select()
        .single()

      if (updateError) {
        console.error('クイズ開始エラー:', updateError)
        return
      }

      console.log('更新されたクイズ:', updatedQuiz);

      setQuiz(updatedQuiz)
      fetchCurrentQuestion(firstQuestion.id)
    } catch (error) {
      console.error('クイズ開始中に予期せぬエラーが発生しました:', error)
    }
  }

  const nextQuestion = async () => {
    const { data: nextQuestionData, error: nextQuestionError } = await supabase
      .from('questions')
      .select('id')
      .eq('quiz_id', params.id)
      .gt('id', currentQuestion.id)
      .order('id', { ascending: true })
      .limit(1)
      .single()

    if (nextQuestionError) {
      console.error('Error fetching next question:', nextQuestionError)
      return
    }

    if (nextQuestionData) {
      const { data: updatedQuiz, error: updateError } = await supabase
        .from('quizzes')
        .update({ current_question: nextQuestionData.id })
        .eq('id', params.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating current question:', updateError)
      } else {
        setQuiz(updatedQuiz)
        fetchCurrentQuestion(nextQuestionData.id)
      }
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = async () => {
    const { error: updateError } = await supabase
      .from('quizzes')
      .update({ status: 'finished' })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error finishing quiz:', updateError)
    } else {
      setQuiz({ ...quiz, status: 'finished' })
      calculateResults()
    }
  }

  const calculateResults = async () => {
    const { data: resultsData, error: resultsError } = await supabase
      .from('answers')
      .select(`
        participant_id,
        questions!inner(correct_answer),
        selected_option
      `)
      .eq('questions.quiz_id', params.id)

    if (resultsError) {
      console.error('Error fetching results:', resultsError)
      return
    }

    const participantScores = resultsData.reduce((scores: any, answer: any) => {
      const participantId = answer.participant_id
      const isCorrect = answer.questions.correct_answer === answer.selected_option

      if (!scores[participantId]) {
        scores[participantId] = { correct: 0, total: 0 }
      }

      scores[participantId].correct += isCorrect ? 1 : 0
      scores[participantId].total += 1

      return scores
    }, {})

    const results = Object.entries(participantScores).map(([participantId, score]: [string, any]) => ({
      participantId,
      score: score.correct,
      totalQuestions: score.total,
    }))

    results.sort((a, b) => b.score - a.score)

    setQuizResults(results)
    setShowResults(true)
  }

  const renderParticipantList = () => (
    <Card>
      <CardHeader>
        <CardTitle>Participants ({participants.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul>
          {participants.map((participant) => (
            <li key={participant.id}>{participant.name}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )

  const renderQuizControls = () => {
    if (quiz.status === 'waiting') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>クイズ管理</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={startQuiz}>クイズを開始</Button>
          </CardContent>
        </Card>
      )
    }

    if (quiz.status === 'in_progress') {
      const answeredCount = answers.length
      const totalParticipants = participants.length
      const progress = (answeredCount / totalParticipants) * 100

      return (
        <Card>
          <CardHeader>
            <CardTitle>Quiz Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-2">Current Question: {currentQuestion?.question_text}</h3>
            <Progress value={progress} className="mb-2" />
            <p className="mb-2">{answeredCount} out of {totalParticipants} answered</p>
            {answeredCount === totalParticipants && (
              <Button onClick={nextQuestion}>Next Question</Button>
            )}
          </CardContent>
        </Card>
      )
    }

    return null
  }

  const renderResults = () => {
    const chartData = quizResults.map((result) => ({
      name: participants.find((p) => p.id === result.participantId)?.name || 'Unknown',
      score: result.score,
    }))

    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  if (!quiz) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{quiz.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Join Quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <QRCode value={`${window.location.origin}/join/${params.id}`} />
            <p className="mt-2">Or visit: {window.location.origin}/join/{params.id}</p>
          </CardContent>
        </Card>
        {renderParticipantList()}
        {renderQuizControls()}
        {showResults && renderResults()}
      </div>
    </div>
  )
}
