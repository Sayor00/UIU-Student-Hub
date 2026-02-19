// Career track definitions — maps programs to career paths with course weightings
import type { DomainId } from "./domains";

export interface CareerTrack {
    id: string;
    title: string;
    description: string;
    icon: string;
    relevantDomains: DomainId[]; // Domains this career draws from
    keyCourseCodes: string[];    // Most important courses for this career
    skills: string[];            // Key skills for this career
    jobTitles: string[];         // Common job titles
    avgSalaryBDT: string;       // Approximate starting salary range in BDT
    growth: "high" | "medium" | "low"; // Job market growth outlook
}

export interface ProgramCareerMap {
    programId: string;
    tracks: CareerTrack[];
}

// ─── CSE Career Tracks ──────────────────────────────────────────
const CSE_TRACKS: CareerTrack[] = [
    {
        id: "software-eng", title: "Software Engineering", icon: "⚙️",
        description: "Design, develop, and maintain software systems at scale. High demand in local and international markets.",
        relevantDomains: ["programming", "software_eng", "database", "algorithms"],
        keyCourseCodes: ["CSE1111", "CSE2215", "CSE2233", "CSE4523", "CSE3521", "CSE4717"],
        skills: ["Clean Code", "System Design", "Version Control", "Agile/Scrum", "API Design", "Testing"],
        jobTitles: ["Software Engineer", "Backend Developer", "Full Stack Developer", "DevOps Engineer"],
        avgSalaryBDT: "৳40,000 – ৳80,000", growth: "high",
    },
    {
        id: "ai-ml", title: "AI & Machine Learning", icon: "🤖",
        description: "Build intelligent systems using machine learning, deep learning, and data-driven approaches.",
        relevantDomains: ["ai_ml", "statistics", "math", "programming"],
        keyCourseCodes: ["CSE3811", "CSE4821", "CSE4841", "STA2101", "MAT2101", "CSE2217"],
        skills: ["Python/TensorFlow", "Data Analysis", "Neural Networks", "NLP", "Computer Vision", "Research"],
        jobTitles: ["ML Engineer", "AI Researcher", "Data Scientist", "NLP Engineer"],
        avgSalaryBDT: "৳50,000 – ৳1,20,000", growth: "high",
    },
    {
        id: "web-mobile", title: "Web & Mobile Development", icon: "📱",
        description: "Create modern web applications and mobile apps. Largest job market for fresh graduates.",
        relevantDomains: ["web_mobile", "programming", "database", "design"],
        keyCourseCodes: ["CSE4717", "CSE4719", "CSE3521", "CSE2215", "CSE4523"],
        skills: ["React/Next.js", "Node.js", "React Native", "REST APIs", "UI/UX", "Cloud Deployment"],
        jobTitles: ["Frontend Developer", "Mobile Developer", "UI Engineer", "Web Developer"],
        avgSalaryBDT: "৳35,000 – ৳70,000", growth: "high",
    },
    {
        id: "cybersecurity", title: "Cybersecurity", icon: "🔒",
        description: "Protect systems, networks, and data from cyber threats. Growing field with global demand.",
        relevantDomains: ["security", "networking", "hardware"],
        keyCourseCodes: ["CSE4533", "CSE4515", "CSE3411", "CSE2118"],
        skills: ["Network Security", "Penetration Testing", "Cryptography", "Risk Assessment", "Compliance"],
        jobTitles: ["Security Analyst", "Penetration Tester", "Security Engineer", "SOC Analyst"],
        avgSalaryBDT: "৳45,000 – ৳90,000", growth: "high",
    },
    {
        id: "cloud-devops", title: "Cloud & DevOps", icon: "☁️",
        description: "Manage cloud infrastructure and automate software delivery pipelines.",
        relevantDomains: ["networking", "software_eng", "programming"],
        keyCourseCodes: ["CSE4543", "CSE4545", "CSE3411", "CSE4515", "CSE4523"],
        skills: ["AWS/Azure/GCP", "Docker/K8s", "CI/CD", "Linux", "Terraform", "Monitoring"],
        jobTitles: ["Cloud Engineer", "DevOps Engineer", "SRE", "Platform Engineer"],
        avgSalaryBDT: "৳50,000 – ৳1,00,000", growth: "high",
    },
    {
        id: "research-academia", title: "Research & Academia", icon: "🎓",
        description: "Pursue MS/PhD and contribute to cutting-edge research in CS or teach at universities.",
        relevantDomains: ["research", "algorithms", "math", "ai_ml"],
        keyCourseCodes: ["CSE4900", "CSE4901", "CSE3313", "CSE3811", "CSE4821", "MAT2201"],
        skills: ["Research Methods", "Paper Writing", "Mathematical Proofs", "Literature Review", "Presentation"],
        jobTitles: ["Research Assistant", "Lecturer", "PhD Candidate", "Lab Researcher"],
        avgSalaryBDT: "৳30,000 – ৳60,000", growth: "medium",
    },
];

