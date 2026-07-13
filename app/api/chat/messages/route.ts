import { NextResponse } from 'next/server';
import { messages } from '@/lib/chat/store';

export async function GET() {
  return NextResponse.json({ messages });
}
