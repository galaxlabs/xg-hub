import { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/* ================================================================
   20 POSITION DEFINITIONS (titles + icons + colors only —
   scoring is done by AI when API key is present)
   ================================================================ */
const POSITIONS = [
    { id: 'frontend', title: 'Frontend Developer', icon: 'fa-code', color: '#ef4444' },
    { id: 'backend', title: 'Backend Developer', icon: 'fa-server', color: '#991b1b' },
    { id: 'fullstack', title: 'Full Stack Developer', icon: 'fa-layer-group', color: '#a78bfa' },
    { id: 'devops', title: 'DevOps Engineer', icon: 'fa-gears', color: '#f59e0b' },
    { id: 'datascience', title: 'Data Scientist', icon: 'fa-chart-line', color: '#ec4899' },
    { id: 'uiux', title: 'UI/UX Designer', icon: 'fa-pen-nib', color: '#f472b6' },
    { id: 'pm', title: 'Project Manager', icon: 'fa-diagram-project', color: '#fb923c' },
    { id: 'qa', title: 'QA Engineer', icon: 'fa-vial', color: '#2dd4bf' },
    { id: 'mobile', title: 'Mobile Developer', icon: 'fa-mobile-screen', color: '#818cf8' },
    { id: 'dataeng', title: 'Data Engineer', icon: 'fa-database', color: '#38bdf8' },
    { id: 'cloudarch', title: 'Cloud Architect', icon: 'fa-cloud', color: '#22d3ee' },
    { id: 'cybersec', title: 'Cybersecurity Analyst', icon: 'fa-shield-halved', color: '#f43f5e' },
    { id: 'sales', title: 'Sales Executive', icon: 'fa-handshake', color: '#f97316' },
    { id: 'salesmanager', title: 'Sales Manager', icon: 'fa-users-gear', color: '#ea580c' },
    { id: 'hr', title: 'HR Specialist / Manager', icon: 'fa-people-group', color: '#06b6d4' },
    { id: 'digitalmarketing', title: 'Digital Marketing Specialist', icon: 'fa-bullhorn', color: '#e11d48' },
    { id: 'seniordesigner', title: 'Senior Graphic Designer', icon: 'fa-palette', color: '#d946ef' },
    { id: 'juniordesigner', title: 'Junior Graphic Designer', icon: 'fa-paintbrush', color: '#c084fc' },
    { id: 'aiautomation', title: 'AI Automation Specialist', icon: 'fa-robot', color: '#dc2626' },
    { id: 'webdev', title: 'Web Developer', icon: 'fa-globe', color: '#38bdf8' },
    { id: 'crm', title: 'CRM Specialist', icon: 'fa-address-book', color: '#84cc16' },
];

/* ================================================================
   KEYWORD DATABASE (used as FALLBACK when no API key)
   ================================================================ */
const KEYWORDS_DB: Record<string, Record<string, number>> = {
    frontend: { 'html': 5, 'css': 5, 'javascript': 5, 'react': 4, 'angular': 4, 'vue': 4, 'typescript': 4, 'next.js': 3, 'tailwind': 2, 'sass': 2, 'webpack': 2, 'vite': 2, 'redux': 2, 'graphql': 2, 'frontend': 5, 'front-end': 5, 'ui developer': 5, 'web developer': 3, 'client-side': 4, 'jest': 2, 'cypress': 2, 'material ui': 2, 'styled components': 2 },
    backend: { 'node.js': 5, 'python': 4, 'java': 4, 'csharp': 4, 'go': 4, 'php': 3, 'express': 4, 'django': 4, 'flask': 3, 'fastapi': 3, 'spring boot': 4, 'rest api': 5, 'microservices': 4, 'mongodb': 3, 'postgresql': 3, 'mysql': 3, 'redis': 3, 'backend': 5, 'back-end': 5, 'server-side': 5, 'api developer': 4, 'authentication': 3, 'orm': 3, 'sql': 3, 'nosql': 3 },
    fullstack: { 'full stack': 5, 'fullstack': 5, 'mern': 5, 'mean': 4, 'react': 3, 'node.js': 4, 'typescript': 3, 'mongodb': 3, 'postgresql': 3, 'express': 3, 'next.js': 3, 'frontend': 2, 'backend': 2, 'tailwind': 1, 'redux': 1, 'prisma': 2 },
    devops: { 'docker': 5, 'kubernetes': 5, 'k8s': 5, 'terraform': 5, 'ansible': 4, 'jenkins': 4, 'cicd': 5, 'ci/cd': 5, 'aws': 5, 'azure': 4, 'gcp': 4, 'linux': 4, 'bash scripting': 3, 'prometheus': 3, 'grafana': 3, 'devops': 5, 'sre': 4, 'infrastructure': 4, 'nginx': 3 },
    datascience: { 'machine learning': 5, 'deep learning': 5, 'python': 5, 'statistics': 5, 'tensorflow': 4, 'pytorch': 4, 'scikit-learn': 4, 'pandas': 4, 'numpy': 4, 'nlp': 4, 'computer vision': 4, 'data science': 5, 'data scientist': 5, 'regression': 3, 'neural network': 4, 'jupyter': 3 },
    uiux: { 'figma': 5, 'wireframing': 5, 'prototyping': 5, 'user research': 5, 'usability testing': 4, 'ui design': 5, 'ux design': 5, 'user experience': 5, 'interaction design': 4, 'design system': 4, 'wireframe': 4, 'persona': 3, 'a/b testing': 3, 'adobe xd': 4, 'invision': 3 },
    pm: { 'project manager': 5, 'project management': 5, 'agile': 5, 'scrum': 5, 'stakeholder management': 4, 'risk management': 4, 'sprint planning': 4, 'roadmap': 4, 'pmp': 5, 'jira': 4, 'resource allocation': 4, 'team leadership': 4, 'gantt': 3 },
    qa: { 'selenium': 5, 'testing': 5, 'qa': 5, 'quality assurance': 5, 'test automation': 5, 'cypress': 4, 'playwright': 3, 'test plan': 4, 'test case': 4, 'regression testing': 4, 'performance testing': 4, 'api testing': 4, 'postman': 3, 'bdd': 3 },
    mobile: { 'react native': 5, 'flutter': 5, 'swift': 4, 'kotlin': 4, 'ios development': 5, 'android development': 5, 'mobile development': 5, 'dart': 4, 'xcode': 4, 'android studio': 4, 'firebase': 3 },
    dataeng: { 'etl': 5, 'data pipeline': 5, 'apache spark': 5, 'data engineering': 5, 'data engineer': 5, 'airflow': 4, 'dbt': 4, 'snowflake': 4, 'bigquery': 4, 'sql': 5, 'data warehouse': 4, 'data lake': 4, 'kafka': 4 },
    cloudarch: { 'cloud architect': 5, 'aws': 5, 'azure': 5, 'gcp': 5, 'serverless': 4, 'terraform': 5, 'cloudformation': 4, 'vpc': 4, 'iam': 4, 'multi-cloud': 4, 'hybrid cloud': 4, 'disaster recovery': 4, 'high availability': 4 },
    cybersec: { 'cybersecurity': 5, 'information security': 5, 'penetration testing': 5, 'security analyst': 5, 'vulnerability assessment': 4, 'owasp': 4, 'firewall': 4, 'siem': 4, 'incident response': 4, 'malware analysis': 4, 'compliance': 4 },
    sales: { 'sales': 5, 'b2b sales': 5, 'lead generation': 5, 'cold calling': 5, 'prospecting': 5, 'sales pipeline': 5, 'closing': 5, 'quota': 5, 'negotiation': 5, 'account management': 4, 'client acquisition': 4, 'salesforce': 4, 'commission': 4 },
    salesmanager: { 'sales manager': 5, 'sales management': 5, 'sales leadership': 5, 'coaching': 5, 'sales coaching': 5, 'sales strategy': 5, 'forecasting': 4, 'performance management': 5, 'quota attainment': 5, 'team development': 4, 'hiring': 3, 'revenue growth': 5 },
    hr: { 'human resources': 5, 'hr': 5, 'hr manager': 5, 'recruitment': 5, 'talent acquisition': 5, 'hiring': 5, 'onboarding': 5, 'employee relations': 5, 'performance management': 5, 'performance appraisal': 5, 'labor law': 5, 'compliance': 5, 'payroll': 4, 'hris': 4, 'hrms': 4 },
    digitalmarketing: { 'digital marketing': 5, 'seo': 5, 'sem': 5, 'ppc': 5, 'google ads': 5, 'social media marketing': 5, 'email marketing': 5, 'content marketing': 4, 'marketing strategy': 5, 'lead generation': 5, 'conversion rate': 4, 'a/b testing': 4, 'keyword research': 4, 'google analytics': 4, 'roas': 4 },
    seniordesigner: { 'graphic design': 5, 'senior designer': 5, 'art direction': 5, 'creative direction': 5, 'brand identity': 5, 'branding': 5, 'brand strategy': 4, 'typography': 5, 'print design': 4, 'packaging design': 4, 'adobe illustrator': 5, 'adobe photoshop': 5, 'design leadership': 4, 'mentoring': 4 },
    juniordesigner: { 'graphic design': 5, 'junior designer': 5, 'color theory': 4, 'adobe photoshop': 5, 'adobe illustrator': 5, 'canva': 4, 'social media design': 5, 'poster design': 4, 'logo design': 4, 'thumbnail': 4, 'internship': 3, 'fresher': 3 },
    aiautomation: { 'ai automation': 5, 'rpa': 5, 'robotic process automation': 5, 'zapier': 5, 'make': 5, 'n8n': 4, 'chatgpt': 5, 'openai': 5, 'langchain': 5, 'prompt engineering': 5, 'chatbot': 5, 'llm': 5, 'workflow automation': 5, 'api integration': 5, 'uipath': 4 },
    webdev: { 'web developer': 5, 'web development': 5, 'wordpress': 5, 'woocommerce': 4, 'shopify': 4, 'cms': 5, 'html': 5, 'css': 5, 'javascript': 5, 'php': 5, 'hosting': 4, 'cpanel': 4, 'responsive design': 4, 'seo': 4, 'theme development': 4, 'elementor': 3 },
    crm: { 'crm': 5, 'salesforce': 5, 'hubspot': 5, 'crm specialist': 5, 'crm administrator': 5, 'lead management': 5, 'pipeline management': 5, 'crm implementation': 5, 'zoho crm': 4, 'dynamics 365': 4, 'crm reporting': 4, 'salesforce administrator': 5 }
};

const ALIASES: Record<string, string> = {
    'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'node': 'node.js', 'nodejs': 'node.js',
    'reactjs': 'react', 'react.js': 'react', 'vuejs': 'vue', 'nextjs': 'next.js', 'k8s': 'kubernetes',
    'sklearn': 'scikit-learn', 'ml': 'machine learning', 'ci/cd': 'cicd', 'rest': 'rest api'
};

/* ================================================================
   TYPES
   ================================================================ */
interface CVFile {
    file: File; name: string; ext: string; scanned: boolean; result: ScanResult | null;
}
interface ScoredPosition {
    id: string; title: string; icon: string; color: string;
    score: number; matchedSkills: { skill: string; weight: number }[];
    matchedWeight: number; totalWeight: number; reason?: string;
}
interface ScanResult {
    results: ScoredPosition[];
    contact: { email?: string; phone?: string; linkedin?: string; github?: string };
    experience: number; education: string[]; allSkills: string[]; textLength: number;
    aiSummary?: string;
}

/* ================================================================
   FALLBACK KEYWORD ENGINE
   ================================================================ */
function normalizeText(t: string) { return t.toLowerCase().replace(/[^\w\s.\-\/@+()#]/g, ' ').replace(/\s+/g, ' ').trim(); }
function resolveAlias(w: string) { return ALIASES[w] || w; }
function buildTokenSet(norm: string) {
    const words = norm.split(' ').filter(w => w.length > 1);
    const tokens = new Set<string>();
    words.forEach(w => { tokens.add(w); tokens.add(resolveAlias(w)); });
    for (let i = 0; i < words.length - 1; i++) tokens.add(words[i] + ' ' + words[i + 1]);
    for (let i = 0; i < words.length - 2; i++) tokens.add(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
    return tokens;
}
function keywordScore(posId: string, tokenSet: Set<string>) {
    const kws = KEYWORDS_DB[posId]; if (!kws) return { score: 0, matchedSkills: [], matchedWeight: 0, totalWeight: 0 };
    let mw = 0, tw = 0; const ms: { skill: string; weight: number }[] = [];
    for (const [k, w] of Object.entries(kws)) { tw += w; if (tokenSet.has(k) || tokenSet.has(resolveAlias(k))) { mw += w; ms.push({ skill: k, weight: w }); } }
    return { score: Math.min(tw > 0 ? (mw / tw) * 100 : 0, 100), matchedSkills: ms, matchedWeight: mw, totalWeight: tw };
}
function extractContactInfo(text: string) {
    const c: ScanResult['contact'] = {};
    const em = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (em) c.email = em[0];
    const ph = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
    if (ph) c.phone = ph[0].trim();
    const li = text.match(/linkedin\.com\/in\/[\w\-]+/i); if (li) c.linkedin = li[0];
    const gh = text.match(/github\.com\/[\w\-]+/i); if (gh) c.github = gh[0];
    return c;
}
function extractExperience(text: string) {
    let m = 0;
    const ps = [/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp|work)/gi, /(?:experience|exp|work)\s+(?:of\s+)?(?:over\s+|more\s+than\s+|about\s+)?(\d+)\+?\s*(?:years?|yrs?)/gi];
    ps.forEach(p => { let x; while ((x = p.exec(text.toLowerCase())) !== null) { const y = parseInt(x[1]); if (y > m && y <= 50) m = y; } });
    return m;
}
function extractEducation(text: string) {
    const l = text.toLowerCase(); const d: string[] = [];
    if (/ph\.?d|doctorate/gi.test(l)) d.push('Ph.D');
    if (/master(?:'s)?\s+(?:of\s+)?(?:science|arts|engineering|technology|business)|m\.s\.|m\.a\.|m\.eng|m\.tech|mba/gi.test(l)) d.push("Master's Degree");
    if (/bachelor(?:'s)?\s+(?:of\s+)?(?:science|arts|engineering|technology|business)|b\.s\.|b\.a\.|b\.eng|b\.tech|bba/gi.test(l)) d.push("Bachelor's Degree");
    if (/diploma|certificate/gi.test(l)) d.push('Diploma / Certificate');
    return [...new Set(d)];
}

/* ================================================================
   GROQ API ANALYSIS
   ================================================================ */
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function analyzeWithGemini(apiKey: string, cvText: string): Promise<ScanResult> {
    const positionList = POSITIONS.map(p => p.title).join(', ');

    const systemPrompt = `You are an expert HR recruitment AI. Analyze the given CV/resume text and determine how well the candidate fits EACH of these ${POSITIONS.length} positions: ${positionList}.

You MUST respond with ONLY valid JSON (no markdown, no code blocks, no explanation outside JSON). The JSON schema is:
{
  "positions": [
    { "id": "<exact id from list below>", "score": <number 0-100>, "matchedSkills": ["skill1","skill2"], "reason": "<one sentence why this score>" }
  ],
  "contact": { "email": "<string or null>", "phone": "<string or null>", "linkedin": "<string or null>", "github": "<string or null>" },
  "experience": <estimated total years as number, 0 if unclear>,
  "education": ["<degree1>", "<degree2>"],
  "allSkills": ["<skill1>", "<skill2>"],
  "summary": "<2-3 sentence overall assessment of the candidate>"
}

Position IDs: ${POSITIONS.map(p => `"${p.id}"`).join(', ')}

SCORING RULES:
- Score 80-100: The candidate is clearly experienced and specialized in this exact role
- Score 50-79: Strong alignment, candidate has most required skills and relevant experience
- Score 25-49: Partial match, some relevant skills but missing critical ones or insufficient experience
- Score 5-24: Weak match, only tangentially related skills
- Score 0: No relevant skills or experience at all
- Do NOT give everyone high scores. Be strict and realistic. Most candidates should only score high on 1-3 positions.
- A fresh graduate should NOT score above 40 on senior roles.
- Consider CONTEXT: "used React in a college project" is very different from "2 years professional React experience"
- Consider SENIORITY: "Senior Graphic Designer" requires leadership/strategy keywords, not just design tools
- matchedSkills should list ONLY skills actually found in the CV that are relevant to that position (max 15 per position)
- allSkills should be a comprehensive flat list of ALL professional skills found in the CV (max 40)`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: `Here is the CV text to analyze:\n\n${cvText.substring(0, 15000)}` }] }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 4000,
                responseMimeType: "application/json"
            }
        })
    });

    if (!response.ok) {
        let errMsg = 'Unknown error';
        try {
            const errRaw = await response.text();
            const errJson = JSON.parse(errRaw);
            errMsg = errJson.error?.message || (Array.isArray(errJson) && errJson[0]?.error?.message) || errRaw;
        } catch (e) {
            errMsg = 'Failed to parse error response';
        }

        if (response.status === 429) {
            throw new Error('Gemini API Quota Exceeded: You have reached your rate limit. Please try again later or verify your API key limits.');
        }
        throw new Error(`Gemini API error (${response.status}): ${errMsg.substring(0, 150)}...`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty response from Gemini API');

    let parsed: any;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error('Failed to parse Gemini API response as JSON');
    }

    // Merge AI scores with position metadata
    const idToPos = Object.fromEntries(POSITIONS.map(p => [p.id, p]));
    const results: ScoredPosition[] = (parsed.positions || [])
        .map((p: any) => {
            const meta = idToPos[p.id];
            if (!meta) return null;
            return {
                ...meta,
                score: typeof p.score === 'number' ? Math.min(Math.max(p.score, 0), 100) : 0,
                matchedSkills: (p.matchedSkills || []).map((s: string) => ({ skill: s, weight: 3 })),
                matchedWeight: (p.matchedSkills || []).length * 3,
                totalWeight: 100,
                reason: p.reason || ''
            };
        })
        .filter(Boolean)
        .sort((a: ScoredPosition, b: ScoredPosition) => b.score - a.score);

    // Ensure all 21 positions are present (fill missing with 0)
    POSITIONS.forEach(p => {
        if (!results.find((r: ScoredPosition) => r.id === p.id)) {
            results.push({ ...p, score: 0, matchedSkills: [], matchedWeight: 0, totalWeight: 100, reason: 'No relevant skills detected' });
        }
    });
    results.sort((a: ScoredPosition, b: ScoredPosition) => b.score - a.score);

    return {
        results,
        contact: {
            email: parsed.contact?.email || null,
            phone: parsed.contact?.phone || null,
            linkedin: parsed.contact?.linkedin || null,
            github: parsed.contact?.github || null,
        },
        experience: typeof parsed.experience === 'number' ? parsed.experience : 0,
        education: Array.isArray(parsed.education) ? parsed.education : [],
        allSkills: Array.isArray(parsed.allSkills) ? parsed.allSkills : [],
        textLength: cvText.length,
        aiSummary: parsed.summary || ''
    };
}

/* ================================================================
   TEXT EXTRACTION
   ================================================================ */
async function extractText(file: File, ext: string): Promise<string> {
    if (ext === 'txt') return await file.text();
    if (ext === 'pdf') {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((it: any) => it.str).join(' ') + '\n';
        }
        return text;
    }
    if (ext === 'docx' || ext === 'doc') {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        return result.value;
    }
    return '';
}

