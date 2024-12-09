import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/lib/prisma';

// Type for the sync request body
interface SyncRequest {
  time: number;
  isActive: boolean;
  isBreak: boolean;
  currentPomodoroId: string | null;
  lastUpdate: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { time, isActive, isBreak, currentPomodoroId, lastUpdate } = req.body as SyncRequest;

    // Get the user's current timer state
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        pomodoroState: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's timer state
    const updatedState = await prisma.user.update({
      where: { id: user.id },
      data: {
        pomodoroState: {
          upsert: {
            create: {
              time,
              isActive,
              isBreak,
              currentPomodoroId,
              lastUpdate,
            },
            update: {
              time,
              isActive,
              isBreak,
              currentPomodoroId,
              lastUpdate,
            },
          },
        },
      },
      select: {
        pomodoroState: true,
      },
    });

    // Return the current state
    return res.status(200).json(updatedState.pomodoroState);
  } catch (error) {
    console.error('Error syncing pomodoro state:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
