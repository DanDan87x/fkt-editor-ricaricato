
import { GoogleGenAI, Type } from "@google/genai";
import { ProtocolData, SlideType, SectionType, ExerciseLibraryItem } from "../types";

// Initialize Gemini API client correctly using a named parameter.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define structured response schemas using the recommended Type enum.
const itemSchema = {
  type: Type.OBJECT,
  properties: {
    text: { 
      type: Type.STRING, 
      description: "The name of the exercise, objective, or information point. Be specific." 
    },
    description: { 
      type: Type.STRING, 
      description: "MANDATORY: Verbatim instructions, repetitions, sets, duration, or specific clinical advice found in the source text. DO NOT SUMMARIZE." 
    },
    img: { 
      type: Type.STRING, 
      description: "A reference image URL if provided or inferred." 
    }
  },
  required: ["text"]
};

const sectionSchema = {
  type: Type.OBJECT,
  properties: {
    type: { 
      type: Type.STRING, 
      enum: [
        SectionType.OBJECTIVES, 
        SectionType.EXERCISES, 
        SectionType.INFO, 
        SectionType.PRECAUTIONS, 
        SectionType.GENERIC_LIST, 
        SectionType.WARNING,
        SectionType.VIDEO,
        SectionType.CRITERIA
      ] 
    },
    title: { type: Type.STRING, description: "Detailed title for this section." },
    items: { type: Type.ARRAY, items: itemSchema }
  },
  required: ["type", "title", "items"]
};

const slideSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: [SlideType.TRANSITION, SlideType.PHASE, SlideType.FINAL, SlideType.WARNING] },
    title: { type: Type.STRING, description: "Heading for the slide. Use 'Settimana X-Y' or 'Fase Z' if detected." },
    imageUrl: { type: Type.STRING, description: "For cover slides only." },
    sections: { type: Type.ARRAY, items: sectionSchema }
  },
  required: ["type", "sections"]
};

const protocolSchema = {
  type: Type.OBJECT,
  properties: {
    doctorName: { type: Type.STRING },
    protocolTitle: { type: Type.STRING },
    logoUrl: { type: Type.STRING },
    slides: { type: Type.ARRAY, items: slideSchema }
  },
  required: ["protocolTitle", "slides"]
};

export const parseProtocolFromText = async (text: string, existingLibrary: ExerciseLibraryItem[] = []): Promise<ProtocolData | null> => {
  try {
    const libraryContext = existingLibrary.map(ex => `- ${ex.name}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Sei un esperto riabilitatore specializzato nella digitalizzazione di protocolli clinici. 
      Il tuo obiettivo primario è convertire il testo fornito in un JSON strutturato senza perdere NESSUNA informazione.

      REGOLE TASSATIVE DI ESTRAZIONE:
      1. CRONOLOGIA (SlideType: PHASE): Dividi il testo in fasi temporali (es: "Settimana 1", "Dalla 2a alla 4a settimana"). Ogni blocco temporale DEVE essere una slide separata.
      
      2. OBIETTIVI (SectionType: OBJECTIVES): Identifica TUTTI gli obiettivi clinici di ogni fase. Cerca termini come "Obiettivi", "Goal", "Finalità", "Traguardi". È OBBLIGATORIO estrarli in una sezione dedicata se presenti.
      
      3. CRITERI DI PASSAGGIO (SectionType: CRITERIA): Identifica i requisiti per passare alla fase successiva (es: "ROM > 90°", "Controllo del dolore", "Forza 4/5"). Cerca termini come "Criteri per il passaggio", "Requisiti per progressione", "Dimissione dalla fase". NON DIMENTICARLI.
      
      4. ESERCIZI (SectionType: EXERCISES): 
         - Se riconosci un esercizio nel database fornito sotto, usa il NOME DEL DATABASE come 'text'.
         - TUTTAVIA, la 'description' DEVE contenere TUTTO il testo originale dell'utente relativo a quell'esercizio (dosaggi, serie, precauzioni specifiche). NON riassumere.
         - Se l'esercizio non è nel database, usa il nome originale del testo.
      
      5. VERBATIM: Non cambiare il linguaggio tecnico. Se il testo dice "Evitare SLR attivo", deve apparire esattamente così in una sezione 'PRECAUTIONS' o 'WARNING'.

      ESERCIZI NEL DATABASE PER COERENZA NOMI:
      ${libraryContext || 'Nessuno'}

      TESTO DA ELABORARE:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: protocolSchema
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text) as ProtocolData;
      
      parsed.slides = parsed.slides.map((s, sIdx) => ({
        ...s,
        id: `slide-${Date.now()}-${sIdx}`,
        sections: s.sections ? s.sections.map((sec, secIdx) => ({
           ...sec,
           id: `sec-${Date.now()}-${sIdx}-${secIdx}`,
           items: (sec.items || []).map(item => {
              const itemNameLower = item.text.toLowerCase().trim();
              const matchedLibraryItem = existingLibrary.find(libEx => 
                libEx.name.toLowerCase().trim() === itemNameLower ||
                itemNameLower.includes(libEx.name.toLowerCase().trim())
              );
              
              return {
                ...item,
                img: matchedLibraryItem?.img || item.img,
                // Preserve the AI-extracted verbatim description, only fall back to library if empty
                description: item.description || matchedLibraryItem?.description
              };
           })
        })) : []
      }));
      
      if (!parsed.exerciseLibrary) parsed.exerciseLibrary = existingLibrary;
      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Error parsing protocol with Gemini:", error);
    throw error;
  }
};

export const extractExercisesFromHtml = async (html: string): Promise<Partial<ExerciseLibraryItem>[] | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following HTML content. Identify physical exercises that have an associated image. 
      Extract the Exercise Name and the Image URL. If there is a description associated with it, extract that too.
      Ignore navigation elements, logos, or irrelevant content.
      
      HTML Content:
      ${html}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              img: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Error extracting exercises:", error);
    return null;
  }
};

export const findDuplicateExercises = async (library: ExerciseLibraryItem[]): Promise<any[] | null> => {
  if (library.length < 2) return [];
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following list of exercises. Find semantic duplicates.
      Library:
      ${JSON.stringify(library.map(i => ({ id: i.id, name: i.name })))}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ids: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedMerge: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  img: { type: Type.STRING }
                },
                required: ["name", "description", "img"]
              }
            },
            required: ["ids", "suggestedMerge"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Error finding duplicates:", error);
    return null;
  }
};

export const generateExerciseDescription = async (exerciseName: string, protocolContext: string = "Riabilitazione generale"): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Scrivi istruzioni per: "${exerciseName}" nel contesto "${protocolContext}". Sii conciso e includi serie/ripetizioni.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text).description;
    }
    return null;
  } catch (error) {
    console.error("Error generating description:", error);
    return null;
  }
};

export const generateExerciseImage = async (exerciseName: string, description: string = ""): Promise<string | null> => {
  try {
    const prompt = `Professional medical illustration of the physical therapy exercise: "${exerciseName}".
    ${description ? `Context and instructions: "${description}".` : ''}
    Style: Flat vector illustration, clean lines, professional medical look. 
    Colors: Blue and white palette. 
    Background: Solid white. 
    Focus: Anatomically correct posture and clear movement representation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};
