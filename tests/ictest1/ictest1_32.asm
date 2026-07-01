// ictest1_32.asm -- version equivalente con SOLO instrucciones de 32 bits
// Misma logica que ictest1.asm pero sin ninguna instruccion RVC.
// Resultado esperado: mem[100] = 25

    addi  x1, x0, 0       // x1 = 0
    addi  x2, x0, 0       // x2 = 0
    addi  x8, x0, 20      // x8 = 20
    addi  x9, x0, 5       // x9 = 5

    addi  x1, x1, 5       // x1 = 5        (era c.addi x1, 5)
    addi  x2, x2, 3       // x2 = 3        (era c.addi x2, 3)
    add   x1, x1, x2      // x1 = 8        (era c.add  x1, x2)
    slli  x1, x1, 1       // x1 = 16       (era c.slli x1, 1)
    lui   x5, 1           // x5 = 0x1000   (era c.lui  x5, 1)

    sub   x8, x8, x9      // x8 = 15       (era c.sub  x8, x9)
    xor   x8, x8, x9      // x8 = 10       (era c.xor  x8, x9)
    or    x8, x8, x9      // x8 = 15       (era c.or   x8, x9)
    and   x8, x8, x9      // x8 = 5        (era c.and  x8, x9)
    srli  x8, x8, 1       // x8 = 2        (era c.srli x8, 1)
    srai  x8, x8, 1       // x8 = 1        (era c.srai x8, 1)

    addi  x1, x1, 9       // x1 = 25       (era c.addi x1, 9)

    sw    x1, 100(x0)     // mem[100] = 25
    beq   x0, x0, 0       // halt
