// Hier worden alle model functies gedaan!

function ziektestadiamodel(patientenLijst){
    for (const waarde of patientenLijst) {
        const resultaten = {
            L1: (Number(waarde.TJC) * -0.777) + (Number(waarde.SJC) * -1.032) + (Number(waarde.ESR) * -0.209) + 
                (Number(waarde.Leukocytes) * -0.516) + (Number(waarde.HB) * 1.68) + (Number(waarde.Thrombocytes) * -0.004),

            L2: (Number(waarde.TJC) * -0.595) + (Number(waarde.SJC) * -0.699) + (Number(waarde.ESR) * 0.165) + 
                (Number(waarde.Leukocytes) * -0.096) + (Number(waarde.HB) * 0.329) + (Number(waarde.Thrombocytes) * -0.002),

            L3: (Number(waarde.TJC) * -0.569) + (Number(waarde.SJC) * -0.808) + (Number(waarde.ESR) * -0.203) + 
                (Number(waarde.Leukocytes) * 1.302) + (Number(waarde.HB) * -0.271) + (Number(waarde.Thrombocytes) * 0),

            L4: (Number(waarde.TJC) * 0.619) + (Number(waarde.SJC) * 0.359) + (Number(waarde.ESR) * -0.188) + 
                (Number(waarde.Leukocytes) * -0.204) + (Number(waarde.HB) * 0.858) + (Number(waarde.Thrombocytes) * -0.004),

            L5: (Number(waarde.TJC) * 0.296) + (Number(waarde.SJC) * 0.472) + (Number(waarde.ESR) * 0.087) + 
                (Number(waarde.Leukocytes) * 0.005) + (Number(waarde.HB) * -0.1) + (Number(waarde.Thrombocytes) * -0.001),

            L6: (Number(waarde.TJC) * -0.151) + (Number(waarde.SJC) * 0.025) + (Number(waarde.ESR) * 0.329) + 
                (Number(waarde.Leukocytes) * 0.052) + (Number(waarde.HB) * -1.364) + (Number(waarde.Thrombocytes) * 0.001),

            L7: (Number(waarde.TJC) * 0.89) + (Number(waarde.SJC) * 1.475) + (Number(waarde.ESR) * -0.042) + 
                (Number(waarde.Leukocytes) * 0.108) + (Number(waarde.HB) * -0.65) + (Number(waarde.Thrombocytes) * -0.01),

            L8: (Number(waarde.TJC) * 0.286) + (Number(waarde.SJC) * 0.208) + (Number(waarde.ESR) * 0.06) + 
                (Number(waarde.Leukocytes) * -0.65) + (Number(waarde.HB) * -0.481) + (Number(waarde.Thrombocytes) * 0.02)
        };

        const kansen = berekenSoftmax(resultaten);
        waarde.stadiumKansen = kansen; // { L1: 0.12, L2: 0.05 ... }

        // Hoogste bepalen
        const [hoogsteID, hoogsteWaarde] = Object.entries(resultaten).reduce((max, current) => current[1] > max[1] ? current : max);

        console.log(`De winnaar is ${hoogsteID} met score ${hoogsteWaarde}`);

        // 4. ziektestadium toevoegen aan de main dictionary :D
        waarde.ziektestadium = hoogsteID;
    }
};


function voegVisiteTellersToe(patientenLijst) {
    const tellers = {};

    patientenLijst.forEach(patient => {
        const id = patient.patient_id;
        if (tellers[id]) {
            tellers[id]++;
        } else {
            tellers[id] = 1;
        }
    });

    patientenLijst.forEach(patient => {
        const id = patient.patient_id;
        patient.aantalVisites = tellers[id];
    });

}

