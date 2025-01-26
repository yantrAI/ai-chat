import { NextResponse } from "next/server";

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

const models: Model[] = [
  {
    id: "gemma-2b",
    name: "Gemma 2B",
    description: "Google's lightweight and capable model",
    features: ["Fast responses", "Efficient processing", "Helpful assistant"],
    active: true,
    provider: "Google",
    category: ["general", "chat"],
    config: {
      model: "google/gemma-2b-it",
      temperature: 0.7,
      stopTokens: ["<end_of_turn>", "</s>"],
      promptTemplate: {
        human: "<start_of_turn>user\n{message}<end_of_turn>\nassistant\n",
        assistant: "",
      },
    },
  },
  {
    id: "mistral-nemo",
    name: "Mistral Nemo",
    description: "Fast and efficient open source model",
    features: ["Quick thinking", "Accurate responses", "Low latency"],
    active: true,
    provider: "Mistral AI",
    category: ["general", "chat"],
    config: {
      model: "mistralai/Mistral-Nemo-Instruct-2407",
      temperature: 0.7,
      stopTokens: ["[/INST]", "</s>"],
      promptTemplate: {
        human: "<s>[INST] {message} [/INST]",
      },
    },
  },
  {
    id: "mistral-7b-v03",
    name: "Mistral 7B v0.3",
    description:
      "Latest version of Mistral's 7B model with improved capabilities",
    features: [
      "Enhanced reasoning",
      "Better context handling",
      "Improved accuracy",
    ],
    active: true,
    provider: "Mistral AI",
    category: ["general", "chat"],
    config: {
      model: "mistralai/Mistral-7B-Instruct-v0.3",
      temperature: 0.7,
      stopTokens: ["[/INST]", "</s>"],
      promptTemplate: {
        human: "<s>[INST] {message} [/INST]",
      },
    },
  },
  {
    id: "qwen2-vl-7b",
    name: "Qwen2 VL 7B",
    description: "Multimodal model capable of understanding text and images",
    features: [
      "Vision-language tasks",
      "Multimodal understanding",
      "Visual reasoning",
    ],
    active: true,
    provider: "Qwen",
    category: ["multimodal", "vision"],
    config: {
      model: "Qwen/Qwen2-VL-7B-Instruct",
      temperature: 0.7,
      stopTokens: ["<|im_end|>", "</s>"],
      promptTemplate: {
        human: "<|im_start|>user\n{message}<|im_end|>\n<|im_start|>assistant\n",
      },
    },
  },
  {
    id: "qwq-32b",
    name: "QwQ 32B Preview",
    description: "Large-scale preview model with advanced capabilities",
    features: [
      "Advanced reasoning",
      "Complex problem solving",
      "High performance",
    ],
    active: true,
    provider: "Qwen",
    category: ["general", "chat"],
    config: {
      model: "Qwen/QwQ-32B-Preview",
      temperature: 0.7,
      stopTokens: ["<|im_end|>", "</s>"],
      promptTemplate: {
        human: "<|im_start|>user\n{message}<|im_end|>\n<|im_start|>assistant\n",
      },
    },
  },
  {
    id: "qwen-coder-32b",
    name: "Qwen2.5 Coder 32B",
    description:
      "Specialized coding model with extensive programming knowledge",
    features: ["Code generation", "Technical documentation", "Problem solving"],
    active: true,
    provider: "Qwen",
    category: ["coding", "development"],
    config: {
      model: "Qwen/Qwen2.5-Coder-32B-Instruct",
      temperature: 0.7,
      stopTokens: ["<|im_end|>", "</s>"],
      promptTemplate: {
        human: "<|im_start|>user\n{message}<|im_end|>\n<|im_start|>assistant\n",
      },
    },
  },
  {
    id: "phi-3-mini",
    name: "Phi-3.5 Mini",
    description: "Microsoft's compact but powerful instruction-following model",
    features: ["Efficient processing", "Compact size", "Quick responses"],
    active: true,
    provider: "Microsoft",
    category: ["general", "chat"],
    config: {
      model: "microsoft/Phi-3.5-mini-instruct",
      temperature: 0.7,
      stopTokens: ["<|end|>", "<|user|>", "<|assistant|>", "</s>"],
      promptTemplate: {
        human: "<|user|>{message}<|end|>\n<|assistant|>",
      },
    },
  },
  {
    id: "hermes-3-8b",
    name: "Hermes-3 Llama",
    description: "Advanced open-source model based on Llama architecture",
    features: [
      "Strong reasoning",
      "Efficient processing",
      "Balanced performance",
    ],
    active: true,
    provider: "Nous Research",
    category: ["general", "chat"],
    config: {
      model: "NousResearch/Hermes-3-Llama-3.1-8B",
      temperature: 0.7,
      stopTokens: ["<|im_end|>", "</s>"],
      promptTemplate: {
        system:
          "<|im_start|>system\nYou are a helpful AI assistant.<|im_end|>\n",
        human: "<|im_start|>user\n{message}<|im_end|>\n<|im_start|>assistant\n",
      },
    },
  },
];

export async function GET() {
  return NextResponse.json(models);
}
