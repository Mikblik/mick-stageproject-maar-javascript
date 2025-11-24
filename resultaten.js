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
    let gekozenpatientlijst = [];
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