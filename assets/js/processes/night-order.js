import Observer from "../classes/Observer.js";
import {
    lookupOne,
    lookupCached,
    lookupOneCached,
    replaceContentsMany
} from "../utils/elements.js";

const gameObserver = Observer.create("game");
const tokenObserver = Observer.create("token");

gameObserver.on("characters-selected", ({ detail }) => {

    const characters = detail.characters.filter((character) => {
        const team = character.getTeam();
        return team !== "traveller";
    });

    replaceContentsMany(
        lookupOneCached("#first-night"),
        characters
            .filter((character) => character.getFirstNight())
            .sort((a, b) => a.getFirstNight() - b.getFirstNight())
            .map((character) => character.drawNightOrder(true))
    );

    replaceContentsMany(
        lookupOneCached("#other-nights"),
        characters
            .filter((character) => character.getOtherNight())
            .sort((a, b) => a.getOtherNight() - b.getOtherNight())
            .map((character) => character.drawNightOrder(false))
    );

});

function displayPlayers(night, players) {
    const playersDisplay = players.map((player) => {
        var name = player.name === "" ? "???" : player.name;
        if (player.isDead)
            name = "<s>" + name + "</s>";
        return name
    });
    lookupOne(".js--night-info--players", night).innerHTML = playersDisplay.join(" ");
}

function addPlayer(night, character) {
    var players = JSON.parse(night.dataset.players || '[]');
    players.push({name: character.playerName, isDead: character.isDead});
    night.dataset.players = JSON.stringify(players);
    displayPlayers(night, players);
}

function removePlayer(night, character) {
    var players = JSON.parse(night.dataset.players || '[]');
    for (var i = players.length - 1; i >= 0; i--) {
        if (players[i].name === character.playerName && players[i].isDead === character.getIsDead()) {
            players.splice(i, 1);
            break;
        }
    }
    night.dataset.players = JSON.stringify(players);
    displayPlayers(night, players);
}

function renamePlayer(night, character, newName) {
    var players = JSON.parse(night.dataset.players || '[]');
    for (var i = players.length - 1; i >= 0; i--) {
        if (players[i].name === character.playerName && players[i].isDead === character.getIsDead()) {
            players[i].name = newName;
            break;
        }
    }
    night.dataset.players = JSON.stringify(players);
    displayPlayers(night, players);
}

function toggleIsDeadPlayer(night, character, wasDead) {
    var players = JSON.parse(night.dataset.players || '[]');
    for (var i = players.length - 1; i >= 0; i--) {
        if (players[i].name === character.playerName && players[i].isDead === wasDead) {
            players[i].isDead = character.getIsDead();
            break;
        }
    }
    night.dataset.players = JSON.stringify(players);
    displayPlayers(night, players);
}

tokenObserver.on("character-add", ({ detail }) => {

    const {
        character
    } = detail;

    const id = character.getId();

    const firstNight = lookupOne(`#first-night [data-id="${id}"]`);
    const otherNights = lookupOne(`#other-nights [data-id="${id}"]`);

    if (firstNight) {

        firstNight.dataset.count = (Number(firstNight.dataset.count) || 0) + 1;
        addPlayer(firstNight, character);
        firstNight.classList.add("is-playing");

    }

    if (otherNights) {

        otherNights.dataset.count = (Number(otherNights.dataset.count) || 0) + 1;
        addPlayer(otherNights, character);
        otherNights.classList.add("is-playing");

    }

});

tokenObserver.on("character-remove", ({ detail }) => {

    const {
        character
    } = detail;

    const id = character.getId();

    const firstNight = lookupOne(`#first-night [data-id="${id}"]`);
    const otherNights = lookupOne(`#other-nights [data-id="${id}"]`);

    if (firstNight) {

        const count = (Number(firstNight.dataset.count) || 1) - 1;
        firstNight.dataset.count = count;
        removePlayer(firstNight, character);

        if (count === 0) {
            firstNight.classList.remove("is-playing");
        }

    }

    if (otherNights) {

        const count = (Number(otherNights.dataset.count) || 1) - 1;
        otherNights.dataset.count = count;
        removePlayer(otherNights, character);

        if (count === 0) {
            otherNights.classList.remove("is-playing");
        }

    }

});

tokenObserver.on("shroud-toggle", ({ detail }) => {

    const {
        wasDead,
        character
    } = detail;

    const id = character.getId();

    const firstNight = lookupOne(`#first-night [data-id="${id}"]`);
    const otherNights = lookupOne(`#other-nights [data-id="${id}"]`);

    if (firstNight) {
        toggleIsDeadPlayer(firstNight, character, wasDead);
    }

    if (otherNights) {
        toggleIsDeadPlayer(otherNights, character, wasDead);
    }

});

tokenObserver.on("set-player-name", ({ detail }) => {

    const {
        name,
        character
    } = detail;

    const id = character.getId();

    const firstNight = lookupOne(`#first-night [data-id="${id}"]`);
    const otherNights = lookupOne(`#other-nights [data-id="${id}"]`);

    if (firstNight) {
        renamePlayer(firstNight, character, name);
    }

    if (otherNights) {
        renamePlayer(otherNights, character, name);
    }

});

lookupOne("#show-all").addEventListener("change", ({ target }) => {

    const showAll = target.checked;

    lookupCached(".night-order").forEach((list) => {
        list.classList.toggle("is-show-all", showAll);
    });

    gameObserver.trigger("night-order-show-all", {
        showAll
    });

});
