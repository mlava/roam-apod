# Astronomy Picture of the Day (APOD)

Bring NASA’s Astronomy Picture of the Day (APOD) into your Roam graph with a single command or SmartBlock.

![APOD screenshot](https://user-images.githubusercontent.com/6857790/202060671-70476dd6-9b5e-4c49-ab97-7e18e85f13f8.png)

## Highlights
- Imports APOD as a titled block with child blocks for media, description, and HD link
- Handles both images and videos
- Works with Roam Hotkeys and SmartBlocks

## Install
Install via Roam Depot or load the extension in dev mode.

## Setup
1. Get a free NASA API key: https://api.nasa.gov/#signUp
2. Open Roam Depot settings for this extension
3. Paste your API key into **NASA API key**

## Usage
### Command Palette
Open the Command Palette and run:
- **Astronomy Picture of the Day (NASA)**

### SmartBlocks
Use the SmartBlock command:
- `<%APOD%>`

## Output Structure
The extension inserts:
- A header block with the APOD title (and copyright if provided)
- Child blocks containing:
  - The image or video embed
  - The description
  - A link to the HD image (for image APODs)

## Notes
- If the API key is missing, SmartBlocks will insert a short reminder instead of failing.
- If Roam is still loading, try again once the graph finishes initializing.

## Changelog
- Video APOD support
- Compatible with user-defined hotkeys
