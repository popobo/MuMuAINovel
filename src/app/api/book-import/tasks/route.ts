import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  bookImportService,
  BookImportError,
} from '@/services/book-import.service'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ detail: '未登录' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')
  const projectId = form.get('project_id')
  const createNewProject = form.get('create_new_project')
  const importModeRaw = String(form.get('import_mode') ?? 'append')

  if (projectId) {
    return NextResponse.json(
      { detail: '当前仅支持新建项目导入，不支持指定 project_id' },
      { status: 400 },
    )
  }
  if (String(createNewProject) === 'false') {
    return NextResponse.json(
      { detail: '当前仅支持新建项目导入' },
      { status: 400 },
    )
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ detail: '缺少文件' }, { status: 400 })
  }

  const importMode = importModeRaw === 'overwrite' ? 'overwrite' : 'append'

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const result = await bookImportService.createTask({
      userId: session.user.id,
      filename: file.name || 'import.txt',
      fileContent: buf,
      importMode,
    })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof BookImportError) {
      return NextResponse.json({ detail: e.message }, { status: e.statusCode })
    }
    throw e
  }
}
