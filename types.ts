
export enum SlideType {
  TRANSITION = 'TRANSITION',
  PHASE = 'PHASE',
  FINAL = 'FINAL',
  WARNING = 'WARNING'
}

export enum SectionType {
  OBJECTIVES = 'OBJECTIVES',
  EXERCISES = 'EXERCISES',
  INFO = 'INFO',
  PRECAUTIONS = 'PRECAUTIONS',
  GENERIC_LIST = 'GENERIC_LIST',
  WARNING = 'WARNING',
  VIDEO = 'VIDEO',
  CRITERIA = 'CRITERIA'
}

export interface SectionItem {
  text: string; // The primary text (or Name of exercise, or Video URL)
  img?: string; // Optional image URL
  description?: string; // Optional detailed description (how to do it)
}

export interface SlideSection {
  id: string;
  type: SectionType;
  title: string;
  items: SectionItem[];
}

export interface ProtocolSlide {
  id: string;
  type: SlideType;
  title?: string;
  imageUrl?: string; // For Transition
  sections: SlideSection[]; // Flexible list of sections
  customWidth?: number; // Custom width in px
  customHeight?: number; // Custom min-height in px
  backgroundColor?: string; // Custom background color (hex)
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  img: string;
  description?: string;
}

export interface ProtocolData {
  doctorName: string;
  protocolTitle: string;
  logoUrl: string;
  slides: ProtocolSlide[];
  exerciseLibrary: ExerciseLibraryItem[];
}

export const INITIAL_DATA: ProtocolData = {
  doctorName: "Dott. Daniele Tradati",
  protocolTitle: "PROTESI TOTALE DI GINOCCHIO",
  logoUrl: "https://i.ibb.co/Z665Fc6b/logo-bianco-1.png",
  exerciseLibrary: [
    { 
        id: 'ex1', 
        name: 'Flesso-estensione caviglia', 
        img: 'https://i.ibb.co/Jjz65fH2/FLEX-EXT-CAVIGLIA-FLESSO-ESTENSIONE-TIBIOTARSICA-CAVIGLIA.png',
        description: 'Muovere la caviglia su e giù lentamente per favorire la circolazione.'
    },
    { 
        id: 'ex2', 
        name: 'Isometria quadricipite', 
        img: 'https://i.ibb.co/hF2wmFmC/Isometria-del-quadricipite.png',
        description: 'Premere il ginocchio contro il letto contraendo la coscia. Tenere 5 secondi.'
    }
  ],
  slides: [
    {
      id: '1',
      type: SlideType.TRANSITION,
      imageUrl: "https://i.ibb.co/6R8yPYsF/titolo.png",
      sections: []
    },
    {
      id: '2',
      type: SlideType.PHASE,
      title: "Pre-intervento",
      sections: [
        {
          id: 'sec1',
          type: SectionType.OBJECTIVES,
          title: "Obiettivi",
          items: [{ text: "Preparare il quadricipite alla chirurgia" }]
        },
        {
          id: 'sec2',
          type: SectionType.INFO,
          title: "Informazioni utili",
          items: [{ text: "Sarete contattati dalle segretarie..." }]
        }
      ]
    }
  ]
};
