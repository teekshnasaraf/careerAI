import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || "";
console.log("Testing API Key:", apiKey ? `${apiKey.slice(0, 15)}...` : "NO KEY FOUND");

const ai = new GoogleGenAI({ apiKey });

async function listAndTestAll() {
  try {
    console.log("Listing available models from Google API...");
    const pager = await ai.models.list();

    for await (const m of pager) {
      console.log(`- Model Name: ${m.name}`);
      try {
        const res = await ai.models.generateContent({
          model: m.name || "",
          contents: "Hi",
        });
        console.log(`>>> SUCCESS WITH MODEL: "${m.name}"! Response:\n`, res.text);
        return;
      } catch (err: any) {
        console.log(`Failed for "${m.name}":`, err?.message || err);
      }
    }
  } catch (err: any) {
    console.error("List Models Error:", err?.message || err);
  }
}

listAndTestAll();
