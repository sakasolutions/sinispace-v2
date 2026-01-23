import { auth } from '@/auth';
import { openai } from '@/lib/openai';
import { isUserPremium } from '@/lib/subscription';
import { NextResponse } from 'next/server';

const UPSELL_MESSAGE = `### 🔒 Premium Feature

Diese Funktion steht nur **Pro-Usern** zur Verfügung.
Upgrade deinen Account, um unbegrenzten Zugriff auf alle KI-Tools zu erhalten.

[👉 **Hier klicken zum Freischalten**](/settings)`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const isAllowed = await isUserPremium();
    if (!isAllowed) {
      // Für Free User: Sende die Upsell-Nachricht als Stream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for (const char of UPSELL_MESSAGE) {
            controller.enqueue(encoder.encode(char));
            await new Promise(resolve => setTimeout(resolve, 10)); // Kleine Verzögerung für Streaming-Effekt
          }
          controller.close();
        },
      });
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const body = await req.json();
    const { messages, fileIds, fileMimeTypes } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Ungültige Nachrichten' }, { status: 400 });
    }

    // Prüfe ob es Bilder gibt
    const hasImages = fileMimeTypes?.some((mime: string) => mime?.startsWith('image/')) || false;
    const hasNonImages = fileMimeTypes?.some((mime: string) => !mime?.startsWith('image/')) || false;

    // Wenn es nur Bilder gibt, nutze Vision API
    if (fileIds && fileIds.length > 0 && hasImages && !hasNonImages) {
      const lastUserMessage = messages[messages.length - 1];
      const imageContent = fileIds.map((fileId: string) => ({
        type: 'image_file' as const,
        image_file: { file_id: fileId },
      }));

      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Du bist Sinispace, ein warmer, empathischer und hochintelligenter KI-Begleiter. Nutze Markdown, Tabellen und Emojis. Sei hilfreich. Du kannst Bilder sehen und analysieren.',
          },
          ...messages.slice(0, -1),
          {
            role: 'user',
            content: [
              { type: 'text', text: lastUserMessage.content },
              ...imageContent,
            ],
          },
        ] as any,
        stream: true,
      });

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
            controller.close();
          } catch (error) {
            console.error('Stream error:', error);
            controller.error(error);
          }
        },
      });

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Standard Chat ohne Dateien oder mit Dokumenten (Assistants API)
    // Für jetzt: Einfacher Chat-Stream ohne Assistants API (zu komplex)
    // Wenn Dokumente vorhanden sind, nutzen wir weiterhin die nicht-streaming Version
    if (fileIds && fileIds.length > 0 && hasNonImages) {
      // Für Dokumente: Fallback auf nicht-streaming (Assistants API unterstützt kein Streaming einfach)
      return NextResponse.json({ 
        error: 'Streaming mit Dokumenten wird noch nicht unterstützt. Bitte nutze die normale Chat-Funktion.' 
      }, { status: 400 });
    }

    // Standard Chat-Stream
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist Sinispace, ein warmer, empathischer und hochintelligenter KI-Begleiter. Nutze Markdown, Tabellen und Emojis. Sei hilfreich.',
        },
        ...messages,
      ] as any,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat stream error:', error);
    return NextResponse.json(
      { error: error.message || 'Verbindungsproblem.' },
      { status: 500 }
    );
  }
}
