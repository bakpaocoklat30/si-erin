import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TATA_USAHA', 'TATA USAHA', 'POKJA', 'TIM_POKJA'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'tugas', 'sppd', 'laporan'

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
    }

    const assignment = await db.monitoringAssignment.findUnique({
      where: { id },
      select: {
        suratTugasUrl: true,
        sppdUrl: true,
        laporanUrl: true,
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let fileData = null;
    if (type === 'tugas') fileData = assignment.suratTugasUrl;
    if (type === 'sppd') fileData = assignment.sppdUrl;
    if (type === 'laporan') fileData = assignment.laporanUrl;

    if (!fileData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // If it's a data URL (e.g. data:application/pdf;base64,...), return redirect or the base64 content
    if (fileData.startsWith('data:')) {
      const arr = fileData.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const bstr = Buffer.from(arr[1], 'base64');
      
      return new NextResponse(bstr, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${type}_${id}.pdf"`,
        },
      });
    }

    // If it's just a regular string URL (e.g. from S3 or external)
    return NextResponse.redirect(fileData);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
