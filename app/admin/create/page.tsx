'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabaseClient'

export default function CreateQuiz() {
  const [quizName, setQuizName] = useState('')
  const [questions, setQuestions] = useState([{ text: '', options: ['', '', '', ''], correctAnswer: 0 }])
  const router = useRouter()

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswer: 0 }])
  }

  const updateQuestion = (index: number, field: string, value: string | number) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value }
    setQuestions(updatedQuestions)
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].options[optionIndex] = value
    setQuestions(updatedQuestions)
  }

  const createQuiz = async () => {
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({ name: quizName, status: 'waiting', current_question: 0 })
      .select()
      .single()

    if (quizError) {
      console.error('Error creating quiz:', quizError)
      return
    }

    for (const question of questions) {
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert({ quiz_id: quiz.id, question_text: question.text, correct_answer: question.correctAnswer })
        .select()
        .single()

      if (questionError) {
        console.error('Error creating question:', questionError)
        continue
      }

      for (const option of question.options) {
        const { error: optionError } = await supabase
          .from('options')
          .insert({ question_id: questionData.id, option_text: option })

        if (optionError) {
          console.error('Error creating option:', optionError)
        }
      }
    }

    router.push(`/admin/manage/${quiz.id}`)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create Quiz</h1>
      <Input
        type="text"
        placeholder="Quiz Name"
        value={quizName}
        onChange={(e) => setQuizName(e.target.value)}
        className="mb-4"
      />
      {questions.map((question, index) => (
        <div key={index} className="mb-6 p-4 border rounded">
          <Input
            type="text"
            placeholder={`Question ${index + 1}`}
            value={question.text}
            onChange={(e) => updateQuestion(index, 'text', e.target.value)}
            className="mb-2"
          />
          {question.options.map((option, optionIndex) => (
            <Input
              key={optionIndex}
              type="text"
              placeholder={`Option ${optionIndex + 1}`}
              value={option}
              onChange={(e) => updateOption(index, optionIndex, e.target.value)}
              className="mb-2"
            />
          ))}
          <select
            value={question.correctAnswer}
            onChange={(e) => updateQuestion(index, 'correctAnswer', parseInt(e.target.value))}
            className="mb-2 p-2 border rounded"
          >
            {question.options.map((_, optionIndex) => (
              <option key={optionIndex} value={optionIndex}>
                Correct Answer: Option {optionIndex + 1}
              </option>
            ))}
          </select>
        </div>
      ))}
      <Button onClick={addQuestion} className="mb-4">Add Question</Button>
      <Button onClick={createQuiz}>Create Quiz</Button>
    </div>
  )
}