// ─── Data Science Career Tracks ─────────────────────────────────
const DS_TRACKS: CareerTrack[] = [
    {
        id: "data-scientist", title: "Data Scientist", icon: "📊",
        description: "Extract insights from data using statistical methods and machine learning.",
        relevantDomains: ["statistics", "ai_ml", "programming", "math"],
        keyCourseCodes: ["DS3101", "CSE4821", "DS4101", "STA2101", "DS2101"],
        skills: ["Python/R", "Statistical Modeling", "Data Visualization", "ML Pipelines", "A/B Testing"],
        jobTitles: ["Data Scientist", "Analytics Engineer", "Quantitative Analyst"],
        avgSalaryBDT: "৳50,000 – ৳1,00,000", growth: "high",
    },
    {
        id: "ml-engineer", title: "ML Engineer", icon: "🤖",
        description: "Productionize machine learning models and build ML infrastructure.",
        relevantDomains: ["ai_ml", "programming", "database"],
        keyCourseCodes: ["CSE4821", "DS4101", "DS4201", "DS4301", "DS3201"],
        skills: ["PyTorch/TensorFlow", "MLOps", "Model Serving", "Feature Engineering", "Distributed Computing"],
        jobTitles: ["ML Engineer", "AI Engineer", "Deep Learning Engineer"],
        avgSalaryBDT: "৳60,000 – ৳1,20,000", growth: "high",
    },
    {
        id: "data-engineer", title: "Data Engineer", icon: "🗄️",
        description: "Build and maintain data pipelines, warehouses, and infrastructure.",
        relevantDomains: ["database", "programming", "statistics"],
        keyCourseCodes: ["DS3201", "DS4401", "CSE3521", "CSE2233"],
        skills: ["SQL/NoSQL", "Spark/Kafka", "ETL Pipelines", "Cloud Data Services", "Data Modeling"],
        jobTitles: ["Data Engineer", "ETL Developer", "Database Architect"],
        avgSalaryBDT: "৳45,000 – ৳90,000", growth: "high",
    },
    {
        id: "business-analyst", title: "Business Analyst", icon: "💼",
        description: "Bridge business needs and data solutions. Translate data insights to strategy.",
        relevantDomains: ["statistics", "business_core", "communication"],
        keyCourseCodes: ["DS1101", "DS2101", "STA2101", "STA1101"],
        skills: ["Data Storytelling", "SQL", "Excel/Tableau", "Requirements Gathering", "Domain Knowledge"],
        jobTitles: ["Business Analyst", "Product Analyst", "BI Analyst"],
        avgSalaryBDT: "৳35,000 – ৳70,000", growth: "medium",
    },
];

