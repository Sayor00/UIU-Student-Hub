// Academic domain taxonomy — maps courses to knowledge areas for career analysis

export type DomainId =
    | "programming" | "math" | "algorithms" | "hardware" | "networking"
    | "database" | "ai_ml" | "security" | "software_eng" | "web_mobile"
    | "business_core" | "finance" | "marketing" | "accounting" | "management"
    | "economics" | "statistics" | "communication" | "language" | "social_science"
    | "science" | "lab" | "design" | "civil_core" | "structural" | "environmental"
    | "power_systems" | "electronics" | "telecom" | "signal_processing"
    | "biotech" | "genetics" | "pharma" | "chemistry" | "biology"
    | "media" | "journalism" | "education" | "research" | "general";

export interface Domain {
    id: DomainId;
    name: string;
    color: string; // Tailwind color class
    icon: string;  // Emoji shorthand for quick rendering
}

export const DOMAINS: Record<DomainId, Domain> = {
    programming: { id: "programming", name: "Programming", color: "blue", icon: "💻" },
    math: { id: "math", name: "Mathematics", color: "purple", icon: "📐" },
    algorithms: { id: "algorithms", name: "Algorithms & DS", color: "indigo", icon: "🧩" },
    hardware: { id: "hardware", name: "Hardware & Systems", color: "slate", icon: "🔧" },
    networking: { id: "networking", name: "Networking", color: "cyan", icon: "🌐" },
    database: { id: "database", name: "Database Systems", color: "emerald", icon: "🗄️" },
    ai_ml: { id: "ai_ml", name: "AI & Machine Learning", color: "violet", icon: "🤖" },
    security: { id: "security", name: "Cybersecurity", color: "red", icon: "🔒" },
    software_eng: { id: "software_eng", name: "Software Engineering", color: "sky", icon: "⚙️" },
    web_mobile: { id: "web_mobile", name: "Web & Mobile Dev", color: "orange", icon: "📱" },
    business_core: { id: "business_core", name: "Business Core", color: "amber", icon: "💼" },
    finance: { id: "finance", name: "Finance", color: "green", icon: "💰" },
    marketing: { id: "marketing", name: "Marketing", color: "pink", icon: "📊" },
    accounting: { id: "accounting", name: "Accounting", color: "teal", icon: "📋" },
    management: { id: "management", name: "Management", color: "rose", icon: "👔" },
    economics: { id: "economics", name: "Economics", color: "lime", icon: "📈" },
    statistics: { id: "statistics", name: "Statistics", color: "fuchsia", icon: "📉" },
    communication: { id: "communication", name: "Communication", color: "yellow", icon: "🗣️" },
    language: { id: "language", name: "Language & Literature", color: "amber", icon: "📝" },
    social_science: { id: "social_science", name: "Social Science", color: "orange", icon: "🏛️" },
    science: { id: "science", name: "Natural Science", color: "green", icon: "🔬" },
    lab: { id: "lab", name: "Lab & Practical", color: "teal", icon: "🧪" },
    design: { id: "design", name: "Design & Graphics", color: "pink", icon: "🎨" },
    civil_core: { id: "civil_core", name: "Civil Engineering", color: "stone", icon: "🏗️" },
    structural: { id: "structural", name: "Structural Eng", color: "zinc", icon: "🏢" },
    environmental: { id: "environmental", name: "Environmental Eng", color: "emerald", icon: "🌿" },
    power_systems: { id: "power_systems", name: "Power Systems", color: "yellow", icon: "⚡" },
    electronics: { id: "electronics", name: "Electronics", color: "blue", icon: "🔌" },
    telecom: { id: "telecom", name: "Telecommunications", color: "cyan", icon: "📡" },
    signal_processing: { id: "signal_processing", name: "Signal Processing", color: "indigo", icon: "📶" },
    biotech: { id: "biotech", name: "Biotechnology", color: "emerald", icon: "🧬" },
    genetics: { id: "genetics", name: "Genetics", color: "violet", icon: "🔬" },
    pharma: { id: "pharma", name: "Pharmaceutical Sci", color: "blue", icon: "💊" },
    chemistry: { id: "chemistry", name: "Chemistry", color: "amber", icon: "⚗️" },
    biology: { id: "biology", name: "Biology", color: "green", icon: "🦠" },
    media: { id: "media", name: "Media Studies", color: "rose", icon: "🎬" },
    journalism: { id: "journalism", name: "Journalism", color: "red", icon: "📰" },
    education: { id: "education", name: "Education", color: "sky", icon: "🎓" },
    research: { id: "research", name: "Research Methods", color: "slate", icon: "🔍" },
    general: { id: "general", name: "General Education", color: "gray", icon: "📚" },
};
