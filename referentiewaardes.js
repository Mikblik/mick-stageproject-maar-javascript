// Gemiddelde klinische waarden per ziektestadia HB moet aangepast worden!
const REF_GEM_PER_STADIA = {
    "L1": { 
        TJC: 0.51, SJC: 0.22, ESR: 5.14, 
        Leukocytes: 5.08, HB: 0.68, Thrombocytes: 229.84 
    },
    "L2": { 
        TJC: 0.75, SJC: 0.57, ESR: 19.72, 
        Leukocytes: 5.86, HB: 0.68, Thrombocytes: 289.94 
    },
    "L3": { 
        TJC: 1.92, SJC: 0.65, ESR: 8.40, 
        Leukocytes: 8.58, HB: 0.69, Thrombocytes: 262.25 
    },
    "L4": { 
        TJC: 3.62, SJC: 3.85, ESR: 11.85, 
        Leukocytes: 6.07, HB: 0.66, Thrombocytes: 250.64 
    },
    "L5": { 
        TJC: 1.90, SJC: 1.78, ESR: 35.59, 
        Leukocytes: 7.39, HB: 0.53, Thrombocytes: 325.18 
    },
    "L6": { 
        TJC: 8.32, SJC: 6.90, ESR: 46.57, 
        Leukocytes: 9.39, HB: 0.50, Thrombocytes: 383.54 
    },
    "L7": { 
        TJC: 15.97, SJC: 8.95, ESR: 22.59, 
        Leukocytes: 6.98, HB: 0.62, Thrombocytes: 278.63 
    },
    "L8": { 
        TJC: 8.31, SJC: 1.40, ESR: 19.98, 
        Leukocytes: 6.69, HB: 0.62, Thrombocytes: 303.34 
    }
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
    "L1": "uitleg",
    "L2": "uitleg",
    "L3": "uitleg",
    "L4": "uitleg",
    "L5": "uitleg",
    "L6": "uitleg",
    "L7": "uitleg",
    "L8": "uitleg"
};

const UITLEG_TRAJECTEN = {
    "TR1": "uitleg",
    "TR2": "uitleg",
    "TR3": "uitleg",
    "TR4": "uitleg"
};