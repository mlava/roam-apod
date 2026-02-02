function buildSettingsConfig(extensionAPI) {
    return {
        tabTitle: "NASA",
        settings: [
            {
                id: "nasa-apiKey",
                name: "NASA API key",
                description: "Your API Key from https://api.nasa.gov/#signUp",
                action: {
                    type: "input",
                    placeholder: "Add API key here",
                    value: extensionAPI.settings.get("nasa-apiKey") || "",
                },
            },
            {
                id: "nasa-prefer-hd-embed",
                name: "Prefer HD image embed",
                description: "When available, embed the HD image instead of the standard image.",
                action: {
                    type: "switch",
                    value: !!extensionAPI.settings.get("nasa-prefer-hd-embed"),
                },
            },
        ],
    };
}

let smartblocksLoadedHandler = null;

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.settings.panel.create(buildSettingsConfig(extensionAPI));

        extensionAPI.ui.commandPalette.addCommand({
            label: "Astronomy Picture of the Day (NASA)",
            callback: async () => {
                if (!window.roamAlphaAPI?.ui?.getFocusedBlock || !window.roamAlphaAPI?.updateBlock) {
                    alert("Roam API is not available yet. Please try again after Roam finishes loading.");
                    return;
                }
                const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                if (uid == undefined) {
                    alert("Please focus a block before importing an image");
                    return;
                }

                let previousString = null;
                try {
                    previousString = window.roamAlphaAPI.pull("[:block/string]", [":block/uid", uid])?.[":block/string"] ?? null;
                } catch (e) {
                    previousString = null;
                }

                await window.roamAlphaAPI.updateBlock(
                    { block: { uid: uid, string: "Loading...".toString(), open: true } });

                try {
                    const blocks = await fetchAPOD();
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
                    } else {
                        const fallback = previousString ?? "APOD import failed. Please check your API key and network connection.";
                        await window.roamAlphaAPI.updateBlock(
                            { block: { uid: uid, string: fallback.toString(), open: true } });
                    }
                } catch (err) {
                    console.error("APOD import failed", err);
                    const fallback = previousString ?? "APOD import failed. Please check your API key and network connection.";
                    await window.roamAlphaAPI.updateBlock(
                        { block: { uid: uid, string: fallback.toString(), open: true } });
                }
            }
        });

        const args = {
            text: "APOD",
            help: "Import the Astronomy Picture of the Day (NASA)",
            handler: (context) => async () => {
                try {
                    const result = await fetchAPOD({
                        suppressAlert: true,
                        missingKeyMessage: "APOD: Please set your NASA API key in the Roam Depot settings.",
                        roamApiMissingMessage: "APOD: Roam API not ready. Try again in a moment.",
                    });
                    if (typeof result === "string") return result;
                    if (result) return result;
                    return "APOD: Import failed. Check console for details.";
                } catch (err) {
                    return "APOD: Import failed. Check console for details.";
                }
            },
        };
        if (window.roamjs?.extension?.smartblocks) {
            window.roamjs.extension.smartblocks.registerCommand(args);
        } else {
            smartblocksLoadedHandler = () =>
                window.roamjs?.extension.smartblocks &&
                window.roamjs.extension.smartblocks.registerCommand(args);
            document.body.addEventListener(`roamjs:smartblocks:loaded`, smartblocksLoadedHandler);
        }

        async function fetchAPOD(options = {}) {
            const {
                suppressAlert = false,
                missingKeyMessage = null,
                roamApiMissingMessage = null,
            } = options;
            const asText = (v) => (v == null ? "" : String(v));
            const safeUrl = (u) => {
                try {
                    return encodeURI(new URL(u).toString())
                        .replaceAll("(", "%28")
                        .replaceAll(")", "%29");
                } catch (e) {
                    return encodeURI(String(u || ""))
                        .replaceAll("(", "%28")
                        .replaceAll(")", "%29");
                }
            };
            if (!window.roamAlphaAPI) {
                if (!suppressAlert) {
                    alert("Roam API is not available yet. Please try again after Roam finishes loading.");
                }
                return roamApiMissingMessage ?? null;
            }

            if (!extensionAPI.settings.get("nasa-apiKey")) {
                if (!suppressAlert) {
                    sendConfigAlert("API");
                }
                return missingKeyMessage ?? null;
            }

            const apiKey = extensionAPI.settings.get("nasa-apiKey");
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                const response = await fetch(
                    "https://api.nasa.gov/planetary/apod?api_key=" + apiKey + "",
                    { signal: controller.signal }
                );
                clearTimeout(timeoutId);
                const text = await response.text();
                let data = null;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = null;
                }

                if (!response.ok) {
                    const message = data?.error?.message || text || `HTTP ${response.status}`;
                    throw new Error(message);
                }

                var hdurl, urlString;
                if (data.media_type == "image") {
                    hdurl = safeUrl(data.hdurl);
                }
                const preferHdEmbed = !!extensionAPI.settings.get("nasa-prefer-hd-embed");
                let title = asText(data.title);
                let url = safeUrl(data.url);
                let explanation = asText(data.explanation);
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
                    let copyright = asText(data.copyright);
                    const regex = /(\(Used with permission\))/gm;
                    const subst = ``;
                    copyright = copyright.replace(regex, subst).trim();
                    copyright = copyright.replaceAll("\n", "");
                    titleString += " © [[" + copyright + "]]";
                }
                if (data.media_type == "video") {
                    let embedString = null;
                    try {
                        const parsed = new URL(asText(data.url));
                        const host = parsed.hostname.replace(/^www\./, "");
                        if (host === "youtube.com") {
                            let videoId = parsed.searchParams.get("v") || "";
                            if (!videoId && parsed.pathname.startsWith("/embed/")) {
                                videoId = parsed.pathname.split("/")[2] || "";
                            }
                            if (videoId) {
                                embedString = "{{[[video]]: https://www.youtube.com/watch?v=" + videoId + "}} ";
                            }
                        } else if (host === "youtu.be") {
                            const videoId = parsed.pathname.replace("/", "");
                            if (videoId) {
                                embedString = "{{[[video]]: https://www.youtube.com/watch?v=" + videoId + "}} ";
                            }
                        }
                    } catch (e) {
                        embedString = null;
                    }
                    urlString = embedString || "[Video Link](" + url + ") ";
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
                    const embedUrl = preferHdEmbed && hdurl ? hdurl : url;
                    urlString = "![](" + embedUrl + ") ";
                    const children = [
                        { text: urlString },
                        { text: "" + explanation + "" },
                    ];
                    if (!preferHdEmbed && hdurl) {
                        children.push({ text: "[HD Image](" + hdurl + ")" });
                    }
                    return [
                        {
                            text: titleString,
                            children,
                        },
                    ];
                }
            } catch (err) {
                console.error("APOD fetch failed", err);
                throw err;
            }
        };
    },
    onunload: () => {
        if (window.roamjs?.extension?.smartblocks) {
            window.roamjs.extension.smartblocks.unregisterCommand("APOD");
        }
        if (smartblocksLoadedHandler) {
            document.body.removeEventListener(`roamjs:smartblocks:loaded`, smartblocksLoadedHandler);
            smartblocksLoadedHandler = null;
        }
    }
}

function sendConfigAlert(key) {
    if (key == "API") {
        alert("Please set your NASA API key in the configuration settings via the Roam Depot tab.");
    }
}
