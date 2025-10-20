import { redirect } from 'next/navigation'

// Disable caching for this pages
export const revalidate = 0

export default function HomePage() {
  redirect('/stats')
}
