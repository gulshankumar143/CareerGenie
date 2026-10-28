
"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
});

export async function generateCoverLetter(data) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const prompt = `
Write a professional cover letter for a ${data.jobTitle} position at ${data.companyName}.

About the candidate:
- Industry: ${user.industry || "Not specified"}
- Years of experience: ${user.experience ?? 0}
- Skills: ${user.skills?.join(", ") || "Not specified"}
- Professional background: ${user.bio || "Not specified"}

Job description:
${data.jobDescription}

Requirements:
1. Use a professional, enthusiastic tone.
2. Highlight relevant skills and experience.
3. Relate the candidate's background to the job requirements.
4. Keep it under 400 words.
5. Format the letter in Markdown.
6. Do not invent achievements or experience not provided.
`;

  try {
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    if (!content) {
      throw new Error("Gemini returned an empty response");
    }

    return await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });
  } catch (error) {
  console.error("Cover letter generation failed:", {
    message: error?.message,
    status: error?.status,
    statusText: error?.statusText,
    details: error?.errorDetails,
  });

  throw new Error(
    error?.message || "Failed to generate cover letter"
    );
  }
}

export async function getCoverLetters() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return db.coverLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCoverLetter(id) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return db.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return db.coverLetter.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}