// ─── EEE Career Tracks ──────────────────────────────────────────
const EEE_TRACKS: CareerTrack[] = [
    {
        id: "power-systems", title: "Power Systems", icon: "⚡",
        description: "Design and manage electrical power generation, transmission, and distribution.",
        relevantDomains: ["power_systems", "electronics"],
        keyCourseCodes: ["EEE4201", "EEE3301", "EEE4601"],
        skills: ["Power Grid Design", "SCADA", "Load Flow Analysis", "Renewable Integration"],
        jobTitles: ["Power Systems Engineer", "Energy Analyst", "Grid Engineer"],
        avgSalaryBDT: "৳35,000 – ৳70,000", growth: "medium",
    },
    {
        id: "vlsi-design", title: "VLSI & Chip Design", icon: "🔌",
        description: "Design integrated circuits and semiconductor devices for next-gen electronics.",
        relevantDomains: ["electronics", "hardware"],
        keyCourseCodes: ["EEE4101", "CSE1325", "EEE2101"],
        skills: ["Verilog/VHDL", "ASIC Design", "FPGA", "EDA Tools", "Semiconductor Physics"],
        jobTitles: ["VLSI Engineer", "IC Designer", "Verification Engineer"],
        avgSalaryBDT: "৳40,000 – ৳80,000", growth: "medium",
    },
    {
        id: "embedded-systems", title: "Embedded Systems & IoT", icon: "🔧",
        description: "Develop firmware and embedded solutions for IoT, automotive, and consumer electronics.",
        relevantDomains: ["hardware", "programming", "electronics"],
        keyCourseCodes: ["EEE4501", "CSE1111", "CSE1325", "EEE3501"],
        skills: ["C/C++ Embedded", "Microcontrollers", "RTOS", "PCB Design", "IoT Protocols"],
        jobTitles: ["Embedded Engineer", "Firmware Developer", "IoT Engineer"],
        avgSalaryBDT: "৳35,000 – ৳75,000", growth: "high",
    },
    {
        id: "telecom", title: "Telecommunications", icon: "📡",
        description: "Work on wireless communication, 5G networks, and signal processing systems.",
        relevantDomains: ["telecom", "signal_processing"],
        keyCourseCodes: ["EEE3401", "EEE4401", "EEE4301", "EEE3201"],
        skills: ["RF Engineering", "5G/LTE", "Signal Processing", "Antenna Design", "Network Planning"],
        jobTitles: ["Telecom Engineer", "RF Engineer", "Network Planner"],
        avgSalaryBDT: "৳30,000 – ৳65,000", growth: "medium",
    },
    {
        id: "robotics", title: "Robotics & Automation", icon: "🤖",
        description: "Build robotic systems combining electronics, programming, and control theory.",
        relevantDomains: ["electronics", "programming", "ai_ml"],
        keyCourseCodes: ["EEE4701", "EEE3501", "EEE4501", "CSE1111"],
        skills: ["ROS", "Control Systems", "Sensor Integration", "PLC", "Motion Planning"],
        jobTitles: ["Robotics Engineer", "Automation Engineer", "Control Systems Engineer"],
        avgSalaryBDT: "৳40,000 – ৳80,000", growth: "high",
    },
];

// ─── BBA Career Tracks ──────────────────────────────────────────
const BBA_TRACKS: CareerTrack[] = [
    {
        id: "marketing-mgmt", title: "Marketing & Brand Management", icon: "📊",
        description: "Drive brand strategy, digital marketing campaigns, and consumer engagement.",
        relevantDomains: ["marketing", "communication", "business_core"],
        keyCourseCodes: ["MKT2101", "MKT3101", "MKT4101"],
        skills: ["Digital Marketing", "SEO/SEM", "Brand Strategy", "Market Research", "Social Media"],
        jobTitles: ["Marketing Executive", "Brand Manager", "Digital Marketer"],
        avgSalaryBDT: "৳25,000 – ৳55,000", growth: "high",
    },
    {
        id: "finance-banking", title: "Finance & Banking", icon: "💰",
        description: "Manage financial operations, investments, and banking services.",
        relevantDomains: ["finance", "accounting", "economics"],
        keyCourseCodes: ["FIN2101", "FIN3101", "FIN4101", "FIN4201"],
        skills: ["Financial Modeling", "Risk Analysis", "Portfolio Management", "Corporate Finance"],
        jobTitles: ["Financial Analyst", "Bank Officer", "Investment Analyst", "Credit Analyst"],
        avgSalaryBDT: "৳30,000 – ৳60,000", growth: "medium",
    },
    {
        id: "hr-management", title: "Human Resource Management", icon: "👔",
        description: "Manage talent acquisition, organizational development, and employee relations.",
        relevantDomains: ["management", "communication"],
        keyCourseCodes: ["HRM2101", "MGT3101", "MGT4101"],
        skills: ["Recruitment", "Performance Management", "Labor Law", "Training & Development"],
        jobTitles: ["HR Executive", "Talent Acquisition Specialist", "HR Manager"],
        avgSalaryBDT: "৳25,000 – ৳50,000", growth: "medium",
    },
    {
        id: "entrepreneurship", title: "Entrepreneurship", icon: "🚀",
        description: "Start and grow your own business. Build ventures from idea to market.",
        relevantDomains: ["business_core", "management", "marketing", "finance"],
        keyCourseCodes: ["MGT4201", "MGT4101", "MKT2101", "FIN2101"],
        skills: ["Business Planning", "Fundraising", "Leadership", "Product-Market Fit", "Operations"],
        jobTitles: ["Founder/CEO", "Startup Consultant", "Business Development Manager"],
        avgSalaryBDT: "Variable", growth: "high",
    },
];

