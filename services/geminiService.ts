
import { GoogleGenAI, Type } from "@google/genai";
import { Student } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSeating = async (students: Student[]): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        以下の生徒リストに基づき、席替えのアドバイスを100文字以内で作成してください。
        特に男女比や選択科目の偏りに注目してください。
        
        生徒リスト:
        ${students.map(s => `${s.name}(${s.gender}, ${s.subject})`).join(', ')}
      `,
      config: {
        systemInstruction: "あなたは優秀な教育コンサルタントです。日本の教室の席替えについて、教育的かつ実用的なアドバイスを日本語で提供します。",
        temperature: 0.7,
      }
    });
    return response.text || "アドバイスを取得できませんでした。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AIアドバイス機能は現在利用できません。";
  }
};
