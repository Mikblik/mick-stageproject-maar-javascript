// Gemiddelde klinische waarden per ziektestadia
const REF_GEM_PER_STADIA = {
    "L1": { TJC: 0.81, SJC: 0.35, ESR: 8.00, Leukocytes: 6.19, HB: 8.63, Thrombocytes: 244.32 },
    "L2": { TJC: 1.33, SJC: 0.77, ESR: 34.35, Leukocytes: 7.76, HB: 8.06, Thrombocytes: 288.78 },
    "L3": { TJC: 1.48, SJC: 0.89, ESR: 13.55, Leukocytes: 11.05, HB: 8.47, Thrombocytes: 307.02 },
    "L4": { TJC: 5.57, SJC: 2.91, ESR: 10.28, Leukocytes: 7.32, HB: 8.59, Thrombocytes: 261.80 },
    "L5": { TJC: 4.83, SJC: 4.08, ESR: 35.16, Leukocytes: 8.57, HB: 8.01, Thrombocytes: 315.19 },
    "L6": { TJC: 4.42, SJC: 4.10, ESR: 80.79, Leukocytes: 9.81, HB: 7.08, Thrombocytes: 390.74 },
    "L7": { TJC: 11.82, SJC: 10.83, ESR: 32.11, Leukocytes: 8.85, HB: 7.85, Thrombocytes: 319.96 },
    "L8": { TJC: 3.00, SJC: 2.28, ESR: 19.12, Leukocytes: 3.83, HB: 4.21, Thrombocytes: 267.67 }
};

// placeholder later veranderen // dit was nodig voor de KNN pipeline
const REFERENTIE_BIBLIOTHEEK = [
    { id: "ref_001", traject: "TR1", sequentie: ["L1", "L1", "L1"] },
    { id: "ref_002", traject: "TR1", sequentie: ["L2", "L1", "L1", "L1"] },
    { id: "ref_003", traject: "TR1", sequentie: ["L2", "L2", "L1"] },
    
    { id: "ref_004", traject: "TR2", sequentie: ["L2", "L3", "L2", "L2"] },
    { id: "ref_005", traject: "TR2", sequentie: ["L4", "L3", "L2"] },
    
    { id: "ref_006", traject: "TR3", sequentie: ["L4", "L5", "L5", "L6"] },
    { id: "ref_007", traject: "TR3", sequentie: ["L3", "L4", "L5"] },

    { id: "ref_008", traject: "TR4", sequentie: ["L6", "L7", "L8", "L8"] },
    { id: "ref_009", traject: "TR4", sequentie: ["L5", "L6", "L7"] },
    { id: "ref_010", traject: "TR4", sequentie: ["L7", "L8", "L7", "L8"] }
];

// gemiddelde waarden per ziektetraject
const REF_TRAJECT_BASELINE = {
    // Traject A
    "TR1": { TJC: 3.71, SJC: 2.96, ESR: 43.89, Leukocytes: 8.29, HB: 7.77, Thrombocytes: 313.65 },
    
    // Traject B
    "TR2": { TJC: 2.86, SJC: 1.96, ESR: 12.31, Leukocytes: 6.60, HB: 8.52, Thrombocytes: 254.82 },
    
    // Traject C
    "TR3": { TJC: 3.34, SJC: 2.45, ESR: 20.75, Leukocytes: 10.22, HB: 8.29, Thrombocytes: 317.43 },
    
    // Traject D
    "TR4": { TJC: 7.26, SJC: 5.58, ESR: 21.18, Leukocytes: 8.13, HB: 8.10, Thrombocytes: 292.88 }
};

const UITLEG_STADIA = {
    "L1": "Remission: Near zero SJC/TJC, lowest ESR, and normal leukocytes/HB. Common in later visits.",
    "L2": "Mild systemic inflammation: Low SJC/TJC, elevated ESR, and slightly increased leukocytes/thrombocytes. Mostly occurs after 200 days.",
    "L3": "Leukocytosis: High leukocytes (>10) with low joint inflammation. Most frequent 1 year post-baseline.",
    "L4": "Local joint inflammation: High SJC/TJC, but without elevated ESR. Occurs early and after 1 year.",
    "L5": "Elevated ESR: Moderate SJC/TJC with raised ESR. Common at baseline.",
    "L6": "Strongly elevated ESR: Moderate SJC/TJC with highly elevated ESR. Similar to L5, but more severe.",
    "L7": "Severe local inflammation: Highest SJC/TJC combined with elevated ESR. Common at baseline.",
    "L8": "Early disease state: Low SJC/TJC and low HB. Exclusively occurs at baseline."
};

const UITLEG_TRAJECTEN = {
    "TR1": "Systemic inflammation: Characterized by elevated ESR. Patients are predominantly older and female.",
    "TR2": "Best prognosis: Starts with joint inflammation but quickly leads toward full remission.",
    "TR3": "Elevated leukocytes: Initially resembles TR2, but fails to reach remission.",
    "TR4": "Persistent joint inflammation: High SJC/TJC without rapid improvement. Patients often remain stuck in stage L4 (normal ESR)."
};

const REF_GRAPH_PER_TRAJECT = {
    "TR1": {
        nodes: {
            "L1": 150, "L2": 120, "L3": 80, "L4": 110,
            "L5": 90,  "L6": 50,  "L7": 70, "L8": 40
        },
        edges: [
            { from: "L1", to: "L2", gewicht: 100 },
            { from: "L1", to: "L3", gewicht: 50 },  
            { from: "L2", to: "L4", gewicht: 80 },
            { from: "L3", to: "L4", gewicht: 40 },
            { from: "L3", to: "L5", gewicht: 60 },
            { from: "L4", to: "L5", gewicht: 90 },
            { from: "L4", to: "L6", gewicht: 30 }, 
            { from: "L5", to: "L7", gewicht: 70 },
            { from: "L6", to: "L7", gewicht: 40 },
            { from: "L7", to: "L8", gewicht: 60 },
            { from: "L2", to: "L5", gewicht: 20 }  
        ]
    },
    "TR2": {
        nodes: { "L1": 40, "L2": 100, "L3": 80, "L4": 60, "L5": 30 },
        edges: [ { from: "L1", to: "L2", gewicht: 30 }, { from: "L2", to: "L3", gewicht: 70 }, { from: "L3", to: "L4", gewicht: 50 }, { from: "L4", to: "L5", gewicht: 20 } ]
    },
    "TR3": {
        nodes: { "L4": 50, "L5": 100, "L6": 70, "L7": 80, "L8": 40 },
        edges: [ { from: "L4", to: "L5", gewicht: 60 }, { from: "L5", to: "L6", gewicht: 40 }, { from: "L6", to: "L7", gewicht: 50 }, { from: "L7", to: "L8", gewicht: 30 } ]
    },
    "TR4": {
        nodes: { "L5": 40, "L6": 30, "L7": 120, "L8": 150 },
        edges: [ { from: "L5", to: "L7", gewicht: 40 }, { from: "L6", to: "L7", gewicht: 20 }, { from: "L7", to: "L8", gewicht: 110 } ]
    }
};

