export type DefaultLens = {
  category: string;
  name: string;
  rewardValue: number;
  notes?: string | null;
};

export const DEFAULT_LENSES: DefaultLens[] = [
  { category: "Visão Simples", name: "EVOLUX DIGITAL – LENTES PRONTAS", rewardValue: 5.0, notes: null },
  { category: "Visão Simples", name: "EVOLUX DIGITAL LIGHT – LENTES PRONTAS", rewardValue: 7.0, notes: null },
  { category: "Visão Simples", name: "BLUE LIGHT (FILTRO AZUL)– LENTES PRONTAS", rewardValue: 15.0, notes: null },
  { category: "Visão Simples", name: "OPTVIEW BLUE (1 ANO GARANTIA DE RISCO) - LENTES PRONTAS", rewardValue: 20.0, notes: null },
  { category: "Visão Simples", name: "CRIZAL (TODAS) – LENTES PRONTAS*", rewardValue: 10.0, notes: "Lentes surfaçadas com Crizal não dão prêmio." },
  { category: "Visão Simples", name: "TRANSITIONS COM OU SEM AR – LENTES PRONTAS", rewardValue: 10.0, notes: null },
  { category: "Visão Simples", name: "FOTO ORGÂNICA– LENTES PRONTAS", rewardValue: 15.0, notes: null },
  { category: "Visão Simples", name: "LENTE SOLAR COM GRAU – LENTES PRONTAS E SURF.", rewardValue: 10.0, notes: null },
  { category: "Multifocal", name: "EVOLUX DIGITAL", rewardValue: 20.0, notes: null },
  { category: "Multifocal", name: "EVOLUX DIGITAL COM AR", rewardValue: 35.0, notes: null },
  { category: "Multifocal", name: "EVOLUX FREE FORM", rewardValue: 40.0, notes: null },
  { category: "Multifocal", name: "EVOLUX FREE FORM COM AR", rewardValue: 45.0, notes: null },
  { category: "Multifocal", name: "VARILUX COMFORT C/ CRIZAL", rewardValue: 15.0, notes: null },
  { category: "Multifocal", name: "VARILUX COMFORT MAX C/ CRIZAL", rewardValue: 30.0, notes: null },
  { category: "Multifocal", name: "VARILUX PHYSIO EXTENSEE C/ CRIZAL", rewardValue: 35.0, notes: null },
  { category: "Multifocal", name: "VARILUX XR DESING C/ CRIZAL", rewardValue: 50.0, notes: null },
  { category: "Promoção 2° Par 50%", name: "VARILUX COMFORT C/ CRIZAL", rewardValue: 15.0, notes: null },
  { category: "Promoção 2° Par 50%", name: "VARILUX COMFORT MAX C/ CRIZAL", rewardValue: 30.0, notes: null },
  { category: "Promoção 2° Par 50%", name: "VARILUX PHYSIO EXTENSEE C/ CRIZAL", rewardValue: 35.0, notes: null },
  { category: "Promoção em Dobro", name: "VARILUX XR DESING C/ CRIZAL", rewardValue: 50.0, notes: null },
  { category: "VisionDT — Multifocais Progressivas", name: "VisionDT Max c/ AR hiperclean SHA e hiperclean MAX", rewardValue: 35.0, notes: null },
  { category: "VisionDT — Multifocais Progressivas", name: "VisionDT Max c/ AR hiperclean DUAL+ e hiperclean BLUE", rewardValue: 45.0, notes: null },
  { category: "VisionDT — Multifocais Progressivas", name: "VisionDT Premier c/ AR hiperclean SHA e hiperclean MAX", rewardValue: 45.0, notes: null },
  { category: "VisionDT — Multifocais Progressivas", name: "VisionDT Premier c/ AR hiperclean DUAL+ e hiperclean BLUE", rewardValue: 55.0, notes: null },
  { category: "VisionDT — Multifocais Progressivas", name: "VisionDT Unique c/ AR hiperclean SHA e hiperclean MAX", rewardValue: 50.0, notes: null },
  { category: "VisionDT — Multifocais Progressivas", name: "VisionDT Unique c/ AR hiperclean DUAL+ e hiperclean BLUE", rewardValue: 55.0, notes: null },
  { category: "VisionDT — Multifocais Progressivas", name: "VisionDT Revolution c/ AR hiperclean SHA e hiperclean MAX", rewardValue: 55.0, notes: null },
  { category: "VisionDT — Multifocais Progressivas", name: "VisionDT Revolution c/ AR hiperclean DUAL+ e hiperclean BLUE", rewardValue: 65.0, notes: null },
  { category: "VisionDT — Multifocais Funcionais", name: "VisionDT Mobile c/ AR hiperclean SHA e hiperclean MAX", rewardValue: 35.0, notes: null },
  { category: "VisionDT — Multifocais Funcionais", name: "VisionDT Mobile c/ AR hiperclean DUAL+ e hiperclean BLUE", rewardValue: 45.0, notes: null },
  { category: "VisionDT — Multifocais Funcionais", name: "VisionDT Drive c/ AR hiperclean SHA e hiperclean MAX", rewardValue: 35.0, notes: null },
  { category: "VisionDT — Multifocais Funcionais", name: "VisionDT Drive c/ AR hiperclean DUAL+ e hiperclean BLUE", rewardValue: 45.0, notes: "Promoção em dobro progressiva VisionDT: todos os materiais a partir do AR hiperclean SHA; o primeiro par deve ser o mais caro e o segundo par é cobrado a R$ 150,00." },
];