function berekenSoftmax(scores) {
    // 1. Bereken e^score voor alles
    // We trekken eerst de max eraf voor numerieke stabiliteit (voorkomt "Infinity" bij grote getallen)
    const values = Object.values(scores);
    const maxVal = Math.max(...values);
    
    const exponenten = {};
    let totaalSom = 0;

    for (const [key, val] of Object.entries(scores)) {
        const exp = Math.exp(val - maxVal);
        exponenten[key] = exp;
        totaalSom += exp;
    }

    // 2. Deel door totaal om percentage te krijgen (0.0 tot 1.0)
    const kansen = {};
    for (const [key, val] of Object.entries(exponenten)) {
        kansen[key] = val / totaalSom;
    }
    return kansen;
}

// In modellen.js

function berekenGemiddeldesPerTraject(patientenLijst) {
    console.log("--- Start berekenen gemiddelden per traject ---");
    
    const features = ['TJC', 'SJC', 'ESR', 'HB', 'Leukocytes', 'Thrombocytes'];
    const tempOpslag = {}; 

    ['TR1', 'TR2', 'TR3', 'TR4'].forEach(tr => {
        tempOpslag[tr] = {};
    });


    patientenLijst.forEach(p => {
        const traject = p.ziektetraject; 
        const visit = p.visit;
        
        if (traject && tempOpslag[traject]) {
            
            if (!tempOpslag[traject][visit]) {
                tempOpslag[traject][visit] = { count: 0 };
                features.forEach(f => tempOpslag[traject][visit][f] = 0);
            }

            tempOpslag[traject][visit].count += 1;
            features.forEach(f => {
                tempOpslag[traject][visit][f] += Number(p[f] || 0);
            });
        }
    });

    // Output structuur: { 'TR1': [ {visit: 1, TJC: 4.5...}, {visit: 2...} ], 'TR2': ... }
    const eindResultaat = {};

    for (const [tr, visits] of Object.entries(tempOpslag)) {
        eindResultaat[tr] = [];
        
        for (const [visiteNummer, data] of Object.entries(visits)) {
            const gemiddeldeRij = { visit: Number(visiteNummer) };
            
            features.forEach(f => {
                // Totaal delen door aantal patienten in die visite
                gemiddeldeRij[f] = data[f] / data.count;
            });
            
            eindResultaat[tr].push(gemiddeldeRij);
        }

        // Sorteer op visite (1, 2, 3..)
        eindResultaat[tr].sort((a, b) => a.visit - b.visit);
    }

    console.log("Gemiddeldes berekend:", eindResultaat);
    return eindResultaat;
}


function baselinemodel(patientenLijst) {
    console.log("--- Start Baseline Model ---");
    const baselineGeheugen = {};

    for (const waarde of patientenLijst) {
        
        const visitNummer = Number(waarde.visit); 
        
        if (visitNummer === 1) {            
            const resultaten = {
                TR1: (Number(waarde.TJC) * 0.777) + (Number(waarde.SJC) * -1.032),
                TR2: (Number(waarde.TJC) * 0.595) + (Number(waarde.SJC) * -0.699),
                TR3: (Number(waarde.TJC) * 0.597) + (Number(waarde.SJC) * -0.808),
                TR4: (Number(waarde.TJC) * 0.619) + (Number(waarde.SJC) * -0.359),
            };

            // 1. Kansen berekenen
            const kansen = berekenSoftmax(resultaten);
            
            // 2. Winnaar bepalen
            const [hoogsteID] = Object.entries(resultaten).reduce((max, current) => current[1] > max[1] ? current : max);
            
            // 3. Opslaan in geheugen als OBJECT
            baselineGeheugen[waarde.patient_id] = {
                traject: hoogsteID,
                kansen: kansen
            };
            console.log(`Baseline gevonden voor ${waarde.patient_id}: ${hoogsteID}`);
        }
    }

    for (const waarde of patientenLijst) {
        const geheugen = baselineGeheugen[waarde.patient_id]; 

        if (geheugen) {
            waarde.ziektetraject = geheugen.traject;     
            waarde.trajectKansen = geheugen.kansen;       
        } else {
            waarde.ziektetraject = "Onbekend (Geen Baseline)";
            waarde.trajectKansen = null;
        }
    }
    console.log("Baseline Model voltooid.");
}