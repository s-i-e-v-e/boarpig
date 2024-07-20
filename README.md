# boarpig

*boarpig* is a toolkit that helps you produce e-texts from pdf/djvu files containing images.

Some features include:

* image extraction and renumbering
* ocr
* browser-based proofreading system

## Getting started

### On Linux/WSL
*boarpig* requires some kind of Linux distribution. It is known to work under WSL on Windows 10.

Steps:

* Install `djvulibre`, `mupdf-tools` and `tesseract-ocr`
* Install [Deno](https://deno.com) (`curl -fsSL https://deno.land/install.sh | sh`)
* Clone this repository
* Switch to the boarpig/src directory
* Install *boarpig* using `deno install -g -fA boarpig.ts`. Edit the ~/.deno/bin/boarpig file and remove the `--no-config` option. Do this every time you update the repository so that the latest changes are compiled.
* See `boarpig --help` for more information.
* [HOWTO](HOWTO.md) contains a complete step-by-step example of converting a djvu/pdf file into a proofread etext.

### Using Podman

* Build an image using the provided Containerfile
* Create a container named saki using `podman run --name saki -dt -p 8000:8000 <imageID>`. Provide the appropriate imageID.
* Log into the shell using `podman exec -it saki /bin/bash`
* Within the shell, do `boarpig serve ./` and access `http://localhost:8000` in your browser to see a readymade example project.
*  See [HOWTO](HOWTO.md) for a step-by-step example of how the example project was created.

## Licensing

*boarpig* is licensed under *GNU AFFERO GENERAL PUBLIC LICENSE, Version 3.0* (AGPL).

## Colophon

*boarpig* is named after the chapter from Saki's *Beasts and Super-beasts*.
