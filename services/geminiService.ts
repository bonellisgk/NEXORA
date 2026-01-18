
import { GoogleGenAI, Type } from "@google/genai";
import { HealthMetrics, AIResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeHealthData(
  metrics: HealthMetrics,
  foodQuery?: string
): Promise<AIResponse> {
  const prompt = `
    Analyze the following health metrics:
    Blood Pressure: ${metrics.systolic}/${metrics.diastolic} mmHg
    Blood Sugar: ${metrics.bloodSugar} mg/dL
    ${foodQuery ? `The user also mentioned eating/planning to eat: "${foodQuery}"` : ""}

    Act as a supportive, professional wellness coach. Provide a detailed analysis including status labels for BP and sugar (green/yellow/red based on standard medical ranges), specific diet recommendations, and lifestyle tips.
    If food was mentioned, evaluate its impact specifically on these current metrics.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "You are 'Health Companion', a helpful, empathetic, and expert health coach. You analyze blood pressure and sugar data to give actionable dietary and lifestyle advice. Always warn users that you are an AI and they should consult a doctor for medical decisions. Keep responses structured and easy to read.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallSummary: { type: Type.STRING },
          bpStatus: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              color: { type: Type.STRING, enum: ['green', 'yellow', 'red'] },
              description: { type: Type.STRING }
            },
            required: ['label', 'color', 'description']
          },
          sugarStatus: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              color: { type: Type.STRING, enum: ['green', 'yellow', 'red'] },
              description: { type: Type.STRING }
            },
            required: ['label', 'color', 'description']
          },
          dietRecommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          lifestyleTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          foodAnalysis: {
            type: Type.OBJECT,
            properties: {
              pros: { type: Type.ARRAY, items: { type: Type.STRING } },
              cons: { type: Type.ARRAY, items: { type: Type.STRING } },
              verdict: { type: Type.STRING },
              rating: { type: Type.NUMBER }
            }
          }
        },
        required: ['overallSummary', 'bpStatus', 'sugarStatus', 'dietRecommendations', 'lifestyleTips']
      }
    }
  });

  return JSON.parse(response.text);
}
