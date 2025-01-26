import { NextResponse } from "next/server";
import modelsData from "@/config/models.json";

interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens?: number;
  stopTokens?: string[];
  promptTemplate?: {
    system?: string;
    human: string;
    assistant?: string;
  };
}

interface Model {
  id: string;
  name: string;
  description: string;
  features: string[];
  active: boolean;
  comingSoon?: boolean;
  config?: ModelConfig;
  provider: string;
  category: string[];
}

const models: Model[] = modelsData.models;

export async function GET() {
  return NextResponse.json(models);
}
