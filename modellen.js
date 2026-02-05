// Hier worden alle model functies gedaan en hulp functies 

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
        waarde.stadiumKansen = kansen;

        // Hoogste bepalen
        const [hoogsteID, hoogsteWaarde] = Object.entries(resultaten).reduce((max, current) => current[1] > max[1] ? current : max);

        console.log(`De winnaar is ${hoogsteID} met score ${hoogsteWaarde}`);

        // ziektestadium toevoegen aan de main dictionary :D
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
    const values = Object.values(scores);
    const maxVal = Math.max(...values);
    
    const exponenten = {};
    let totaalSom = 0;

    for (const [key, val] of Object.entries(scores)) {
        const exp = Math.exp(val - maxVal);
        exponenten[key] = exp;
        totaalSom += exp;
    }

    const kansen = {};
    for (const [key, val] of Object.entries(exponenten)) {
        kansen[key] = val / totaalSom;
    }
    return kansen;
}


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

    const eindResultaat = {};

    for (const [tr, visits] of Object.entries(tempOpslag)) {
        eindResultaat[tr] = [];
        
        for (const [visiteNummer, data] of Object.entries(visits)) {
            const gemiddeldeRij = { visit: Number(visiteNummer) };
            
            features.forEach(f => {
                gemiddeldeRij[f] = data[f] / data.count;
            });
            
            eindResultaat[tr].push(gemiddeldeRij);
        }

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

            const kansen = berekenSoftmax(resultaten);
            
            const [hoogsteID] = Object.entries(resultaten).reduce((max, current) => current[1] > max[1] ? current : max);
            
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

// ------ DTW/KNN PIPELNE

function stadiumNaarGetal(stadiumCode) {
    if (!stadiumCode) return 0;
    return parseInt(stadiumCode.replace('L', '')) || 0;
}

function berekenDTWAfstand(seq1, seq2) {
    const n = seq1.length;
    const m = seq2.length;
    
    let dtw = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const val1 = stadiumNaarGetal(seq1[i - 1]);
            const val2 = stadiumNaarGetal(seq2[j - 1]);
            
            const cost = Math.abs(val1 - val2);
            
            dtw[i][j] = cost + Math.min(
                dtw[i - 1][j],     
                dtw[i][j - 1],     
                dtw[i - 1][j - 1]  
            );
        }
    }
    return dtw[n][m] / (n + m);
}


function pipeline_DTW_KNN(patientenLijst) {
    console.log("--- Start DTW/KNN Pipeline ---");

    const gesorteerd = [...patientenLijst].sort((a, b) => a.visit - b.visit);
    
    const patientSequentie = gesorteerd
        .map(p => p.ziektestadium)
        .filter(s => s !== undefined);

    if (patientSequentie.length === 0) {
        console.error("Geen ziektestadia gevonden voor deze patiënt!");
        return null;
    }

    console.log("Patiënt Sequentie:", patientSequentie);

    const scores = REFERENTIE_BIBLIOTHEEK.map(refPat => {
        const afstand = berekenDTWAfstand(patientSequentie, refPat.sequentie);
        return {
            id: refPat.id,
            traject: refPat.traject,
            sequentie: refPat.sequentie,
            afstand: afstand
        };
    });

    scores.sort((a, b) => a.afstand - b.afstand);

    const k = 5; 
    const buren = scores.slice(0, k);
    console.log(`Top ${k} buren:`, buren);

    const stemmen = {};
    buren.forEach(buur => {
        stemmen[buur.traject] = (stemmen[buur.traject] || 0) + 1;
    });

    let winnendTraject = null;
    let meesteStemmen = -1;

    Object.keys(stemmen).forEach(traject => {
        if (stemmen[traject] > meesteStemmen) {
            meesteStemmen = stemmen[traject];
            winnendTraject = traject;
        }
    });

    console.log("Voorspeld Traject (KNN):", winnendTraject);

    patientenLijst.forEach(p => {
        p.knn_voorspelling = winnendTraject;
        p.knn_buren = buren; 
        p.ziektetraject = winnendTraject;
    });

    return winnendTraject;
}