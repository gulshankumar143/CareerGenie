"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
});

export const generateAIInsights = async (industry) => {
  const prompt = `
Analyze the current state of the ${industry} industry and provide insights in ONLY valid JSON.

{
  "salaryRanges":[
    {
      "role":"string",
      "min":0,
      "max":0,
      "median":0,
      "location":"string"
    }
  ],
  "growthRate":0,
  "demandLevel":"HIGH",
  "topSkills":[""],
  "marketOutlook":"POSITIVE",
  "keyTrends":[""],
  "recommendedSkills":[""]
}

Return ONLY valid JSON.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  return JSON.parse(response.text.trim());
};


export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    // include: {
    //   IndustryInsight: true,
    // },
    select: {
      industry: true,
      IndustryInsight: true, // This works like `include` in this case
    },
  });

  if (!user) throw new Error("User not found");

  if (!user.industry) {
    // console.error("User industry is null. Skipping insight generation.");
    return null;
  }


  // If no insights exist, generate them
  // if (!user.industryInsight) {
  //   const insights = await generateAIInsights(user.industry);

  //   const industryInsight = await db.industryInsight.upsert({
  //     // data: {
  //     //   industry: user.industry,
  //     //   ...insights,
  //     //   nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  //     // },
  //     where: { industry: user.industry }, // Where clause to check for uniqueness
  //     update: {}, // Do nothing if the record already exists
  //     create: {
  //       industry: user.industry,
  //       ...insights, // Include the AI insights
  //       nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Set next update time
  //     },
  //   });

  //   return industryInsight;
  // }

  if (!user.IndustryInsight && user.industry) {
    const insights = await generateAIInsights(user.industry);
    const industryInsight = await db.industryInsight.upsert({
      where: { industry: user.industry },
      update: {},
      create: {
        industry: user.industry,
        salaryRanges: insights.salaryRanges,
        growthRate: insights.growthRate,
        demandLevel: insights.demandLevel,
        topSkills: insights.topSkills,
        marketOutlook: insights.marketOutlook,
        keyTrends: insights.keyTrends,
        recommendedSkills: insights.recommendedSkills,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // example: 1 week later
      },
    });
    return industryInsight;
  }

  return user.IndustryInsight;
}
