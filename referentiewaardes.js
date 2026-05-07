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

// placeholder later veranderen
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

// GEM WAARDES TRAJECT PLACEHOLDER
const REF_TRAJECT_BASELINE = {
    "TR1": { 
        TJC: 2.5, SJC: 1.5, ESR: 10.0, Leukocytes: 5.5, HB: 8.5, Thrombocytes: 240 
    },
    "TR2": { 
        TJC: 5.0, SJC: 3.0, ESR: 18.0, Leukocytes: 6.5, HB: 8.0, Thrombocytes: 260 
    },
    "TR3": { 
        TJC: 8.5, SJC: 6.0, ESR: 30.0, Leukocytes: 8.0, HB: 7.0, Thrombocytes: 300 
    },
    "TR4": { 
        TJC: 14.0, SJC: 11.0, ESR: 45.0, Leukocytes: 9.0, HB: 6.0, Thrombocytes: 380 
    }
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

// ========================================================================
// DUMMY DATA: Meerdere referentiepatiënten per traject (voor PCA Clustering)
// ========================================================================
const REF_TRAJECT_POPULATIE = {
    "TR1": [
        { "TJC": 2, "SJC": 1, "ESR": 15, "Leukocytes": 6.5, "HB": 8.5, "Thrombocytes": 250 },
        { "TJC": 3, "SJC": 1, "ESR": 14, "Leukocytes": 6.2, "HB": 8.7, "Thrombocytes": 240 },
        { "TJC": 1, "SJC": 2, "ESR": 16, "Leukocytes": 6.8, "HB": 8.3, "Thrombocytes": 260 },
        { "TJC": 2, "SJC": 0, "ESR": 12, "Leukocytes": 6.0, "HB": 8.9, "Thrombocytes": 230 },
        { "TJC": 3, "SJC": 2, "ESR": 18, "Leukocytes": 7.0, "HB": 8.1, "Thrombocytes": 270 }
    ],
    "TR2": [
        { "TJC": 5, "SJC": 4, "ESR": 25, "Leukocytes": 7.5, "HB": 8.0, "Thrombocytes": 300 },
        { "TJC": 6, "SJC": 3, "ESR": 22, "Leukocytes": 7.2, "HB": 8.2, "Thrombocytes": 290 },
        { "TJC": 4, "SJC": 5, "ESR": 28, "Leukocytes": 7.8, "HB": 7.8, "Thrombocytes": 310 },
        { "TJC": 5, "SJC": 5, "ESR": 26, "Leukocytes": 7.6, "HB": 7.9, "Thrombocytes": 305 },
        { "TJC": 7, "SJC": 4, "ESR": 24, "Leukocytes": 7.4, "HB": 8.1, "Thrombocytes": 295 }
    ],
    "TR3": [
        { "TJC": 8, "SJC": 7, "ESR": 40, "Leukocytes": 8.5, "HB": 7.5, "Thrombocytes": 350 },
        { "TJC": 9, "SJC": 6, "ESR": 38, "Leukocytes": 8.2, "HB": 7.7, "Thrombocytes": 340 },
        { "TJC": 7, "SJC": 8, "ESR": 43, "Leukocytes": 8.8, "HB": 7.3, "Thrombocytes": 360 },
        { "TJC": 8, "SJC": 8, "ESR": 41, "Leukocytes": 8.6, "HB": 7.4, "Thrombocytes": 355 },
        { "TJC": 10, "SJC": 7, "ESR": 39, "Leukocytes": 8.4, "HB": 7.6, "Thrombocytes": 345 }
    ],
    "TR4": [
        { "TJC": 12, "SJC": 10, "ESR": 60, "Leukocytes": 10.0, "HB": 7.0, "Thrombocytes": 450 },
        { "TJC": 13, "SJC": 9,  "ESR": 58, "Leukocytes": 9.8,  "HB": 7.2, "Thrombocytes": 440 },
        { "TJC": 11, "SJC": 11, "ESR": 63, "Leukocytes": 10.3, "HB": 6.8, "Thrombocytes": 460 },
        { "TJC": 12, "SJC": 11, "ESR": 61, "Leukocytes": 10.1, "HB": 6.9, "Thrombocytes": 455 },
        { "TJC": 14, "SJC": 10, "ESR": 59, "Leukocytes": 9.9,  "HB": 7.1, "Thrombocytes": 445 }
    ]
};