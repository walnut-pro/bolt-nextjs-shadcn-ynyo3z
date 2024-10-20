import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-400 to-purple-500">
      <h1 className="text-4xl font-bold text-white mb-8">Multi-player Quiz App</h1>
      <div className="space-y-4">
        <Link href="/admin/create">
          <Button className="w-48">Create Quiz</Button>
        </Link>
        <Link href="/join">
          <Button className="w-48">Join Quiz</Button>
        </Link>
      </div>
    </div>
  )
}