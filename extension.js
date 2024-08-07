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

        extensionAPI.ui.commandPalette.addCommand({
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
                        var hdurl, urlString;
                        if (data.media_type == "image") {
                            hdurl = data.hdurl.toString();
                            if (hdurl.includes("(")) {
                                hdurl = hdurl.replaceAll("(", "%28");
                                hdurl = hdurl.replaceAll(")", "%29");
                            }
                        }
                        let title = data.title.toString();
                        let url = data.url.toString();
                        if (url.includes("(")) {
                            url = url.replaceAll("(", "%28");
                            url = url.replaceAll(")", "%29");
                        }
                        let explanation = data.explanation.toString();
                        const regex = /(Your Sky Surprise.+1995\))/gm;
                        const subst = ``;
                        explanation = explanation.replace(regex, subst).trim();
                        const regex1 = /(Astrophysicists: Browse.+Source Code Library)/gm;
                        const subst1 = ``;
                        explanation = explanation.replace(regex1, subst1).trim();
                        const regex2 = /(Almost Hyperspace: Random APOD Generator)/gm;
                        const subst2 = ``;
                        explanation = explanation.replace(regex2, subst2).trim();
                        const regex3 = /(\s{2,3})/gm;
                        const subst3 = ` `;
                        explanation = explanation.replace(regex3, subst3).trim();

                        let titleString = "**Astronomy Picture of the Day ~ [[" + title + "]]**";
                        if (data.hasOwnProperty("copyright")) {
                            let copyright = data.copyright.toString();
                            const regex = /(\(Used with permission\))/gm;
                            const subst = ``;
                            copyright = copyright.replace(regex, subst).trim();
                            copyright = copyright.replaceAll("\n", "");
                            titleString += " © [[" + copyright + "]]";
                        }
                        if (data.media_type == "video") {
                            url = url.split("/")[4];
                            if (url.includes("?rel=0")) {
                                url = url.replace("?rel=0", "");
                            }
                            urlString = "{{[[video]]: https://www.youtube.com/watch?v=" + url + "}} ";
                            return [
                                {
                                    text: titleString,
                                    children: [
                                        { text: urlString },
                                        { text: "" + explanation + "" },
                                    ]
                                },
                            ];
                        } else {
                            urlString = "![](" + url + ") ";
                            return [
                                {
                                    text: titleString,
                                    children: [
                                        { text: urlString },
                                        { text: "" + explanation + "" },
                                        { text: "[HD Image](" + hdurl + ")" },
                                    ]
                                },
                            ];
                        }
                    } else {
                        console.error(data);
                    }
                }
            }
        };
    },
    onunload: () => {
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