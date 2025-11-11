// Wacht tot de HTML (DOM) helemaal geladen is
document.addEventListener('DOMContentLoaded', () => {

    const dataString = sessionStorage.getItem('patient_data_json');
    if (!dataString) {
        console.error("Geen data gevonden! Terugsturen naar home.");
        // Stuur de gebruiker terug naar de invoerpagina
        window.location.href = 'index.html'; 
        // Stop de rest van het script
        return; 
    }
    //  PARSEN: Zet de data terug van tekst naar een bruikbaar object/array
    //  (sessionStorage slaat alles op als tekst)
    const patientenLijst = JSON.parse(dataString);
    console.log("Data succesvol geladen uit sessionStorage:", patientenLijst);

    // De knoppen ("schakelaars")
    const navHomeKnop = document.getElementById('nav-home')
    const navPatientKnop = document.getElementById('nav-patient');
    const navAllPatientsKnop = document.getElementById('nav-all-patients');

    // info knop info
    const modal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeButton = document.getElementById('modal-close-button');
    //    querySelectorAll pakt alle elementen met de class ".info-button"
    const allInfoButtons = document.querySelectorAll('.info-button');

    // De content ("kamers")
    const individueleView = document.getElementById('individuele-view');
    const allePatientenView = document.getElementById('alle-patienten-view');

    // KIJKT HOEVEEL DATA JE HEBT 1 patient of meerdere?? en opent de juiste start pagina>!>!
    if (patientenLijst.length === 1) {
        // Er is maar 1 patiënt (van het individuele formulier)
        // Maak de individuele view ZICHTBAAR:
        individueleView.classList.remove('hidden');
    } else {
        // Er zijn meerdere patiënten (van de CSV)
        // Maak de "alle patiënten" view ZICHTBAAR:
        allePatientenView.classList.remove('hidden');
    }


    /*
    Voordat je zelf inputs kan geven door te klikken op knoppen moeten eerst hierzo de
    modellen geladen/uitgevoerd worden.!
    */

    // --- 2. LUISTER NAAR KLIKKEN ---

    navHomeKnop.addEventListener('click', (event) => {
        window.location.href = 'index.html';
    });

    // Wat te doen als iemand op "Toon Individuele View" klikt
    navPatientKnop.addEventListener('click', (event) => {
        // 'event.preventDefault()' stopt de '<a>' tag
        // van het proberen te herladen van de pagina.
        event.preventDefault(); 
        
        console.log("Schakel naar Individuele View");

        individueleView.classList.remove('hidden');
        allePatientenView.classList.add('hidden');
        
    });

    // Wat te doen als iemand op "Toon Alle Patiënten View" klikt
    navAllPatientsKnop.addEventListener('click', (event) => {
        event.preventDefault();

        console.log("Schakel naar Alle Patiënten View");

        individueleView.classList.add('hidden');
        allePatientenView.classList.remove('hidden');
    });

    function openModal(title, description) {
        // Vul de modal met de juiste tekst
        modalTitle.innerText = title;
        modalContent.innerText = description;
        // Maak de modal zichtbaar
        modal.classList.remove('hidden');
    }

    // 4. Maak een functie om de modal te sluiten
    function closeModal() {
        modal.classList.add('hidden');
    }

    // 5. Koppel de "open" functie aan ELKE info-knop
    allInfoButtons.forEach(button => {
        
        button.addEventListener('click', () => {
            // Haal de unieke data uit de 'data-' attributen van de knop
            const title = button.dataset.title;
            const description = button.dataset.description;
            
            // Open de modal met die specifieke info
            openModal(title, description);
        });
        
    });

    // 6. Koppel de "sluit" functie aan de sluitknop
    closeButton.addEventListener('click', closeModal);

    // 7. (Bonus) Sluit de modal ook als je op de donkere achtergrond klikt
    modal.addEventListener('click', (event) => {
        // Als het element waarop je klikt de modal-achtergrond zelf is...
        if (event.target === modal) {
            closeModal();
        }
    });

});