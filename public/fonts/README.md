# Local fonts

Geist is a variable font from https://github.com/google/fonts/tree/main/ofl/geist.
Noto Sans SC and Noto Serif SC are variable WOFF2 Unicode subsets served by
Google Fonts (fonts.gstatic.com), with the original Unicode ranges retained in
src/styles/noto-fonts.css. These retain the complete Google Fonts character coverage
while letting browsers load only the subsets needed by the page.

Each family includes its SIL Open Font License in OFL.txt. Fonts are committed
locally so neither development nor production builds require Google network
access. Geist uses next/font/local; the CJK families use local CSS @font-face.
