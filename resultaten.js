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

    // vangt keuze voor trendlijnen individupagina
    const selectLijn1 = document.getElementById('select-lijn-1');
    const selectLijn2 = document.getElementById('select-lijn-2');

    //vangt keuze voor staafdiagram stadia/traject individupagina
    const selectKansVisite = document.getElementById('select-kans-visite');
    const selectKansType = document.getElementById('select-kans-type');

    // vangt waardes voor alle patient trendlijn figuur.
    const selectTrendTraject = document.getElementById('select-trend-traject');
    const selectTrendFeat1 = document.getElementById('select-trend-feat1');
    const selectTrendFeat2 = document.getElementById('select-trend-feat2');


    // KIJKT HOEVEEL DATA JE HEBT 1 patient of meerdere?? en opent de juiste start pagina>!>!
    if (patientenLijst.length === 1) {
        individueleView.classList.remove('hidden');
    } else {
        allePatientenView.classList.remove('hidden');
    }

//------------------------------------------------------------------------------
    /*
    Voordat je zelf inputs kan geven door te klikken op knoppen moeten eerst hierzo de
    modellen geladen/uitgevoerd worden.!
    */

    // MODEL 1 ZIEKTESTADIUM TOEWIJZEN
    ziektestadiamodel(patientenLijst)

    voegVisiteTellersToe(patientenLijst)

    // KIEZEN WELK MODEL/PIPELINE/BEIDE GERUND GAAT WORDEN
    let modelVoorkeur = sessionStorage.getItem('model_voorkeur');
    console.log("gekozen model:", modelVoorkeur);

    if (modelVoorkeur == "baseline"){
        console.log("baseline model word gebruikt.")
        baselinemodel(patientenLijst);
    } else if (modelVoorkeur == "traject"){
        console.log("DTW / KNN pipeline word gebruikt.")
        //resultaat_traject = pipeline_DTW_KNN(patientenLijst);
    } else {
        console.log("combo van Baseline en DTW / KNN pipeline word gebruikt.")
        //resultaat_traject = combowombotraject(patientenLijst);
    }

    console.log("geupdate patientenlijst MET TRAJECT/STADIA", patientenLijst)


//---------------------------------------------------------------------

    patkiezenknop.addEventListener('click', () => {
        const gekozenpatient = patientinputveld.value.trim();
        gekozenpatientlijst = patientenLijst.filter(p => p.patient_id.trim() === gekozenpatient);
        
        console.log("Patient gekozen:", gekozenpatient);

        if (gekozenpatientlijst.length > 0) {
            
            // A. TEKEN COMBO GRAFIEK 
            maakFlexibeleComboGrafiek(
                gekozenpatientlijst, 
                selectLijn1.value, 
                selectLijn2.value
            );

            // B. VUL DE VISITE DROPDOWN 
            vulVisiteDropdown(gekozenpatientlijst);
            selectKansType.value = "Stadium"; 
            // Trigger de tekenfunctie
            maakKansenGrafiek(gekozenpatientlijst, selectKansVisite.value, "Stadium");
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
        
        // Sorteer visites (1, 2, 3...)
        data.sort((a, b) => a.visit - b.visit);

        // Maak voor elke visite een <option>
        data.forEach(rij => {
            const optie = document.createElement("option");
            optie.value = rij.visit;
            optie.text = `Visite ${rij.visit}`;
            selectKansVisite.appendChild(optie);
        });

        // Selecteer standaard de EERSTE visite (of de laatste, wat je wilt)
        if (data.length > 0) {
            selectKansVisite.value = data[0].visit; 
        }
    }
    // 2. UPDATE BIJ DROPDOWN WIJZIGING trendlijn(LINKS)(trendlijn individupagina)
    selectLijn1.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakFlexibeleComboGrafiek(
                gekozenpatientlijst, 
                selectLijn1.value, 
                selectLijn2.value
            );
        }
    });

    // 3. UPDATE BIJ DROPDOWN WIJZIGING trendlijn(RECHTS)(trendlijn individupagina)
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
            selectTrendTraject.value, 
            selectTrendFeat1.value, 
            selectTrendFeat2.value
        );
    }

    // Event listeners toevoegen
    if(selectTrendTraject && selectTrendFeat1 && selectTrendFeat2) {
        selectTrendTraject.addEventListener('change', updateTrendGrafiek);
        selectTrendFeat1.addEventListener('change', updateTrendGrafiek);
        selectTrendFeat2.addEventListener('change', updateTrendGrafiek);

        // Initiële grafiek tekenen (Default: TR1, TJC, SJC)
        updateTrendGrafiek();
    }


});