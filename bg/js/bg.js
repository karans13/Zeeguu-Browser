var PERSITENT_PREFERENCES_KEYS = ["dictUrl", "from", "to", "links", "fast", "session", "email", "highlight", "work_before_play"];
var API_URL = "https://www.zeeguu.unibe.ch/";  // This is also stored in lib/zeeguu_api_interface.js
//var API_URL = "http://localhost:8080/";  // This is also stored in lib/zeeguu_api_interface.js


var zeeguu_window = null,
    state;

var previous_url = [];

function getState(callback) {
    if (state) {
        if (callback) {
            callback(state);
        }
        return;
    }
    browser.getSettings(PERSITENT_PREFERENCES_KEYS, function(items) {
        state = fillStateWithDefaults(items);
        if (callback) {
            callback(state);
        }
    });
}

function storeState() {
    var persitentState = {};
    $.each(state, function(i, v) {
        if (PERSITENT_PREFERENCES_KEYS.indexOf(i) >= 0) {
            persitentState[i] = v;
        }
    });
    browser.setSettings(persitentState);
    console.log(persitentState);
    browser.broadcast("state", {
        state: state
    });
}

function fillStateWithDefaults(state) {
    return $.extend({
            dictUrl: "http://{from}-{to}.syn.dict.cc/?s={query}",
            from: "de",
            to: "en",
            highlight: false,
            session: null,
            links: false,
            fast: false,  // translate with double-click
            selectionMode: false,
            work_before_play: true
    }, state);
}

function validateSession(sessionID, callback) {
    $.get(API_URL + "validate?session=" + sessionID).done(function(data) {
        callback(data == "OK");
    }).fail(function() {
        callback(false);
    });
}

browser.addMessageListener("window", function(message, sender) {
    if (zeeguu_window) {
        chrome.windows.remove(zeeguu_window.id);
    }
    chrome.windows.create({
        url: message.url,
        width: 734,
        height: 300,
        focused: true,
        type: "popup"
    }, function(window) {
        zeeguu_window = window;
  });
});

browser.addMessageListener("get_state", function(message, sender, response) {
    getState(function(state) {
        response(state);
    });
}, true);

browser.addMessageListener("update_state", function(message) {
    console.log(message);
    $.extend(true, state, message);
    browser.setToolbarBadge(state.selectionMode ? "!" : "");
    storeState();
});

browser.addMessageListener("reset_state", function(message) {
    console.log(message);
    state = fillStateWithDefaults({});
    browser.setToolbarBadge(state.selectionMode ? "!" : "");
    storeState();
});


chrome.extension.onMessage.addListener(function(message, sender) {
    if (message.name != "window" && message.name != "update_state" && message.name != "get_state") {
        chrome.tabs.sendMessage(sender.tab.id, message);
    }
});



// N.B. callback will be called with info and the tab in which the menu has been activated
// the translate message is sent to the content script...
browser.contextMenu("translate", "Translate %s", "selection", function(info, tab) {
    chrome.tabs.sendMessage(tab.id, {
        name: "ZM_SHOW_TRANSLATION",
        term: info.selectionText,
        url: tab.url,
        context: "" //this is if we want to save the url of the page as context
    });
});

chrome.commands.onCommand.addListener(function(command) {
  console.log('Command:', command);
});

getState(function(state) {
    validateSession(state.session, function(valid) {
        if (!valid) {
            state.session = null;
            storeState();
        }
    });
});

