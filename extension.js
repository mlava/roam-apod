const config = {
    tabTitle: "NASA",
    settings: [
        {
            id: "nasa-apiKey",
            name: "NASA API key",
            description: "Your API Key from https://api.nasa.gov/#signUp",
            action: { type: "input", placeholder: "Add API key here" },
        },
    ]
};

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.settings.panel.create(config);

        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Astronomy Picture of the Day (NASA)",
            callback: () => {
                const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                if (uid == undefined) {
                    alert("Please focus a block before importing an image");
                    return;
                } else {
                    window.roamAlphaAPI.updateBlock(
                        { block: { uid: uid, string: "Loading...".toString(), open: true } });
                }
                fetchAPOD().then(async (blocks) => {
                    if (blocks) {
                        await window.roamAlphaAPI.updateBlock(
                            { block: { uid: uid, string: blocks[0].text.toString(), open: true } });
                        for (var i = 0; i < blocks[0].children.length; i++) {
                            var thisBlock = window.roamAlphaAPI.util.generateUID();
                            await window.roamAlphaAPI.createBlock({
                                location: { "parent-uid": uid, order: i + 1 },
                                block: { string: blocks[0].children[i].text.toString(), uid: thisBlock }
                            });
                        }
                    }
                });
            }
        });

        const args = {
            text: "APOD",
            help: "Import the Astronomy Picture of the Day (NASA)",
            handler: (context) => fetchAPOD,
        };
        if (window.roamjs?.extension?.smartblocks) {
            window.roamjs.extension.smartblocks.registerCommand(args);
        } else {
            document.body.addEventListener(
                `roamjs:smartblocks:loaded`,
                () =>
                    window.roamjs?.extension.smartblocks &&
                    window.roamjs.extension.smartblocks.registerCommand(args)
            );
        }

        async function fetchAPOD() {
            var key;
            breakme: {
                if (!extensionAPI.settings.get("nasa-apiKey")) {
                    key = "API";
                    sendConfigAlert(key);
                    break breakme;
                } else {
                    const apiKey = extensionAPI.settings.get("nasa-apiKey");
                    const response = await fetch("https://api.nasa.gov/planetary/apod?api_key=" + apiKey + "");
                    const data = await response.json();
                    if (response.ok) {
                        let title = data.title.toString();
                        let hdurl = data.hdurl.toString();
                        let url = data.url.toString();
                        let explanation = data.explanation.toString();
                        const regex = /(Your Sky Surprise.+1995\))/gm;
                        const subst = ``;
                        explanation = explanation.replace(regex, subst).trim();
                        
                        let titleString = "**Astronomy Picture of the Day ~ [[" + title + "]]**";
                        if (data.hasOwnProperty("copyright")) {
                            let copyright = data.copyright.toString();
                            titleString += " ©[[" + copyright + "]]";
                        }
                        return [
                            {
                                text: titleString, 
                                children: [
                                    { text: "![](" + url + ")" },
                                    { text: "" + explanation + "" },
                                    { text: "[HD Image](" + hdurl + ")" },
                                ]
                            },
                        ];
                    } else {
                        console.error(data);
                    }
                }
            }
        };
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Astronomy Picture of the Day (NASA)'
        });
        if (window.roamjs?.extension?.smartblocks) {
            window.roamjs.extension.smartblocks.unregisterCommand("APOD");
        }
    }
}

function sendConfigAlert(key) {
    if (key == "API") {
        alert("Please set your NASA API key in the configuration settings via the Roam Depot tab.");
    }
}