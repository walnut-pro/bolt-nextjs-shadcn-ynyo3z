'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabaseClient'

export default function JoinQuizWithId({ params }: { params: { id: string } }) {
  const [name, setName] = useState('')
  const router = useRouter()

  const handleJoin = async () => {
    const { data, error } = await supabase
      .from('participants')
      .insert({ quiz_id: params.id, name })
      .select()
      .single()

    if (error) {
      console.error('Error joining quiz:', error)
    } else {
      router.push(`/quiz/${params.id}?participant=${data.id}`)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Join Quiz</h1>
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