/* ================================================================
   COMPONENT
   ================================================================ */
export default function CVScanner() {
    const [cvFiles, setCvFiles] = useState<CVFile[]>([]);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [isScanning, setIsScanning] = useState(false);
    const [scanPhase, setScanPhase] = useState('');
    const [error, setError] = useState('');
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const folderRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const addRef = useRef<HTMLInputElement>(null);

    const hasKey = geminiKey.trim().length > 10;

    const handleFiles = useCallback((fileList: FileList) => {
        const CV_EXTS = ['pdf', 'docx', 'doc', 'txt'];
        const newFiles = Array.from(fileList).filter(f => CV_EXTS.includes(f.name.split('.').pop()!.toLowerCase()));
        if (!newFiles.length) { setError('No CV files found. Supported: PDF, DOCX, DOC, TXT'); setTimeout(() => setError(''), 3000); return; }
        const mapped: CVFile[] = newFiles.map(f => ({
            file: f, name: f.name, ext: f.name.split('.').pop()!.toLowerCase(), scanned: false, result: null
        }));
        setCvFiles(prev => [...prev, ...mapped]);
        setError('');
    }, []);

    const doScan = async (idx: number) => {
        if (isScanning) return;
        setIsScanning(true);
        setError('');
        setActiveIdx(idx);

        try {
            const cv = cvFiles[idx];
            setScanPhase('Extracting text from document...');
            const rawText = await extractText(cv.file, cv.ext);
            if (!rawText || rawText.trim().length < 20) {
                setError(`Could not extract text from "${cv.name}". File may be image-based or corrupted.`);
                setIsScanning(false); return;
            }

            let scanResult: ScanResult | null = null;
            let aiFailed = false;

            if (hasKey) {
                try {
                    // ─── AI MODE ───
                    setScanPhase('Sending to Gemini AI for deep analysis...');
                    scanResult = await analyzeWithGemini(geminiKey.trim(), rawText);
                } catch (aiErr: any) {
                    console.error("AI Analysis Error:", aiErr);
                    aiFailed = true;
                }
            }

            if (!hasKey || aiFailed) {
                // ─── KEYWORD MODE ───
                setScanPhase(aiFailed ? 'Falling back to local keyword matching...' : 'Analyzing skills and experience...');
                await new Promise(r => setTimeout(r, 600));
                setScanPhase('Matching against 21 position profiles...');
                await new Promise(r => setTimeout(r, 300));

                const normalized = normalizeText(rawText);
                const tokenSet = buildTokenSet(normalized);
                const results: ScoredPosition[] = POSITIONS.map(pos => {
                    const scored = keywordScore(pos.id, tokenSet);
                    return { ...pos, ...scored };
                }).sort((a, b) => b.score - a.score);

                const allSkills = new Set<string>();
                Object.values(KEYWORDS_DB).forEach(kws => {
                    for (const kw of Object.keys(kws)) {
                        if (tokenSet.has(kw) || tokenSet.has(resolveAlias(kw))) allSkills.add(kw);
                    }
                });

                scanResult = {
                    results,
                    contact: extractContactInfo(rawText),
                    experience: extractExperience(rawText),
                    education: extractEducation(rawText),
                    allSkills: [...allSkills].sort(),
                    textLength: rawText.length,
                };
            }

            setCvFiles(prev => prev.map((f, i) => i === idx ? { ...f, scanned: true, result: scanResult! } : f));
            setScanPhase('');
        } catch (err: any) {
            setError(err.message || 'Error scanning CV');
        }
        setIsScanning(false);
    };

    const currentCV = activeIdx >= 0 ? cvFiles[activeIdx] : null;

    const fileIcon = (ext: string) => ({ pdf: 'fa-file-pdf', docx: 'fa-file-word', doc: 'fa-file-word', txt: 'fa-file-lines' }[ext] || 'fa-file');
    const fileColor = (ext: string) => ({ pdf: '#ef4444', docx: '#991b1b', doc: '#991b1b', txt: '#94a3b8' }[ext] || '#94a3b8');

    return (
        <div style={{ minHeight: '100vh', background: '#000000', color: '#e2e8f0', fontFamily: '"Space Grotesk", sans-serif' }}>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet" />

            {/* ─── HEADER ─── */}
            <div style={{ borderBottom: '1px solid #3f0f0f', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0000', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#ef4444,#991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-brain" style={{ color: '#000000', fontSize: 14 }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>CV Intelligence Scanner</h1>
                        <p style={{ fontSize: 11, color: '#475569' }}>
                            {hasKey
                                ? <><i className="fa-solid fa-bolt" style={{ color: '#dc2626', marginRight: 4 }} />AI Mode — Gemini Powered</>
                                : <>Keyword Matching Mode</>}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* AI Status */}
                    <div
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8,
                            fontSize: 12, fontWeight: 600, border: '1px solid',
                            borderColor: hasKey ? '#ef4444' : '#7f1d1d',
                            background: hasKey ? 'rgba(239,68,68,0.1)' : 'rgba(127,29,29,0.1)',
                            color: hasKey ? '#ef4444' : '#7f1d1d'
                        }}
                    >
                        <i className={`fa-solid ${hasKey ? 'fa-check-circle' : 'fa-triangle-exclamation'}`} />
                        {hasKey ? 'AI Connected' : 'AI Offline (Check .env)'}
                    </div>

                    {cvFiles.length > 0 && (
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94a3b8' }}>
                            <span><i className="fa-solid fa-file-lines" style={{ color: '#ef4444', marginRight: 4 }} />{cvFiles.length} CVs</span>
                            <span><i className="fa-solid fa-check-circle" style={{ color: '#ef4444', marginRight: 4 }} />{cvFiles.filter(f => f.scanned).length} scanned</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── API KEY HIDDEN IN ENVIRONMENT VARIABLES ─── */}

            {/* ─── TOAST ─── */}
            {error && (
                <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '14px 20px', borderRadius: 10, background: '#3f0f0f', border: '1px solid #450a0a', color: '#e2e8f0', fontSize: 14, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 420, animation: 'fadeUp .3s ease-out' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{error}</span>
                    <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}><i className="fa-solid fa-xmark" /></button>
                </div>
            )}

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

                {/* ========== UPLOAD STATE ========== */}
                {cvFiles.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 32 }}>
                            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.5px' }}>Scan Any CV, Find the Right Role</h2>
                            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 520, margin: '0 auto' }}>
                                {hasKey
                                    ? 'Your Gemini AI key is connected. Drop CVs below for deep, context-aware position matching powered by Gemini 2.0 Flash.'
                                    : 'Select your recruitment folder or drop CV files to analyze candidates. Add Gemini API key for dramatically more accurate results.'}
                            </p>
                        </div>

                        <div
                            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#ef4444'; }}
                            onDragLeave={e => { e.currentTarget.style.borderColor = '#3f0f0f'; }}
                            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#3f0f0f'; handleFiles(e.dataTransfer.files); }}
                            style={{ border: '2px dashed #3f0f0f', borderRadius: 16, padding: '48px 32px', textAlign: 'center', width: '100%', maxWidth: 520, background: '#140000', transition: 'all .3s', cursor: 'pointer' }}
                            onClick={() => folderRef.current?.click()}
                        >
                            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 40, color: hasKey ? '#ef4444' : '#7f1d1d', marginBottom: 20, display: 'block' }} />
                            <p style={{ fontWeight: 600, marginBottom: 4 }}>Drop CV files here</p>
                            <p style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>Supports PDF, DOCX, DOC, and TXT formats</p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={e => { e.stopPropagation(); folderRef.current?.click(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, background: hasKey ? '#dc2626' : '#ef4444', color: '#000000', border: 'none', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-folder-open" /> Select Recruitment Folder
                                </button>
                                <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, background: '#2c0b0b', color: '#e2e8f0', border: '1px solid #3f0f0f', cursor: 'pointer' }}>
                                    <i className="fa-solid fa-file-arrow-up" /> Pick CV Files
                                </button>
                            </div>
                        </div>

                        {/* @ts-ignore */}
                        <input ref={folderRef} type="file" webkitdirectory="" multiple onChange={e => e.target.files && handleFiles(e.target.files)} style={{ display: 'none' }} />
                        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" multiple onChange={e => e.target.files && handleFiles(e.target.files)} style={{ display: 'none' }} />

                        <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, fontSize: 12, color: '#475569' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: '#140000', border: '1px solid #3f0f0f' }}><i className="fa-solid fa-lock" style={{ fontSize: 10, color: '#ef4444' }} /> 100% Local Processing</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: '#140000', border: '1px solid #3f0f0f' }}><i className="fa-solid fa-bolt" style={{ fontSize: 10, color: '#f59e0b' }} /> Instant Results</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: '#140000', border: '1px solid #3f0f0f' }}><i className="fa-solid fa-bullseye" style={{ fontSize: 10, color: '#ef4444' }} /> 21 Position Profiles</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: '#140000', border: `1px solid ${hasKey ? '#dc2626' : '#3f0f0f'}` }}><i className="fa-solid fa-robot" style={{ fontSize: 10, color: '#dc2626' }} /> {hasKey ? 'AI Powered' : 'Add Gemini Key for AI'}</span>
                        </div>
                    </div>
                )}

                {/* ========== DASHBOARD STATE ========== */}
                {cvFiles.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }} className="cv-dash-grid">

                        {/* Sidebar */}
                        <div style={{ background: '#140000', border: '1px solid #3f0f0f', borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <h3 style={{ fontWeight: 600, fontSize: 14 }}>CV Files</h3>
                                <button onClick={() => addRef.current?.click()} style={{ fontSize: 12, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: 'none' }}>
                                    <i className="fa-solid fa-plus" />
                                </button>
                                <input ref={addRef} type="file" accept=".pdf,.docx,.doc,.txt" multiple onChange={e => e.target.files && handleFiles(e.target.files)} style={{ display: 'none' }} />
                            </div>
                            <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {cvFiles.map((cv, i) => (
                                    <div key={cv.name + i} onClick={() => doScan(i)} style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, border: '1px solid transparent', background: i === activeIdx ? 'rgba(239,68,68,0.08)' : 'transparent', borderColor: i === activeIdx ? '#dc2626' : 'transparent', transition: 'all .2s' }}>
                                        <i className={`fa-solid ${fileIcon(cv.ext)}`} style={{ color: fileColor(cv.ext), fontSize: 14 }} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: i === activeIdx ? '#e2e8f0' : '#94a3b8' }}>{cv.name}</span>
                                        {cv.scanned && <i className="fa-solid fa-check" style={{ color: '#ef4444', fontSize: 11 }} />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Panel */}
                        <div>
                            {activeIdx < 0 && !isScanning && (
                                <div style={{ background: '#140000', border: '1px solid #3f0f0f', borderRadius: 12, padding: 64, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500 }}>
                                    <i className="fa-solid fa-arrow-left" style={{ fontSize: 28, color: '#475569', marginBottom: 16 }} />
                                    <p style={{ fontWeight: 600, marginBottom: 4 }}>Select a CV to scan</p>
                                    <p style={{ fontSize: 14, color: '#475569' }}>
                                        {hasKey ? 'Click any file — it will be analyzed by AI' : 'Click any file from the list to start analysis'}
                                    </p>
                                </div>
                            )}

                            {isScanning && (
                                <div style={{ background: '#140000', border: '1px solid #3f0f0f', borderRadius: 12, padding: 64, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${hasKey ? '#dc2626' : '#ef4444'},transparent)`, boxShadow: `0 0 20px ${hasKey ? '#dc2626' : '#ef4444'}`, animation: 'scanLine 2s ease-in-out infinite' }} />
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: hasKey ? 'rgba(220,38,38,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${hasKey ? 'rgba(220,38,38,0.2)' : 'rgba(239,68,68,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'pulseGlow 2s ease-in-out infinite' }}>
                                            <i className={`fa-solid ${hasKey ? 'fa-robot' : 'fa-magnifying-glass-chart'}`} style={{ fontSize: 24, color: hasKey ? '#ef4444' : '#7f1d1d' }} />
                                        </div>
                                        <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
                                            {hasKey ? 'AI is Analyzing CV' : 'Analyzing CV'}
                                        </p>
                                        <p style={{ fontSize: 14, color: '#94a3b8' }}>{scanPhase}</p>
                                    </div>
                                </div>
                            )}

                            {currentCV?.result && !isScanning && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {/* AI Summary (only in AI mode) */}
                                    {currentCV.result.aiSummary && (
                                        <div style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(239,68,68,0.05))', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(220,38,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className="fa-solid fa-robot" style={{ color: '#dc2626', fontSize: 14 }} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#dc2626', marginBottom: 6 }}>AI Assessment</p>
                                                <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>{currentCV.result.aiSummary}</p>
                                            </div>
                                        </div>
                                    )}
                                    <TopMatchCard result={currentCV.result} />
                                    <InfoGrid result={currentCV.result} />
                                    <SkillsTags result={currentCV.result} />
                                    <AllPositionsRanked results={currentCV.result.results} />
                                    <SkillBreakdown result={currentCV.result} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes scanLine { 0%{top:0;opacity:1} 50%{opacity:.6} 100%{top:100%;opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes barGrow { from{width:0} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 20px rgba(239,68,68,.1)} 50%{box-shadow:0 0 40px rgba(239,68,68,.25)} }
        @keyframes tagPop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        .bar-grow { animation: barGrow .8s ease-out forwards; }
        .tag-pop { animation: tagPop .25s ease-out forwards; opacity: 0; }
        @media(max-width:900px) { .cv-dash-grid { grid-template-columns: 1fr !important; } }
      `}</style>
        </div>
    );
}

/* ================================================================
   SUB-COMPONENTS (unchanged from before)
   ================================================================ */
function ScoreRing({ score }: { score: number }) {
    const r = 48; const C = 2 * Math.PI * r; const offset = C - (C * score / 100);
    const color = score >= 40 ? '#ef4444' : score >= 25 ? '#f59e0b' : '#ef4444';
    const label = score >= 40 ? 'Strong Match' : score >= 25 ? 'Moderate Match' : 'Weak Match';
    return (
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="#2c0b0b" strokeWidth="8" />
                <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 700, color }}>{Math.round(score)}%</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: '#475569' }}>{label}</span>
            </div>
        </div>
    );
}

