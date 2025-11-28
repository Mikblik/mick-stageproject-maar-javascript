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


function baselinemodel(patientenLijst) {

    const baselineGeheugen = {};

    for (const waarde of patientenLijst) {
        const visitNummer = Number(waarde.visit);
        // random Placeholder waardes Dus nog veranderen later
        if (visitNummer === 1) {            
            const resultatenbaseline = {
                TR1: (Number(waarde.TJC) * 0.777) + (Number(waarde.SJC) * -1.032),
                TR2: (Number(waarde.TJC) * 0.595) + (Number(waarde.SJC) * -0.699),
                TR3: (Number(waarde.TJC) * 0.597) + (Number(waarde.SJC) * -0.808),
                TR4: (Number(waarde.TJC) * 0.619) + (Number(waarde.SJC) * -0.359),
            };

            const [hoogsteID, hoogsteWaarde] = Object.entries(resultatenbaseline).reduce((max, current) => current[1] > max[1] ? current : max);
            baselineGeheugen[waarde.patient_id] = hoogsteID;  
            console.log(`Baseline gevonden voor ${waarde.patient_id}: ${hoogsteID}`);
        }
    }

    for (const waarde of patientenLijst) {
        const patientID = waarde.patient_id;
        if (baselineGeheugen[patientID]) {
            waarde.ziektetraject = baselineGeheugen[patientID];
        } else {
            waarde.ziektetraject = "Onbekend (Geen Baseline)";
            console.warn(`Let op: Patiënt ${patientID} heeft geen Visite 1 in de data.`);
        }
    }
}