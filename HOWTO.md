# HOWTO

This HOWTO will take you through one complete *boarpig* workflow. It is assumed that you have already installed *boarpig* by following the instructions in the [README](README.md).

1. Download the DJVU version of Saki's *Beasts and Super-beasts* from archive.org: [beastssuperbeast00sakirich.djvu](https://archive.org/download/beastssuperbeast00sakirich/beastssuperbeast00sakirich.djvu)

2. Create a directory (say `boarpig-books`) somewhere on your computer and put the downloaded file inside it.

3. Start a terminal on Linux/Windows-WSL, switch to the directory and run: `boarpig extract ./beastssuperbeast00sakirich.djvu`

   If you are in some other directory, you can specify full or relative paths. *boarpig* will only create files within the specified directory.

   For. e.g., if the complete path to the directory is `/home/sieve/Desktop/boarpig-books` and you have your terminal open in `/home/sieve/private`, you can specify one of:

    * `boarpig extract /home/sieve/Desktop/boarpig-books/beastssuperbeast00sakirich.djvu`
    * `boarpig extract ../Desktop/boarpig-books/beastssuperbeast00sakirich.djvu`

4. *boarpig* will first convert the book to pdf. It will then extract the images from the pdf file into
`boarpig-books/beastssuperbeast00sakirich_output/ocr/images`

5. It is now time for some manual intervention. Books generally have one or more sections: front matter, body, end matter etc. So, it is better to go through the images and apply a prefix to each set to simply matters.

   In this particular case:

   * Images `image-0007.png ... image-0072.png` (14 pgs) are the cover and front matter. Of which we are only going to keep four: 37, 42, 57, 67.
   * Images `image-0077.png ... image-1632.png` (312 pgs) are the body of the text. We are keeping all of them.
   * Images `image-1637.png ... image-1672.png` (8 pgs) are the back cover and blank pages. We are keeping none of them.

   So, go ahead and delete the following files:

   * `image-0007.png`
   * `image-0012.png`
   * `image-0017.png`
   * `image-0022.png`
   * `image-0027.png`
   * `image-0032.png`
   * `image-0047.png`
   * `image-0052.png`
   * `image-0062.png`
   * `image-0072.png`
   * `image-1637.png`
   * `image-1642.png`
   * `image-1647.png`
   * `image-1652.png`
   * `image-1657.png`
   * `image-1662.png`
   * `image-1667.png`
   * `image-1672.png`

   We are now left with two sets of files (4 + 312 = 316). Let us use the prefix `A` for the front matter, and `B` for the main text. So run:

   * `boarpig renumber ./beastssuperbeast00sakirich.djvu A 37-67`

   * `boarpig renumber ./beastssuperbeast00sakirich.djvu B 77-1632`

   This will renumber the two sets into `A0001.png ... A0004.png` and `B0001.png ... B0312.png`

6. Now we run an OCR pass over the images: `boarpig ocr ./beastssuperbeast00sakirich.djvu`

   This is a CPU-intensive process. So, you can use the same prefix and start-end notation used for image numbering if you want to do it in passes. For .e.g.

   * `boarpig ocr ./beastssuperbeast00sakirich.djvu A 1-4`
   * `boarpig ocr ./beastssuperbeast00sakirich.djvu B 1-200`
   * `boarpig ocr ./beastssuperbeast00sakirich.djvu B 201-312`

   This process will put `A0001.txt ... B0312.txt` files into the `boarpig-books/beastssuperbeast00sakirich_output/ocr/text` directory.

7. Now you can use the web-ui to proofread the book page by page. Start the webserver by running: `boarpig serve ./` and visit http://localhost:8000/

   Some handy shortcuts:

   * Previous page: `Ctrl + ←`
   * Next page: `Ctrl + →`
   * Italicize selection `Ctrl + I`
   * Convert selection to heading `Ctrl + H`

8. Once you have proofread the book, you can create a boarpig project using: `boarpig make ./beastssuperbeast00sakirich.djvu`

   This creates a bunch of useful files in the `boarpig-books/beastssuperbeast00sakirich_output/proj` directory. `project.bpp` is the main project file. The rest are independent files that serve a variety of purposes including serving as a base for comparison with gutenberg.org texts. In particular, the `words.txt.bpp` file can be used to check the main project for misspelled words.

9. As a final step, you can generate an html ebook using: `boarpig gen ./beastssuperbeast00sakirich.djvu html`

   This creates an html file within the `boarpig-books/beastssuperbeast00sakirich_output/proj/output/html5` directory.

10. All the files used and generated in this example (other than djvu, pdf and png) can be found in the [docs/examples/boarpig-books](./docs/examples/boarpig-books) directory.
