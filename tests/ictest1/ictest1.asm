// ictest1.asm -- version con instrucciones comprimidas RVC
// Prueba: c.addi, c.add, c.slli, c.lui, c.sub, c.xor, c.or, c.and, c.srli, c.srai
// Resultado esperado: mem[100] = 25

    addi  x1, x0, 0       // x1 = 0
    addi  x2, x0, 0       // x2 = 0
    addi  x8, x0, 20      // x8 = 20
    addi  x9, x0, 5       // x9 = 5

    c.addi x1, 5          // x1 = 5
    c.addi x2, 3          // x2 = 3
    c.add  x1, x2         // x1 = 8
    c.slli x1, 1          // x1 = 16
    c.lui  x5, 1          // x5 = 0x1000

    c.sub  x8, x9         // x8 = 15
    c.xor  x8, x9         // x8 = 10
    c.or   x8, x9         // x8 = 15
    c.and  x8, x9         // x8 = 5
    c.srli x8, 1          // x8 = 2
    c.srai x8, 1          // x8 = 1

    c.addi x1, 9          // x1 = 25

    sw    x1, 100(x0)     // mem[100] = 25
    beq   x0, x0, 0       // halt
