import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ boards: [] });
  }

  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const boards = await prisma.board.findMany({
      where: { userId },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ boards });
  } catch (error) {
    console.error("Error fetching boards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ board: null });
  }

  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    const board = await prisma.board.create({
      data: {
        userId,
        name,
      },
      include: {
        tasks: true
      }
    });

    return NextResponse.json({ board });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}