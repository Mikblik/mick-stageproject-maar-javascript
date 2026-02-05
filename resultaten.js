/*
 * ============================================================================
 * BESTAND: resultaten.js
 * BESCHRIJVING: 
 * Dit script beheert de 'resultaten.html' pagina. Het haalt data op uit de
 * sessie(data dat is geupload in app.js), draait de voorspellende modellen, en roept de juiste
 * grafieken op (individu of alle patiënt pagina).
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    // ========================================================================
    // DATA INITIALISATIE & VALIDATIE
    // ========================================================================

    // Haal de ruwe data string op uit de browser opslag.
    const dataString = sessionStorage.getItem('patient_data_json');

    // Validatie: Als er geen data is, stuur direct terug naar homepage.
    if (!dataString) {
        console.error("Geen data gevonden! Terugsturen naar home.");
        window.location.href = 'index.html'; 
        return; 
    }

    //  zet DataString om naar een bruikbaar object (parsen).
    const patientenLijst = JSON.parse(dataString);
    console.log("Data succesvol geladen uit sessionStorage:", patientenLijst);

    // ========================================================================
    // Sla alle elementen in een keer op.
    // ========================================================================

    // navigatie (header)
    const navHomeKnop = document.getElementById('nav-home');
    const navPatientKnop = document.getElementById('nav-patient');
    const navAllPatientsKnop = document.getElementById('nav-all-patients');

    // views (deze zijn om de juiste pagina te laten zien (individu of alle patient))
    const individueleView = document.getElementById('individuele-view');
    const allePatientenView = document.getElementById('alle-patienten-view');

    // interactie voor individu pagina.
    const patientinputveld = document.getElementById("DePatiënt");
    const patkiezenknop = document.getElementById('verstuurKnop');

    // dropdowns voor individu pagina
    const selectLijn1 = document.getElementById('select-lijn-1');
    const selectLijn2 = document.getElementById('select-lijn-2');
    const selectKansVisite = document.getElementById('select-kans-visite');
    const selectKansType = document.getElementById('select-kans-type');

    // dropdowns voor alle patiënt pagina.
    const selectTrendFeat1 = document.getElementById('select-trend-feat1');
    const selectTrendFeat2 = document.getElementById('select-trend-feat2');

    // modal (Dit is de opgeslagen info voor de I knop.)
    const modal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeButton = document.getElementById('modal-close-button');
    const allInfoButtons = document.querySelectorAll('.info-button');

    // KIJKT HOEVEEL DATA JE HEBT 1 patient of meerdere?? en opent de juiste start pagina>!>!
    // DIT STUK MOET NOG AANGEPAST WORDEN! (BUGGED) ============+!+!++!+!+!++!+!+======
    if (patientenLijst.length === 1) {
        individueleView.classList.remove('hidden');
    } else {
        allePatientenView.classList.remove('hidden');
        
    }

    // ========================================================================
    // MODEL UITVOERING:
    // Hier worden alle modellen aangeroepen, de modellen zelf staan
    // in het bestand "modellen.js".
    // ========================================================================

    // Dit model voegt een ziektestadium toe aan elke visite.
    ziektestadiamodel(patientenLijst)

    // Deze functie telt hoeveel visites elke patiënt in totaal heeft.
    voegVisiteTellersToe(patientenLijst)

    // De gekozen traject strategie uit de sessie data (verkregen uit app.js) halen
    let modelVoorkeur = sessionStorage.getItem('model_voorkeur');
    console.log("gekozen model:", modelVoorkeur);

    // De juiste traject strategie model aanroepen.
    if (modelVoorkeur == "baseline"){
        console.log("baseline model word gebruikt.")
        baselinemodel(patientenLijst);
    } else if (modelVoorkeur == "traject"){
        console.log("DTW / KNN pipeline word gebruikt.")
        pipeline_DTW_KNN(patientenLijst);
    } else {
        console.log("combo van Baseline en DTW / KNN pipeline word gebruikt.")
        //resultaat_traject = combowombotraject(patientenLijst);
    }

    console.log("geupdate patientenlijst MET TRAJECT/STADIA", patientenLijst)


//--------------------------------------------------------------------- tot hier goede doc gedaan

    patkiezenknop.addEventListener('click', () => {
        const gekozenpatient = patientinputveld.value.trim();
        gekozenpatientlijst = patientenLijst.filter(p => p.patient_id.trim() === gekozenpatient);
        
        console.log("Patient gekozen:", gekozenpatient);

        if (gekozenpatientlijst.length > 0) {
            
            //  TEKEN COMBO GRAFIEK 
            maakFlexibeleComboGrafiek(
                gekozenpatientlijst, 
                selectLijn1.value, 
                selectLijn2.value
            );

            //  VUL DE VISITE DROPDOWN 
            vulVisiteDropdown(gekozenpatientlijst);
            selectKansType.value = "Stadium"; 
            maakKansenGrafiek(gekozenpatientlijst, selectKansVisite.value, "Stadium");

            maakApexHeatmap(gekozenpatientlijst);

            maakTrajectHeatmap(gekozenpatientlijst);

            vulBurenTabel(gekozenpatientlijst);

            vulPatientSpecifiekeLegenda(gekozenpatientlijst);

            }
    });

    // Als visite verandert (staafdiagram (individupagina))
    selectKansVisite.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakKansenGrafiek(
                gekozenpatientlijst, 
                selectKansVisite.value, 
                selectKansType.value
            );
            maakApexHeatmap(gekozenpatientlijst);
        }
    });

    // Als type verandert (Stadium vs Traject(staafdiagram individupagina))
    selectKansType.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakKansenGrafiek(
                gekozenpatientlijst, 
                selectKansVisite.value, 
                selectKansType.value
            );
        }
    });

    // vult de visite dropdown met visites (staafdiagram (individupagina))
    function vulVisiteDropdown(data) {
        // Maak dropdown leeg
        selectKansVisite.innerHTML = "";
        
        data.sort((a, b) => a.visit - b.visit);

        data.forEach(rij => {
            const optie = document.createElement("option");
            optie.value = rij.visit;
            optie.text = `Visite ${rij.visit}`;
            selectKansVisite.appendChild(optie);
        });

        if (data.length > 0) {
            selectKansVisite.value = data[0].visit; 
        }
    }
    selectLijn1.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakFlexibeleComboGrafiek(
                gekozenpatientlijst, 
                selectLijn1.value, 
                selectLijn2.value
            );
        }
    });

    selectLijn2.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakFlexibeleComboGrafiek(
                gekozenpatientlijst, 
                selectLijn1.value, 
                selectLijn2.value
            );
        }
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
    
    // ALLE PATIENT FIGUREN HIERONDER


    const trajectGemiddeldes = berekenGemiddeldesPerTraject(patientenLijst);

    // Functie om grafiek te updaten
    function updateTrendGrafiek() {
        maakTrajectTrendGrafiek(
            trajectGemiddeldes, 
            selectTrendFeat1.value, 
            selectTrendFeat2.value
        );
    }

    // Event listeners toevoegen
    if(selectTrendFeat1 && selectTrendFeat2) {
        selectTrendFeat1.addEventListener('change', updateTrendGrafiek);
        selectTrendFeat2.addEventListener('change', updateTrendGrafiek);

        // Initiële grafiek tekenen (Default: TJC, SJC)
        updateTrendGrafiek();
    }

    if (patientenLijst.length > 1) {
        console.log("Meerdere patiënten gevonden, PCA Scatter tekenen...");
        maakPopulatieScatter(patientenLijst);
    }


});