// ─── BBA-AIS Career Tracks ──────────────────────────────────────
const BBA_AIS_TRACKS: CareerTrack[] = [
    {
        id: "auditing", title: "Auditing & Assurance", icon: "📋",
        description: "Audit financial statements and ensure regulatory compliance for organizations.",
        relevantDomains: ["accounting"],
        keyCourseCodes: ["ACC3101", "ACC2101", "ACC1201"],
        skills: ["Audit Planning", "Internal Controls", "GAAP/IFRS", "Risk Assessment"],
        jobTitles: ["External Auditor", "Internal Auditor", "Audit Associate"],
        avgSalaryBDT: "৳25,000 – ৳55,000", growth: "medium",
    },
    {
        id: "tax-consulting", title: "Tax Consulting", icon: "📑",
        description: "Advise businesses and individuals on tax planning and compliance.",
        relevantDomains: ["accounting", "finance"],
        keyCourseCodes: ["ACC3201", "ACC2101", "ACC1201"],
        skills: ["Tax Law", "Tax Planning", "VAT/Income Tax", "Compliance"],
        jobTitles: ["Tax Consultant", "Tax Analyst", "Revenue Officer"],
        avgSalaryBDT: "৳25,000 – ৳50,000", growth: "medium",
    },
    {
        id: "it-auditing", title: "IT Auditing", icon: "🔒",
        description: "Evaluate IT systems for security, integrity, and compliance with standards.",
        relevantDomains: ["accounting", "security", "programming"],
        keyCourseCodes: ["AIS3101", "AIS2101", "ACC3101"],
        skills: ["IT Controls", "COBIT", "ISO 27001", "ERP Systems", "Data Analytics"],
        jobTitles: ["IT Auditor", "IS Analyst", "Compliance Officer"],
        avgSalaryBDT: "৳30,000 – ৳60,000", growth: "high",
    },
    {
        id: "forensic-accounting", title: "Forensic Accounting", icon: "🔍",
        description: "Investigate financial fraud and disputes using accounting expertise.",
        relevantDomains: ["accounting"],
        keyCourseCodes: ["ACC4101", "ACC3101", "ACC2101"],
        skills: ["Fraud Investigation", "Litigation Support", "Data Forensics", "Expert Testimony"],
        jobTitles: ["Forensic Accountant", "Fraud Examiner", "Investigation Analyst"],
        avgSalaryBDT: "৳30,000 – ৳65,000", growth: "medium",
    },
];

