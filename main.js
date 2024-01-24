const coinArray = [];
let selectedFavorites = [];
let displayedCoins = [];
let allDisplayedCoins = [];
let pendingCoinId = null


// ---------------------------------------- AJAX REQUEST ------------------------------------------------------

async function fetchAllCoins() {
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/coins/list");
        if (!response.ok) throw new Error(`Error fetching coins. Status: ${response.status}`);

        const allCoinsData = await response.json();

        // Filter coins by name and id, allowing only letters
        const filteredCoins = allCoinsData.filter(coin => /^[A-Za-z]+$/.test(coin.name) && /^[A-Za-z]+$/.test(coin.id));

        // Filter coins with symbols having only 3 letters
        const filteredCoinsWithThreeLetters = filteredCoins.filter(coin => coin.symbol.length === 3);

        coinArray.push(...filteredCoinsWithThreeLetters);
        console.log("Coins array:", coinArray);
        displayCoins(coinArray);
    } catch (error) {
        console.error("Error fetching coins:", error.message);
        const boxCoins = document.getElementById("boxCoins");
        boxCoins.innerHTML = '<h1>Any coin to fetch :/</h1>'
    }
}

async function fetchCoinDetails(coin) {
    try {
        const cachedDetails = localStorage.getItem(coin.id);
        if (cachedDetails) {
            const { data, timestamp } = JSON.parse(cachedDetails);
            if (Date.now() - timestamp < 120000) return { ...coin, details: data };
            localStorage.removeItem(coin.id);
        }

        const coinDetails = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}`).then(response => response.json());
        localStorage.setItem(coin.id, JSON.stringify({ data: coinDetails, timestamp: Date.now() }));
        return { ...coin, details: coinDetails };
    } catch (error) {
        console.error(`Error fetching details for coin ${coin.id}: ${error.message}`);
        return coin;
    }
}

// -------------------------------------------- DISPLAY COIN & DETAIL ---------------------------------------------------

function displayCoins(coins) {
    displayedCoins = coins;
    allDisplayedCoins = coinArray;
    const boxCoins = document.getElementById("boxCoins");
    boxCoins.innerHTML = '';
    const coinsHTML = coins.map(coin => `
    <div class="cardCoin">
        <div class="cardTitle">
            <h2>${coin.name}</h2>
            <h6>${coin.symbol}</h6>
        </div>
        <label class="custom-checkbox" for="favori${coin.id}">
        <input type="checkbox" id="favori${coin.id}" class="customControl" onclick="addToFav('${coin.id}')">
        <div class="checkbox-image"></div>
        </label>
        <button class="btnMoreInfo" type="button" data-toggle="collapse" data-target="#collapseExample${coin.id}" aria-expanded="false" aria-controls="collapseExample${coin.id}" onclick="loadCoinDetails('${coin.id}')">
            More Info
        </button>
        <div class="collapse" id="collapseExample${coin.id}">
            <div class="cardCoinDetail card-body" id="details${coin.id}"></div>
        </div>
    </div>
        `
    ).join('');

    boxCoins.innerHTML += `${coinsHTML}`;
    console.log("pending coin ", pendingCoinId)
}

async function loadCoinDetails(coinId) {
    const coin = coinArray.find(c => c.id === coinId);
    const detailsDiv = document.getElementById(`details${coinId}`);
    try {
        detailsDiv.innerHTML = '<div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>';
        const coinDetails = await fetchCoinDetails(coin);
        detailsDiv.innerHTML = `
            <img src="${coinDetails.details.image.small}" alt="${coin.name}" class="crypto-image img-fluid rounded mb-2" />
            <p><b>USD: </b>${coinDetails.details.market_data.current_price.usd} $ </p>
            <p><b>EUR: </b>${coinDetails.details.market_data.current_price.eur} € </p>
            <p><b>IL: </b>${coinDetails.details.market_data.current_price.ils} ₪ </p>`;
    } catch (error) {
        console.error(`Error loading details for coin ${coin.id}: ${error.message}`);
    }
}


// -------------------------------------- RESEARCH & ADD TO FAV ------------------------------------------------------

const searchInput = document.getElementById('searchInput');

if (searchInput) {
    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredCoins = coinArray.filter(coin => coin.name.toLowerCase().includes(searchTerm) || coin.symbol.toLowerCase().includes(searchTerm));
        // substring
        // debound
        displayCoins(filteredCoins);
        updateSwitches();
    });

} else {
    console.error('Element with ID "searchInput" not found.');
}

function addToFav(coinId) {
    const coin = coinArray.find(c => c.id === coinId);
    const isAlreadyFavorited = selectedFavorites.some(fav => fav && fav.id === coin.id);

    if (isAlreadyFavorited) {
        removeFav(coinId);
    } else {
        if (selectedFavorites.length < 5) {
            selectedFavorites.push(coin);
            updateSwitches();
        } else {
            pendingCoinId = coinId;
            console.log("id 6th coin choosen", pendingCoinId);
            showLimitExceededModal(selectedFavorites);
            return null;
        }
    }
    return null;
}

function removeFav(coinId) {
    selectedFavorites = selectedFavorites.filter(fav => fav.id !== coinId);
    updateSwitches();
}

function updateSwitches() {
    const coinsToCheck = displayedCoins.length > 0 ? displayedCoins : allDisplayedCoins;

    const switches = document.querySelectorAll('.customControl');
    switches.forEach((switchElement, index) => {
        const coin = coinsToCheck[index];
        switchElement.checked = selectedFavorites.some(fav => fav && fav.id === coin.id);
        toggleCheckboxImage(coin.id, switchElement.checked);
    });

    console.log("Favoris:", selectedFavorites);
}

function toggleCheckboxImage(coinId, isChecked) {
    const checkboxImage = document.querySelector(`#favori${coinId} + .checkbox-image`);
    if (checkboxImage) {
        checkboxImage.style.backgroundImage = isChecked ? 'url(./assets/icons/rocketStar.png)' : 'url(./assets/icons/rocketNeo.png)';
    }
}