function TopMatchCard({ result }: { result: ScanResult }) {
    const top = result.results[0];
    return (
        <div style={{ background: 'linear-gradient(135deg,#ef4444,#991b1b)', padding: 2, borderRadius: 16 }}>
            <div style={{ background: '#140000', borderRadius: 14, padding: 28, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
                <ScoreRing score={top.score} />
                <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#475569', marginBottom: 4 }}>Best Fit Position</p>
                    <h2 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <i className={`fa-solid ${top.icon}`} style={{ color: top.color }} />
                        {top.title}
                    </h2>
                    <p style={{ fontSize: 14, color: '#94a3b8' }}>
                        {top.matchedSkills.length} relevant skills detected &middot;{' '}
                        {result.experience ? `~${result.experience} years experience` : 'Experience not clearly stated'}
                        {result.education.length ? ` \u00b7 ${result.education[0]}` : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}

function InfoGrid({ result }: { result: ScanResult }) {
    const c = result.contact;
    const cardStyle: React.CSSProperties = { background: '#140000', border: '1px solid #3f0f0f', borderRadius: 12, padding: 20 };
    const headingStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#475569', marginBottom: 12 };
    const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginBottom: 6 };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
            {/* Contact */}
            <div style={cardStyle}>
                <h4 style={headingStyle}><i className="fa-solid fa-address-card" style={{ color: '#ef4444', marginRight: 6 }} />Contact Info</h4>
                {c.email && <div style={rowStyle}><i className="fa-solid fa-envelope" style={{ fontSize: 11, color: '#475569' }} />{c.email}</div>}
                {c.phone && <div style={rowStyle}><i className="fa-solid fa-phone" style={{ fontSize: 11, color: '#475569' }} />{c.phone}</div>}
                {c.linkedin && <div style={rowStyle}><i className="fa-brands fa-linkedin" style={{ fontSize: 11, color: '#991b1b' }} />{c.linkedin}</div>}
                {c.github && <div style={rowStyle}><i className="fa-brands fa-github" style={{ fontSize: 11, color: '#475569' }} />{c.github}</div>}
                {!Object.keys(c).length && <span style={{ fontSize: 13, color: '#475569' }}>No contact info detected</span>}
            </div>
            {/* Experience */}
            <div style={cardStyle}>
                <h4 style={headingStyle}><i className="fa-solid fa-briefcase" style={{ color: '#f59e0b', marginRight: 6 }} />Experience</h4>
                {result.experience
                    ? <p><span style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{result.experience}</span><span style={{ fontSize: 14, color: '#94a3b8' }}> years</span></p>
                    : <span style={{ fontSize: 13, color: '#475569' }}>Not explicitly stated</span>}
            </div>
            {/* Education */}
            <div style={cardStyle}>
                <h4 style={headingStyle}><i className="fa-solid fa-graduation-cap" style={{ color: '#a78bfa', marginRight: 6 }} />Education</h4>
                {result.education.length ? result.education.map((e, i) => (
                    <div key={i} style={rowStyle}><i className="fa-solid fa-check" style={{ fontSize: 10, color: '#a78bfa' }} />{e}</div>
                )) : <span style={{ fontSize: 13, color: '#475569' }}>No degrees detected</span>}
            </div>
            {/* Quick Stats */}
            <div style={cardStyle}>
                <h4 style={headingStyle}><i className="fa-solid fa-chart-pie" style={{ color: '#ef4444', marginRight: 6 }} />Quick Stats</h4>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                    <div style={{ marginBottom: 6 }}><span style={{ fontWeight: 600, color: '#e2e8f0' }}>{result.allSkills.length}</span> skills detected</div>
                    <div style={{ marginBottom: 6 }}><span style={{ fontWeight: 600, color: '#e2e8f0' }}>{result.textLength}</span> characters extracted</div>
                    <div><span style={{ fontWeight: 600, color: '#e2e8f0' }}>{result.results.filter(p => p.score > 10).length}</span> positions scored &gt;10%</div>
                </div>
            </div>
        </div>
    );
}

function SkillsTags({ result }: { result: ScanResult }) {
    if (!result.allSkills.length) return null;
    return (
        <div style={{ background: '#140000', border: '1px solid #3f0f0f', borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#475569', marginBottom: 12 }}>
                <i className="fa-solid fa-tags" style={{ color: '#ef4444', marginRight: 6 }} />Detected Skills
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.allSkills.map((skill, i) => {
                    const cat = POSITIONS.find(p => KEYWORDS_DB[p.id]?.[skill]);
                    const color = cat ? cat.color : '#475569';
                    return <span key={i} className="tag-pop" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: color + '15', color, border: `1px solid ${color}30`, animationDelay: `${i * 30}ms` }}>{skill}</span>;
                })}
            </div>
        </div>
    );
}

function AllPositionsRanked({ results }: { results: ScoredPosition[] }) {
    return (
        <div style={{ background: '#140000', border: '1px solid #3f0f0f', borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#475569', marginBottom: 16 }}>
                <i className="fa-solid fa-ranking-star" style={{ color: '#f59e0b', marginRight: 6 }} />All Positions Ranked
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map((pos, i) => {
                    const s = Math.round(pos.score);
                    const barColor = s >= 40 ? '#ef4444' : s >= 25 ? '#f59e0b' : s >= 10 ? '#991b1b' : '#475569';
                    return (
                        <div key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: i === 0 ? 1 : 0.75 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, width: 20, textAlign: 'right', color: i === 0 ? '#ef4444' : '#475569' }}>{i + 1}</span>
                            <i className={`fa-solid ${pos.icon}`} style={{ color: pos.color, fontSize: 13, width: 20, textAlign: 'center' }} />
                            <span style={{ fontSize: 13, fontWeight: 500, flexShrink: 0, width: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pos.title}</span>
                            <div style={{ flex: 1, background: '#3f0f0f', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                                <div className="bar-grow" style={{ width: `${s}%`, height: '100%', borderRadius: 6, background: barColor, animationDelay: `${i * 80}ms` }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, width: 40, textAlign: 'right', color: barColor }}>{s}%</span>
                            <span style={{ fontSize: 10, width: 60, textAlign: 'right', color: '#475569' }}>{pos.matchedSkills.length} skills</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SkillBreakdown({ result }: { result: ScanResult }) {
    const top = result.results[0];
    if (!top.matchedSkills.length) return null;
    const sorted = [...top.matchedSkills].sort((a, b) => b.weight - a.weight);
    const labelOf = (w: number) => w >= 5 ? 'Critical' : w >= 4 ? 'Important' : w >= 3 ? 'Relevant' : 'Bonus';
    const colorOf = (w: number) => w >= 5 ? '#ef4444' : w >= 4 ? '#f59e0b' : w >= 3 ? '#ef4444' : '#475569';
    return (
        <div style={{ background: '#140000', border: '1px solid #3f0f0f', borderRadius: 12, padding: 20 }}>
            <h4 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#475569', marginBottom: 12 }}>
                <i className="fa-solid fa-microscope" style={{ color: top.color, marginRight: 6 }} />Why {top.title}? — Skill Breakdown
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {sorted.map((ms, i) => (
                    <span key={i} className="tag-pop" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, fontSize: 12, background: '#3f0f0f', border: '1px solid #3f0f0f', animationDelay: `${i * 40}ms` }}>
                        <span style={{ color: top.color }}>{ms.skill}</span>
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: colorOf(ms.weight) + '18', color: colorOf(ms.weight) }}>{labelOf(ms.weight)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}