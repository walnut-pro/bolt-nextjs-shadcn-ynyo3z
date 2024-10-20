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
    console.log('クイズ作成開始');
    console.log('クイズ名:', quizName);
    console.log('質問数:', questions.length);

    try {
      // まず、クイズを作成します
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({ name: quizName, status: 'waiting' })
        .select()
        .single()

      if (quizError) {
        console.error('クイズ作成エラー:', quizError)
        return
      }

      console.log('クイズ作成成功:', quiz);

      // 最初の質問を作成し、そのIDをcurrent_questionとして設定します
      if (questions.length > 0) {
        console.log('最初の質問を作成中');
        const { data: firstQuestion, error: firstQuestionError } = await supabase
          .from('questions')
          .insert({ quiz_id: quiz.id, question_text: questions[0].text, correct_answer: questions[0].correctAnswer })
          .select()
          .single()

        if (firstQuestionError) {
          console.error('最初の質問作成エラー:', firstQuestionError)
        } else {
          console.log('最初の質問作成成功:', firstQuestion);

          // クイズのcurrent_questionを更新します
          const { error: updateError } = await supabase
            .from('quizzes')
            .update({ current_question: firstQuestion.id })
            .eq('id', quiz.id)

          if (updateError) {
            console.error('クイズ更新エラー:', updateError)
          } else {
            console.log('クイズのcurrent_question更新成功');
          }
        }

        // 最初の質問のオプションを作成します
        console.log('最初の質問のオプションを作成中');
        for (const option of questions[0].options) {
          const { error: optionError } = await supabase
            .from('options')
            .insert({ question_id: firstQuestion.id, option_text: option })

          if (optionError) {
            console.error('オプション作成エラー:', optionError)
          }
        }
        console.log('最初の質問のオプション作成完了');
      }

      // 残りの質問とオプションを作成します
      console.log('残りの質問とオプションを作成中');
      for (let i = 1; i < questions.length; i++) {
        const question = questions[i]
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert({ quiz_id: quiz.id, question_text: question.text, correct_answer: question.correctAnswer })
          .select()
          .single()

        if (questionError) {
          console.error(`質問${i+1}作成エラー:`, questionError)
          continue
        }

        console.log(`質問${i+1}作成成功:`, questionData);

        for (const option of question.options) {
          const { error: optionError } = await supabase
            .from('options')
            .insert({ question_id: questionData.id, option_text: option })

          if (optionError) {
            console.error(`質問${i+1}のオプション作成エラー:`, optionError)
          }
        }
        console.log(`質問${i+1}のオプション作成完了`);
      }

      console.log('クイズ作成完了。管理ページへ遷移します。');
      router.push(`/admin/manage/${quiz.id}`)
    } catch (error) {
      console.error('予期せぬエラーが発生しました:', error);
    }
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
