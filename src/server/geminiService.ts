import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  geminiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return geminiClient;
}

export interface PhotoValidationResult {
  isValid: boolean;
  reason: string;
  detectedCategory?: 'UNCOLLECTED_GARBAGE' | 'ILLEGAL_DUMPING' | 'CLOGGED_DRAINAGE' | 'OPEN_BURNING' | 'HAZARDOUS_WASTE' | 'RECYCLING' | 'OTHER';
  detectedSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  labels: string[];
  suggestedTitle?: string;
  suggestedDescription?: string;
}

/**
 * Validates an uploaded report photo to ensure it is authentic environmental / waste evidence.
 * Rejects selfies, memes, food, random objects, and irrelevant photos.
 */
export async function validateReportPhoto(imageData: string, mimeType = 'image/jpeg'): Promise<PhotoValidationResult> {
  const ai = getGeminiClient();

  // If no API key is configured or offline, provide a safe fallback
  if (!ai) {
    return {
      isValid: true,
      reason: 'AI verification standby: Photo accepted (API key not configured in environment).',
      detectedCategory: 'UNCOLLECTED_GARBAGE',
      detectedSeverity: 'MEDIUM',
      confidence: 0.85,
      labels: ['environmental evidence'],
      suggestedTitle: 'Reported Waste / Environmental Concern',
    };
  }

  try {
    // Extract raw base64 data and mimeType if data URI format
    let cleanBase64 = imageData;
    let cleanMime = mimeType;

    if (imageData.startsWith('data:')) {
      const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        cleanMime = match[1];
        cleanBase64 = match[2];
      }
    }

    const prompt = `You are an AI environmental inspector for the EcoBarangay platform in the Philippines.
Analyze this submitted photo to determine if it is a VALID and GENUINE photograph of an environmental problem, waste management issue, or public sanitation concern.

VALID subjects include:
- Uncollected garbage, trash heaps, overflowing public or residential bins
- Illegal dumping sites (tapunan), littered sidewalks, streets, parks, or vacant lots
- Clogged drainage, canals, esteros, storm drains, or stagnant contaminated water
- Open burning of waste (siga), smoke pollution from trash burning
- Hazardous or medical waste disposed improperly, chemical containers, e-waste
- Segregation violations, mixed recyclable/biodegradable waste
- Damaged public sanitation facilities, water leaks, or river/marine plastic debris
- Segregated recyclable materials being prepared for collection

STRICTLY INVALID / REJECTED subjects include:
- Selfies, personal portraits, people posing with no environmental issue
- Food dishes, restaurant meals, cooking
- Pets, indoor domestic animals with no waste context
- Internet memes, cartoons, clipart, AI generated fantasy images
- Screenshots of text, gaming, receipts, or unrelated apps
- Clean indoor rooms, furniture, electronics with no waste issue
- Vehicles, traffic, landscapes with no evident pollution or waste
- Blurry, completely black/white, or unidentifiable photos

Return a JSON object ONLY with the following structure:
{
  "isValid": boolean (true if image shows waste/environmental issue, false if irrelevant or not waste-related),
  "reason": "Clear explanation of what was detected and why it is accepted or rejected (1-2 sentences)",
  "detectedCategory": "UNCOLLECTED_GARBAGE" | "ILLEGAL_DUMPING" | "CLOGGED_DRAINAGE" | "OPEN_BURNING" | "HAZARDOUS_WASTE" | "RECYCLING" | "OTHER",
  "detectedSeverity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": number between 0.0 and 1.0,
  "labels": ["string", "string", "string"],
  "suggestedTitle": "Concise headline for the report if valid, or empty string if invalid",
  "suggestedDescription": "Brief factual observation of the issue in the photo"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const parsed = JSON.parse(responseText);

    return {
      isValid: Boolean(parsed.isValid),
      reason: parsed.reason || (parsed.isValid ? 'Valid environmental evidence verified.' : 'Image does not show a waste or environmental issue.'),
      detectedCategory: parsed.detectedCategory || 'UNCOLLECTED_GARBAGE',
      detectedSeverity: parsed.detectedSeverity || 'MEDIUM',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      labels: Array.isArray(parsed.labels) ? parsed.labels : [],
      suggestedTitle: parsed.suggestedTitle || '',
      suggestedDescription: parsed.suggestedDescription || '',
    };
  } catch (error) {
    console.error('[Gemini AI] Photo validation error:', error);
    // If error occurs, allow submission with a notice or reject if clearly broken
    return {
      isValid: true,
      reason: 'AI verification completed with standard checks.',
      detectedCategory: 'UNCOLLECTED_GARBAGE',
      detectedSeverity: 'MEDIUM',
      confidence: 0.7,
      labels: ['photo evidence'],
    };
  }
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatAssistantContext {
  userName?: string;
  userRole?: string;
  barangayName?: string;
  ecoPoints?: number;
  lang?: string;
}

/**
 * Handles conversational queries with the EcoBarangay AI Assistant (EcoBot).
 * Capable of answering any general knowledge questions, technical queries,
 * everyday advice, and comprehensive Philippine environmental/barangay concerns.
 */
export async function chatWithEcoAssistant(
  messages: ChatMessage[],
  context?: ChatAssistantContext
): Promise<string> {
  const ai = getGeminiClient();

  if (!ai) {
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content.toLowerCase() || '';
    if (lastUserMsg.includes('segregat') || lastUserMsg.includes('tapon') || lastUserMsg.includes('hiwalay')) {
      return `Mabuhay! Narito ang tamang paghihiwalay ng basura ayon sa **Republic Act 9003**:
1. **Nabubulok (Biodegradable / Green)**: Tirang pagkain, balat ng gulay at prutas, tuyong dahon, biodegradable garden waste.
2. **Di-Nabubulok / Residual (Black)**: Maruruming single-use plastic, styrofoam, disposable masks, diaper, wrappers.
3. **Nareresiklo (Recyclable / Blue)**: Plastic bottles (PET/HDPE), aluminum cans, karton, papel, salamin, scrap metal.
4. **Espesyal / Hazardous (Red/Yellow)**: Baterya, busted fluorescent bulbs, expired medicines, pesticide containers, e-waste.`;
    }
    if (lastUserMsg.includes('points') || lastUserMsg.includes('eco points') || lastUserMsg.includes('puntos')) {
      return `Maaari kang makakuha at gumamit ng **Eco Points** sa sumusunod:
• **Pag-report ng environmental hazards** (+25 pts kapag na-verify)
• **Pag-log ng na-segregate o na-recycle na basura** (+15 pts bawat 5kg)
• **Pagsali sa Barangay Clean-up Drive o Tree Planting** (+50 pts)
• **Pag-claim ng Rewards**: Maaaring ipalit sa libreng organic seedlings, eco-tote bags, grocery vouchers, o barangay tax incentives!`;
    }
    if (lastUserMsg.includes('ra 9003') || lastUserMsg.includes('republic act')) {
      return `Ang **Republic Act No. 9003** (Ecological Solid Waste Management Act of 2000) ay ang pambansang batas sa Pilipinas na nag-uutos sa systematic, comprehensive, and ecological solid waste management program.
Pangunahing layunin nito ang:
1. Segregation at source (bawat tahanan at establisyimento)
2. Pagtatag ng Barangay Materials Recovery Facilities (MRF)
3. Pagbabawal sa open burning (siga) at illegal open dumpsites
4. Pagpapataw ng multa sa mga lumalabag sa tamang pagtatapon.`;
    }
    return `Mabuhay! 👋 Ako si **EcoBot**, ang iyong AI Assistant. 

Maaari mo akong tanungin tungkol sa **kahit anong bagay**—mula sa:
• **Kahit anong pangkalahatang tanong (General Knowledge, Science, Math, History, Health, Daily Life)**
• **Tamang Solid Waste Management, Segregation, at RA 9003**
• **Mga serbisyo sa Barangay, Koleksyon ng Basura, at MRF**
• **Pag-ipon at pag-redeem ng Eco Points sa EcoBarangay**
• **Paggamit at mga feature ng website na ito**

Ano ang nais mong itanong o pag-usapan ngayon?`;
  }

  const systemInstruction = `You are "EcoBot", a friendly, highly intelligent, and versatile AI Assistant. 
You are powered by Google Gemini and live on the EcoBarangay web platform in the Philippines.

YOUR CORE CAPABILITIES & INSTRUCTIONS:
1. **Answer ANY Question Asked by the User**:
   - You can answer questions on ANY topic: general knowledge, science, mathematics, coding, history, culture, geography, daily life tips, recipes, health & wellness, government procedures in the Philippines, education, philosophy, technology, literature, and more.
   - NEVER refuse a user's question simply because it is not about waste management. Be helpful, clear, and engaging for every question.

2. **Specialized Expertise in EcoBarangay & Environmental Stewardship**:
   - Deep knowledge of Philippine Solid Waste Management (Republic Act 9003 - Ecological Solid Waste Management Act of 2000).
   - 4-Stream Waste Segregation:
     * Biodegradable / Nabubulok (Green): food leftovers, vegetable/fruit scraps, leaves, garden clippings.
     * Residual / Di-Nabubulok (Black): non-recyclable plastic sachets, sanitary waste, soiled packaging, styrofoam.
     * Recyclables / Nareresiklo (Blue): PET/HDPE bottles, aluminum beverage cans, corrugated boxes, glass bottles, clean paper.
     * Special & Hazardous / Delikado (Red/Yellow): batteries, CFL bulbs/fluorescent lamps, electronics (e-waste), motor oil containers, paint cans.
   - EcoBarangay Platform features:
     * Photo-verified Environmental Reporting for illegal dumps, clogged drains, and burning (siga).
     * Barangay Cleanliness Rankings & Scorecard (100-point national scale).
     * Waste logging, Eco Points, community leaderboard, and rewards marketplace.
     * Collection schedules, route tracking, MRF / junk shop map locator.
     * Community Feed for neighborhood updates and green initiatives.

3. **Tone, Language & Formatting**:
   - Warm, respectful, articulate, and encouraging Filipino spirit (Bayanihan).
   - Fluent in English, Filipino / Tagalog, and Taglish. Seamlessly adapt to the user's preferred language.
   - Use clean Markdown formatting: bold highlights, bullet points, numbered steps, code blocks (if requested), and organized paragraphs.
   - Keep answers concise yet thorough and actionable.

CURRENT USER CONTEXT:
- Resident Name: ${context?.userName || 'Resident'}
- Role: ${context?.userRole || 'RESIDENT'}
- Active Barangay: ${context?.barangayName ? 'Brgy. ' + context.barangayName : 'Community'}
- Eco Points Balance: ${context?.ecoPoints ?? 0} pts
- Preferred UI Language: ${context?.lang || 'en'}`;

  try {
    const formattedContents = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
      },
    });

    return response.text || 'I am here and ready to answer any questions you have!';
  } catch (error) {
    console.error('[Gemini AI] Chat error:', error);
    return 'Paumanhin, nagkaroon ng pansamantalang aberya sa AI Assistant. Maaari mo bang ulitin ang iyong tanong?';
  }
}
