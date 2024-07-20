FROM archlinux
ENV PATH=/root/.deno:/root/.deno/bin:/usr/bin:/usr/local/bin
RUN pacman -Syy
RUN pacman -S unzip curl wget git djvulibre mupdf-tools tesseract tesseract-data-eng --noconfirm
RUN curl -fsSL https://deno.land/install.sh | sh
RUN mkdir -p test
WORKDIR /test
RUN git clone https://github.com/s-i-e-v-e/boarpig.git
WORKDIR /test/boarpig/src
RUN echo '#!/bin/sh' > /root/.deno/bin/boarpig
RUN echo 'exec deno run --allow-all "file:///test/boarpig/src/boarpig.ts" "$@"' >> /root/.deno/bin/boarpig
RUN chmod +x /root/.deno/bin/boarpig
WORKDIR /test
RUN mkdir -p /test/boarpig-books
WORKDIR /test/boarpig-books
RUN wget https://archive.org/download/beastssuperbeast00sakirich/beastssuperbeast00sakirich.djvu
RUN boarpig extract ./beastssuperbeast00sakirich.djvu
WORKDIR /test/boarpig-books/beastssuperbeast00sakirich_output/ocr/images
RUN rm image-0007.png
RUN rm image-0012.png
RUN rm image-0017.png
RUN rm image-0022.png
RUN rm image-0027.png
RUN rm image-0032.png
RUN rm image-0047.png
RUN rm image-0052.png
RUN rm image-0062.png
RUN rm image-0072.png
RUN rm image-1637.png
RUN rm image-1642.png
RUN rm image-1647.png
RUN rm image-1652.png
RUN rm image-1657.png
RUN rm image-1662.png
RUN rm image-1667.png
RUN rm image-1672.png
WORKDIR /test/boarpig-books
RUN boarpig renumber ./beastssuperbeast00sakirich.djvu A 37-67
RUN boarpig renumber ./beastssuperbeast00sakirich.djvu B 77-1632
RUN boarpig ocr ./beastssuperbeast00sakirich.djvu
