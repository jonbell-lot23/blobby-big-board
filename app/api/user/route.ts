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
    return NextResponse.json({ user: null });
  }

  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        boards: {
          include: {
            tasks: true
          }
        }
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
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
    return NextResponse.json({ user: null });
  }

  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, email } = await request.json();

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { username, email },
      create: {
        id: userId,
        username,
        email,
        boards: {
          create: [
            { name: "Home" },
            { name: "Work" }
          ]
        }
      },
      include: {
        boards: true
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}