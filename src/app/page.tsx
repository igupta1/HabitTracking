import Link from 'next/link'
import { USERS, USER_IDS } from '@/lib/habits'

/** Landing page. In practice you each bookmark /ishaan or /saloni directly. */
export default function PickUser() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Habits</h1>
      {USER_IDS.map((id) => (
        <Link
          key={id}
          href={`/${id}`}
          className="tap w-full max-w-xs rounded-xl px-4 py-3 text-center font-medium text-black"
          style={{ backgroundColor: USERS[id].color }}
        >
          {USERS[id].name}
        </Link>
      ))}
    </main>
  )
}
