import { readFile, stat } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const contentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

export async function GET(_request: NextRequest, context: RouteContext<'/uploads/[filename]'>) {
  const { filename } = await context.params;
  const safeFilename = path.basename(filename);
  if (!safeFilename || safeFilename !== filename) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, safeFilename);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const file = await readFile(filePath);
    const ext = path.extname(safeFilename).toLowerCase();

    return new NextResponse(file, {
      headers: {
        'content-type': contentTypes[ext] || 'application/octet-stream',
        'content-length': String(fileStat.size),
        'cache-control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }
}