// --------------------------------------------- MODAL ------------------------------------------------------

function closeLimitExceededModal() {
    const modal = document.getElementById('limitExceededModal');
    modal.style.display = 'none';
    pendingCoinId = null
}

function showLimitExceededModal(favorites) {
    const modal = document.getElementById('limitExceededModal');
    const modalContent = document.getElementById("favorisCoin")
    modal.style.display = 'flex';
    modalContent.innerHTML = '';
    favorites.forEach(coin => {
        const div = document.createElement('div');
        div.classList.add('favCoinModal');
        div.setAttribute('data-id', coin.id);
        div.innerHTML = `<button class="favChangeButton" onclick="changeCoin(this)">change <h5>${coin.name}</h5> with ${pendingCoinId}</button>`;
        modalContent.appendChild(div);
    })
}

function changeCoin(button) {
    const parentDiv = button.parentNode;
    const selectedCoinId = parentDiv.getAttribute("data-id");
    const modalContent = document.getElementById("favorisCoin")
    const modalHeader = document.querySelector("#limitExceededModal .modalHeader");
    const modalFooter = document.querySelector("#limitExceededModal .modalFooter");
    const selectedCoinIndex = selectedFavorites.findIndex(fav => fav && fav.id === selectedCoinId)
    if (selectedCoinIndex !== -1) {
        selectedFavorites.splice(selectedCoinIndex, 1)
        addToFav(pendingCoinId);
        modalHeader.style.display = "none";
        modalFooter.style.display = "none";
        modalContent.innerHTML = `<div class="successChange"><h1 style="padding:15px">favorite succesfully updated</h1><img src="./assets/icons/astronautS.png"></div>`
        setTimeout(() => {
            closeLimitExceededModal()
            modalHeader.style.display = "block";
            modalFooter.style.display = "flex";
        }, 2000)
    } else {
        console.error("The selected coin was not found in the favorites.")
    }
}


// -------------------------------------------- SHOWED SECTION --------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
    const sections = ['home', 'graph', 'about'];
    let graphInterval;
    sections.forEach(sectionId => {
        document.getElementById(`${sectionId}Button`).addEventListener('click', () => { showSection(sectionId) })
    });

    showSection('home');
    fetchAllCoins();

    function showSection(sectionId) {
        sections.forEach(s => document.getElementById(s).style.display = s === sectionId ? 'block' : 'none');

        document.getElementById('searchInput').style.display = sectionId === 'home' ? 'block' : 'none';

        if (sectionId === 'graph') {
            let graphContainer = document.getElementById("graphContainer");
            let spanGraph = document.getElementById("spanGraph")
            if (selectedFavorites.length === 0) {
                clearInterval(graphInterval);
                graphContainer.style.display = 'none';
            } else {
                console.log("favoris from graph", selectedFavorites);
                fetchGraphData(selectedFavorites);
                graphInterval = setInterval(() => fetchGraphData(selectedFavorites), 2000);
                graphContainer.style.display = 'block';
                spanGraph.style.display = 'none';
            }
        } else {
            clearInterval(graphInterval);

            let graphContainer = document.getElementById("graphContainer");
            graphContainer.style.display = 'none';
        }

    }
})


// ---------------------------------------------- GRAPH ---------------------------------------------------------------------

async function fetchGraphData(coins) {
    try {
        let favContainer = document.getElementById("graphContainer")
        let symbol = coins.map(coin => coin.symbol.toUpperCase()).join(",")
        const response = await fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symbol}&tsyms=USD`);
        if (!response.ok) throw new Error(`Error fetching coins. Status: ${response.status}`);
        const allCoinsData = await response.json();
        console.log("fav :", allCoinsData)
        displayFavValue(allCoinsData, favContainer)
    } catch (error) {
        console.error("Error fetching data:", error.message);
    }
}

function displayFavValue(coins, container) {
    let coinsValue = Object.entries(coins).map(([symbol, data]) => `${symbol}: ${data.USD}`).join(" ; ");
    console.log("coins value", coinsValue);
    let tableContent = `<table class="tableFav"><tr><th>Coin</th><th>Value (USD)</th></tr>`;

    Object.entries(coins).forEach(([symbol, data]) => {
        tableContent += `<tr><td>${symbol}</td><td>${data.USD}</td></tr>`;
    });

    tableContent += "</table>";

    container.innerHTML = tableContent
}