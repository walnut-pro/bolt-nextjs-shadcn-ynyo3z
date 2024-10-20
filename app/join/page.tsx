'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabaseClient'

export default function JoinQuiz() {
  const [quizId, setQuizId] = useState('')
  const [name, setName] = useState('')
  const router = useRouter()

  const handleJoin = async () => {
    const { data, error } = await supabase
      .from('participants')
      .insert({ quiz_id: quizId, name })
      .select()
      .single()

    if (error) {
      console.error('Error joining quiz:', error)
    } else {
      router.push(`/quiz/${quizId}?participant=${data.id}`)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Join Quiz</h1>
      <Input
        type="text"
        placeholder="Quiz ID"
        value={quizId}
        onChange={(e) => setQuizId(e.target.value)}
        className="mb-2"
      />
      <Input
        type="text"
        placeholder="Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2"
      />
      <Button onClick={handleJoin}>Join</Button>
    </div>
  )
}