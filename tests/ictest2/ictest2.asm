// ictest2.asm -- version con instrucciones comprimidas RVC
// Prueba: c.lw, c.sw, c.lwsp, c.swsp, c.beqz, c.bnez, c.j, c.jal, c.jr, c.jalr
// Resultado esperado: mem[100] = 25

    addi  x2, x0, 0       // sp = 0
    addi  x8, x0, 96      // x8 = 96  (direccion base)
    addi  x9, x0, 25      // x9 = 25  (valor a guardar)

    c.sw   x9,  0(x8)     // mem[96] = 25
    c.lw   x10, 0(x8)     // x10 = 25
    c.swsp x10, 104(x2)   // mem[104] = 25
    c.lwsp x11, 104(x2)   // x11 = 25

    addi  x12, x0, 0      // x12 = 0

    c.beqz x12, +4        // salta (x12==0), omite siguiente
    c.addi x1, 3          // NO debe ejecutarse
    c.bnez x10, +4        // salta (x10==25!=0), omite siguiente
    c.addi x1, 3          // NO debe ejecutarse
    c.j    +4             // salto incondicional, omite siguiente
    c.addi x1, 3          // NO debe ejecutarse
    c.jal  +4             // x1=PC+2, salta, omite siguiente
    c.addi x1, 3          // NO debe ejecutarse

    addi  x6, x0, 48      // x6 = 48 (direccion del sw abajo)
    c.jr  x6              // salta a PC=48
    c.addi x1, 3          // NO debe ejecutarse

    addi  x7, x0, 54      // x7 = 54 (direccion del sw abajo)
    c.jalr x7             // x1=PC+2, salta a PC=54

    sw    x10, 100(x0)    // mem[100] = 25
    beq   x0,  x0, 0      // halt