// ─── Civil Engineering Career Tracks ────────────────────────────
const CIVIL_TRACKS: CareerTrack[] = [
    {
        id: "structural-eng", title: "Structural Engineering", icon: "🏗️",
        description: "Design buildings, bridges, and infrastructure to withstand loads and forces.",
        relevantDomains: ["structural", "civil_core", "math"],
        keyCourseCodes: ["CE3101", "CE4101", "CE4501", "CE2101"],
        skills: ["ETABS/SAP2000", "AutoCAD", "Structural Analysis", "Concrete Design", "Steel Design"],
        jobTitles: ["Structural Engineer", "Design Engineer", "Consultant"],
        avgSalaryBDT: "৳30,000 – ৳60,000", growth: "medium",
    },
    {
        id: "construction-mgmt", title: "Construction Management", icon: "👷",
        description: "Manage construction projects from planning to completion.",
        relevantDomains: ["civil_core", "management"],
        keyCourseCodes: ["CE4401", "CE4201", "CE3301"],
        skills: ["Project Management", "Cost Estimation", "MS Project", "Contract Admin", "Site Management"],
        jobTitles: ["Project Manager", "Site Engineer", "Construction Manager"],
        avgSalaryBDT: "৳30,000 – ৳65,000", growth: "high",
    },
    {
        id: "environmental-eng", title: "Environmental Engineering", icon: "🌿",
        description: "Design systems for water treatment, waste management, and environmental protection.",
        relevantDomains: ["environmental", "civil_core"],
        keyCourseCodes: ["CE4301", "CE3201"],
        skills: ["Water Treatment", "EIA", "Waste Management", "Environmental Modeling"],
        jobTitles: ["Environmental Engineer", "Water Resources Engineer", "EIA Consultant"],
        avgSalaryBDT: "৳25,000 – ৳55,000", growth: "medium",
    },
];

// ─── Pharmacy Career Tracks ─────────────────────────────────────
const PHARM_TRACKS: CareerTrack[] = [
    {
        id: "clinical-pharmacy", title: "Clinical Pharmacy", icon: "🏥",
        description: "Provide pharmaceutical care in hospitals and clinical settings.",
        relevantDomains: ["pharma", "biology"],
        keyCourseCodes: ["PHR4101", "PHR3101", "PHR2101"],
        skills: ["Drug Therapy", "Patient Counseling", "Drug Interactions", "Clinical Trials"],
        jobTitles: ["Clinical Pharmacist", "Hospital Pharmacist", "Drug Information Specialist"],
        avgSalaryBDT: "৳25,000 – ৳50,000", growth: "medium",
    },
    {
        id: "pharma-rd", title: "Pharmaceutical R&D", icon: "🧪",
        description: "Research and develop new drugs, formulations, and delivery systems.",
        relevantDomains: ["pharma", "chemistry", "research"],
        keyCourseCodes: ["PHR4301", "PHR3201", "PHR4900"],
        skills: ["Drug Formulation", "Analytical Chemistry", "HPLC", "GMP", "Clinical Research"],
        jobTitles: ["R&D Scientist", "Formulation Scientist", "Research Associate"],
        avgSalaryBDT: "৳30,000 – ৳60,000", growth: "medium",
    },
    {
        id: "pharma-qa", title: "Quality Assurance & Regulatory", icon: "✅",
        description: "Ensure drug quality standards and regulatory compliance in pharmaceutical companies.",
        relevantDomains: ["pharma", "lab"],
        keyCourseCodes: ["PHR4201", "PHR3201"],
        skills: ["cGMP", "FDA Guidelines", "SOP Writing", "Validation", "BSSS Standards"],
        jobTitles: ["QA Officer", "QC Analyst", "Regulatory Affairs Officer"],
        avgSalaryBDT: "৳22,000 – ৳45,000", growth: "medium",
    },
];

// ─── Economics Career Tracks ────────────────────────────────────
const ECO_TRACKS: CareerTrack[] = [
    {
        id: "economic-research", title: "Economic Research & Policy", icon: "📈",
        description: "Analyze economic data and advise on policy for government and think tanks.",
        relevantDomains: ["economics", "statistics", "research"],
        keyCourseCodes: ["ECO3101", "ECO3201", "ECO4101", "ECO4900"],
        skills: ["Econometrics", "Stata/R", "Policy Analysis", "Report Writing"],
        jobTitles: ["Research Associate", "Policy Analyst", "Economist"],
        avgSalaryBDT: "৳25,000 – ৳55,000", growth: "medium",
    },
    {
        id: "banking-finance", title: "Banking & Financial Services", icon: "🏦",
        description: "Work in commercial banking, central banking, or financial institutions.",
        relevantDomains: ["economics", "finance"],
        keyCourseCodes: ["ECO4201", "ECO2101", "ECO3301"],
        skills: ["Financial Analysis", "Credit Assessment", "Basel Norms", "Monetary Policy"],
        jobTitles: ["Bank Officer", "Financial Analyst", "Credit Analyst"],
        avgSalaryBDT: "৳30,000 – ৳60,000", growth: "medium",
    },
    {
        id: "development-eco", title: "Development Economics", icon: "🌍",
        description: "Work with NGOs, World Bank, UN agencies on development projects.",
        relevantDomains: ["economics", "social_science"],
        keyCourseCodes: ["ECO3201", "ECO4101"],
        skills: ["Impact Evaluation", "Project Management", "Data Collection", "Grant Writing"],
        jobTitles: ["Development Researcher", "M&E Officer", "Program Coordinator"],
        avgSalaryBDT: "৳30,000 – ৳70,000", growth: "medium",
    },
];

