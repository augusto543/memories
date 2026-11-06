import { mondayOfWeek, todayInAppTimeZone } from "@/lib/calendar";

/**
 * Curated question bank. Keep existing entries/order stable: the question
 * for a given ISO week is computed deterministically, without a scheduler.
 */
const QUESTIONS = [
  "Qual pequeno gesto meu fez você sorrir recentemente?",
  "Que lembrança nossa você gostaria de reviver?",
  "Qual lugar você adoraria conhecer comigo?",
  "O que faz você se sentir mais acolhido(a) no nosso relacionamento?",
  "Qual momento simples juntos virou uma memória especial?",
  "O que aprendemos um com o outro neste mês?",
  "Qual seria o nosso encontro perfeito gastando pouco?",
  "Qual música faz você lembrar de nós?",
  "Que tradição você gostaria de criar comigo?",
  "Como posso demonstrar carinho de um jeito que você gosta?",
  "Qual sonho nosso você quer transformar em plano?",
  "O que te fez admirar nossa parceria nesta semana?",
  "Se pudéssemos viajar amanhã, para onde iríamos?",
  "Qual comida você gostaria de preparar comigo?",
  "Qual foi a surpresa mais bonita que vivemos juntos?",
  "O que você gostaria que fizéssemos mais nos fins de semana?",
  "Qual detalhe do nosso primeiro encontro ficou na sua memória?",
  "Qual habilidade nova seria divertido aprendermos juntos?",
  "Como seria um domingo perfeito para nós?",
  "Qual mensagem você gostaria de receber num dia difícil?",
  "Qual é uma coisa pela qual você sente gratidão na nossa história?",
  "Qual lugar da cidade ainda precisamos visitar juntos?",
  "Que pequeno desafio podemos cumprir juntos nesta semana?",
  "O que você imagina quando pensa no nosso próximo aniversário?",
] as const;

export function questionForWeek(weekStart: string): string {
  const epoch = Date.parse("2024-01-01T00:00:00Z");
  const week = Math.floor((Date.parse(weekStart + "T00:00:00Z") - epoch) / 604_800_000);
  return QUESTIONS[((week % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length];
}

export function currentQuestion() {
  const weekStart = mondayOfWeek(todayInAppTimeZone());
  return { weekStart, question: questionForWeek(weekStart) };
}
