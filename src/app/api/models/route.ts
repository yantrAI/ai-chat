import { NextResponse } from "next/server";

const models = [
  {
    id: "gemma",
    name: "Gemma",
    description: "Google's lightweight and capable model",
    features: ["Fast responses", "Efficient processing", "Helpful assistant"],
    active: true,
    config: {
      model: "google/gemma-2b-it",
      temperature: 0.7,
      maxTokens: 500,
    },
  },
  {
    id: "mistral",
    name: "Mistral",
    description: "Fast and efficient open source model",
    features: ["Quick thinking", "Accurate responses", "Low latency"],
    active: true,
    config: {
      model: "mistralai/Mistral-Nemo-Instruct-2407",
      temperature: 0.7,
      maxTokens: 500,
    },
  },
  {
    id: "llama",
    name: "Llama 2",
    description: "Meta's powerful open source model",
    features: ["Strong reasoning", "Code generation", "Complex tasks"],
    active: false,
    comingSoon: true,
  },
];

export async function GET() {
  return NextResponse.json(models);
}