// ─── English Career Tracks ──────────────────────────────────────
const ENGLISH_TRACKS: CareerTrack[] = [
    {
        id: "content-writing", title: "Content & Copywriting", icon: "✍️",
        description: "Create compelling written content for digital, print, and marketing channels.",
        relevantDomains: ["language", "communication"],
        keyCourseCodes: ["ENG3201", "ENG1201", "ENG4201"],
        skills: ["SEO Writing", "Copywriting", "Editing", "Content Strategy"],
        jobTitles: ["Content Writer", "Copywriter", "Content Strategist", "Editor"],
        avgSalaryBDT: "৳20,000 – ৳45,000", growth: "high",
    },
    {
        id: "teaching", title: "Teaching & Education", icon: "🎓",
        description: "Teach English at schools, universities, or language institutes.",
        relevantDomains: ["language", "education"],
        keyCourseCodes: ["ENG4101", "ENG3101", "ENG2201"],
        skills: ["TESOL/TEFL", "Curriculum Design", "Classroom Management", "Assessment"],
        jobTitles: ["English Teacher", "Lecturer", "IELTS Instructor"],
        avgSalaryBDT: "৳20,000 – ৳40,000", growth: "medium",
    },
    {
        id: "translation", title: "Translation & Localization", icon: "🌐",
        description: "Translate and localize content between languages for global audiences.",
        relevantDomains: ["language"],
        keyCourseCodes: ["ENG3301", "ENG2201"],
        skills: ["Bangla-English Translation", "Localization Tools", "Cultural Adaptation"],
        jobTitles: ["Translator", "Localization Specialist", "Interpreter"],
        avgSalaryBDT: "৳20,000 – ৳50,000", growth: "medium",
    },
];

// ─── MSJ Career Tracks ──────────────────────────────────────────
const MSJ_TRACKS: CareerTrack[] = [
    {
        id: "journalism", title: "Journalism", icon: "📰",
        description: "Report news and stories across print, digital, and broadcast media.",
        relevantDomains: ["journalism", "communication"],
        keyCourseCodes: ["MSJ3201", "MSJ1201", "MSJ4101"],
        skills: ["News Writing", "Investigative Reporting", "Fact-Checking", "Ethics"],
        jobTitles: ["Reporter", "News Editor", "Correspondent"],
        avgSalaryBDT: "৳20,000 – ৳45,000", growth: "medium",
    },
    {
        id: "digital-media", title: "Digital Media & Production", icon: "🎬",
        description: "Create and manage digital content including video, audio, and social media.",
        relevantDomains: ["media", "design"],
        keyCourseCodes: ["MSJ2201", "MSJ4201", "MSJ2101"],
        skills: ["Video Editing", "Social Media", "Adobe Suite", "Storytelling"],
        jobTitles: ["Digital Media Producer", "Video Editor", "Social Media Manager"],
        avgSalaryBDT: "৳20,000 – ৳50,000", growth: "high",
    },
    {
        id: "pr-communications", title: "PR & Corporate Communications", icon: "🗣️",
        description: "Manage public relations, corporate image, and strategic communications.",
        relevantDomains: ["communication", "marketing"],
        keyCourseCodes: ["MSJ3101", "MSJ3301"],
        skills: ["Press Releases", "Crisis Communication", "Event Management", "Media Relations"],
        jobTitles: ["PR Executive", "Communications Manager", "Corporate Affairs Officer"],
        avgSalaryBDT: "৳25,000 – ৳55,000", growth: "medium",
    },
];

