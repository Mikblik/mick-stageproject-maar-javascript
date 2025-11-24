// Wacht tot de HTML (DOM) helemaal geladen is
document.addEventListener('DOMContentLoaded', () => {

    const dataString = sessionStorage.getItem('patient_data_json');
    if (!dataString) {
        console.error("Geen data gevonden! Terugsturen naar home.");
        window.location.href = 'index.html'; 
        return; 
    }
    //  PARSEN: Zet de data terug van tekst naar een bruikbaar object/array
    //  (sessionStorage slaat alles op als tekst)
    const patientenLijst = JSON.parse(dataString);
    console.log("Data succesvol geladen uit sessionStorage:", patientenLijst);

    const navHomeKnop = document.getElementById('nav-home');
    const navPatientKnop = document.getElementById('nav-patient');
    const navAllPatientsKnop = document.getElementById('nav-all-patients');

    // info knop info
    const modal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeButton = document.getElementById('modal-close-button');

    //    querySelectorAll pakt alle elementen met de class ".info-button"
    const allInfoButtons = document.querySelectorAll('.info-button');

    const individueleView = document.getElementById('individuele-view');
    const allePatientenView = document.getElementById('alle-patienten-view');

    // INDIVIDU 1 Unieke patient kiezen invul+knop
    const patientinputveld = document.getElementById("DePatiënt");
    const patkiezenknop = document.getElementById('verstuurKnop');

    const featureselected = document.getElementById('feature-select')

    // KIJKT HOEVEEL DATA JE HEBT 1 patient of meerdere?? en opent de juiste start pagina>!>!
    if (patientenLijst.length === 1) {
        individueleView.classList.remove('hidden');
    } else {
        allePatientenView.classList.remove('hidden');
    }


    /*
    Voordat je zelf inputs kan geven door te klikken op knoppen moeten eerst hierzo de
    modellen geladen/uitgevoerd worden.!
    */
   // MODEL 1 ZIEKTESTADIUM TOEWIJZEN
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

//---------------------------------------------------------MODEL 2 HIER DUS
    // START BASELINE PREDICTIE MODEL 2 #NU NOG PLACEHOLDER WAARDES LET OP!
    const resultatenbaseline = {
        TR1: (Number(waarde.TJC) * 0.777) + (Number(waarde.SJC) * -1.032),

        TR2: (Number(waarde.TJC) * 0.595) + (Number(waarde.SJC) * -0.699),

        TR3: (Number(waarde.TJC) * 0.597) + (Number(waarde.SJC) * -0.808),

        TR4: (Number(waarde.TJC) * 0.619) + (Number(waarde.SJC) * -0.359),
    };

    console.log("DIT IS RESULTATENBASELINE OUTPUT:", resultatenbaseline)

    const [hoogsteIDBASE, hoogsteWaardeBASE] = Object.entries(resultatenbaseline).reduce((max, current) => current[1] > max[1] ? current : max);

    console.log(`De winnaar is ${hoogsteIDBASE} met score ${hoogsteWaardeBASE}`);

    waarde.ziektetraject = hoogsteIDBASE;
}
// FILTER DE GEKOZEN PATIENT EN ROEP GRAFIEK / TABEL FUNCTIES AAN :D
console.log("HIERZO", patientenLijst)


    let gekozenpatientlijst = [];
    // LUISTER NAAR KLIKKEN

    // DE KNOP VOOR INDIVIDU PATIENT VERSTUREN
    patkiezenknop.addEventListener('click', () => {
        const gekozenpatient = patientinputveld.value.trim();
        gekozenpatientlijst = patientenLijst.filter(p => p.patient_id.trim() === gekozenpatient);
        console.log("Dit is de gekozen patient:" + gekozenpatient);
        console.log(gekozenpatientlijst)

        maakTijdlijnGrafiek(gekozenpatientlijst);
        maakfeaturetijdlijn(gekozenpatientlijst, featureselected.value);
    });

    featureselected.addEventListener('change', () => {
        console.log("gekozen feature:" + featureselected.value)
        maakfeaturetijdlijn(gekozenpatientlijst, featureselected.value);
    });

    navHomeKnop.addEventListener('click', (event) => {
        window.location.href = 'index.html';
    });

    navPatientKnop.addEventListener('click', (event) => {
        event.preventDefault(); 
        
        console.log("Schakel naar Individuele View");

        individueleView.classList.remove('hidden');
        allePatientenView.classList.add('hidden');
        
    });

    navAllPatientsKnop.addEventListener('click', (event) => {
        event.preventDefault();

        console.log("Schakel naar Alle Patiënten View");

        individueleView.classList.add('hidden');
        allePatientenView.classList.remove('hidden');
    });

    function openModal(title, description) {
        modalTitle.innerText = title;
        modalContent.innerText = description;
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    allInfoButtons.forEach(button => {
        
        button.addEventListener('click', () => {
            const title = button.dataset.title;
            const description = button.dataset.description;
            
            openModal(title, description);
        });
        
    });

    closeButton.addEventListener('click', closeModal);

    // OM MODAL TE SLUITEN ALS JE BUITEN HET INHOUDSGEDEELTE KLIKT DUS EROMHEEN
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

});