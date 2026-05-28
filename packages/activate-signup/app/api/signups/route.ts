import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { CapacityError, SlotNotFoundError, getPublicBoard, submitSignupClaim } from '@/lib/board';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const signupInput = {
      slotId: String(body.slotId ?? ''),
      parentName: String(body.parentName ?? ''),
      phone: String(body.phone ?? ''),
      quantity: Number(body.quantity ?? 0),
      ...(body.email ? { email: String(body.email) } : {}),
      ...(body.notes ? { notes: String(body.notes) } : {}),
    };
    const result = await submitSignupClaim(signupInput);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Please check the form and try again.',
          issues: error.flatten(),
        },
        { status: 400 }
      );
    }

    if (error instanceof CapacityError || error instanceof SlotNotFoundError) {
      const board = await getPublicBoard();
      return NextResponse.json(
        {
          error: error.message,
          board,
        },
        { status: error instanceof CapacityError ? 409 : 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Unable to save the signup right now.',
      },
      { status: 500 }
    );
  }
}