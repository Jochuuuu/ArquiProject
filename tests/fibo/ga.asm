0513    // low  de 06400513 ; addi  x10, x0, 100
0640    // high de 06400513 ; addi  x10, x0, 100
0593    // low  de 00800593 ; addi  x11, x0, 8
0080    // high de 00800593 ; addi  x11, x0, 8
0293    // low  de 00500293 ; addi  x5, x0, 5
0050    // high de 00500293 ; addi  x5, x0, 5
2023    // low  de 00552023 ; sw    x5, 0(x10)
0055    // high de 00552023 ; sw    x5, 0(x10)
0293    // low  de 00300293 ; addi  x5, x0, 3
0030    // high de 00300293 ; addi  x5, x0, 3
2223    // low  de 00552223 ; sw    x5, 4(x10)
0055    // high de 00552223 ; sw    x5, 4(x10)
0293    // low  de 00800293 ; addi  x5, x0, 8
0080    // high de 00800293 ; addi  x5, x0, 8
2423    // low  de 00552423 ; sw    x5, 8(x10)
0055    // high de 00552423 ; sw    x5, 8(x10)
0293    // low  de 00100293 ; addi  x5, x0, 1
0010    // high de 00100293 ; addi  x5, x0, 1
2623    // low  de 00552623 ; sw    x5, 12(x10)
0055    // high de 00552623 ; sw    x5, 12(x10)
0293    // low  de 00900293 ; addi  x5, x0, 9
0090    // high de 00900293 ; addi  x5, x0, 9
2823    // low  de 00552823 ; sw    x5, 16(x10)
0055    // high de 00552823 ; sw    x5, 16(x10)
0293    // low  de 00200293 ; addi  x5, x0, 2
0020    // high de 00200293 ; addi  x5, x0, 2
2A23    // low  de 00552A23 ; sw    x5, 20(x10)
0055    // high de 00552A23 ; sw    x5, 20(x10)
0293    // low  de 00700293 ; addi  x5, x0, 7
0070    // high de 00700293 ; addi  x5, x0, 7
2C23    // low  de 00552C23 ; sw    x5, 24(x10)
0055    // high de 00552C23 ; sw    x5, 24(x10)
0293    // low  de 00400293 ; addi  x5, x0, 4
0040    // high de 00400293 ; addi  x5, x0, 4
2E23    // low  de 00552E23 ; sw    x5, 28(x10)
0055    // high de 00552E23 ; sw    x5, 28(x10)
0293    // low  de 00100293 ; addi  x5, x0, 1
0010    // high de 00100293 ; addi  x5, x0, 1
D863    // low  de 04B2D863 ; bge   x5, x11, _end
04B2    // high de 04B2D863 ; bge   x5, x11, _end
9E13    // low  de 00229E13 ; slli  x28, x5, 2
0022    // high de 00229E13 ; slli  x28, x5, 2
0E33    // low  de 00AE0E33 ; add   x28, x28, x10
00AE    // high de 00AE0E33 ; add   x28, x28, x10
2383    // low  de 000E2383 ; lw    x7, 0(x28)
000E    // high de 000E2383 ; lw    x7, 0(x28)
8313    // low  de FFF28313 ; addi  x6, x5, -1
FFF2    // high de FFF28313 ; addi  x6, x5, -1
4363    // low  de 02034363 ; blt   x6, x0, _insert
0203    // high de 02034363 ; blt   x6, x0, _insert
1E13    // low  de 00231E13 ; slli  x28, x6, 2
0023    // high de 00231E13 ; slli  x28, x6, 2
0E33    // low  de 00AE0E33 ; add   x28, x28, x10
00AE    // high de 00AE0E33 ; add   x28, x28, x10
2403    // low  de 000E2403 ; lw    x8, 0(x28)
000E    // high de 000E2403 ; lw    x8, 0(x28)
4B63    // low  de 00744B63 ; blt   x8, x7, _insert
0074    // high de 00744B63 ; blt   x8, x7, _insert
0963    // low  de 00740963 ; beq   x8, x7, _insert
0074    // high de 00740963 ; beq   x8, x7, _insert
0493    // low  de 004E0493 ; addi  x9, x28, 4
004E    // high de 004E0493 ; addi  x9, x28, 4
A023    // low  de 0084A023 ; sw    x8, 0(x9)
0084    // high de 0084A023 ; sw    x8, 0(x9)
137D    // c.addi x6, -1            ; compressed 16-bit
F06F    // low  de FDFFF06F ; jal   x0, _inner
FDFF    // high de FDFFF06F ; jal   x0, _inner
0313    // low  de 00130313 ; addi  x6, x6, 1
0013    // high de 00130313 ; addi  x6, x6, 1
1E13    // low  de 00231E13 ; slli  x28, x6, 2
0023    // high de 00231E13 ; slli  x28, x6, 2
0E33    // low  de 00AE0E33 ; add   x28, x28, x10
00AE    // high de 00AE0E33 ; add   x28, x28, x10
2023    // low  de 007E2023 ; sw    x7, 0(x28)
007E    // high de 007E2023 ; sw    x7, 0(x28)
0285    // c.addi x5, 1             ; compressed 16-bit
F06F    // low  de FB5FF06F ; jal   x0, _outer
FB5F    // high de FB5FF06F ; jal   x0, _outer
0063    // low  de 00000063 ; beq   x0, x0, 0
0000    // high de 00000063 ; beq   x0, x0, 0