import { NextRequest, NextResponse } from 'next/server';
import { messages, broadcast } from '@/lib/chat/store';

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const messageId = searchParams.get('id');

  if (!messageId) {
    return NextResponse.json({ error: 'ID pesan wajib diisi' }, { status: 400 });
  }

  // Cari index pesan
  const index = messages.findIndex(m => m.id === messageId);
  if (index === -1) {
    return NextResponse.json({ error: 'Pesan tidak ditemukan' }, { status: 404 });
  }

  // Hapus dari memori
  messages.splice(index, 1);

  // Beritahu semua client untuk menghapus pesan ini dari UI
  broadcast({
    type: 'delete_message',
    messageId: messageId
  });

  return NextResponse.json({ success: true });
}