// ─── EDS Career Tracks ──────────────────────────────────────────
const EDS_TRACKS: CareerTrack[] = [
    {
        id: "education-policy", title: "Education Policy & Research", icon: "🎓",
        description: "Research and develop education policies for government and NGOs.",
        relevantDomains: ["education", "research"],
        keyCourseCodes: ["EDS3201", "EDS3101", "EDS2201"],
        skills: ["Policy Analysis", "Research Design", "Data Analysis", "Report Writing"],
        jobTitles: ["Education Researcher", "Policy Analyst", "Program Officer"],
        avgSalaryBDT: "৳25,000 – ৳50,000", growth: "medium",
    },
    {
        id: "ngo-development", title: "NGO & Development Work", icon: "🌍",
        description: "Work with NGOs on community development, social welfare, and empowerment.",
        relevantDomains: ["social_science", "management"],
        keyCourseCodes: ["EDS4101", "EDS3301"],
        skills: ["Project Management", "M&E", "Community Engagement", "Grant Proposals"],
        jobTitles: ["NGO Coordinator", "Development Worker", "Field Officer"],
        avgSalaryBDT: "৳20,000 – ৳45,000", growth: "medium",
    },
];

// ─── BGE Career Tracks ──────────────────────────────────────────
const BGE_TRACKS: CareerTrack[] = [
    {
        id: "biotech-rd", title: "Biotechnology R&D", icon: "🧬",
        description: "Research and develop biotech products in pharmaceuticals, agriculture, and industry.",
        relevantDomains: ["biotech", "genetics", "research"],
        keyCourseCodes: ["BGE4201", "BGE4101", "BGE4900"],
        skills: ["PCR/Cloning", "Bioinformatics", "Lab Techniques", "Research Paper Writing"],
        jobTitles: ["Research Scientist", "Biotech Researcher", "Lab Manager"],
        avgSalaryBDT: "৳25,000 – ৳55,000", growth: "medium",
    },
    {
        id: "genetic-research", title: "Genetic Research", icon: "🔬",
        description: "Conduct genetic research in healthcare, forensics, or agricultural biotech.",
        relevantDomains: ["genetics", "biology"],
        keyCourseCodes: ["BGE3201", "BGE4201", "BGE3101"],
        skills: ["Gene Sequencing", "CRISPR", "Genomics", "Statistical Genetics"],
        jobTitles: ["Genetic Researcher", "Genomics Analyst", "Clinical Geneticist"],
        avgSalaryBDT: "৳25,000 – ৳50,000", growth: "high",
    },
    {
        id: "agri-biotech", title: "Agricultural Biotechnology", icon: "🌾",
        description: "Apply biotech methods to improve crops, livestock, and food production.",
        relevantDomains: ["biotech", "biology"],
        keyCourseCodes: ["BGE4301", "BGE4201"],
        skills: ["Plant Tissue Culture", "GMO Development", "Field Trials", "Biosafety"],
        jobTitles: ["Agri-Biotech Scientist", "Plant Breeder", "Agricultural Researcher"],
        avgSalaryBDT: "৳20,000 – ৳45,000", growth: "medium",
    },
];

// ─── Full Career Map Registry ───────────────────────────────────
export const CAREER_MAPS: ProgramCareerMap[] = [
    { programId: "bscse", tracks: CSE_TRACKS },
    { programId: "bsds", tracks: DS_TRACKS },
    { programId: "bseee", tracks: EEE_TRACKS },
    { programId: "bscivil", tracks: CIVIL_TRACKS },
    { programId: "bpharm", tracks: PHARM_TRACKS },
    { programId: "bba", tracks: BBA_TRACKS },
    { programId: "bba_ais", tracks: BBA_AIS_TRACKS },
    { programId: "bseco", tracks: ECO_TRACKS },
    { programId: "bsseds", tracks: EDS_TRACKS },
    { programId: "ba_english", tracks: ENGLISH_TRACKS },
    { programId: "bssmsj", tracks: MSJ_TRACKS },
    { programId: "bsbge", tracks: BGE_TRACKS },
];
