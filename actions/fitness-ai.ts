'use server';

import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';
import { createHelperChat } from '@/actions/chat-actions';

// --- HILFS-NACHRICHT FÜR FREE USER ---
const UPSELL_MESSAGE = `### 🔒 Premium Feature

Diese Funktion steht nur **Pro-Usern** zur Verfügung.
Upgrade deinen Account, um unbegrenzten Zugriff auf alle KI-Tools zu erhalten.

[👉 **Hier klicken zum Freischalten**](/settings)`;

type FitnessPlan = {
  title: string;
  summary: string;
  warmup: string[];
  exercises: { name: string; sets: string; reps: string; tip: string }[];
  cooldown: string[];
};

export async function generateFitnessPlan(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const goal = (formData.get('goal') as string) || 'Muskelaufbau';
  const level = (formData.get('level') as string) || 'Anfänger';
  const duration = (formData.get('duration') as string) || '30';
  const equipment = (formData.getAll('equipment') as string[]) || [];

  const equipmentText = equipment.length > 0 ? equipment.join(', ') : 'Keine Geräte';

  const systemPrompt = `Du bist ein erfahrener Personal Trainer. Erstelle einen strukturierten Workout-Plan.

Struktur:
1. Warm-up (kurz & knackig).
2. Hauptteil (Übungen mit Sätzen & Wiederholungen).
3. Cool-down.

WICHTIG: Passe die Übungen STRIKT an das verfügbare Equipment an (z.B. keine Klimmzüge, wenn User 'nur Boden' hat).
Output als JSON im folgenden Format:
{
  "title": "Full Body Blast",
  "summary": "Intensives Ganzkörpertraining für Zuhause.",
  "warmup": ["Jumping Jacks (2 Min)", "Arm Circles"],
  "exercises": [
    { "name": "Liegestütze", "sets": "3", "reps": "12-15", "tip": "Rücken gerade lassen!" },
    { "name": "Squats", "sets": "4", "reps": "20", "tip": "Tief runtergehen." }
  ],
  "cooldown": ["Dehnen der Brustmuskulatur", "Child's Pose"]
}`;

  const userPrompt = `Ziel: ${goal}
Level: ${level}
Zeit: ${duration} Minuten
Equipment: ${equipmentText}

Erstelle einen Trainingsplan für diese Vorgaben.`;

  try {
    const response = await createChatCompletion(
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      },
      'fitness',
      'Fit-Coach'
    );

    const content = response.choices[0].message.content;
    if (!content) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    let plan: FitnessPlan;
    try {
      plan = JSON.parse(content) as FitnessPlan;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return { error: 'Fehler beim Verarbeiten der Antwort. Bitte versuche es erneut.' };
    }

    if (!plan.title || !plan.warmup || !plan.exercises || !plan.cooldown) {
      return { error: 'Ungültiges Format. Bitte versuche es erneut.' };
    }

    const formattedPlan = `# ${plan.title}

${plan.summary}

## Warm-up
${plan.warmup.map((w) => `- ${w}`).join('\n')}

## Hauptteil
${plan.exercises.map((e, i) => `${i + 1}. ${e.name} – ${e.sets} Sätze × ${e.reps} (${e.tip})`).join('\n')}

## Cool-down
${plan.cooldown.map((c) => `- ${c}`).join('\n')}`;

    const userInput = `Ziel: ${goal}, Level: ${level}, Dauer: ${duration} Min, Equipment: ${equipmentText}`;
    await createHelperChat('fitness', userInput, formattedPlan);

    return { result: JSON.stringify(plan) };
  } catch (error: any) {
    console.error('Fitness generation error:', error);
    return { error: 'Fehler beim Generieren des Trainingsplans. Bitte versuche es erneut.' };
  }
}
