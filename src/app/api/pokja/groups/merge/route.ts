import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== 'POKJA' && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourcePlacementIds, targetPlacementId } = await request.json();

    if (!sourcePlacementIds || !Array.isArray(sourcePlacementIds) || sourcePlacementIds.length === 0 || !targetPlacementId) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    // Get the target placement details
    const targetPlacement = await prisma.internshipPlacement.findUnique({
      where: { id: targetPlacementId },
    });

    if (!targetPlacement) {
      return NextResponse.json({ error: 'Target placement not found' }, { status: 404 });
    }

    // Ensure we have a valid groupId
    let groupId = targetPlacement.groupId;
    if (!groupId) {
      groupId = `group_${crypto.randomBytes(8).toString('hex')}`;
      
      // Assign this new groupId to all placements that share the same implicit group as the target
      // We do this by finding all placements with the same industry, period, and letterNumber
      await prisma.internshipPlacement.updateMany({
        where: { 
          industryId: targetPlacement.industryId,
          periodId: targetPlacement.periodId,
          letterNumber: targetPlacement.letterNumber,
          groupId: null
        },
        data: { groupId },
      });
    }

    // Update all source placements to match the target's group and letter details
    await prisma.internshipPlacement.updateMany({
      where: { id: { in: sourcePlacementIds } },
      data: {
        groupId,
        industryId: targetPlacement.industryId,
        letterNumber: targetPlacement.letterNumber,
        suratTugasUrl: targetPlacement.suratTugasUrl,
        suratBalasanUrl: targetPlacement.suratBalasanUrl,
        suratPengantaranUrl: targetPlacement.suratPengantaranUrl,
        suratPenarikanUrl: targetPlacement.suratPenarikanUrl,
        startDate: targetPlacement.startDate,
        endDate: targetPlacement.endDate,
      },
    });

    return NextResponse.json({ success: true, message: 'Groups merged successfully' });
  } catch (error: any) {
    console.error('Error merging groups:', error);
    return NextResponse.json({ error: error.message || 'Failed to merge groups' }, { status: 500 });
  }
}
